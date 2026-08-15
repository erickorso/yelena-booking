import type { UserProfile, AuthRole } from "@/types/domain";
import { isAuthRole } from "@/types/domain";
import { optionalString, requireString, toDate } from "./helpers";

export interface UserProfileDoc {
  email?: unknown;
  displayName?: unknown;
  photoUrl?: unknown;
  role?: unknown;
  locale?: unknown;
  timezone?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

/**
 * Adapts a raw Firestore user document into a domain UserProfile.
 */
export function adaptUserProfile(
  id: string,
  data: UserProfileDoc,
): UserProfile {
  const role = data.role;
  if (!isAuthRole(role)) {
    throw new Error(`Invalid role on user ${id}`);
  }

  const locale = data.locale === "en" || data.locale === "es" ? data.locale : "es";

  return {
    id,
    email: requireString(data.email, "email"),
    displayName: requireString(data.displayName, "displayName"),
    photoUrl: optionalString(data.photoUrl),
    role: role as AuthRole,
    locale,
    timezone: optionalString(data.timezone ?? null),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}
