import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { AdminUserRepository } from "@/repositories/firestore/AdminUserRepository";

interface PromoteBody {
  specialty?: unknown;
  licenseNumber?: unknown;
  bio?: unknown;
  location?: unknown;
}

/**
 * POST /api/specialists/promote
 * Patient requests elevation to specialist (pending admin approval).
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request, ["paciente"]);
  if (isAuthError(auth)) return auth;

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

  if (!specialty || !licenseNumber) {
    return NextResponse.json(
      { error: "specialty and licenseNumber are required" },
      { status: 400 },
    );
  }

  try {
    const users = new AdminUserRepository();
    const existing = await users.getSpecialistByUserId(auth.uid);
    if (existing) {
      return NextResponse.json(
        {
          error: "Specialist profile already exists",
          status: existing.status,
        },
        { status: 409 },
      );
    }

    const profile = await users.getById(auth.uid);
    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const specialist = await users.createSpecialist({
      id: auth.uid,
      userId: auth.uid,
      specialty,
      licenseNumber,
      bio: typeof body.bio === "string" ? body.bio : "",
      location: typeof body.location === "string" ? body.location : "",
      status: "pending",
    });

    const adminAuth = await getAdminAuth();
    await adminAuth.setCustomUserClaims(auth.uid, { role: "especialista" });
    await users.updateRole(auth.uid, "especialista");

    return NextResponse.json({
      ok: true,
      role: "especialista",
      specialist: {
        id: specialist.id,
        status: specialist.status,
        specialty: specialist.specialty,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Promotion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
