import { NextResponse } from "next/server";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { isBlobStorageConfigured } from "@/lib/storage/vercelBlobStorage";
import { VercelBlobFileStorage } from "@/lib/storage/vercelBlobStorage";
import { FileUploadService } from "@/services/fileUploadService";
import { AdminEhrRepository } from "@/repositories/firestore/AdminEhrRepository";
import { AdminAppointmentRepository } from "@/repositories/firestore/AdminAppointmentRepository";
import { AdminUserRepository } from "@/repositories/firestore/AdminUserRepository";
import { MEDICAL_FILE_SCOPES, type MedicalFileScope } from "@/types/domain";
import { canActAsSpecialist } from "@/types/domain";

export const runtime = "nodejs";

function isScope(value: unknown): value is MedicalFileScope {
  return (
    typeof value === "string" &&
    (MEDICAL_FILE_SCOPES as readonly string[]).includes(value)
  );
}

function serializeFile(file: {
  id: string;
  scope: string;
  patientId: string | null;
  specialistProfileId: string | null;
  appointmentId: string | null;
  uploadedById: string;
  label: string | null;
  url: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: Date;
}) {
  return {
    id: file.id,
    scope: file.scope,
    patientId: file.patientId,
    specialistProfileId: file.specialistProfileId,
    appointmentId: file.appointmentId,
    uploadedById: file.uploadedById,
    label: file.label,
    url: file.url,
    fileName: file.fileName,
    contentType: file.contentType,
    sizeBytes: file.sizeBytes,
    createdAt: file.createdAt.toISOString(),
  };
}

/**
 * GET /api/files?patientId=… | ?scope=specialist_profile
 * List medical files (append-only archive; no delete).
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const url = new URL(request.url);
  const scope = url.searchParams.get("scope");
  const patientId = url.searchParams.get("patientId");

  try {
    const ehr = new AdminEhrRepository();

    if (scope === "specialist_profile") {
      if (!canActAsSpecialist(auth.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const files = await ehr.listFilesBySpecialistProfile(auth.uid);
      return NextResponse.json({ files: files.map(serializeFile) });
    }

    const targetPatient =
      patientId && patientId.trim() ? patientId.trim() : auth.uid;

    if (targetPatient !== auth.uid && !canActAsSpecialist(auth.role) && auth.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const files = await ehr.listFilesByPatient(targetPatient);
    return NextResponse.json({ files: files.map(serializeFile) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list files";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/files/upload — kept for compat; prefer POST /api/files
 * POST /api/files multipart: file, scope, patientId?, appointmentId?, label?
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  if (!isBlobStorageConfigured()) {
    return NextResponse.json(
      { error: "Vercel Blob is not configured (BLOB_READ_WRITE_TOKEN)" },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const fileEntry = formData.get("file");
  const scopeRaw = formData.get("scope");
  const patientIdRaw = formData.get("patientId");
  const appointmentIdRaw = formData.get("appointmentId");
  const labelRaw = formData.get("label");

  if (!(fileEntry instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (!isScope(scopeRaw)) {
    return NextResponse.json(
      { error: "scope must be patient_general | appointment | specialist_profile" },
      { status: 400 },
    );
  }

  const scope = scopeRaw;
  const label =
    typeof labelRaw === "string" && labelRaw.trim() ? labelRaw.trim() : null;

  try {
    let patientId: string | null = null;
    let specialistProfileId: string | null = null;
    let appointmentId: string | null = null;

    if (scope === "specialist_profile") {
      if (!canActAsSpecialist(auth.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const me = await new AdminUserRepository().getSpecialistByUserId(auth.uid);
      if (!me || me.status !== "active") {
        return NextResponse.json(
          { error: "Specialist must be active" },
          { status: 403 },
        );
      }
      specialistProfileId = auth.uid;
    } else {
      patientId =
        typeof patientIdRaw === "string" && patientIdRaw.trim()
          ? patientIdRaw.trim()
          : auth.uid;

      if (patientId === auth.uid) {
        // patient uploading to self — ok for paciente / especialista / admin
      } else if (canActAsSpecialist(auth.role) || auth.role === "admin") {
        const me = await new AdminUserRepository().getSpecialistByUserId(auth.uid);
        if (auth.role === "especialista" && (!me || me.status !== "active")) {
          return NextResponse.json(
            { error: "Specialist must be active" },
            { status: 403 },
          );
        }
      } else {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (scope === "appointment") {
        appointmentId =
          typeof appointmentIdRaw === "string" && appointmentIdRaw.trim()
            ? appointmentIdRaw.trim()
            : null;
        if (!appointmentId) {
          // Default: last appointment for this patient
          const appts = await new AdminAppointmentRepository().list({
            patientId,
          });
          const latest = [...appts]
            .filter((a) => a.status !== "cancelled")
            .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())[0];
          if (!latest) {
            return NextResponse.json(
              { error: "No appointment found to attach the file" },
              { status: 400 },
            );
          }
          appointmentId = latest.id;
        } else {
          const appt = await new AdminAppointmentRepository().getById(
            appointmentId,
          );
          if (!appt || appt.patientId !== patientId) {
            return NextResponse.json(
              { error: "Appointment not found for patient" },
              { status: 404 },
            );
          }
        }
      }
    }

    const service = new FileUploadService(
      new VercelBlobFileStorage(),
      new AdminEhrRepository(),
    );

    const medicalFile = await service.uploadMedicalFile({
      scope,
      patientId,
      specialistProfileId,
      appointmentId,
      uploadedById: auth.uid,
      file: fileEntry,
      label,
    });

    return NextResponse.json({
      ok: true,
      file: serializeFile(medicalFile),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
