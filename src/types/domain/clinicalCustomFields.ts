export type ClinicalFieldLocale = "es" | "en";

export const CLINICAL_CUSTOM_FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "boolean",
  "date",
  "select",
] as const;

export type ClinicalCustomFieldType =
  (typeof CLINICAL_CUSTOM_FIELD_TYPES)[number];

export type ClinicalFieldAuditAction =
  | "created"
  | "updated"
  | "reordered"
  | "deleted";

export type ClinicalFieldAuditEntry = {
  at: Date;
  byUserId: string;
  action: ClinicalFieldAuditAction;
  fieldId: string;
  detail?: string;
};

/**
 * Specialist-owned chart question (definitions live only on that specialist).
 */
export interface ClinicalCustomFieldDef {
  id: string;
  /** Stable slug for storage/debug; values keyed by `id`. */
  fieldKey: string;
  labels: Partial<Record<ClinicalFieldLocale, string>>;
  type: ClinicalCustomFieldType;
  required: boolean;
  /** Select options (required when type === "select"). */
  options: string[];
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  updatedById: string;
  /** Soft-delete while cascading purge of stored values; omitted when active. */
  deletedAt?: Date;
}

export type ClinicalCustomFieldInput = {
  label: string;
  locale: ClinicalFieldLocale;
  type?: ClinicalCustomFieldType;
  required?: boolean;
  options?: string[];
};

export function isClinicalFieldLocale(
  value: unknown,
): value is ClinicalFieldLocale {
  return value === "es" || value === "en";
}

export function isClinicalCustomFieldType(
  value: unknown,
): value is ClinicalCustomFieldType {
  return (
    typeof value === "string" &&
    (CLINICAL_CUSTOM_FIELD_TYPES as readonly string[]).includes(value)
  );
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

export function normalizeFieldOptions(options: unknown): string[] {
  if (!Array.isArray(options)) return [];
  const out: string[] = [];
  for (const item of options) {
    if (typeof item !== "string") continue;
    const t = item.trim();
    if (t && !out.includes(t)) out.push(t.slice(0, 80));
  }
  return out.slice(0, 30);
}

/**
 * Validate a stored custom value against its definition.
 * Returns normalized string or throws.
 */
export function validateCustomFieldValue(
  field: ClinicalCustomFieldDef,
  raw: unknown,
): string {
  const value = typeof raw === "string" ? raw.trim() : raw === null || raw === undefined ? "" : String(raw).trim();

  if (!value) {
    if (field.required) {
      throw new Error(`Field "${field.fieldKey}" is required`);
    }
    return "";
  }

  switch (field.type) {
    case "number": {
      if (!/^-?\d+(\.\d+)?$/.test(value)) {
        throw new Error(`Field "${field.fieldKey}" must be a number`);
      }
      return value;
    }
    case "boolean": {
      const lower = value.toLowerCase();
      if (lower === "true" || lower === "1" || lower === "yes" || lower === "si" || lower === "sí") {
        return "true";
      }
      if (lower === "false" || lower === "0" || lower === "no") {
        return "false";
      }
      throw new Error(`Field "${field.fieldKey}" must be yes/no`);
    }
    case "date": {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error(`Field "${field.fieldKey}" must be YYYY-MM-DD`);
      }
      const d = new Date(`${value}T00:00:00.000Z`);
      if (Number.isNaN(d.getTime())) {
        throw new Error(`Field "${field.fieldKey}" has an invalid date`);
      }
      return value;
    }
    case "select": {
      if (!field.options.includes(value)) {
        throw new Error(`Field "${field.fieldKey}" must be one of the options`);
      }
      return value;
    }
    case "text":
      return value.slice(0, 500);
    case "textarea":
      return value.slice(0, 4000);
    default:
      return value.slice(0, 500);
  }
}

export function validateCustomValuesMap(
  fields: ClinicalCustomFieldDef[],
  values: Record<string, string>,
): Record<string, string> {
  const byId = new Map(fields.map((f) => [f.id, f]));
  const out: Record<string, string> = {};
  for (const field of fields) {
    out[field.id] = validateCustomFieldValue(field, values[field.id] ?? "");
  }
  // Drop keys that no longer belong to this specialist's schema
  // (callers may still merge other specialists' keys at persistence layer).
  for (const [id, raw] of Object.entries(values)) {
    if (byId.has(id)) continue;
    if (typeof raw === "string" && raw.trim()) {
      // Keep foreign specialist keys untouched when patient saves mixed chart.
      out[id] = raw.trim();
    }
  }
  return out;
}
