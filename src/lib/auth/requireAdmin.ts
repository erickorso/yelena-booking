import "server-only";

import { getAdminAuth, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import type { AuthRole } from "@/types/domain";

export type AuthedAdmin = {
  uid: string;
  role: AuthRole;
};

/**
 * Verifies Bearer ID token and ensures caller has admin claim.
 */
export async function requireAdmin(
  request: Request,
): Promise<AuthedAdmin | Response> {
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
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    if (decoded.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    return { uid: decoded.uid, role: "admin" };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid Firebase ID token";
    return Response.json({ error: message }, { status: 401 });
  }
}

export function isErrorResponse(
  value: AuthedAdmin | Response,
): value is Response {
  return value instanceof Response;
}
