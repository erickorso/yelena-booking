import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { isAuthError, requireAuth, type AuthedUser } from "@/lib/auth/requireAuth";
import { isBlobStorageConfigured } from "@/lib/storage/vercelBlobStorage";
import { AdminEhrRepository } from "@/repositories/firestore/AdminEhrRepository";
import { canActAsSpecialist, type MedicalFile } from "@/types/domain";

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

function canReadFile(auth: AuthedUser, file: MedicalFile): boolean {
  if (auth.role === "admin") return true;
  if (file.scope === "specialist_profile") {
    return (
      file.specialistProfileId === auth.uid && canActAsSpecialist(auth.role)
    );
  }
  if (file.patientId === auth.uid) return true;
  return canActAsSpecialist(auth.role);
}

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/files/[id]/content — stream private medical file (Bearer auth).
 */
export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing file id" }, { status: 400 });
  }

  try {
    const file = await new AdminEhrRepository().getFileById(id.trim());
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    if (!canReadFile(auth, file)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isVercelBlobUrl(file.url)) {
      return NextResponse.redirect(file.url);
    }

    if (!isBlobStorageConfigured()) {
      return NextResponse.json(
        { error: "Blob storage not configured" },
        { status: 503 },
      );
    }

    const result = await get(file.url, {
      access: "private",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    if (!result || !result.stream) {
      return NextResponse.json({ error: "File not found in storage" }, { status: 404 });
    }

    const safeName = file.fileName.replace(/[^\w.\- ()\[\]]+/g, "_") || "file";
    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": file.contentType || result.blob.contentType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
