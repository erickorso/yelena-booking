import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { adaptClinicalHistory } from "@/adapters/firestore";
import type {
  PatientClinicalHistory,
  PatientClinicalHistoryInput,
  PatientSex,
} from "@/types/domain";
import {
  emptyClinicalHistory,
  isPatientSex,
  normalizeBirthDate,
} from "@/types/domain";

const COLLECTION = "patientClinicalHistories";

function nullableTrim(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function parseSex(value: unknown): PatientSex | null {
  if (value === null || value === undefined || value === "") return null;
  if (!isPatientSex(value)) {
    throw new Error("Invalid sex value");
  }
  return value;
}

/**
 * Server-side clinical history (one doc per patient).
 */
export class AdminClinicalHistoryRepository {
  private async db() {
    return getAdminFirestore();
  }

  async getByPatientId(
    patientId: string,
  ): Promise<PatientClinicalHistory> {
    const snap = await (await this.db())
      .collection(COLLECTION)
      .doc(patientId)
      .get();
    if (!snap.exists) {
      return emptyClinicalHistory(patientId);
    }
    return adaptClinicalHistory(patientId, snap.data() ?? {});
  }

  async upsert(
    patientId: string,
    input: PatientClinicalHistoryInput,
    updatedById: string,
  ): Promise<PatientClinicalHistory> {
    const ref = (await this.db()).collection(COLLECTION).doc(patientId);
    const existing = await ref.get();

    const payload = {
      patientId,
      birthDate: normalizeBirthDate(input.birthDate ?? null),
      sex: parseSex(input.sex),
      phone: nullableTrim(input.phone ?? null),
      address: nullableTrim(input.address ?? null),
      bloodType: nullableTrim(input.bloodType ?? null),
      emergencyContactName: nullableTrim(input.emergencyContactName ?? null),
      emergencyContactPhone: nullableTrim(input.emergencyContactPhone ?? null),
      allergies: (input.allergies ?? "").trim(),
      chronicConditions: (input.chronicConditions ?? "").trim(),
      currentMedications: (input.currentMedications ?? "").trim(),
      surgicalHistory: (input.surgicalHistory ?? "").trim(),
      familyHistory: (input.familyHistory ?? "").trim(),
      habits: (input.habits ?? "").trim(),
      generalNotes: (input.generalNotes ?? "").trim(),
      updatedById,
      updatedAt: FieldValue.serverTimestamp(),
      ...(existing.exists
        ? {}
        : { createdAt: FieldValue.serverTimestamp() }),
    };

    await ref.set(payload, { merge: true });
    const snap = await ref.get();
    return adaptClinicalHistory(patientId, snap.data() ?? {});
  }
}
