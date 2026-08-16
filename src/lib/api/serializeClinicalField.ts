import {
  missingCustomFieldLocales,
  resolveCustomFieldLabel,
  type ClinicalCustomFieldDef,
} from "@/types/domain";

/** Public/API DTO for a clinical custom field definition. */
export function serializeClinicalField(
  field: ClinicalCustomFieldDef,
  locale: string,
  options?: { includeAudit?: boolean },
) {
  const base = {
    id: field.id,
    fieldKey: field.fieldKey,
    labels: field.labels,
    label: resolveCustomFieldLabel(field, locale),
    type: field.type,
    required: field.required,
    options: field.options,
    sortOrder: field.sortOrder,
    missingLocales: missingCustomFieldLocales(field),
  };
  if (!options?.includeAudit) return base;
  return {
    ...base,
    createdAt: field.createdAt.toISOString(),
    updatedAt: field.updatedAt.toISOString(),
    createdById: field.createdById || null,
    updatedById: field.updatedById || null,
  };
}
