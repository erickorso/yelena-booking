import type { EhrNote, MedicalFile } from "@/types/domain";

export interface CreateEhrNoteInput {
  appointmentId: string;
  patientId: string;
  specialistId: string;
  body: string;
}

export interface CreateMedicalFileInput {
  patientId: string;
  uploadedById: string;
  storagePath: string;
  url: string;
  provider: "vercel_blob";
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

/**
 * Abstraction over EHR notes and medical file metadata.
 */
export interface IEhrRepository {
  listNotesByPatient(patientId: string): Promise<EhrNote[]>;
  listNotesByAppointment(appointmentId: string): Promise<EhrNote[]>;
  /** Append-only: never mutate existing notes. */
  createNote(input: CreateEhrNoteInput): Promise<EhrNote>;
  listFilesByPatient(patientId: string): Promise<MedicalFile[]>;
  createFileMetadata(input: CreateMedicalFileInput): Promise<MedicalFile>;
}
