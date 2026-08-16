import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { AdminClinicalHistoryRepository } from "@/repositories/firestore/AdminClinicalHistoryRepository";
import { AdminSpecialistClinicalFieldsRepository } from "@/repositories/firestore/AdminSpecialistClinicalFieldsRepository";
import { AdminAppointmentRepository } from "@/repositories/firestore/AdminAppointmentRepository";
import { AdminUserRepository } from "@/repositories/firestore/AdminUserRepository";
import type {
  AuthRole,
  ClinicalCustomFieldDef,
  PatientClinicalHistory,
  PatientClinicalHistoryInput,
} from "@/types/domain";
import {
  canActAsPatient,
  canActAsSpecialist,
  isClinicalHistoryIncomplete,
  isPatientSex,
  missingCustomFieldLocales,
  normalizeBirthDate,
  resolveCustomFieldLabel,
  validateCustomValuesMap,
} from "@/types/domain";

function serialize(history: PatientClinicalHistory) {
  return {
    patientId: history.patientId,
    birthDate: history.birthDate,
    sex: history.sex,
    phone: history.phone,
    address: history.address,
    bloodType: history.bloodType,
    emergencyContactName: history.emergencyContactName,
    emergencyContactPhone: history.emergencyContactPhone,
    allergies: history.allergies,
    chronicConditions: history.chronicConditions,
    currentMedications: history.currentMedications,
    surgicalHistory: history.surgicalHistory,
    familyHistory: history.familyHistory,
    habits: history.habits,
    generalNotes: history.generalNotes,
    customValues: history.customValues,
    customValuesMeta: Object.fromEntries(
      Object.entries(history.customValuesMeta).map(([id, meta]) => [
        id,
        {
          updatedById: meta.updatedById,
          updatedAt: meta.updatedAt.toISOString(),
        },
      ]),
    ),
    createdAt: history.createdAt.toISOString(),
    updatedAt: history.updatedAt.toISOString(),
    updatedById: history.updatedById,
  };
}

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
  };
}

function parseBody(raw: unknown): PatientClinicalHistoryInput {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid JSON body");
  }
  const body = raw as Record<string, unknown>;
  const sexRaw = body.sex;
  let sex: PatientClinicalHistoryInput["sex"] = null;
  if (sexRaw === null || sexRaw === "" || sexRaw === undefined) {
    sex = null;
  } else if (isPatientSex(sexRaw)) {
    sex = sexRaw;
  } else {
    throw new Error("Invalid sex");
  }

  return {
    birthDate: normalizeBirthDate(body.birthDate ?? null),
    sex,
    phone: typeof body.phone === "string" ? body.phone : null,
    address: typeof body.address === "string" ? body.address : null,
    bloodType: typeof body.bloodType === "string" ? body.bloodType : null,
    emergencyContactName:
      typeof body.emergencyContactName === "string"
        ? body.emergencyContactName
        : null,
    emergencyContactPhone:
      typeof body.emergencyContactPhone === "string"
        ? body.emergencyContactPhone
        : null,
    allergies: typeof body.allergies === "string" ? body.allergies : "",
    chronicConditions:
      typeof body.chronicConditions === "string" ? body.chronicConditions : "",
    currentMedications:
      typeof body.currentMedications === "string"
        ? body.currentMedications
        : "",
    surgicalHistory:
      typeof body.surgicalHistory === "string" ? body.surgicalHistory : "",
    familyHistory:
      typeof body.familyHistory === "string" ? body.familyHistory : "",
    habits: typeof body.habits === "string" ? body.habits : "",
    generalNotes:
      typeof body.generalNotes === "string" ? body.generalNotes : "",
    customValues: parseCustomValues(body.customValues),
  };
}

