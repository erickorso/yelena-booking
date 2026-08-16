import "server-only";

import { NextResponse } from "next/server";
import { AdminUserRepository } from "@/repositories/firestore/AdminUserRepository";
import {
  canActAsSpecialist,
  canOperateClinic,
  type AuthRole,
} from "@/types/domain";

/**
 * Deny unless actor may run clinic ops (active especialista, or admin).
 * Returns a 403 Response, or null when allowed.
 */
export async function denyUnlessActiveSpecialist(
  uid: string,
  role: AuthRole,
): Promise<NextResponse | null> {
  if (role === "admin") return null;
  if (!canActAsSpecialist(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const me = await new AdminUserRepository().getSpecialistByUserId(uid);
  if (!canOperateClinic(role, me?.status)) {
    return NextResponse.json(
      { error: "Specialist must be active" },
      { status: 403 },
    );
  }
  return null;
}
