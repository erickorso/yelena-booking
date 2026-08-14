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
  storagePath: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: Date;
}
