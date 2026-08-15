/**
 * Client-side Auth façade over Firebase Auth SDK.
 * UI must not import firebase/auth directly outside this module / AuthProvider.
 */
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
  type Unsubscribe,
  type ActionCodeSettings,
} from "firebase/auth";
import { getClientAuth } from "@/lib/firebase/client";
import type { AuthRole } from "@/types/domain";

export type BootstrapPayload = {
  role: Exclude<AuthRole, "admin">;
  displayName: string;
  locale?: "en" | "es";
  specialty?: string;
  licenseNumber?: string;
  bio?: string;
  location?: string;
};

const PENDING_BOOTSTRAP_KEY = "yelena.pendingBootstrap";

export function isPasswordProvider(user: User): boolean {
  return user.providerData.some((p) => p.providerId === "password");
}

/** Email/password users must verify; Google (and others) are already trusted. */
export function requiresEmailVerification(user: User): boolean {
  return isPasswordProvider(user) && !user.emailVerified;
}

export function savePendingBootstrap(payload: BootstrapPayload): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PENDING_BOOTSTRAP_KEY, JSON.stringify(payload));
}

export function readPendingBootstrap(): BootstrapPayload | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(PENDING_BOOTSTRAP_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BootstrapPayload;
  } catch {
    return null;
  }
}

export function clearPendingBootstrap(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PENDING_BOOTSTRAP_KEY);
}

function verificationSettings(continueUrl: string): ActionCodeSettings {
  return {
    url: continueUrl,
    handleCodeInApp: false,
  };
}

export async function signUpWithEmail(input: {
  email: string;
  password: string;
  displayName: string;
  continueUrl: string;
}): Promise<User> {
  const credential = await createUserWithEmailAndPassword(
    getClientAuth(),
    input.email,
    input.password,
  );
  await updateProfile(credential.user, { displayName: input.displayName });
  await sendEmailVerification(
    credential.user,
    verificationSettings(input.continueUrl),
  );
  return credential.user;
}

export async function resendEmailVerification(
  user: User,
  continueUrl: string,
): Promise<void> {
  await sendEmailVerification(user, verificationSettings(continueUrl));
}

export async function reloadUser(user: User): Promise<User> {
  await reload(user);
  const current = getClientAuth().currentUser ?? user;
  await current.getIdToken(true);
  return current;
}

export async function signInWithEmail(input: {
  email: string;
  password: string;
}): Promise<User> {
  const credential = await signInWithEmailAndPassword(
    getClientAuth(),
    input.email,
    input.password,
  );
  return credential.user;
}

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const credential = await signInWithPopup(getClientAuth(), provider);
  return credential.user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(getClientAuth());
}

export function subscribeToAuth(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(getClientAuth(), callback);
}

export async function getIdToken(
  user: User,
  forceRefresh = false,
): Promise<string> {
  return user.getIdToken(forceRefresh);
}

export async function getRoleClaim(user: User): Promise<AuthRole | null> {
  const token = await user.getIdTokenResult();
  const role = token.claims.role;
  if (role === "paciente" || role === "especialista" || role === "admin") {
    return role;
  }
  return null;
}

export async function bootstrapSession(
  user: User,
  payload: BootstrapPayload,
): Promise<void> {
  const idToken = await getIdToken(user, true);
  const response = await fetch("/api/auth/bootstrap", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(data?.error ?? "Bootstrap failed");
  }

  await getIdToken(user, true);
  clearPendingBootstrap();
}
