import type { SpecialistProfile, SpecialistStatus } from "@/types/domain";
import { requireString, toDate } from "./helpers";

const STATUSES: readonly SpecialistStatus[] = [
  "pending",
  "active",
  "rejected",
];

export interface SpecialistProfileDoc {
  userId?: unknown;
  specialty?: unknown;
  bio?: unknown;
  location?: unknown;
  rating?: unknown;
  status?: unknown;
  licenseNumber?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

function isSpecialistStatus(value: unknown): value is SpecialistStatus {
  return (
    typeof value === "string" &&
    (STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Adapts a raw Firestore specialist document into SpecialistProfile.
 */
export function adaptSpecialistProfile(
  id: string,
  data: SpecialistProfileDoc,
): SpecialistProfile {
  if (!isSpecialistStatus(data.status)) {
    throw new Error(`Invalid specialist status on ${id}`);
  }

  const rating =
    data.rating === null || data.rating === undefined
      ? null
      : typeof data.rating === "number"
        ? data.rating
        : (() => {
            throw new Error(`Invalid rating on specialist ${id}`);
          })();

  return {
    id,
    userId: requireString(data.userId, "userId"),
    specialty: requireString(data.specialty, "specialty"),
    bio: typeof data.bio === "string" ? data.bio : "",
    location: typeof data.location === "string" ? data.location : "",
    rating,
    status: data.status,
    licenseNumber: requireString(data.licenseNumber, "licenseNumber"),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}
