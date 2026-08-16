import { createHash } from "crypto";

/**
 * Stable unique patient number from Firebase uid (deterministic hash).
 * Format: TE-XXXX-XXXXXX
 */
export function derivePatientNumber(userId: string): string {
  const hash = createHash("sha256")
    .update(`thaydee-elena:patient:${userId}`)
    .digest("hex")
    .toUpperCase();
  const compact = hash.slice(0, 10);
  return `TE-${compact.slice(0, 4)}-${compact.slice(4)}`;
}
