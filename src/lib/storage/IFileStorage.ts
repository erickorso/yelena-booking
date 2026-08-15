export type StoredObject = {
  /** Provider object key / pathname (e.g. patients/{uid}/lab.pdf). */
  path: string;
  /** Public or signed access URL. */
  url: string;
  contentType: string;
  sizeBytes: number;
};

export type UploadObjectInput = {
  path: string;
  data: Blob | ArrayBuffer | Buffer | ReadableStream;
  contentType: string;
  /**
   * `public` for portfolio demos; use `private` + signed URLs in production EHR.
   */
  access?: "public" | "private";
};

/**
 * DIP: file bytes live behind this abstraction (Vercel Blob today; swappable).
 * Firestore only stores MedicalFile metadata.
 */
export interface IFileStorage {
  upload(input: UploadObjectInput): Promise<StoredObject>;
  delete(path: string): Promise<void>;
}
