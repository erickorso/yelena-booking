import type { IFileStorage, StoredObject, UploadObjectInput } from "./IFileStorage";

/**
 * In-memory storage for unit tests / local UI without Blob token.
 */
export class StubFileStorage implements IFileStorage {
  private readonly objects = new Map<string, StoredObject>();

  async upload(input: UploadObjectInput): Promise<StoredObject> {
    const sizeBytes =
      typeof input.data === "object" &&
      input.data !== null &&
      "size" in input.data &&
      typeof (input.data as { size: unknown }).size === "number"
        ? (input.data as { size: number }).size
        : Buffer.isBuffer(input.data)
          ? input.data.byteLength
          : 0;

    const stored: StoredObject = {
      path: input.path,
      url: `https://blob.stub.local/${input.path}`,
      contentType: input.contentType,
      sizeBytes,
    };
    this.objects.set(input.path, stored);
    return stored;
  }

  async delete(path: string): Promise<void> {
    this.objects.delete(path);
  }
}
