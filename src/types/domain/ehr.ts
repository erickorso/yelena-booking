/**
 * Immutable clinical note created after / during an appointment.
 * Updates create new notes; existing rows are never mutated in domain ops.
 */
export interface EhrNote {
  id: string;
  appointmentId: string;
  patientId: string;
  specialistId: string;
  body: string;
  createdAt: Date;
}

export const MEDICAL_FILE_SCOPES = [
  "patient_general",
  "appointment",
  "specialist_profile",
] as const;

export type MedicalFileScope = (typeof MEDICAL_FILE_SCOPES)[number];

/**
 * Append-only medical document. Never deleted in domain ops.
 */
export interface MedicalFile {
  id: string;
  scope: MedicalFileScope;
  /** Chart owner when scope is patient_general | appointment. */
  patientId: string | null;
  /** Specialist library when scope is specialist_profile. */
  specialistProfileId: string | null;
  /** Optional link to a consultation. */
  appointmentId: string | null;
  uploadedById: string;
  label: string | null;
  /** Object key in the storage provider. */
  storagePath: string;
  /** Access URL from the storage provider. */
  url: string;
  provider: "vercel_blob";
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: Date;
}
