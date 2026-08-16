import { z } from "zod";

export const clinicalFieldLocaleSchema = z.enum(["es", "en"]);

const fieldTypes = [
  "text",
  "textarea",
  "number",
  "boolean",
  "date",
  "select",
] as const;

export const createClinicalFieldSchema = z.object({
  label: z.string().trim().min(1).max(120),
  locale: clinicalFieldLocaleSchema.optional().default("es"),
  type: z.enum(fieldTypes).optional().default("textarea"),
  required: z.boolean().optional().default(false),
  options: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
});

export const patchClinicalFieldSchema = z
  .object({
    fieldId: z.string().trim().min(1).optional(),
    locale: clinicalFieldLocaleSchema.optional(),
    label: z.string().trim().min(1).max(120).optional(),
    labels: z
      .object({
        es: z.string().optional(),
        en: z.string().optional(),
      })
      .optional(),
    type: z.enum(fieldTypes).optional(),
    required: z.boolean().optional(),
    options: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
    order: z.array(z.string().trim().min(1)).optional(),
  })
  .refine(
    (b) =>
      Boolean(b.order) ||
      Boolean(b.fieldId) ||
      Boolean(b.labels) ||
      Boolean(b.label),
    { message: "fieldId or order required" },
  );

export type CreateClinicalFieldInput = z.infer<typeof createClinicalFieldSchema>;
