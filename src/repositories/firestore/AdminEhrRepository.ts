import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { adaptEhrNote, adaptMedicalFile } from "@/adapters/firestore";
import type { EhrNote, MedicalFile } from "@/types/domain";
import type {
  CreateEhrNoteInput,
  CreateMedicalFileInput,
  IEhrRepository,
} from "@/repositories/IEhrRepository";

const NOTES = "ehrNotes";
const FILES = "medicalFiles";

/**
 * Firestore EHR repository. Medical files are append-only (no delete API).
 */
export class AdminEhrRepository implements IEhrRepository {
  private async db() {
    return getAdminFirestore();
  }

  async listNotesByPatient(patientId: string): Promise<EhrNote[]> {
    const snap = await (await this.db())
      .collection(NOTES)
      .where("patientId", "==", patientId)
      .get();
    return snap.docs.map((d) => adaptEhrNote(d.id, d.data()));
  }

  async listNotesByAppointment(appointmentId: string): Promise<EhrNote[]> {
    const snap = await (await this.db())
      .collection(NOTES)
      .where("appointmentId", "==", appointmentId)
      .get();
    return snap.docs.map((d) => adaptEhrNote(d.id, d.data()));
  }

  async createNote(input: CreateEhrNoteInput): Promise<EhrNote> {
    const ref = (await this.db()).collection(NOTES).doc();
    await ref.set({
      appointmentId: input.appointmentId,
      patientId: input.patientId,
      specialistId: input.specialistId,
      body: input.body,
      createdAt: FieldValue.serverTimestamp(),
    });
    const snap = await ref.get();
    return adaptEhrNote(snap.id, snap.data() ?? {});
  }

  async listFilesByPatient(patientId: string): Promise<MedicalFile[]> {
    const snap = await (await this.db())
      .collection(FILES)
      .where("patientId", "==", patientId)
      .get();
    return snap.docs
      .map((d) => adaptMedicalFile(d.id, d.data()))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async listFilesBySpecialistProfile(
    specialistId: string,
  ): Promise<MedicalFile[]> {
    const snap = await (await this.db())
      .collection(FILES)
      .where("specialistProfileId", "==", specialistId)
      .where("scope", "==", "specialist_profile")
      .get();
    return snap.docs
      .map((d) => adaptMedicalFile(d.id, d.data()))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getFileById(id: string): Promise<MedicalFile | null> {
    const snap = await (await this.db()).collection(FILES).doc(id).get();
    if (!snap.exists) return null;
    return adaptMedicalFile(snap.id, snap.data() ?? {});
  }

  async createFileMetadata(
    input: CreateMedicalFileInput,
  ): Promise<MedicalFile> {
    const ref = (await this.db()).collection(FILES).doc();
    await ref.set({
      scope: input.scope,
      patientId: input.patientId,
      specialistProfileId: input.specialistProfileId,
      appointmentId: input.appointmentId,
      uploadedById: input.uploadedById,
      label: input.label,
      storagePath: input.storagePath,
      url: input.url,
      provider: input.provider,
      fileName: input.fileName,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      createdAt: FieldValue.serverTimestamp(),
    });
    const snap = await ref.get();
    return adaptMedicalFile(snap.id, snap.data() ?? {});
  }
}
