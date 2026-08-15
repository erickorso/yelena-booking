import { NextResponse } from "next/server";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { AdminAppointmentRepository } from "@/repositories/firestore/AdminAppointmentRepository";
import { AdminAvailabilityRepository } from "@/repositories/firestore/AdminAvailabilityRepository";
import { AdminUserRepository } from "@/repositories/firestore/AdminUserRepository";
import {
  computeFreeSlots,
  parseDateInput,
} from "@/lib/availability/defaultSlots";

/**
 * GET /api/specialists/[id]/slots?date=YYYY-MM-DD
 * Free slots for an active specialist (uses their saved schedule).
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing specialist id" }, { status: 400 });
  }

  const dateParam = new URL(request.url).searchParams.get("date");
  const day = dateParam ? parseDateInput(dateParam) : null;
  if (!day) {
    return NextResponse.json(
      { error: "date=YYYY-MM-DD is required" },
      { status: 400 },
    );
  }

  try {
    const users = new AdminUserRepository();
    const specialist = await users.getSpecialistByUserId(id);
    if (!specialist || specialist.status !== "active") {
      return NextResponse.json(
        { error: "Specialist not active" },
        { status: 404 },
      );
    }

    const schedule = await new AdminAvailabilityRepository().getConfigOrDefault(
      id,
    );

    const appointments = await new AdminAppointmentRepository().list({
      specialistId: id,
    });
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const busy = appointments
      .filter((a) => a.startsAt >= dayStart && a.startsAt < dayEnd)
      .map((a) => ({
        startsAt: a.startsAt,
        endsAt: a.endsAt,
        status: a.status,
      }));

    const slots = computeFreeSlots(day, busy, new Date(), schedule).map(
      (s) => ({
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
      }),
    );

    return NextResponse.json({
      specialistId: id,
      date: dateParam,
      slotMinutes: 30,
      schedule,
      slots,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load slots";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
