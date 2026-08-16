import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { randomUUID } from "crypto";
import { getAdminFirestore } from "@/lib/firebase/admin";
import type {
  ClinicalCustomFieldDef,
  ClinicalFieldLocale,
} from "@/types/domain";
import { slugifyFieldKey } from "@/types/domain";

const COLLECTION = "specialistClinicalFieldSchemas";

type FieldDoc = {
  id?: unknown;
  fieldKey?: unknown;
  labels?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

function toDate(value: unknown, fallback = new Date()): Date {
  if (value instanceof Date) return value;
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return fallback;
}

function adaptField(raw: FieldDoc): ClinicalCustomFieldDef | null {
  if (typeof raw.id !== "string" || !raw.id.trim()) return null;
  const labelsRaw =
    raw.labels && typeof raw.labels === "object"
      ? (raw.labels as Record<string, unknown>)
      : {};
  const labels: ClinicalCustomFieldDef["labels"] = {};
  if (typeof labelsRaw.es === "string" && labelsRaw.es.trim()) {
    labels.es = labelsRaw.es.trim();
  }
  if (typeof labelsRaw.en === "string" && labelsRaw.en.trim()) {
    labels.en = labelsRaw.en.trim();
  }
  if (!labels.es && !labels.en) return null;
  const fieldKey =
    typeof raw.fieldKey === "string" && raw.fieldKey.trim()
      ? raw.fieldKey.trim()
      : slugifyFieldKey(labels.es || labels.en || "campo");
  return {
    id: raw.id,
    fieldKey,
    labels,
    createdAt: toDate(raw.createdAt),
    updatedAt: toDate(raw.updatedAt),
  };
}

/**
 * Per-specialist custom clinical history field definitions.
 */
export class AdminSpecialistClinicalFieldsRepository {
  private async db() {
    return getAdminFirestore();
  }

  async list(specialistId: string): Promise<ClinicalCustomFieldDef[]> {
    const snap = await (await this.db())
      .collection(COLLECTION)
      .doc(specialistId)
      .get();
    if (!snap.exists) return [];
    const data = snap.data() ?? {};
    const raw = Array.isArray(data.fields) ? data.fields : [];
    return raw
      .map((item) => adaptField((item ?? {}) as FieldDoc))
      .filter((f): f is ClinicalCustomFieldDef => f !== null)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async listForSpecialists(
    specialistIds: string[],
  ): Promise<ClinicalCustomFieldDef[]> {
    const unique = [...new Set(specialistIds.filter(Boolean))];
    const lists = await Promise.all(unique.map((id) => this.list(id)));
    const byId = new Map<string, ClinicalCustomFieldDef>();
    for (const list of lists) {
      for (const field of list) byId.set(field.id, field);
    }
    return [...byId.values()].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
  }

  async addField(
    specialistId: string,
    input: { label: string; locale: ClinicalFieldLocale },
  ): Promise<ClinicalCustomFieldDef> {
    const label = input.label.trim();
    if (!label) throw new Error("label is required");
    const existing = await this.list(specialistId);
    const id = randomUUID();
    const fieldKey = uniqueKey(
      slugifyFieldKey(label),
      existing.map((f) => f.fieldKey),
    );
    const now = new Date();
    const field: ClinicalCustomFieldDef = {
      id,
      fieldKey,
      labels: { [input.locale]: label },
      createdAt: now,
      updatedAt: now,
    };
    await this.save(specialistId, [...existing, field]);
    return field;
  }

  async setLabel(
    specialistId: string,
    fieldId: string,
    locale: ClinicalFieldLocale,
    label: string,
  ): Promise<ClinicalCustomFieldDef> {
    const trimmed = label.trim();
    if (!trimmed) throw new Error("label is required");
    const existing = await this.list(specialistId);
    const idx = existing.findIndex((f) => f.id === fieldId);
    if (idx < 0) throw new Error("Field not found");
    const current = existing[idx]!;
    const updated: ClinicalCustomFieldDef = {
      ...current,
      labels: { ...current.labels, [locale]: trimmed },
      updatedAt: new Date(),
    };
    const next = [...existing];
    next[idx] = updated;
    await this.save(specialistId, next);
    return updated;
  }

  private async save(
    specialistId: string,
    fields: ClinicalCustomFieldDef[],
  ): Promise<void> {
    const ref = (await this.db()).collection(COLLECTION).doc(specialistId);
    await ref.set(
      {
        specialistId,
        fields: fields.map((f) => ({
          id: f.id,
          fieldKey: f.fieldKey,
          labels: f.labels,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt,
        })),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
}

function uniqueKey(base: string, used: string[]): string {
  if (!used.includes(base)) return base;
  let i = 2;
  while (used.includes(`${base}_${i}`)) i += 1;
  return `${base}_${i}`;
}
