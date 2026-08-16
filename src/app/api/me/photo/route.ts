import { NextResponse } from "next/server";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import {
  isBlobStorageConfigured,
  VercelBlobFileStorage,
} from "@/lib/storage/vercelBlobStorage";
import {
  assertValidProfilePhoto,
  buildProfilePhotoPath,
} from "@/lib/storage/profilePhotoPolicy";
import { AdminUserRepository } from "@/repositories/firestore/AdminUserRepository";

export const runtime = "nodejs";

/**
 * GET /api/me/photo — current user's profile photo URL.
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const profile = await new AdminUserRepository().getById(auth.uid);
    return NextResponse.json({
      photoUrl: profile?.photoUrl ?? null,
      displayName: profile?.displayName ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load photo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/me/photo multipart field `file` — optional profile photo.
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  if (!isBlobStorageConfigured()) {
    return NextResponse.json(
      { error: "Vercel Blob is not configured (BLOB_READ_WRITE_TOKEN)" },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const fileEntry = formData.get("file");
  if (!(fileEntry instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  try {
    assertValidProfilePhoto(fileEntry);
    const path = buildProfilePhotoPath(auth.uid, fileEntry.name);
    const storage = new VercelBlobFileStorage();
    const stored = await storage.upload({
      path,
      data: fileEntry,
      contentType: fileEntry.type,
      access: "private",
      allowOverwrite: true,
    });

    const profile = await new AdminUserRepository().updatePhotoUrl(
      auth.uid,
      stored.url,
    );

    return NextResponse.json({
      photoUrl: profile.photoUrl,
      displayName: profile.displayName,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to upload photo";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * DELETE /api/me/photo — clear profile photo (optional field).
 */
export async function DELETE(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const profile = await new AdminUserRepository().updatePhotoUrl(
      auth.uid,
      null,
    );
    return NextResponse.json({
      photoUrl: profile.photoUrl,
      displayName: profile.displayName,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to remove photo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
