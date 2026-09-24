import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User,
  signInAnonymously
} from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { SystemData } from "../types";

// Initialize Firebase App (singleton)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Deep-remove undefined values before writing to Firestore.
function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefinedDeep(v)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = stripUndefinedDeep(v);
    }
    return out as T;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Firestore initialization — "Database is closing/hidden" fix
//
// Root cause: PWA autoUpdate reloads the page while the old Firestore instance
// is still closing. The new code calls initializeFirestore on an app that
// already has a terminating DB → Firebase throws "Database is closing/hidden".
//
// Fix: call initializeFirestore only ONCE per browser session (tracked via a
// window flag). Subsequent calls (hot-reload, SW update) use getFirestore which
// safely returns the already-configured existing instance.
// ---------------------------------------------------------------------------
const firestoreSettings = { ignoreUndefinedProperties: true } as const;
const FS_INIT_FLAG = "__mtp_fs_initialized__";

function buildDb() {
  // If we already ran initializeFirestore in this browser session, just return
  // the existing instance (avoids the "closing/hidden" race condition).
  if (typeof window !== "undefined" && (window as any)[FS_INIT_FLAG]) {
    return firebaseConfig.firestoreDatabaseId
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
  }
  try {
    const instance = firebaseConfig.firestoreDatabaseId
      ? initializeFirestore(app, firestoreSettings, firebaseConfig.firestoreDatabaseId)
      : initializeFirestore(app, firestoreSettings);
    if (typeof window !== "undefined") (window as any)[FS_INIT_FLAG] = true;
    return instance;
  } catch {
    // initializeFirestore already called — return existing instance
    if (typeof window !== "undefined") (window as any)[FS_INIT_FLAG] = true;
    return firebaseConfig.firestoreDatabaseId
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
  }
}

export const db = buildDb();

export const googleProvider = new GoogleAuthProvider();

// ---------------------------------------------------------------------------
// Google Sign-In
//
// signInWithPopup causes "Database is closing/hidden" on mobile because the
// browser hides the current page during the OAuth popup, which triggers
// Firebase's background-tab detection and starts terminating Firestore.
//
// Fix: use signInWithRedirect on mobile (page navigates away then back,
// Firestore reinitializes cleanly); keep popup on desktop where it works fine.
// ---------------------------------------------------------------------------
export const isMobileBrowser = (): boolean =>
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

export async function loginWithGoogle(): Promise<User | null> {
  try {
    if (isMobileBrowser()) {
      // Redirect flow: will navigate away — caller should not await a User return.
      // App.tsx handles the result via getRedirectResult in the auth listener.
      await signInWithRedirect(auth, googleProvider);
      return null; // navigation happens; this line is not reached in practice
    }
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    const msg = error?.message || String(error);
    console.error("Google sign in error:", error);
    throw new Error(`ไม่สามารถเข้าสู่ระบบด้วย Google ได้: ${msg}`);
  }
}

// Call this once on app mount to capture the result of a mobile redirect login.
export async function handleGoogleRedirectResult(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    return result?.user ?? null;
  } catch (error: any) {
    console.warn("getRedirectResult error:", error);
    return null;
  }
}

// Anonymous / Quick Guest Sign-In
export async function loginAsGuest(): Promise<User> {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error: any) {
    console.error("Guest sign in error:", error);
    throw error;
  }
}

// Sign Out
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

// Load User System Data from Firestore
export async function loadUserDataFromFirestore(userId: string): Promise<SystemData | null> {
  try {
    const userDocRef = doc(db, "users", userId);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return docSnap.data().systemData as SystemData;
    }
    return null;
  } catch (error) {
    console.error("Error loading user data from Firestore:", error);
    return null;
  }
}

// Load the full user doc (systemData + updatedAt) for recency comparison
export async function loadUserDocFromFirestore(
  userId: string
): Promise<{ systemData: SystemData | null; updatedAt?: string } | null> {
  try {
    const userDocRef = doc(db, "users", userId);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        systemData: (data.systemData as SystemData) ?? null,
        updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
      };
    }
    return null;
  } catch (error) {
    console.error("Error loading user doc from Firestore:", error);
    return null;
  }
}

// Save User System Data to Firestore
export async function saveUserDataToFirestore(
  userId: string,
  data: SystemData,
  userInfo?: { email?: string | null; displayName?: string | null }
): Promise<boolean> {
  try {
    const userDocRef = doc(db, "users", userId);
    await setDoc(
      userDocRef,
      {
        userId,
        email: userInfo?.email || "",
        displayName: userInfo?.displayName || "",
        systemData: stripUndefinedDeep(data),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.error("Error saving user data to Firestore:", error);
    return false;
  }
}

// Real-time listener (kept for future use — not active by default)
export function subscribeToUserData(
  userId: string,
  callback: (data: SystemData | null) => void
) {
  const userDocRef = doc(db, "users", userId);
  return onSnapshot(
    userDocRef,
    (docSnap) => {
      callback(docSnap.exists() ? (docSnap.data().systemData as SystemData) : null);
    },
    (error) => {
      console.error("Firestore real-time subscription error:", error);
    }
  );
}
