import { createHash } from "crypto";

export function hashIdempotencyRequest(body: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(body))
    .digest("hex")
    .slice(0, 32);
}

export function idempotencyDocId(uid: string, key: string): string {
  return createHash("sha256")
    .update(`${uid}:${key}`)
    .digest("hex")
    .slice(0, 40);
}