function parseCustomValues(raw: unknown): Record<string, string> | undefined {
  if (raw === undefined) return undefined;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("customValues must be an object");
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

async function assertCanAccessPatient(
  auth: { uid: string; role: AuthRole },
  patientId: string,
): Promise<Response | null> {
  if (auth.uid === patientId && canActAsPatient(auth.role)) {
    return null;
  }
  if (auth.role === "admin") return null;
  if (canActAsSpecialist(auth.role)) {
    const users = new AdminUserRepository();
    if (auth.role === "especialista") {
      const me = await users.getSpecialistByUserId(auth.uid);
      if (!me || me.status !== "active") {
        return NextResponse.json(
          { error: "Specialist must be active" },
          { status: 403 },
        );
      }
    }
    const patient = await users.getById(patientId);
    if (!patient || !canActAsPatient(patient.role)) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }
    return null;
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * GET /api/patients/[id]/clinical-history
 * PUT /api/patients/[id]/clinical-history
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { id: patientId } = await context.params;
  if (!patientId) {
    return NextResponse.json({ error: "Missing patient id" }, { status: 400 });
  }

  const denied = await assertCanAccessPatient(auth, patientId);
  if (denied) return denied;

  try {
    const users = new AdminUserRepository();
    const fieldsRepo = new AdminSpecialistClinicalFieldsRepository();
    const locale =
      new URL(request.url).searchParams.get("locale")?.trim() || "es";
    const [history, patient] = await Promise.all([
      new AdminClinicalHistoryRepository().getByPatientId(patientId),
      users.getById(patientId),
    ]);

    let customFields: ClinicalCustomFieldDef[] = [];
    if (canActAsSpecialist(auth.role) && auth.uid !== patientId) {
      customFields = await fieldsRepo.list(auth.uid);
    } else {
      const appts = await new AdminAppointmentRepository().list({ patientId });
      const specialistIds = [
        ...new Set(appts.map((a) => a.specialistId).filter(Boolean)),
      ];
      customFields = await fieldsRepo.listForSpecialists(specialistIds);
    }

    return NextResponse.json({
      history: serialize(history),
      customFields: customFields.map((f) => serializeField(f, locale)),
      incomplete: isClinicalHistoryIncomplete(history),
      displayName: patient?.displayName ?? null,
      email: patient?.email ?? null,
      patientNumber: patient?.patientNumber ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { id: patientId } = await context.params;
  if (!patientId) {
    return NextResponse.json({ error: "Missing patient id" }, { status: 400 });
  }

  const denied = await assertCanAccessPatient(auth, patientId);
  if (denied) return denied;

  let rawBody: Record<string, unknown>;
  let input: PatientClinicalHistoryInput;
  try {
    rawBody = (await request.json()) as Record<string, unknown>;
    input = parseBody(rawBody);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid body";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const users = new AdminUserRepository();
    const displayNameRaw =
      typeof rawBody.displayName === "string" ? rawBody.displayName.trim() : "";
    let displayName: string | null = null;
    if (displayNameRaw) {
      const updated = await users.updateDisplayName(patientId, displayNameRaw);
      displayName = updated.displayName;
      try {
        await (await getAdminAuth()).updateUser(patientId, {
          displayName: updated.displayName,
        });
      } catch (err) {
        console.error("[clinical-history] Auth displayName sync failed", err);
      }
    } else {
      const patient = await users.getById(patientId);
      displayName = patient?.displayName ?? null;
    }

    const fieldsRepo = new AdminSpecialistClinicalFieldsRepository();
    let schemaFields: ClinicalCustomFieldDef[] = [];
    if (canActAsSpecialist(auth.role) && auth.uid !== patientId) {
      schemaFields = await fieldsRepo.list(auth.uid);
    } else {
      const appts = await new AdminAppointmentRepository().list({ patientId });
      const specialistIds = [
        ...new Set(appts.map((a) => a.specialistId).filter(Boolean)),
      ];
      schemaFields = await fieldsRepo.listForSpecialists(specialistIds);
    }
    if (input.customValues) {
      input = {
        ...input,
        customValues: validateCustomValuesMap(schemaFields, input.customValues),
      };
    }

    const history = await new AdminClinicalHistoryRepository().upsert(
      patientId,
      input,
      auth.uid,
    );
    return NextResponse.json({
      ok: true,
      history: serialize(history),
      incomplete: isClinicalHistoryIncomplete(history),
      displayName,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save history";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
