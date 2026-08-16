import "server-only";

import { getAdminAuth, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { isAuthRole, type AuthRole } from "@/types/domain";
import { resolveClinicId } from "@/lib/clinic/constants";

export type AuthedUser = {
  uid: string;
  role: AuthRole;
  email: string | null;
  clinicId: string;
};

/**
 * Verifies Bearer ID token. Optionally restricts to `allowed` roles.
 */
export async function requireAuth(
  request: Request,
  allowed?: readonly AuthRole[],
): Promise<AuthedUser | Response> {
  if (!isFirebaseAdminConfigured()) {
    return Response.json(
      { error: "Firebase Admin is not configured" },
      { status: 503 },
    );
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return Response.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const idToken = authorization.slice("Bearer ".length).trim();
  if (!idToken) {
    return Response.json({ error: "Empty bearer token" }, { status: 401 });
  }

  try {
    const decoded = await (await getAdminAuth()).verifyIdToken(idToken);
    if (!decoded.email_verified) {
      return Response.json({ error: "Email not verified" }, { status: 403 });
    }
    if (!isAuthRole(decoded.role)) {
      return Response.json({ error: "Missing role claim" }, { status: 403 });
    }
    const role = decoded.role;
    if (allowed && !allowed.includes(role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    return {
      uid: decoded.uid,
      role,
      email: typeof decoded.email === "string" ? decoded.email : null,
      clinicId: resolveClinicId(
        typeof decoded.clinicId === "string" ? decoded.clinicId : null,
      ),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid Firebase ID token";
    return Response.json({ error: message }, { status: 401 });
  }
}

export function isAuthError(
  value: AuthedUser | Response,
): value is Response {
  return value instanceof Response;
}
