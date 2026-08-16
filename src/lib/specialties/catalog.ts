/**
 * Canonical specialty labels for matching (one active booking per specialty).
 */
export const DEFAULT_SPECIALTIES = [
  "Medicina general",
  "Medicina interna",
  "Cardiología",
  "Dermatología",
  "Endocrinología",
  "Gastroenterología",
  "Ginecología y obstetricia",
  "Hematología",
  "Neumología",
  "Nefrología",
  "Neurología",
  "Nutrición",
  "Odontología",
  "Oftalmología",
  "Oncología",
  "Otorrinolaringología",
  "Pediatría",
  "Psicología",
  "Psiquiatría",
  "Reumatología",
  "Traumatología y ortopedia",
  "Urología",
  "Fisioterapia",
  "Terapia ocupacional",
  "Fonoaudiología",
  "Enfermería",
] as const;

export function normalizeSpecialty(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/** Prefer catalog spelling when the normalized form matches. */
export function canonicalizeSpecialty(
  input: string,
  catalog: readonly string[],
): string {
  const trimmed = input.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  const norm = normalizeSpecialty(trimmed);
  const hit = catalog.find((s) => normalizeSpecialty(s) === norm);
  if (hit) return hit;
  return trimmed.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function mergeSpecialtyCatalog(
  defaults: readonly string[],
  custom: string[],
): string[] {
  const byNorm = new Map<string, string>();
  for (const name of defaults) {
    byNorm.set(normalizeSpecialty(name), name);
  }
  for (const name of custom) {
    const n = normalizeSpecialty(name);
    if (!n) continue;
    if (!byNorm.has(n)) byNorm.set(n, name.trim());
  }
  return [...byNorm.values()].sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base" }),
  );
}
