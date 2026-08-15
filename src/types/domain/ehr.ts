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

export function isMedicalFileScope(value: unknown): value is MedicalFileScope {
  return (
    typeof value === "string" &&
    (MEDICAL_FILE_SCOPES as readonly string[]).includes(value)
  );
}

/**
 * Scope ↔ ownership invariants for medical files.
 */
export function assertMedicalFileOwnership(input: {
  scope: MedicalFileScope;
  patientId: string | null;
  specialistProfileId: string | null;
  appointmentId: string | null;
}): void {
  if (input.scope === "specialist_profile") {
    if (!input.specialistProfileId) {
      throw new Error("specialistProfileId is required for specialist_profile");
    }
    if (input.patientId) {
      throw new Error("patientId must be null for specialist_profile");
    }
    if (input.appointmentId) {
      throw new Error("appointmentId must be null for specialist_profile");
    }
    return;
  }

  if (!input.patientId) {
    throw new Error("patientId is required for patient scopes");
  }
  if (input.specialistProfileId) {
    throw new Error("specialistProfileId must be null for patient scopes");
  }
  if (input.scope === "appointment" && !input.appointmentId) {
    throw new Error("appointmentId is required for appointment scope");
  }
  if (input.scope === "patient_general" && input.appointmentId) {
    throw new Error("appointmentId must be null for patient_general");
  }
}
