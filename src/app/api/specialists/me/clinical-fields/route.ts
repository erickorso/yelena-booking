import { NextResponse } from "next/server";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { AdminSpecialistClinicalFieldsRepository } from "@/repositories/firestore/AdminSpecialistClinicalFieldsRepository";
import { AdminClinicalHistoryRepository } from "@/repositories/firestore/AdminClinicalHistoryRepository";
import { AdminUserRepository } from "@/repositories/firestore/AdminUserRepository";
import {
  canActAsSpecialist,
  isClinicalCustomFieldType,
  isClinicalFieldLocale,
  missingCustomFieldLocales,
  resolveCustomFieldLabel,
  type AuthRole,
  type ClinicalCustomFieldDef,
} from "@/types/domain";

export const runtime = "nodejs";

function serializeField(field: ClinicalCustomFieldDef, locale: string) {
  return {
    id: field.id,
    fieldKey: field.fieldKey,
    labels: field.labels,
    label: resolveCustomFieldLabel(field, locale),
    type: field.type,
    required: field.required,
    options: field.options,
    sortOrder: field.sortOrder,
    missingLocales: missingCustomFieldLocales(field),
    createdAt: field.createdAt.toISOString(),
    updatedAt: field.updatedAt.toISOString(),
    createdById: field.createdById || null,
    updatedById: field.updatedById || null,
  };
}

async function assertActiveSpecialist(uid: string, role: AuthRole) {
  if (!canActAsSpecialist(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (role === "especialista") {
    const me = await new AdminUserRepository().getSpecialistByUserId(uid);
    if (!me || me.status !== "active") {
      return NextResponse.json(
        { error: "Specialist must be active" },
        { status: 403 },
      );
    }
  }
  return null;
}

/**
 * GET /api/specialists/me/clinical-fields — own schema only (+ auditLog)
 * POST { label, locale?, type?, required?, options? }
 * PATCH labels | meta | order
 * DELETE ?fieldId=
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;
  const denied = await assertActiveSpecialist(auth.uid, auth.role);
  if (denied) return denied;

  const locale =
    new URL(request.url).searchParams.get("locale")?.trim() || "es";
  try {
    const repo = new AdminSpecialistClinicalFieldsRepository();
    const [fields, auditLog] = await Promise.all([
      repo.list(auth.uid),
      repo.listAudit(auth.uid),
    ]);
    return NextResponse.json({
      fields: fields.map((f) => serializeField(f, locale)),
      auditLog: auditLog.slice(0, 40).map((e) => ({
        at: e.at.toISOString(),
        byUserId: e.byUserId,
        action: e.action,
        fieldId: e.fieldId,
        detail: e.detail ?? null,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load fields";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;
  const denied = await assertActiveSpecialist(auth.uid, auth.role);
  if (denied) return denied;

  let body: {
    label?: unknown;
    locale?: unknown;
    type?: unknown;
    required?: unknown;
    options?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const label = typeof body.label === "string" ? body.label : "";
  const locale = isClinicalFieldLocale(body.locale) ? body.locale : "es";
  const type = isClinicalCustomFieldType(body.type) ? body.type : "textarea";
  const required = body.required === true;
  const options = Array.isArray(body.options)
    ? body.options.filter((o): o is string => typeof o === "string")
    : undefined;

  try {
    const field = await new AdminSpecialistClinicalFieldsRepository().addField(
      auth.uid,
      auth.uid,
      { label, locale, type, required, options },
    );
    return NextResponse.json({
      ok: true,
      field: serializeField(field, locale),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to add field";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;
  const denied = await assertActiveSpecialist(auth.uid, auth.role);
  if (denied) return denied;

  let body: {
    fieldId?: unknown;
    locale?: unknown;
    label?: unknown;
    labels?: unknown;
    type?: unknown;
    required?: unknown;
    options?: unknown;
    order?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const repo = new AdminSpecialistClinicalFieldsRepository();
  const localeHint =
    new URL(request.url).searchParams.get("locale")?.trim() || "es";

  try {
    if (Array.isArray(body.order)) {
      const orderedIds = body.order.filter(
        (id): id is string => typeof id === "string" && !!id.trim(),
      );
      const fields = await repo.reorderFields(auth.uid, auth.uid, orderedIds);
      return NextResponse.json({
        ok: true,
        fields: fields.map((f) => serializeField(f, localeHint)),
      });
    }

    const fieldId = typeof body.fieldId === "string" ? body.fieldId.trim() : "";
    if (!fieldId) {
      return NextResponse.json({ error: "fieldId is required" }, { status: 400 });
    }

    if (
      body.type !== undefined ||
      body.required !== undefined ||
      body.options !== undefined
    ) {
      const field = await repo.updateFieldMeta(auth.uid, auth.uid, fieldId, {
        type: isClinicalCustomFieldType(body.type) ? body.type : undefined,
        required: typeof body.required === "boolean" ? body.required : undefined,
        options: Array.isArray(body.options)
          ? body.options.filter((o): o is string => typeof o === "string")
          : undefined,
      });
      return NextResponse.json({
        ok: true,
        field: serializeField(field, localeHint),
      });
    }

    if (body.labels && typeof body.labels === "object") {
      const raw = body.labels as Record<string, unknown>;
      const labels: Partial<Record<"es" | "en", string>> = {};
      if (typeof raw.es === "string") labels.es = raw.es;
      if (typeof raw.en === "string") labels.en = raw.en;
      const field = await repo.updateLabels(auth.uid, auth.uid, fieldId, labels);
      return NextResponse.json({
        ok: true,
        field: serializeField(field, localeHint),
      });
    }

    const label = typeof body.label === "string" ? body.label : "";
    if (!isClinicalFieldLocale(body.locale)) {
      return NextResponse.json(
        { error: "locale must be es or en" },
        { status: 400 },
      );
    }
    const field = await repo.setLabel(
      auth.uid,
      auth.uid,
      fieldId,
      body.locale,
      label,
    );
    return NextResponse.json({
      ok: true,
      field: serializeField(field, body.locale),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update field";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;
  const denied = await assertActiveSpecialist(auth.uid, auth.role);
  if (denied) return denied;

  const fieldId =
    new URL(request.url).searchParams.get("fieldId")?.trim() || "";
  if (!fieldId) {
    return NextResponse.json({ error: "fieldId is required" }, { status: 400 });
  }

  try {
    const fieldsRepo = new AdminSpecialistClinicalFieldsRepository();
    const histories = new AdminClinicalHistoryRepository();
    const existing = await fieldsRepo.listAll(auth.uid);
    const field = existing.find((f) => f.id === fieldId);
    if (field && !field.deletedAt) {
      await fieldsRepo.markFieldDeleted(auth.uid, auth.uid, fieldId);
    } else if (!field) {
      const purged = await histories.purgeCustomFieldValue(fieldId);
      return NextResponse.json({
        ok: true,
        deletedFieldId: fieldId,
        purgedPatientCharts: purged,
        alreadyDeleted: true,
      });
    }
    const purged = await histories.purgeCustomFieldValue(fieldId);
    await fieldsRepo.removeFieldHard(auth.uid, fieldId);
    return NextResponse.json({
      ok: true,
      deletedFieldId: fieldId,
      purgedPatientCharts: purged,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete field";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
