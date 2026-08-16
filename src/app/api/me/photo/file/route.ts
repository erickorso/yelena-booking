import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { isBlobStorageConfigured } from "@/lib/storage/vercelBlobStorage";
import { AdminUserRepository } from "@/repositories/firestore/AdminUserRepository";

export const runtime = "nodejs";

function isVercelBlobUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return (
      host.endsWith(".blob.vercel-storage.com") ||
      host === "blob.vercel-storage.com"
    );
  } catch {
    return false;
  }
}

/**
 * GET /api/me/photo/file — stream private profile photo (Bearer auth).
 * Google/external URLs are redirected.
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const profile = await new AdminUserRepository().getById(auth.uid);
    const photoUrl = profile?.photoUrl?.trim() || null;
    if (!photoUrl) {
      return NextResponse.json({ error: "No photo" }, { status: 404 });
    }

    if (!isVercelBlobUrl(photoUrl)) {
      return NextResponse.redirect(photoUrl);
    }

    if (!isBlobStorageConfigured()) {
      return NextResponse.json(
        { error: "Blob storage not configured" },
        { status: 503 },
      );
    }

    const result = await get(photoUrl, {
      access: "private",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    if (!result || !result.stream) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType || "image/jpeg",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load photo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
