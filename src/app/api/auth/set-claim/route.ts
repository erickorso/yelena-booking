import { NextResponse } from "next/server";
import { getAdminAuth, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { isAuthRole, type AuthRole } from "@/types/domain";

interface SetClaimBody {
  uid?: unknown;
  role?: unknown;
}

/**
 * POST /api/auth/set-claim
 * Body: { uid: string, role: AuthRole }
 *
 * - Caller must send Firebase ID token as `Authorization: Bearer <token>`.
 * - Self-service: authenticated user may assign themselves `paciente` once.
 * - Admin: may assign any AuthRole to any uid.
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

  let body: SetClaimBody;
  try {
    body = (await request.json()) as SetClaimBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const targetUid = typeof body.uid === "string" ? body.uid : null;
  if (!targetUid || !isAuthRole(body.role)) {
    return NextResponse.json(
      { error: "uid (string) and role (AuthRole) are required" },
      { status: 400 },
    );
  }
  const role = body.role as AuthRole;

  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(idToken);
    const callerRole =
      typeof decoded.role === "string" ? decoded.role : undefined;
    const isAdmin = callerRole === "admin";
    const isSelfPatientBootstrap =
      decoded.uid === targetUid && role === "paciente";

    if (!isAdmin && !isSelfPatientBootstrap) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await auth.setCustomUserClaims(targetUid, { role });

    return NextResponse.json({
      ok: true,
      uid: targetUid,
      role,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to set custom claim";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
