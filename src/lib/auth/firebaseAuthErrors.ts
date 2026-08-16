/**
 * Maps Firebase Auth SDK errors to Auth.errors.* i18n keys (no raw Firebase text).
 */
export type AuthErrorKey =
  | "generic"
  | "invalidEmail"
  | "invalidCredential"
  | "userDisabled"
  | "tooManyRequests"
  | "emailInUse"
  | "weakPassword"
  | "popupClosed"
  | "network"
  | "emailNotVerified";

const CODE_TO_KEY: Record<string, AuthErrorKey> = {
  "auth/invalid-email": "invalidEmail",
  "auth/missing-email": "invalidEmail",
  "auth/invalid-credential": "invalidCredential",
  "auth/wrong-password": "invalidCredential",
  "auth/user-not-found": "invalidCredential",
  "auth/user-disabled": "userDisabled",
  "auth/too-many-requests": "tooManyRequests",
  "auth/email-already-in-use": "emailInUse",
  "auth/weak-password": "weakPassword",
  "auth/popup-closed-by-user": "popupClosed",
  "auth/cancelled-popup-request": "popupClosed",
  "auth/network-request-failed": "network",
};

export function getFirebaseAuthErrorCode(error: unknown): string | null {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }
  const message = error instanceof Error ? error.message : String(error ?? "");
  const match = message.match(/auth\/[\w-]+/);
  return match?.[0] ?? null;
}

export function mapFirebaseAuthErrorKey(error: unknown): AuthErrorKey {
  if (error instanceof Error && error.message === "EMAIL_NOT_VERIFIED") {
    return "emailNotVerified";
  }
  const code = getFirebaseAuthErrorCode(error);
  if (code && CODE_TO_KEY[code]) return CODE_TO_KEY[code];
  return "generic";
}
