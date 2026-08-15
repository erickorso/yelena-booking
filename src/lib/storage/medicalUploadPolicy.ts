/** Allowed medical upload MIME types (PDF + images). */
export const ALLOWED_MEDICAL_CONTENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedMedicalContentType =
  (typeof ALLOWED_MEDICAL_CONTENT_TYPES)[number];

export const MAX_MEDICAL_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

export function isAllowedMedicalContentType(
  value: string,
): value is AllowedMedicalContentType {
  return (ALLOWED_MEDICAL_CONTENT_TYPES as readonly string[]).includes(value);
}

export function assertValidMedicalUpload(file: {
  type: string;
  size: number;
  name: string;
}): void {
  if (!file.name.trim()) {
    throw new Error("File name is required");
  }
  if (!isAllowedMedicalContentType(file.type)) {
    throw new Error(
      `Unsupported content type: ${file.type}. Allowed: PDF, JPEG, PNG, WEBP.`,
    );
  }
  if (file.size <= 0 || file.size > MAX_MEDICAL_FILE_BYTES) {
    throw new Error(`File must be between 1 byte and ${MAX_MEDICAL_FILE_BYTES} bytes`);
  }
}

/** Builds a scoped object path: patients/{patientId}/{timestamp}-{safeName} */
export function buildPatientFilePath(
  patientId: string,
  fileName: string,
  now = Date.now(),
): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `patients/${patientId}/${now}-${safe}`;
}
