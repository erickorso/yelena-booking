/** Strip spaces/hyphens so "TE-D23E" and "TED23E" match the same. */
export function normalizePatientCodeQuery(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]/g, "");
}

export function matchesPatientQuery(
  query: string,
  patient: {
    displayName: string;
    email: string;
    patientNumber?: string | null;
  },
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (patient.displayName.toLowerCase().includes(q)) return true;
  if (patient.email.toLowerCase().includes(q)) return true;
  const num = (patient.patientNumber ?? "").trim().toLowerCase();
  if (!num) return false;
  if (num.includes(q)) return true;
  const qCompact = normalizePatientCodeQuery(q);
  const numCompact = normalizePatientCodeQuery(num);
  return qCompact.length >= 2 && numCompact.includes(qCompact);
}

/** Haystack for SearchableSelect (name, email, TE code ± hyphens). */
export function patientSearchBlob(patient: {
  displayName: string;
  email: string;
  patientNumber?: string | null;
}): string {
  const num = (patient.patientNumber ?? "").trim();
  return `${patient.displayName} ${patient.email} ${num} ${normalizePatientCodeQuery(num)}`;
}
