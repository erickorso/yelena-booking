/** Default tenant for single-clinic v1 (multi-tenant light). */
export const DEFAULT_CLINIC_ID = "yelena";

export function resolveClinicId(
  claimOrProfile?: string | null,
): string {
  const raw = claimOrProfile?.trim();
  return raw && raw.length > 0 ? raw : DEFAULT_CLINIC_ID;
}
