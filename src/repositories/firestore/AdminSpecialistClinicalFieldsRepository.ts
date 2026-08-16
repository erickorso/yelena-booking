import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { randomUUID } from "crypto";
import { getAdminFirestore } from "@/lib/firebase/admin";
import type {
  ClinicalCustomFieldDef,
  ClinicalCustomFieldType,
  ClinicalFieldAuditEntry,
  ClinicalFieldLocale,
} from "@/types/domain";
import {
  isClinicalCustomFieldType,
  normalizeFieldOptions,
  slugifyFieldKey,
} from "@/types/domain";

const COLLECTION = "specialistClinicalFieldSchemas";
const AUDIT_CAP = 80;

type FieldDoc = {
  id?: unknown;
  fieldKey?: unknown;
  labels?: unknown;
  type?: unknown;
  required?: unknown;
  options?: unknown;
  sortOrder?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdById?: unknown;
  updatedById?: unknown;
  deletedAt?: unknown;
};

type AuditDoc = {
  at?: unknown;
  byUserId?: unknown;
  action?: unknown;
  fieldId?: unknown;
  detail?: unknown;
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

function adaptField(raw: FieldDoc, index: number): ClinicalCustomFieldDef | null {
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
  const deletedAt =
    raw.deletedAt === undefined || raw.deletedAt === null
      ? undefined
      : toDate(raw.deletedAt);
  const type: ClinicalCustomFieldType = isClinicalCustomFieldType(raw.type)
    ? raw.type
    : "textarea";
  const createdById =
    typeof raw.createdById === "string" ? raw.createdById : "";
  const updatedById =
    typeof raw.updatedById === "string" ? raw.updatedById : createdById;
  return {
    id: raw.id,
    fieldKey,
    labels,
    type,
    required: raw.required === true,
    options: normalizeFieldOptions(raw.options),
    sortOrder:
      typeof raw.sortOrder === "number" && Number.isFinite(raw.sortOrder)
        ? raw.sortOrder
        : index,
    createdAt: toDate(raw.createdAt),
    updatedAt: toDate(raw.updatedAt),
    createdById,
    updatedById,
    ...(deletedAt ? { deletedAt } : {}),
  };
}

function adaptAudit(raw: AuditDoc): ClinicalFieldAuditEntry | null {
  if (typeof raw.byUserId !== "string" || !raw.byUserId.trim()) return null;
  if (typeof raw.fieldId !== "string" || !raw.fieldId.trim()) return null;
  const action = raw.action;
  if (
    action !== "created" &&
    action !== "updated" &&
    action !== "reordered" &&
    action !== "deleted"
  ) {
    return null;
  }
  return {
    at: toDate(raw.at),
    byUserId: raw.byUserId,
    action,
    fieldId: raw.fieldId,
    detail: typeof raw.detail === "string" ? raw.detail : undefined,
  };
}

function serializeField(f: ClinicalCustomFieldDef) {
  return {
    id: f.id,
    fieldKey: f.fieldKey,
    labels: f.labels,
    type: f.type,
    required: f.required,
    options: f.options,
    sortOrder: f.sortOrder,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
    createdById: f.createdById,
    updatedById: f.updatedById,
    ...(f.deletedAt ? { deletedAt: f.deletedAt } : {}),
  };
}

/**
 * Per-specialist custom clinical history field definitions (+ audit trail).
 */
export class AdminSpecialistClinicalFieldsRepository {
  private async db() {
    return getAdminFirestore();
  }

  /** Active fields only (excludes soft-deleted), sorted by sortOrder. */
  async list(specialistId: string): Promise<ClinicalCustomFieldDef[]> {
    return (await this.listAll(specialistId))
      .filter((f) => !f.deletedAt)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime());
  }

  async listAll(specialistId: string): Promise<ClinicalCustomFieldDef[]> {
    const snap = await (await this.db())
      .collection(COLLECTION)
      .doc(specialistId)
      .get();
    if (!snap.exists) return [];
    const data = snap.data() ?? {};
    const raw = Array.isArray(data.fields) ? data.fields : [];
    return raw
      .map((item, index) => adaptField((item ?? {}) as FieldDoc, index))
      .filter((f): f is ClinicalCustomFieldDef => f !== null);
  }

  async listAudit(specialistId: string): Promise<ClinicalFieldAuditEntry[]> {
    const snap = await (await this.db())
      .collection(COLLECTION)
      .doc(specialistId)
      .get();
    if (!snap.exists) return [];
    const data = snap.data() ?? {};
    const raw = Array.isArray(data.auditLog) ? data.auditLog : [];
    return raw
      .map((item) => adaptAudit((item ?? {}) as AuditDoc))
      .filter((e): e is ClinicalFieldAuditEntry => e !== null)
      .sort((a, b) => b.at.getTime() - a.at.getTime());
  }

  /**
   * Merge fields from several specialists (patient chart view only).
   * Each field still belongs to one specialist schema.
   */
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
      (a, b) => a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime(),
    );
  }

  async addField(
    specialistId: string,
    actorId: string,
    input: {
      label: string;
      locale: ClinicalFieldLocale;
      type?: ClinicalCustomFieldType;
      required?: boolean;
      options?: string[];
    },
  ): Promise<ClinicalCustomFieldDef> {
    const label = input.label.trim();
    if (!label) throw new Error("label is required");
    const type = input.type ?? "textarea";
    if (!isClinicalCustomFieldType(type)) throw new Error("Invalid field type");
    const options = normalizeFieldOptions(input.options);
    if (type === "select" && options.length < 2) {
      throw new Error("select fields need at least 2 options");
    }
    const existing = await this.listAll(specialistId);
    const active = existing.filter((f) => !f.deletedAt);
    const id = randomUUID();
    const fieldKey = uniqueKey(
      slugifyFieldKey(label),
      active.map((f) => f.fieldKey),
    );
    const now = new Date();
    const maxOrder = active.reduce((m, f) => Math.max(m, f.sortOrder), -1);
    const field: ClinicalCustomFieldDef = {
      id,
      fieldKey,
      labels: { [input.locale]: label },
      type,
      required: input.required === true,
      options: type === "select" ? options : [],
      sortOrder: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
      createdById: actorId,
      updatedById: actorId,
    };
    await this.save(specialistId, [...existing, field], [
      {
        at: now,
        byUserId: actorId,
        action: "created",
        fieldId: id,
        detail: `${type}:${fieldKey}`,
      },
    ]);
    return field;
  }

  async setLabel(
    specialistId: string,
    actorId: string,
    fieldId: string,
    locale: ClinicalFieldLocale,
    label: string,
  ): Promise<ClinicalCustomFieldDef> {
    const trimmed = label.trim();
    if (!trimmed) throw new Error("label is required");
    return this.patchField(specialistId, actorId, fieldId, (current) => ({
      ...current,
      labels: { ...current.labels, [locale]: trimmed },
      updatedAt: new Date(),
      updatedById: actorId,
    }), `label:${locale}`);
  }

  async updateLabels(
    specialistId: string,
    actorId: string,
    fieldId: string,
    labels: Partial<Record<ClinicalFieldLocale, string>>,
  ): Promise<ClinicalCustomFieldDef> {
    return this.patchField(specialistId, actorId, fieldId, (current) => {
      const nextLabels: ClinicalCustomFieldDef["labels"] = { ...current.labels };
      if (typeof labels.es === "string") {
        const t = labels.es.trim();
        if (t) nextLabels.es = t;
        else delete nextLabels.es;
      }
      if (typeof labels.en === "string") {
        const t = labels.en.trim();
        if (t) nextLabels.en = t;
        else delete nextLabels.en;
      }
      if (!nextLabels.es?.trim() && !nextLabels.en?.trim()) {
        throw new Error("At least one label (es or en) is required");
      }
      return {
        ...current,
        labels: nextLabels,
        updatedAt: new Date(),
        updatedById: actorId,
      };
    }, "labels");
  }

  async updateFieldMeta(
    specialistId: string,
    actorId: string,
    fieldId: string,
    patch: {
      type?: ClinicalCustomFieldType;
      required?: boolean;
      options?: string[];
    },
  ): Promise<ClinicalCustomFieldDef> {
    return this.patchField(specialistId, actorId, fieldId, (current) => {
      const type = patch.type ?? current.type;
      if (!isClinicalCustomFieldType(type)) throw new Error("Invalid field type");
      const options =
        patch.options !== undefined
          ? normalizeFieldOptions(patch.options)
          : current.options;
      if (type === "select" && options.length < 2) {
        throw new Error("select fields need at least 2 options");
      }
      return {
        ...current,
        type,
        required:
          patch.required !== undefined ? patch.required === true : current.required,
        options: type === "select" ? options : [],
        updatedAt: new Date(),
        updatedById: actorId,
      };
    }, "meta");
  }

  async reorderFields(
    specialistId: string,
    actorId: string,
    orderedIds: string[],
  ): Promise<ClinicalCustomFieldDef[]> {
    const all = await this.listAll(specialistId);
    const active = all.filter((f) => !f.deletedAt);
    const soft = all.filter((f) => f.deletedAt);
    if (orderedIds.length !== active.length) {
      throw new Error("order must include every active field exactly once");
    }
    const byId = new Map(active.map((f) => [f.id, f]));
    const nextActive: ClinicalCustomFieldDef[] = [];
    const seen = new Set<string>();
    const now = new Date();
    for (const [index, id] of orderedIds.entries()) {
      if (seen.has(id)) throw new Error("duplicate field id in order");
      const field = byId.get(id);
      if (!field) throw new Error("unknown field id in order");
      seen.add(id);
      nextActive.push({
        ...field,
        sortOrder: index,
        updatedAt: now,
        updatedById: actorId,
      });
    }
    await this.save(specialistId, [...nextActive, ...soft], [
      {
        at: now,
        byUserId: actorId,
        action: "reordered",
        fieldId: "*",
        detail: orderedIds.join(","),
      },
    ]);
    return nextActive;
  }

  async markFieldDeleted(
    specialistId: string,
    actorId: string,
    fieldId: string,
  ): Promise<"marked" | "already_deleted"> {
    const all = await this.listAll(specialistId);
    const idx = all.findIndex((f) => f.id === fieldId);
    if (idx < 0) throw new Error("Field not found");
    if (all[idx].deletedAt) return "already_deleted";
    const now = new Date();
    const next = [...all];
    next[idx] = {
      ...all[idx],
      deletedAt: now,
      updatedAt: now,
      updatedById: actorId,
    };
    await this.save(specialistId, next, [
      {
        at: now,
        byUserId: actorId,
        action: "deleted",
        fieldId,
      },
    ]);
    return "marked";
  }

  async removeFieldHard(
    specialistId: string,
    fieldId: string,
  ): Promise<boolean> {
    const all = await this.listAll(specialistId);
    const next = all.filter((f) => f.id !== fieldId);
    if (next.length === all.length) return false;
    await this.save(specialistId, next, []);
    return true;
  }

  private async patchField(
    specialistId: string,
    actorId: string,
    fieldId: string,
    mutator: (current: ClinicalCustomFieldDef) => ClinicalCustomFieldDef,
    detail: string,
  ): Promise<ClinicalCustomFieldDef> {
    const all = await this.listAll(specialistId);
    const idx = all.findIndex((f) => f.id === fieldId && !f.deletedAt);
    if (idx < 0) throw new Error("Field not found");
    const updated = mutator(all[idx]!);
    const next = [...all];
    next[idx] = updated;
    await this.save(specialistId, next, [
      {
        at: new Date(),
        byUserId: actorId,
        action: "updated",
        fieldId,
        detail,
      },
    ]);
    return updated;
  }

  private async save(
    specialistId: string,
    fields: ClinicalCustomFieldDef[],
    auditAppend: ClinicalFieldAuditEntry[],
  ): Promise<void> {
    const ref = (await this.db()).collection(COLLECTION).doc(specialistId);
    const snap = await ref.get();
    const prevAudit = Array.isArray(snap.data()?.auditLog)
      ? (snap.data()?.auditLog as AuditDoc[])
          .map((item) => adaptAudit(item ?? {}))
          .filter((e): e is ClinicalFieldAuditEntry => e !== null)
      : [];
    const auditLog = [...auditAppend, ...prevAudit]
      .slice(0, AUDIT_CAP)
      .map((e) => ({
        at: e.at,
        byUserId: e.byUserId,
        action: e.action,
        fieldId: e.fieldId,
        ...(e.detail ? { detail: e.detail } : {}),
      }));

    await ref.set(
      {
        specialistId,
        fields: fields.map(serializeField),
        auditLog,
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
