import type { AuthRole } from "./roles";

export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const SPECIALIST_STATUSES = [
  "pending",
  "active",
  "rejected",
] as const;

export type SpecialistStatus = (typeof SPECIALIST_STATUSES)[number];

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoUrl: string | null;
  role: AuthRole;
  locale: Locale;
  /**
   * IANA timezone for display (e.g. Europe/Madrid).
   * Optional until dual patient/specialist TZ lands fully.
   */
  timezone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SpecialistProfile {
  id: string;
  userId: string;
  specialty: string;
  bio: string;
  location: string;
  rating: number | null;
  status: SpecialistStatus;
  licenseNumber: string;
  /** Working timezone for slots (IANA). */
  timezone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" &&
    (LOCALES as readonly string[]).includes(value)
  );
}

export function isSpecialistStatus(value: unknown): value is SpecialistStatus {
  return (
    typeof value === "string" &&
    (SPECIALIST_STATUSES as readonly string[]).includes(value)
  );
}

export function isActiveSpecialist(
  status: SpecialistStatus | null | undefined,
): boolean {
  return status === "active";
}
