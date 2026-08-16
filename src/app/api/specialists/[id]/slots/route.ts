import { NextResponse } from "next/server";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { AdminAppointmentRepository } from "@/repositories/firestore/AdminAppointmentRepository";
import { AdminAvailabilityRepository } from "@/repositories/firestore/AdminAvailabilityRepository";
import { AdminUserRepository } from "@/repositories/firestore/AdminUserRepository";
import {
  computeFreeSlots,
  parseDateInput,
  resolveScheduleTimezone,
  resolveSlotMinutes,
} from "@/lib/availability/defaultSlots";
import { fromZonedYmdHm, addDaysYmd, zonedYmd } from "@/lib/availability/scheduleTimeZone";
import { GoogleCalendarService } from "@/services/googleCalendarService";

/**
 * GET /api/specialists/[id]/slots?date=YYYY-MM-DD
 * Free slots for an active specialist (schedule + Google FreeBusy).
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
    const scheduleTz = resolveScheduleTimezone(schedule);
    const dayYmd =
      dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
        ? dateParam
        : zonedYmd(day, scheduleTz);
    const dayStart = fromZonedYmdHm(dayYmd, "00:00", scheduleTz);
    const dayEnd = fromZonedYmdHm(addDaysYmd(dayYmd, 1), "00:00", scheduleTz);

    const appointments = await new AdminAppointmentRepository().list({
      specialistId: id,
    });
    const busy = appointments
      .filter((a) => a.startsAt >= dayStart && a.startsAt < dayEnd)
      .map((a) => ({
        startsAt: a.startsAt,
        endsAt: a.endsAt,
        status: a.status,
      }));

    // Patient cannot pick a slot that overlaps their other appointments.
    const patientBusy = await new AdminAppointmentRepository().list({
      patientId: auth.uid,
    });
    for (const a of patientBusy) {
      if (a.specialistId === id) continue;
      if (a.status !== "pending" && a.status !== "confirmed") continue;
      if (a.endsAt <= dayStart || a.startsAt >= dayEnd) continue;
      busy.push({
        startsAt: a.startsAt,
        endsAt: a.endsAt,
        status: a.status,
      });
    }

    let googleBusyCount = 0;
    try {
      const gBusy = await new GoogleCalendarService().listBusy(
        id,
        dayStart,
        dayEnd,
        scheduleTz,
      );
      googleBusyCount = gBusy.length;
      for (const g of gBusy) {
        busy.push({
          startsAt: g.startsAt,
          endsAt: g.endsAt,
          status: "confirmed",
        });
      }
    } catch {
      // FreeBusy failure must not break slot listing.
    }

    const slots = computeFreeSlots(day, busy, new Date(), schedule).map(
      (s) => ({
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
      }),
    );

    return NextResponse.json({
      specialistId: id,
      date: dateParam,
      slotMinutes: resolveSlotMinutes(schedule),
      schedule,
      googleBusyCount,
      slots,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load slots";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
