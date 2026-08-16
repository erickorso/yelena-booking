import { NextResponse } from "next/server";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { AdminSpecialistClinicalFieldsRepository } from "@/repositories/firestore/AdminSpecialistClinicalFieldsRepository";
import { AdminUserRepository } from "@/repositories/firestore/AdminUserRepository";
import {
  canActAsSpecialist,
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
    missingLocales: missingCustomFieldLocales(field),
    createdAt: field.createdAt.toISOString(),
    updatedAt: field.updatedAt.toISOString(),
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
 * GET /api/specialists/me/clinical-fields
 * POST { label, locale? } — add field
 * PATCH { fieldId, locale, label } | { fieldId, labels: { es?, en? } }
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
    const fields = await new AdminSpecialistClinicalFieldsRepository().list(
      auth.uid,
    );
    return NextResponse.json({
      fields: fields.map((f) => serializeField(f, locale)),
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

  let body: { label?: unknown; locale?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const label = typeof body.label === "string" ? body.label : "";
  const locale = isClinicalFieldLocale(body.locale) ? body.locale : "es";

  try {
    const field = await new AdminSpecialistClinicalFieldsRepository().addField(
      auth.uid,
      { label, locale },
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
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fieldId = typeof body.fieldId === "string" ? body.fieldId.trim() : "";
  if (!fieldId) {
    return NextResponse.json({ error: "fieldId is required" }, { status: 400 });
  }

  const repo = new AdminSpecialistClinicalFieldsRepository();
  const localeHint =
    new URL(request.url).searchParams.get("locale")?.trim() || "es";

  try {
    if (body.labels && typeof body.labels === "object") {
      const raw = body.labels as Record<string, unknown>;
      const labels: Partial<Record<"es" | "en", string>> = {};
      if (typeof raw.es === "string") labels.es = raw.es;
      if (typeof raw.en === "string") labels.en = raw.en;
      const field = await repo.updateLabels(auth.uid, fieldId, labels);
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
    const field = await repo.setLabel(auth.uid, fieldId, body.locale, label);
    return NextResponse.json({
      ok: true,
      field: serializeField(field, body.locale),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update label";
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
    await new AdminSpecialistClinicalFieldsRepository().deleteField(
      auth.uid,
      fieldId,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete field";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
