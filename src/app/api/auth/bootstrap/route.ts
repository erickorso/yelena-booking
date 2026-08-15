import { NextResponse } from "next/server";
import { getAdminAuth, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { AdminUserRepository } from "@/repositories/firestore/AdminUserRepository";
import { isAuthRole, type AuthRole } from "@/types/domain";

interface BootstrapBody {
  role?: unknown;
  displayName?: unknown;
  locale?: unknown;
  specialty?: unknown;
  licenseNumber?: unknown;
  bio?: unknown;
  location?: unknown;
}

const SELF_SERVICE_ROLES: readonly AuthRole[] = ["paciente", "especialista"];

/**
 * POST /api/auth/bootstrap
 * Creates Firestore profile + custom claim after signup.
 * Body: { role: 'paciente'|'especialista', displayName, locale?, specialty?, licenseNumber? }
 */
export async function POST(request: Request) {
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
  if (!idToken) {
    return NextResponse.json({ error: "Empty bearer token" }, { status: 401 });
  }

  let body: BootstrapBody;
  try {
    body = (await request.json()) as BootstrapBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isAuthRole(body.role) || !SELF_SERVICE_ROLES.includes(body.role)) {
    return NextResponse.json(
      { error: "role must be paciente or especialista" },
      { status: 400 },
    );
  }

  const role = body.role;
  const displayName =
    typeof body.displayName === "string" && body.displayName.trim()
      ? body.displayName.trim()
      : null;
  const locale = body.locale === "en" || body.locale === "es" ? body.locale : "es";

  if (!displayName) {
    return NextResponse.json({ error: "displayName is required" }, { status: 400 });
  }

  if (role === "especialista") {
    if (
      typeof body.specialty !== "string" ||
      !body.specialty.trim() ||
      typeof body.licenseNumber !== "string" ||
      !body.licenseNumber.trim()
    ) {
      return NextResponse.json(
        { error: "specialty and licenseNumber are required for especialistas" },
        { status: 400 },
      );
    }
  }

  try {
    const auth = await getAdminAuth();
    const decoded = await auth.verifyIdToken(idToken);
    const existingClaim =
      typeof decoded.role === "string" ? decoded.role : undefined;

    if (existingClaim === "admin") {
      return NextResponse.json({
        ok: true,
        uid: decoded.uid,
        role: "admin",
        skipped: true,
      });
    }

    if (existingClaim && existingClaim !== role) {
      return NextResponse.json(
        { error: "Role already assigned; contact admin to change it" },
        { status: 409 },
      );
    }

    const users = new AdminUserRepository();
    const email = decoded.email ?? "";
    if (!email) {
      return NextResponse.json(
        { error: "Authenticated user must have an email" },
        { status: 400 },
      );
    }

    await auth.setCustomUserClaims(decoded.uid, { role });

    const profile = await users.create({
      id: decoded.uid,
      email,
      displayName,
      photoUrl: typeof decoded.picture === "string" ? decoded.picture : null,
      role,
      locale,
    });

    let specialist = null;
    if (role === "especialista") {
      specialist = await users.createSpecialist({
        id: decoded.uid,
        userId: decoded.uid,
        specialty: String(body.specialty).trim(),
        licenseNumber: String(body.licenseNumber).trim(),
        bio: typeof body.bio === "string" ? body.bio : "",
        location: typeof body.location === "string" ? body.location : "",
        status: "pending",
      });
    }

    return NextResponse.json({
      ok: true,
      uid: decoded.uid,
      role,
      profile: {
        ...profile,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      },
      specialist: specialist
        ? {
            ...specialist,
            createdAt: specialist.createdAt.toISOString(),
            updatedAt: specialist.updatedAt.toISOString(),
          }
        : null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Bootstrap failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
