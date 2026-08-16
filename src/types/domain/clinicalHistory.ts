export const PATIENT_SEX_OPTIONS = [
  "female",
  "male",
  "other",
  "unspecified",
] as const;

export type PatientSex = (typeof PATIENT_SEX_OPTIONS)[number];

/**
 * Standard outpatient clinical history (historia clínica básica).
 * One document per patient: `patientClinicalHistories/{patientId}`.
 */
export interface PatientClinicalHistory {
  patientId: string;
  birthDate: string | null;
  sex: PatientSex | null;
  phone: string | null;
  address: string | null;
  bloodType: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  allergies: string;
  chronicConditions: string;
  currentMedications: string;
  surgicalHistory: string;
  familyHistory: string;
  habits: string;
  generalNotes: string;
  /** Values for specialist custom fields, keyed by field def id. */
  customValues: Record<string, string>;
  /** Who last changed each custom value (field-level audit). */
  customValuesMeta: Record<
    string,
    { updatedAt: Date; updatedById: string }
  >;
  createdAt: Date;
  updatedAt: Date;
  updatedById: string | null;
}

export type PatientClinicalHistoryInput = {
  birthDate?: string | null;
  sex?: PatientSex | null;
  phone?: string | null;
  address?: string | null;
  bloodType?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  allergies?: string;
  chronicConditions?: string;
  currentMedications?: string;
  surgicalHistory?: string;
  familyHistory?: string;
  habits?: string;
  generalNotes?: string;
  customValues?: Record<string, string>;
};

export function isPatientSex(value: unknown): value is PatientSex {
  return (
    typeof value === "string" &&
    (PATIENT_SEX_OPTIONS as readonly string[]).includes(value)
  );
}

export function emptyClinicalHistory(
  patientId: string,
  now = new Date(),
): PatientClinicalHistory {
  return {
    patientId,
    birthDate: null,
    sex: null,
    phone: null,
    address: null,
    bloodType: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    allergies: "",
    chronicConditions: "",
    currentMedications: "",
    surgicalHistory: "",
    familyHistory: "",
    habits: "",
    generalNotes: "",
    customValues: {},
    customValuesMeta: {},
    createdAt: now,
    updatedAt: now,
    updatedById: null,
  };
}

/** True when the chart still needs basic / clinical data from the patient. */
export function isClinicalHistoryIncomplete(
  history: PatientClinicalHistory,
): boolean {
  if (!history.phone?.trim()) return true;
  if (!history.birthDate) return true;
  const clinicalFilled = [
    history.allergies,
    history.chronicConditions,
    history.currentMedications,
    history.surgicalHistory,
    history.familyHistory,
    history.habits,
    history.generalNotes,
  ].some((v) => v.trim().length > 0);
  return !clinicalFilled;
}

/** YYYY-MM-DD or null. */
export function normalizeBirthDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") {
    throw new Error("birthDate must be YYYY-MM-DD");
  }
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error("birthDate must be YYYY-MM-DD");
  }
  const d = new Date(`${trimmed}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    throw new Error("birthDate is invalid");
  }
  return trimmed;
}
