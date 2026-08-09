import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
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

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Initialize Firestore with ignoreUndefinedProperties so that records containing
// undefined fields (e.g. optional lab values that weren't filled in) don't throw
// "Unsupported field value: undefined" and silently fail the cloud save.
const firestoreSettings = { ignoreUndefinedProperties: true } as const;
let dbInstance;
try {
  dbInstance = firebaseConfig.firestoreDatabaseId
    ? initializeFirestore(app, firestoreSettings, firebaseConfig.firestoreDatabaseId)
    : initializeFirestore(app, firestoreSettings);
} catch {
  // Already initialized (e.g. hot reload) — fall back to the existing instance.
  dbInstance = firebaseConfig.firestoreDatabaseId
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);
}
export const db = dbInstance;

// Deep-remove undefined values as a second line of defence before writing to Firestore.
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

export const googleProvider = new GoogleAuthProvider();

// Google Sign-In
export async function loginWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Google sign in error:", error);
    throw error;
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
      const data = docSnap.data();
      return data.systemData as SystemData;
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
    await setDoc(userDocRef, {
      userId,
      email: userInfo?.email || "",
      displayName: userInfo?.displayName || "",
      systemData: stripUndefinedDeep(data),
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error saving user data to Firestore:", error);
    return false;
  }
}

// Listen for real-time changes to user data
export function subscribeToUserData(userId: string, callback: (data: SystemData | null) => void) {
  const userDocRef = doc(db, "users", userId);
  return onSnapshot(userDocRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      callback(data.systemData as SystemData);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error("Firestore real-time subscription error:", error);
  });
}
