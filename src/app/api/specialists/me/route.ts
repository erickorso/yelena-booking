import { NextResponse } from "next/server";
import { getAdminAuth, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { AdminUserRepository } from "@/repositories/firestore/AdminUserRepository";

/**
 * GET /api/specialists/me — current specialist profile + approval status.
 */
export async function GET(request: Request) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Firebase Admin is not configured" },
      { status: 503 },
    );
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const idToken = authorization.slice("Bearer ".length).trim();

  try {
    const decoded = await (await getAdminAuth()).verifyIdToken(idToken);
    if (decoded.role !== "especialista" && decoded.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = new AdminUserRepository();
    const specialist = await users.getSpecialistByUserId(decoded.uid);

    if (!specialist) {
      return NextResponse.json({ specialist: null });
    }

    return NextResponse.json({
      specialist: {
        id: specialist.id,
        status: specialist.status,
        specialty: specialist.specialty,
        licenseNumber: specialist.licenseNumber,
        location: specialist.location,
        bio: specialist.bio,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load specialist profile";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
