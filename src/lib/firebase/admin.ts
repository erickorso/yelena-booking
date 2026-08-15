import "server-only";

import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";

function requireAdminEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Set Admin SDK vars in .env.local (never expose to client).`,
    );
  }
  return value;
}

function buildCredential(): ServiceAccount {
  const privateKey = requireAdminEnv("FIREBASE_ADMIN_PRIVATE_KEY").replace(
    /\\n/g,
    "\n",
  );

  return {
    projectId: requireAdminEnv("FIREBASE_ADMIN_PROJECT_ID"),
    clientEmail: requireAdminEnv("FIREBASE_ADMIN_CLIENT_EMAIL"),
    privateKey,
  };
}

/**
 * Server-only Firebase Admin app. Never import from Client Components.
 */
export function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }

  return initializeApp({
    credential: cert(buildCredential()),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

/** Lazy import avoids jose/jwks-rsa ESM require() crash on Vercel. */
export async function getAdminAuth() {
  const { getAuth } = await import("firebase-admin/auth");
  return getAuth(getAdminApp());
}

export async function getAdminFirestore() {
  const { getFirestore } = await import("firebase-admin/firestore");
  return getFirestore(getAdminApp());
}

export async function getAdminStorage() {
  const { getStorage } = await import("firebase-admin/storage");
  return getStorage(getAdminApp());
}

export function isFirebaseAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_ADMIN_PROJECT_ID &&
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
      process.env.FIREBASE_ADMIN_PRIVATE_KEY,
  );
}
