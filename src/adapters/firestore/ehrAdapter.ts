import type { EhrNote, MedicalFile, MedicalFileScope } from "@/types/domain";
import { MEDICAL_FILE_SCOPES } from "@/types/domain";
import { optionalString, requireString, toDate } from "./helpers";

export interface EhrNoteDoc {
  appointmentId?: unknown;
  patientId?: unknown;
  specialistId?: unknown;
  body?: unknown;
  createdAt?: unknown;
}

export interface MedicalFileDoc {
  scope?: unknown;
  patientId?: unknown;
  specialistProfileId?: unknown;
  appointmentId?: unknown;
  uploadedById?: unknown;
  label?: unknown;
  storagePath?: unknown;
  url?: unknown;
  provider?: unknown;
  fileName?: unknown;
  contentType?: unknown;
  sizeBytes?: unknown;
  createdAt?: unknown;
}

function isScope(value: unknown): value is MedicalFileScope {
  return (
    typeof value === "string" &&
    (MEDICAL_FILE_SCOPES as readonly string[]).includes(value)
  );
}

/**
 * Adapts a raw Firestore EHR note document.
 */
export function adaptEhrNote(id: string, data: EhrNoteDoc): EhrNote {
  return {
    id,
    appointmentId: requireString(data.appointmentId, "appointmentId"),
    patientId: requireString(data.patientId, "patientId"),
    specialistId: requireString(data.specialistId, "specialistId"),
    body: requireString(data.body, "body"),
    createdAt: toDate(data.createdAt),
  };
}

/**
 * Adapts a raw Firestore medical file metadata document.
 */
export function adaptMedicalFile(id: string, data: MedicalFileDoc): MedicalFile {
  if (typeof data.sizeBytes !== "number") {
    throw new Error(`Invalid sizeBytes on medical file ${id}`);
  }

  // Backward compat: old docs without scope → patient_general
  const scope: MedicalFileScope = isScope(data.scope)
    ? data.scope
    : "patient_general";

  return {
    id,
    scope,
    patientId: optionalString(data.patientId ?? null),
    specialistProfileId: optionalString(data.specialistProfileId ?? null),
    appointmentId: optionalString(data.appointmentId ?? null),
    uploadedById: requireString(data.uploadedById, "uploadedById"),
    label: optionalString(data.label ?? null),
    storagePath: requireString(data.storagePath, "storagePath"),
    url: requireString(data.url, "url"),
    provider:
      data.provider === "vercel_blob"
        ? "vercel_blob"
        : (() => {
            throw new Error(`Unsupported storage provider on medical file ${id}`);
          })(),
    fileName: requireString(data.fileName, "fileName"),
    contentType: requireString(data.contentType, "contentType"),
    sizeBytes: data.sizeBytes,
    createdAt: toDate(data.createdAt),
  };
}
