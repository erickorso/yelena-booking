import type { MedicalFile, MedicalFileScope } from "@/types/domain";
import { assertMedicalFileOwnership } from "@/types/domain";
import type {
  CreateMedicalFileInput,
  IEhrRepository,
} from "@/repositories/IEhrRepository";
import type { IFileStorage } from "@/lib/storage";
import {
  assertValidMedicalUpload,
  buildPatientFilePath,
  buildSpecialistFilePath,
} from "@/lib/storage/medicalUploadPolicy";

export type UploadMedicalFileInput = {
  scope: MedicalFileScope;
  patientId: string | null;
  specialistProfileId: string | null;
  appointmentId: string | null;
  uploadedById: string;
  file: File;
  label?: string | null;
};

/**
 * Orchestrates binary upload (IFileStorage) + Firestore metadata (IEhrRepository).
 * Append-only: never deletes files.
 */
export class FileUploadService {
  constructor(
    private readonly storage: IFileStorage,
    private readonly ehr: IEhrRepository,
  ) {}

  async uploadMedicalFile(input: UploadMedicalFileInput): Promise<MedicalFile> {
    assertValidMedicalUpload(input.file);
    assertMedicalFileOwnership({
      scope: input.scope,
      patientId: input.patientId,
      specialistProfileId: input.specialistProfileId,
      appointmentId: input.appointmentId,
    });

    const path =
      input.scope === "specialist_profile"
        ? buildSpecialistFilePath(input.specialistProfileId!, input.file.name)
        : buildPatientFilePath(input.patientId!, input.file.name);

    const stored = await this.storage.upload({
      path,
      data: input.file,
      contentType: input.file.type,
      access: "private",
    });

    const metadata: CreateMedicalFileInput = {
      scope: input.scope,
      patientId: input.patientId,
      specialistProfileId: input.specialistProfileId,
      appointmentId: input.appointmentId,
      uploadedById: input.uploadedById,
      label: input.label?.trim() || null,
      storagePath: stored.path,
      url: stored.url,
      provider: "vercel_blob",
      fileName: input.file.name,
      contentType: input.file.type,
      sizeBytes: input.file.size,
    };

    return this.ehr.createFileMetadata(metadata);
  }

  listFilesByPatient(patientId: string): Promise<MedicalFile[]> {
    return this.ehr.listFilesByPatient(patientId);
  }

  listFilesBySpecialistProfile(specialistId: string): Promise<MedicalFile[]> {
    return this.ehr.listFilesBySpecialistProfile(specialistId);
  }
}
