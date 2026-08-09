/**
 * App lock utilities: PIN (PBKDF2) + optional biometric unlock (WebAuthn).
 *
 * Security notes:
 * - The PIN itself is NEVER stored. We keep only a PBKDF2 hash + random salt.
 * - Biometric is a local presence/user-verification gate via WebAuthn platform
 *   authenticator (works on HTTPS, e.g. GitHub Pages). It is not a server-verified
 *   assertion; it simply confirms the same device + verified user before unlocking.
 * - If the PIN is forgotten, data still lives in Firestore (when signed in): clear
 *   local storage and sign in again to restore. No local recovery is provided.
 */

const PIN_KEY = "med_lock_pin_v1"; // JSON: { salt, hash, iterations }
const WEBAUTHN_KEY = "med_lock_webauthn_v1"; // JSON: { credentialId }

const ITERATIONS = 120000;

interface PinRecord {
  salt: string; // base64
  hash: string; // base64
  iterations: number;
}

// ---------- base64 helpers ----------
function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function b64ToBuf(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

// ---------- PIN ----------
async function derive(pin: string, salt: ArrayBuffer, iterations: number): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return bufToB64(bits);
}

export function isPinSet(): boolean {
  try {
    return !!localStorage.getItem(PIN_KEY);
  } catch {
    return false;
  }
}

export async function setPin(pin: string): Promise<void> {
  const saltBuf = crypto.getRandomValues(new Uint8Array(16)).buffer;
  const hash = await derive(pin, saltBuf, ITERATIONS);
  const rec: PinRecord = { salt: bufToB64(saltBuf), hash, iterations: ITERATIONS };
  localStorage.setItem(PIN_KEY, JSON.stringify(rec));
}

export async function verifyPin(pin: string): Promise<boolean> {
  try {
    const raw = localStorage.getItem(PIN_KEY);
    if (!raw) return false;
    const rec = JSON.parse(raw) as PinRecord;
    const candidate = await derive(pin, b64ToBuf(rec.salt), rec.iterations || ITERATIONS);
    // constant-time-ish compare
    if (candidate.length !== rec.hash.length) return false;
    let diff = 0;
    for (let i = 0; i < candidate.length; i++) diff |= candidate.charCodeAt(i) ^ rec.hash.charCodeAt(i);
    return diff === 0;
  } catch {
    return false;
  }
}

export function clearPin(): void {
  try {
    localStorage.removeItem(PIN_KEY);
    localStorage.removeItem(WEBAUTHN_KEY);
  } catch {
    /* ignore */
  }
}

// ---------- WebAuthn (biometric) ----------
export function isWebAuthnSupported(): boolean {
  return typeof window !== "undefined" && !!window.PublicKeyCredential && !!navigator.credentials;
}

export function isBiometricEnabled(): boolean {
  try {
    return !!localStorage.getItem(WEBAUTHN_KEY);
  } catch {
    return false;
  }
}

/** Register a platform authenticator credential (call after PIN is set). */
export async function enableBiometric(displayName: string): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "MediTrack Pro", id: location.hostname },
        user: { id: userId, name: displayName || "user", displayName: displayName || "user" },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 }, // ES256
          { type: "public-key", alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;
    if (!cred) return false;
    localStorage.setItem(WEBAUTHN_KEY, JSON.stringify({ credentialId: bufToB64(cred.rawId) }));
    return true;
  } catch (e) {
    console.warn("enableBiometric failed:", e);
    return false;
  }
}

export function disableBiometric(): void {
  try {
    localStorage.removeItem(WEBAUTHN_KEY);
  } catch {
    /* ignore */
  }
}

/** Verify biometric to unlock. Returns true on success. */
export async function verifyBiometric(): Promise<boolean> {
  if (!isWebAuthnSupported() || !isBiometricEnabled()) return false;
  try {
    const raw = localStorage.getItem(WEBAUTHN_KEY);
    if (!raw) return false;
    const { credentialId } = JSON.parse(raw) as { credentialId: string };
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: location.hostname,
        allowCredentials: [{ type: "public-key", id: new Uint8Array(b64ToBuf(credentialId)) }],
        userVerification: "required",
        timeout: 60000,
      },
    });
    return !!assertion;
  } catch (e) {
    console.warn("verifyBiometric failed:", e);
    return false;
  }
}

/** Whether the app should start locked (a PIN has been configured). */
export function lockEnabled(): boolean {
  return isPinSet();
}
