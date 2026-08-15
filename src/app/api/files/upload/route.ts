import { NextResponse } from "next/server";
import { StubEhrRepository } from "@/repositories";
import { FileUploadService } from "@/services/fileUploadService";
import { isBlobStorageConfigured } from "@/lib/storage/vercelBlobStorage";
import { VercelBlobFileStorage } from "@/lib/storage/vercelBlobStorage";
import { getAdminAuth, isFirebaseAdminConfigured } from "@/lib/firebase/admin";

export const runtime = "nodejs";

/**
 * POST /api/files/upload
 * multipart/form-data: file + patientId
 * Authorization: Bearer <Firebase ID token>
 *
 * Bytes → Vercel Blob; metadata → EHR repository (stub until Firestore repo lands).
 */
export async function POST(request: Request) {
  if (!isBlobStorageConfigured()) {
    return NextResponse.json(
      { error: "Vercel Blob is not configured (BLOB_READ_WRITE_TOKEN)" },
      { status: 503 },
    );
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const idToken = authorization.slice("Bearer ".length).trim();
  if (!idToken) {
    return NextResponse.json({ error: "Empty bearer token" }, { status: 401 });
  }

  let uid: string;
  try {
    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json(
        { error: "Firebase Admin is not configured" },
        { status: 503 },
      );
    }
    const decoded = await (await getAdminAuth()).verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid Firebase ID token";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const fileEntry = formData.get("file");
  const patientIdEntry = formData.get("patientId");

  if (!(fileEntry instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (typeof patientIdEntry !== "string" || !patientIdEntry) {
    return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  }

  const service = new FileUploadService(
    new VercelBlobFileStorage(),
    new StubEhrRepository(),
  );

  try {
    const medicalFile = await service.uploadMedicalFile({
      patientId: patientIdEntry,
      uploadedById: uid,
      file: fileEntry,
    });

    return NextResponse.json({
      ok: true,
      file: {
        ...medicalFile,
        createdAt: medicalFile.createdAt.toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    const status = message.includes("Only the patient") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
