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

// Use named firestore database if specified in config
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

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
      systemData: data,
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
