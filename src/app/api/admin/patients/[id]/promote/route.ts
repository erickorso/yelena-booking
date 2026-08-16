import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { AdminUserRepository } from "@/repositories/firestore/AdminUserRepository";

interface PromoteBody {
  specialty?: unknown;
  licenseNumber?: unknown;
  bio?: unknown;
  location?: unknown;
  /** If true, activate immediately; otherwise pending queue. */
  activate?: unknown;
}

/**
 * POST /api/admin/patients/[id]/promote
 * Admin elevates a patient to specialist (pending or active).
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request, ["admin"]);
  if (isAuthError(auth)) return auth;

  const { id: patientId } = await context.params;
  if (!patientId) {
    return NextResponse.json({ error: "Missing patient id" }, { status: 400 });
  }

  let body: PromoteBody;
  try {
    body = (await request.json()) as PromoteBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const specialty =
    typeof body.specialty === "string" ? body.specialty.trim() : "";
  const licenseNumber =
    typeof body.licenseNumber === "string" ? body.licenseNumber.trim() : "";
  const activate = body.activate === true;

  if (!specialty || !licenseNumber) {
    return NextResponse.json(
      { error: "specialty and licenseNumber are required" },
      { status: 400 },
    );
  }

  try {
    const users = new AdminUserRepository();
    const profile = await users.getById(patientId);
    if (!profile) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }
    if (profile.role !== "paciente") {
      return NextResponse.json(
        { error: "Only patients can be promoted" },
        { status: 400 },
      );
    }

    const existing = await users.getSpecialistByUserId(patientId);
    if (existing) {
      return NextResponse.json(
        {
          error: "Specialist profile already exists",
          status: existing.status,
        },
        { status: 409 },
      );
    }

    const status = activate ? "active" : "pending";
    const specialist = await users.createSpecialist({
      id: patientId,
      userId: patientId,
      specialty,
      licenseNumber,
      bio: typeof body.bio === "string" ? body.bio : "",
      location: typeof body.location === "string" ? body.location : "",
      status,
    });

    const adminAuth = await getAdminAuth();
    await adminAuth.setCustomUserClaims(patientId, { role: "especialista" });
    await users.updateRole(patientId, "especialista");

    return NextResponse.json({
      ok: true,
      specialist: {
        id: specialist.id,
        status: specialist.status,
        specialty: specialist.specialty,
        displayName: profile.displayName,
        email: profile.email,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Promotion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
