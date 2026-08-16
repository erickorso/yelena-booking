import { NextResponse } from "next/server";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { AdminClinicalHistoryRepository } from "@/repositories/firestore/AdminClinicalHistoryRepository";
import { AdminUserRepository } from "@/repositories/firestore/AdminUserRepository";
import type {
  AuthRole,
  PatientClinicalHistory,
  PatientClinicalHistoryInput,
} from "@/types/domain";
import {
  canActAsPatient,
  canActAsSpecialist,
  isClinicalHistoryIncomplete,
  isPatientSex,
  normalizeBirthDate,
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
    createdAt: history.createdAt.toISOString(),
    updatedAt: history.updatedAt.toISOString(),
    updatedById: history.updatedById,
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
  };
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
    const history =
      await new AdminClinicalHistoryRepository().getByPatientId(patientId);
    return NextResponse.json({
      history: serialize(history),
      incomplete: isClinicalHistoryIncomplete(history),
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

  let input: PatientClinicalHistoryInput;
  try {
    input = parseBody(await request.json());
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid body";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const history = await new AdminClinicalHistoryRepository().upsert(
      patientId,
      input,
      auth.uid,
    );
    return NextResponse.json({
      ok: true,
      history: serialize(history),
      incomplete: isClinicalHistoryIncomplete(history),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save history";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
