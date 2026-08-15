import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

/**
 * Next.js only inlines NEXT_PUBLIC_* with static property access.
 * Dynamic `process.env[name]` is undefined in the browser bundle.
 */
function readPublicFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

/**
 * Browser / client Firebase app (public config only).
 */
export function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }

  const config = readPublicFirebaseConfig();
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing Firebase public config (${missing.join(", ")}). Check .env.local and restart next dev.`,
    );
  }

  return initializeApp({
    apiKey: config.apiKey!,
    authDomain: config.authDomain!,
    projectId: config.projectId!,
    storageBucket: config.storageBucket!,
    messagingSenderId: config.messagingSenderId!,
    appId: config.appId!,
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
  const config = readPublicFirebaseConfig();
  return Boolean(config.apiKey && config.projectId && config.appId);
}
