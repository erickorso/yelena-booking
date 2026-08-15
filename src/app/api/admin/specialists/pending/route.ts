import { NextResponse } from "next/server";
import { isErrorResponse, requireAdmin } from "@/lib/auth/requireAdmin";
import { AdminUserRepository } from "@/repositories/firestore/AdminUserRepository";

/**
 * GET /api/admin/specialists/pending
 * Admin-only queue of specialists awaiting approval.
 */
export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const users = new AdminUserRepository();
    const pending = await users.listPendingSpecialists();

    const specialists = await Promise.all(
      pending.map(async (specialist) => {
        const profile = await users.getById(specialist.userId);
        return {
          id: specialist.id,
          userId: specialist.userId,
          specialty: specialist.specialty,
          licenseNumber: specialist.licenseNumber,
          location: specialist.location,
          bio: specialist.bio,
          status: specialist.status,
          displayName: profile?.displayName ?? "—",
          email: profile?.email ?? "—",
          createdAt: specialist.createdAt.toISOString(),
        };
      }),
    );

    return NextResponse.json({ specialists });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list pending specialists";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
