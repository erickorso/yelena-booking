export type ClinicalFieldLocale = "es" | "en";

/**
 * Specialist-defined chart question (definition lives on the specialist).
 */
export interface ClinicalCustomFieldDef {
  id: string;
  /** Stable slug for storage/debug; values keyed by `id`. */
  fieldKey: string;
  labels: Partial<Record<ClinicalFieldLocale, string>>;
  createdAt: Date;
  updatedAt: Date;
}

export type ClinicalCustomFieldInput = {
  label: string;
  locale: ClinicalFieldLocale;
};

export function isClinicalFieldLocale(
  value: unknown,
): value is ClinicalFieldLocale {
  return value === "es" || value === "en";
}

export function slugifyFieldKey(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return base || "campo";
}

export function resolveCustomFieldLabel(
  field: ClinicalCustomFieldDef,
  locale: string,
): string {
  const loc = locale.startsWith("en") ? "en" : "es";
  const other: ClinicalFieldLocale = loc === "es" ? "en" : "es";
  const primary = field.labels[loc]?.trim();
  if (primary) return primary;
  const fallback = field.labels[other]?.trim();
  if (fallback) return fallback;
  return field.fieldKey;
}

/** Locale missing a non-empty label. */
export function missingCustomFieldLocales(
  field: ClinicalCustomFieldDef,
): ClinicalFieldLocale[] {
  const missing: ClinicalFieldLocale[] = [];
  if (!field.labels.es?.trim()) missing.push("es");
  if (!field.labels.en?.trim()) missing.push("en");
  return missing;
}

export function toClinicalFieldLocale(locale: string): ClinicalFieldLocale {
  return locale.startsWith("en") ? "en" : "es";
}
