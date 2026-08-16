import "server-only";

import { del, put } from "@vercel/blob";
import type { IFileStorage, StoredObject, UploadObjectInput } from "./IFileStorage";

/**
 * Vercel Blob implementation (Spark-friendly alternative to Firebase Storage).
 */
export class VercelBlobFileStorage implements IFileStorage {
  async upload(input: UploadObjectInput): Promise<StoredObject> {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error(
        "Missing BLOB_READ_WRITE_TOKEN. Create a Blob store in Vercel and copy the token.",
      );
    }

    const access = input.access ?? "private";
    const result = await put(input.path, input.data, {
      access,
      contentType: input.contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
      allowOverwrite: input.allowOverwrite ?? false,
    });

    return {
      path: result.pathname,
      url: result.url,
      contentType: input.contentType,
      sizeBytes:
        typeof input.data === "object" &&
        input.data !== null &&
        "size" in input.data &&
        typeof (input.data as { size: unknown }).size === "number"
          ? (input.data as { size: number }).size
          : Buffer.isBuffer(input.data)
            ? input.data.byteLength
            : 0,
    };
  }

  async delete(path: string): Promise<void> {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error("Missing BLOB_READ_WRITE_TOKEN");
    }
    await del(path, { token: process.env.BLOB_READ_WRITE_TOKEN });
  }
}

export function isBlobStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}
