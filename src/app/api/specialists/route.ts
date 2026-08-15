import { NextResponse } from "next/server";
import { isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { AdminUserRepository } from "@/repositories/firestore/AdminUserRepository";

export const runtime = "nodejs";

/**
 * GET /api/specialists — public directory of active specialists.
 */
export async function GET() {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Firebase Admin is not configured" },
      { status: 503 },
    );
  }

  try {
    const users = new AdminUserRepository();
    const active = await users.listActiveSpecialists();

    const specialists = await Promise.all(
      active.map(async (specialist) => {
        const profile = await users.getById(specialist.userId);
        return {
          id: specialist.id,
          specialty: specialist.specialty,
          location: specialist.location,
          bio: specialist.bio,
          rating: specialist.rating,
          displayName: profile?.displayName ?? "Especialista",
        };
      }),
    );

    return NextResponse.json({ specialists });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list specialists";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
