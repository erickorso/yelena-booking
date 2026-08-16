import "server-only";

import { AdminAppointmentRepository } from "@/repositories/firestore/AdminAppointmentRepository";
import { AdminAvailabilityRepository } from "@/repositories/firestore/AdminAvailabilityRepository";
import { AdminUserRepository } from "@/repositories/firestore/AdminUserRepository";
import {
  computeFreeSlots,
  parseDateInput,
  resolveScheduleTimezone,
  resolveSlotMinutes,
  type ScheduleConfig,
} from "@/lib/availability/defaultSlots";
import {
  addDaysYmd,
  fromZonedYmdHm,
  zonedYmd,
} from "@/lib/availability/scheduleTimeZone";
import { GoogleCalendarService } from "@/services/googleCalendarService";

export type IsoSlot = {
  startsAt: string;
  endsAt: string;
};

export type SpecialistDaySlotsResult = {
  slots: IsoSlot[];
  schedule: ScheduleConfig;
  slotMinutes: number;
  googleBusyCount: number;
};

function eachYmdInclusive(fromYmd: string, toYmd: string): string[] {
  const out: string[] = [];
  let cur = fromYmd;
  while (cur <= toYmd) {
    out.push(cur);
    cur = addDaysYmd(cur, 1);
    if (out.length > 31) break;
  }
  return out;
}

/**
 * Free slots for an active specialist over one or more civil days (schedule TZ),
 * including Yelena appointments, patient overlaps, and Google FreeBusy.
 */
export async function computeSpecialistRangeSlots(input: {
  specialistUserId: string;
  fromYmd: string;
  toYmd: string;
  patientId: string | null;
  now?: Date;
}): Promise<SpecialistDaySlotsResult | null> {
  const { specialistUserId, fromYmd, toYmd, patientId } = input;
  const now = input.now ?? new Date();

  const users = new AdminUserRepository();
  const specialist = await users.getSpecialistByUserId(specialistUserId);
  if (!specialist || specialist.status !== "active") {
    return null;
  }

  const schedule = await new AdminAvailabilityRepository().getConfigOrDefault(
    specialistUserId,
  );
  const scheduleTz = resolveScheduleTimezone(schedule);
  const rangeStart = fromZonedYmdHm(fromYmd, "00:00", scheduleTz);
  const rangeEnd = fromZonedYmdHm(addDaysYmd(toYmd, 1), "00:00", scheduleTz);

  const appointments = await new AdminAppointmentRepository().list({
    specialistId: specialistUserId,
  });
  const specialistBusy = appointments
    .filter((a) => a.startsAt < rangeEnd && a.endsAt > rangeStart)
    .map((a) => ({
      startsAt: a.startsAt,
      endsAt: a.endsAt,
      status: a.status,
    }));

  const patientBusy: Array<{
    startsAt: Date;
    endsAt: Date;
    status: string;
  }> = [];
  if (patientId) {
    const patientAppts = await new AdminAppointmentRepository().list({
      patientId,
    });
    for (const a of patientAppts) {
      if (a.specialistId === specialistUserId) continue;
      if (a.status !== "pending" && a.status !== "confirmed") continue;
      if (a.endsAt <= rangeStart || a.startsAt >= rangeEnd) continue;
      patientBusy.push({
        startsAt: a.startsAt,
        endsAt: a.endsAt,
        status: a.status,
      });
    }
  }

  let googleBusyCount = 0;
  const googleBusy: Array<{
    startsAt: Date;
    endsAt: Date;
    status: string;
  }> = [];
  try {
    const gBusy = await new GoogleCalendarService().listBusy(
      specialistUserId,
      rangeStart,
      rangeEnd,
      scheduleTz,
    );
    googleBusyCount = gBusy.length;
    for (const g of gBusy) {
      googleBusy.push({
        startsAt: g.startsAt,
        endsAt: g.endsAt,
        status: "confirmed",
      });
    }
  } catch {
    // FreeBusy failure must not break slot listing.
  }

  const days = eachYmdInclusive(fromYmd, toYmd);
  const slots: IsoSlot[] = [];

  for (const dayYmd of days) {
    const dayStart = fromZonedYmdHm(dayYmd, "00:00", scheduleTz);
    const dayEnd = fromZonedYmdHm(addDaysYmd(dayYmd, 1), "00:00", scheduleTz);
    const busy = [
      ...specialistBusy.filter(
        (b) => b.startsAt < dayEnd && b.endsAt > dayStart,
      ),
      ...patientBusy.filter((b) => b.startsAt < dayEnd && b.endsAt > dayStart),
      ...googleBusy.filter((b) => b.startsAt < dayEnd && b.endsAt > dayStart),
    ];

    const day = parseDateInput(dayYmd);
    if (!day) continue;
    for (const s of computeFreeSlots(day, busy, now, schedule)) {
      slots.push({
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
      });
    }
  }

  return {
    slots,
    schedule,
    slotMinutes: resolveSlotMinutes(schedule),
    googleBusyCount,
  };
}

/** Single-day convenience wrapper (legacy route shape). */
export async function computeSpecialistDaySlots(input: {
  specialistUserId: string;
  dayYmd: string;
  patientId: string | null;
  now?: Date;
}): Promise<SpecialistDaySlotsResult | null> {
  return computeSpecialistRangeSlots({
    specialistUserId: input.specialistUserId,
    fromYmd: input.dayYmd,
    toYmd: input.dayYmd,
    patientId: input.patientId,
    now: input.now,
  });
}

export function isYmd(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function resolveDayYmd(
  dateParam: string,
  scheduleTz: string,
): string {
  if (isYmd(dateParam)) return dateParam;
  const day = new Date(dateParam);
  if (Number.isNaN(day.getTime())) return dateParam;
  return zonedYmd(day, scheduleTz);
}
