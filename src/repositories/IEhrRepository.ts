import type { EhrNote, MedicalFile, MedicalFileScope } from "@/types/domain";

export interface CreateEhrNoteInput {
  appointmentId: string;
  patientId: string;
  specialistId: string;
  body: string;
}

export interface CreateMedicalFileInput {
  scope: MedicalFileScope;
  patientId: string | null;
  specialistProfileId: string | null;
  appointmentId: string | null;
  uploadedById: string;
  label: string | null;
  storagePath: string;
  url: string;
  provider: "vercel_blob";
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

/**
 * Abstraction over EHR notes and medical file metadata (append-only files).
 */
export interface IEhrRepository {
  listNotesByPatient(patientId: string): Promise<EhrNote[]>;
  listNotesByAppointment(appointmentId: string): Promise<EhrNote[]>;
  /** Append-only: never mutate existing notes. */
  createNote(input: CreateEhrNoteInput): Promise<EhrNote>;
  listFilesByPatient(patientId: string): Promise<MedicalFile[]>;
  listFilesBySpecialistProfile(specialistId: string): Promise<MedicalFile[]>;
  getFileById(id: string): Promise<MedicalFile | null>;
  /** Append-only: never delete medical files. */
  createFileMetadata(input: CreateMedicalFileInput): Promise<MedicalFile>;
}
