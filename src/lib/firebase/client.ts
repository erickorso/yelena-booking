import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

function requirePublicEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and fill Firebase web config.`,
    );
  }
  return value;
}

/**
 * Browser / client Firebase app (public config only).
 */
export function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp({
    apiKey: requirePublicEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
    authDomain: requirePublicEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId: requirePublicEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    storageBucket: requirePublicEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: requirePublicEnv(
      "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    ),
    appId: requirePublicEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
  });
}

export function getClientAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getClientFirestore(): Firestore {
  return getFirestore(getFirebaseApp());
}

export function getClientStorage(): FirebaseStorage {
  return getStorage(getFirebaseApp());
}

/** True when public Firebase env vars are present (safe for UI gating). */
export function isFirebaseClientConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  );
}
