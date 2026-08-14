import type { EhrNote, MedicalFile } from "@/types/domain";
import { requireString, toDate } from "./helpers";

export interface EhrNoteDoc {
  appointmentId?: unknown;
  patientId?: unknown;
  specialistId?: unknown;
  body?: unknown;
  createdAt?: unknown;
}

export interface MedicalFileDoc {
  patientId?: unknown;
  uploadedById?: unknown;
  storagePath?: unknown;
  fileName?: unknown;
  contentType?: unknown;
  sizeBytes?: unknown;
  createdAt?: unknown;
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

  return {
    id,
    patientId: requireString(data.patientId, "patientId"),
    uploadedById: requireString(data.uploadedById, "uploadedById"),
    storagePath: requireString(data.storagePath, "storagePath"),
    fileName: requireString(data.fileName, "fileName"),
    contentType: requireString(data.contentType, "contentType"),
    sizeBytes: data.sizeBytes,
    createdAt: toDate(data.createdAt),
  };
}
