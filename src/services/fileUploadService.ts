import type { MedicalFile } from "@/types/domain";
import type { CreateMedicalFileInput, IEhrRepository } from "@/repositories";
import type { IFileStorage } from "@/lib/storage";
import {
  assertValidMedicalUpload,
  buildPatientFilePath,
} from "@/lib/storage/medicalUploadPolicy";

export type UploadMedicalFileInput = {
  patientId: string;
  uploadedById: string;
  file: File;
};

/**
 * Orchestrates binary upload (IFileStorage) + Firestore metadata (IEhrRepository).
 */
export class FileUploadService {
  constructor(
    private readonly storage: IFileStorage,
    private readonly ehr: IEhrRepository,
  ) {}

  async uploadMedicalFile(input: UploadMedicalFileInput): Promise<MedicalFile> {
    assertValidMedicalUpload(input.file);

    if (input.uploadedById !== input.patientId) {
      // v1: only the patient uploads their own labs; specialists write notes, not files.
      throw new Error("Only the patient may upload their medical files");
    }

    const path = buildPatientFilePath(input.patientId, input.file.name);
    const stored = await this.storage.upload({
      path,
      data: input.file,
      contentType: input.file.type,
      access: "private",
    });

    const metadata: CreateMedicalFileInput = {
      patientId: input.patientId,
      uploadedById: input.uploadedById,
      storagePath: stored.path,
      url: stored.url,
      provider: "vercel_blob",
      fileName: input.file.name,
      contentType: input.file.type,
      sizeBytes: input.file.size,
    };

    return this.ehr.createFileMetadata(metadata);
  }
}
