import { NextResponse } from "next/server";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { isAppTimezone } from "@/lib/timezones";
import { AdminUserRepository } from "@/repositories/firestore/AdminUserRepository";
import { canActAsSpecialist } from "@/types/domain";

/**
 * PATCH /api/patients/[id]/timezone
 * Body: { timezone: IANA string }
 * Self or active specialist/admin.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing patient id" }, { status: 400 });
  }

  let body: { timezone?: unknown };
  try {
    body = (await request.json()) as { timezone?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isAppTimezone(body.timezone)) {
    return NextResponse.json(
      { error: "Invalid timezone" },
      { status: 400 },
    );
  }

  const timezone = body.timezone;

  try {
    if (auth.uid !== id && !canActAsSpecialist(auth.role) && auth.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (auth.uid !== id && auth.role === "especialista") {
      const me = await new AdminUserRepository().getSpecialistByUserId(auth.uid);
      if (!me || me.status !== "active") {
        return NextResponse.json(
          { error: "Specialist must be active" },
          { status: 403 },
        );
      }
    }

    const profile = await new AdminUserRepository().updateTimezone(id, timezone);
    return NextResponse.json({
      id: profile.id,
      timezone: profile.timezone,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update timezone";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
