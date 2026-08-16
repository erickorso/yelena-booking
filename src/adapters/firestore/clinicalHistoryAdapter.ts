import type {
  PatientClinicalHistory,
  PatientSex,
} from "@/types/domain";
import {
  emptyClinicalHistory,
  isPatientSex,
  normalizeBirthDate,
} from "@/types/domain";
import { optionalString, toDate } from "./helpers";

export interface ClinicalHistoryDoc {
  patientId?: unknown;
  birthDate?: unknown;
  sex?: unknown;
  phone?: unknown;
  address?: unknown;
  bloodType?: unknown;
  emergencyContactName?: unknown;
  emergencyContactPhone?: unknown;
  allergies?: unknown;
  chronicConditions?: unknown;
  currentMedications?: unknown;
  surgicalHistory?: unknown;
  familyHistory?: unknown;
  habits?: unknown;
  generalNotes?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  updatedById?: unknown;
}

function textField(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string") return "";
  return value;
}

function optionalSex(value: unknown): PatientSex | null {
  if (value === null || value === undefined || value === "") return null;
  if (!isPatientSex(value)) return null;
  return value;
}

/**
 * Adapts Firestore clinical history doc (or empty defaults).
 */
export function adaptClinicalHistory(
  patientId: string,
  data: ClinicalHistoryDoc | null | undefined,
): PatientClinicalHistory {
  if (!data || Object.keys(data).length === 0) {
    return emptyClinicalHistory(patientId);
  }

  let birthDate: string | null = null;
  try {
    birthDate = normalizeBirthDate(data.birthDate ?? null);
  } catch {
    birthDate = null;
  }

  const now = new Date();
  let createdAt = now;
  let updatedAt = now;
  try {
    createdAt = data.createdAt != null ? toDate(data.createdAt) : now;
  } catch {
    createdAt = now;
  }
  try {
    updatedAt = data.updatedAt != null ? toDate(data.updatedAt) : createdAt;
  } catch {
    updatedAt = createdAt;
  }

  return {
    patientId,
    birthDate,
    sex: optionalSex(data.sex),
    phone: optionalString(data.phone ?? null),
    address: optionalString(data.address ?? null),
    bloodType: optionalString(data.bloodType ?? null),
    emergencyContactName: optionalString(data.emergencyContactName ?? null),
    emergencyContactPhone: optionalString(data.emergencyContactPhone ?? null),
    allergies: textField(data.allergies),
    chronicConditions: textField(data.chronicConditions),
    currentMedications: textField(data.currentMedications),
    surgicalHistory: textField(data.surgicalHistory),
    familyHistory: textField(data.familyHistory),
    habits: textField(data.habits),
    generalNotes: textField(data.generalNotes),
    createdAt,
    updatedAt,
    updatedById: optionalString(data.updatedById ?? null),
  };
}
