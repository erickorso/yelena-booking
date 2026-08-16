import { NextResponse } from "next/server";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { denyUnlessActiveSpecialist } from "@/lib/auth/requireActiveSpecialist";
import { serializeClinicalField } from "@/lib/api/serializeClinicalField";
import { AdminSpecialistClinicalFieldsRepository } from "@/repositories/firestore/AdminSpecialistClinicalFieldsRepository";
import { AdminClinicalHistoryRepository } from "@/repositories/firestore/AdminClinicalHistoryRepository";
import {
  createClinicalFieldSchema,
  patchClinicalFieldSchema,
} from "@/contracts/clinicalFields";
import {
  beginApiRequest,
  jsonError,
  jsonOk,
  readJsonBody,
  zodErrorResponse,
} from "@/lib/http/apiResponse";

export const runtime = "nodejs";

/**
 * GET /api/specialists/me/clinical-fields — own schema only (+ auditLog)
 * POST { label, locale?, type?, required?, options? }
 * PATCH labels | meta | order
 * DELETE ?fieldId=
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;
  const denied = await denyUnlessActiveSpecialist(auth.uid, auth.role);
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
      fields: fields.map((f) =>
        serializeClinicalField(f, locale, { includeAudit: true }),
      ),
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
  const ctx = beginApiRequest(request);
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;
  const denied = await denyUnlessActiveSpecialist(auth.uid, auth.role);
  if (denied) return denied;

  const raw = await readJsonBody(request);
  if (raw === null) return jsonError(ctx, 400, "Invalid JSON");

  const parsed = createClinicalFieldSchema.safeParse(raw);
  if (!parsed.success) return zodErrorResponse(ctx, parsed.error);

  try {
    const field = await new AdminSpecialistClinicalFieldsRepository().addField(
      auth.uid,
      auth.uid,
      {
        label: parsed.data.label,
        locale: parsed.data.locale,
        type: parsed.data.type,
        required: parsed.data.required,
        options: parsed.data.options,
      },
    );
    return jsonOk(ctx, {
      ok: true,
      field: serializeClinicalField(field, parsed.data.locale, {
        includeAudit: true,
      }),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to add field";
    return jsonError(ctx, 400, message);
  }
}

export async function PATCH(request: Request) {
  const ctx = beginApiRequest(request);
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;
  const denied = await denyUnlessActiveSpecialist(auth.uid, auth.role);
  if (denied) return denied;

  const raw = await readJsonBody(request);
  if (raw === null) return jsonError(ctx, 400, "Invalid JSON");

  const parsed = patchClinicalFieldSchema.safeParse(raw);
  if (!parsed.success) return zodErrorResponse(ctx, parsed.error);

  const body = parsed.data;
  const repo = new AdminSpecialistClinicalFieldsRepository();
  const localeHint =
    new URL(request.url).searchParams.get("locale")?.trim() || "es";

  try {
    if (body.order) {
      const fields = await repo.reorderFields(auth.uid, auth.uid, body.order);
      return jsonOk(ctx, {
        ok: true,
        fields: fields.map((f) =>
          serializeClinicalField(f, localeHint, { includeAudit: true }),
        ),
      });
    }

    const fieldId = body.fieldId?.trim() || "";
    if (!fieldId) {
      return jsonError(ctx, 400, "fieldId is required");
    }

    if (
      body.type !== undefined ||
      body.required !== undefined ||
      body.options !== undefined
    ) {
      const field = await repo.updateFieldMeta(auth.uid, auth.uid, fieldId, {
        type: body.type,
        required: body.required,
        options: body.options,
      });
      return jsonOk(ctx, {
        ok: true,
        field: serializeClinicalField(field, localeHint, {
          includeAudit: true,
        }),
      });
    }

    if (body.labels) {
      const labels: Partial<Record<"es" | "en", string>> = {};
      if (typeof body.labels.es === "string") labels.es = body.labels.es;
      if (typeof body.labels.en === "string") labels.en = body.labels.en;
      const field = await repo.updateLabels(auth.uid, auth.uid, fieldId, labels);
      return jsonOk(ctx, {
        ok: true,
        field: serializeClinicalField(field, localeHint, {
          includeAudit: true,
        }),
      });
    }

    if (!body.locale || !body.label) {
      return jsonError(ctx, 400, "locale and label required");
    }
    const field = await repo.setLabel(
      auth.uid,
      auth.uid,
      fieldId,
      body.locale,
      body.label,
    );
    return jsonOk(ctx, {
      ok: true,
      field: serializeClinicalField(field, body.locale, { includeAudit: true }),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update field";
    return jsonError(ctx, 400, message);
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;
  const denied = await denyUnlessActiveSpecialist(auth.uid, auth.role);
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
