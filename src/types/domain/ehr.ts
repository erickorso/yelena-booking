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

export interface MedicalFile {
  id: string;
  patientId: string;
  uploadedById: string;
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
