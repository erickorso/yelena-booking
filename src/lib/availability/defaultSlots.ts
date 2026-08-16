import type {
  TimeRange,
  Weekday,
  SpecialistSchedule,
  SlotDurationMinutes,
} from "@/types/domain";
import {
  DEFAULT_SLOT_MINUTES,
  isSlotDurationMinutes,
} from "@/types/domain";
import type { AppointmentStatus } from "@/types/domain";
import {
  addDaysYmd,
  fromZonedWallClock,
  fromZonedYmdHm,
  getZonedParts,
  minutesFromMidnightInZone,
  zonedYmd,
} from "@/lib/availability/scheduleTimeZone";

export type BusyInterval = {
  startsAt: Date;
  endsAt: Date;
  status: AppointmentStatus | string;
};

export type FreeSlot = {
  startsAt: Date;
  endsAt: Date;
};

/** @deprecated Prefer SpecialistSchedule from domain; alias kept for call sites. */
export type ScheduleConfig = SpecialistSchedule;

/** Fallback default length when schedule omits slotMinutes. */
export const SLOT_MINUTES = DEFAULT_SLOT_MINUTES;

/** Fallback until the specialist saves their own hours. */
export const DEFAULT_SCHEDULE: ScheduleConfig = {
  workdays: [1, 2, 3, 4, 5],
  ranges: [
    { start: "09:00", end: "13:00" },
    { start: "15:00", end: "18:00" },
  ],
  timezone: "America/Caracas",
  slotMinutes: DEFAULT_SLOT_MINUTES,
};

const BLOCKING: ReadonlySet<string> = new Set([
  "pending",
  "confirmed",
  "completed",
  "no_show",
]);

function parseHm(hm: string): { h: number; m: number } {
  const [h, m] = hm.split(":").map(Number);
  return { h: h ?? 0, m: m ?? 0 };
}

function overlaps(a0: Date, a1: Date, b0: Date, b1: Date): boolean {
  return a0 < b1 && b0 < a1;
}

function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isValidRange(r: TimeRange): boolean {
  const a = parseHm(r.start);
  const b = parseHm(r.end);
  return a.h * 60 + a.m < b.h * 60 + b.m;
}

export function resolveScheduleTimezone(
  schedule: ScheduleConfig = DEFAULT_SCHEDULE,
): string {
  return schedule.timezone?.trim() || "America/Caracas";
}

export function resolveSlotMinutes(
  schedule: ScheduleConfig = DEFAULT_SCHEDULE,
): SlotDurationMinutes {
  return isSlotDurationMinutes(schedule.slotMinutes)
    ? schedule.slotMinutes
    : DEFAULT_SLOT_MINUTES;
}

/**
 * Free slots for a calendar day (YMD interpreted in schedule timezone).
 * `day` may be any instant on that civil day; YMD is taken in schedule TZ when possible,
 * or from local YMD if `day` was built as noon local for a date picker.
 */
export function computeFreeSlots(
  day: Date,
  busy: BusyInterval[],
  now: Date = new Date(),
  schedule: ScheduleConfig = DEFAULT_SCHEDULE,
): FreeSlot[] {
  const tz = resolveScheduleTimezone(schedule);
  // Prefer explicit local YMD for date-picker days (noon local), else zoned.
  const dayYmd = ymdLocal(day);
  const probe = fromZonedYmdHm(dayYmd, "12:00", tz);
  const weekday = getZonedParts(probe, tz).weekday as Weekday;
  if (!schedule.workdays.includes(weekday)) return [];

  const ranges = schedule.ranges.filter(isValidRange);
  if (ranges.length === 0) return [];

  const slotMinutes = resolveSlotMinutes(schedule);
  const candidates: FreeSlot[] = [];
  for (const range of ranges) {
    let cursor = fromZonedYmdHm(dayYmd, range.start, tz);
    const end = fromZonedYmdHm(dayYmd, range.end, tz);
    while (cursor.getTime() + slotMinutes * 60_000 <= end.getTime()) {
      const slotEnd = new Date(cursor.getTime() + slotMinutes * 60_000);
      candidates.push({ startsAt: new Date(cursor), endsAt: slotEnd });
      cursor = slotEnd;
    }
  }

  const blocking = busy.filter((b) => BLOCKING.has(b.status));

  return candidates.filter((slot) => {
    if (slot.startsAt <= now) return false;
    return !blocking.some((b) =>
      overlaps(slot.startsAt, slot.endsAt, b.startsAt, b.endsAt),
    );
  });
}

/** Whether a proposed interval falls inside the schedule (ignoring busy). */
export function isWithinSchedule(
  startsAt: Date,
  endsAt: Date,
  schedule: ScheduleConfig = DEFAULT_SCHEDULE,
): boolean {
  const tz = resolveScheduleTimezone(schedule);
  const startParts = getZonedParts(startsAt, tz);
  const endParts = getZonedParts(endsAt, tz);
  const startYmd = zonedYmd(startsAt, tz);
  const endYmd = zonedYmd(endsAt, tz);
  if (startYmd !== endYmd) return false;

  const weekday = startParts.weekday as Weekday;
  if (!schedule.workdays.includes(weekday)) return false;

  const startMin = startParts.hour * 60 + startParts.minute;
  const endMin =
    endParts.hour * 60 + endParts.minute + (endParts.second > 0 ? 1 : 0);

  return schedule.ranges.some((range) => {
    if (!isValidRange(range)) return false;
    const r0 = parseHm(range.start);
    const r1 = parseHm(range.end);
    const rangeStart = r0.h * 60 + r0.m;
    const rangeEnd = r1.h * 60 + r1.m;
    return startMin >= rangeStart && endMin <= rangeEnd;
  });
}

export type IntervalAvailability =
  | { ok: true }
  | {
      ok: false;
      reason: "past" | "outside_hours" | "busy" | "invalid";
    };

/**
 * Full check for a proposed booking window (schedule + busy + not past).
 */
export function checkIntervalAvailability(
  startsAt: Date,
  endsAt: Date,
  busy: BusyInterval[],
  schedule: ScheduleConfig = DEFAULT_SCHEDULE,
  now: Date = new Date(),
): IntervalAvailability {
  if (
    Number.isNaN(startsAt.getTime()) ||
    Number.isNaN(endsAt.getTime()) ||
    endsAt <= startsAt
  ) {
    return { ok: false, reason: "invalid" };
  }
  if (startsAt <= now) {
    return { ok: false, reason: "past" };
  }
  if (!isWithinSchedule(startsAt, endsAt, schedule)) {
    return { ok: false, reason: "outside_hours" };
  }
  const blocking = busy.filter((b) => BLOCKING.has(b.status));
  if (
    blocking.some((b) =>
      overlaps(startsAt, endsAt, b.startsAt, b.endsAt),
    )
  ) {
    return { ok: false, reason: "busy" };
  }
  return { ok: true };
}

export function parseDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y!, m! - 1, d!, 12, 0, 0, 0);
}

export function toDateInputValue(d: Date): string {
  return ymdLocal(d);
}

export function hmToMinutes(hm: string): number {
  const { h, m } = parseHm(hm);
  return h * 60 + m;
}

/** Open work ranges for a calendar day as minutes from midnight (schedule TZ). */
export function openMinuteRangesForDay(
  day: Date,
  schedule: ScheduleConfig = DEFAULT_SCHEDULE,
): { startMin: number; endMin: number }[] {
  const tz = resolveScheduleTimezone(schedule);
  const dayYmd = zonedYmd(day, tz);
  const weekday = getZonedParts(fromZonedYmdHm(dayYmd, "12:00", tz), tz)
    .weekday as Weekday;
  if (!schedule.workdays.includes(weekday)) return [];
  return schedule.ranges.filter(isValidRange).map((r) => ({
    startMin: hmToMinutes(r.start),
    endMin: hmToMinutes(r.end),
  }));
}

/**
 * Specialist working windows projected onto a civil day in `displayTimeZone`
 * (e.g. patient TZ). Used so José books at his 08:00 while schedule stays Madrid.
 */
export function openMinuteRangesForDisplayDay(
  displayYmd: string,
  displayTimeZone: string,
  schedule: ScheduleConfig = DEFAULT_SCHEDULE,
): { startMin: number; endMin: number }[] {
  const scheduleTz = resolveScheduleTimezone(schedule);
  const dayStart = fromZonedYmdHm(displayYmd, "00:00", displayTimeZone);
  const dayEnd = fromZonedYmdHm(addDaysYmd(displayYmd, 1), "00:00", displayTimeZone);

  const specialistYmds = new Set<string>([
    zonedYmd(dayStart, scheduleTz),
    zonedYmd(new Date(dayEnd.getTime() - 1), scheduleTz),
  ]);

  const bands: { startMin: number; endMin: number }[] = [];
  for (const specYmd of specialistYmds) {
    const weekday = getZonedParts(fromZonedYmdHm(specYmd, "12:00", scheduleTz), scheduleTz)
      .weekday as Weekday;
    if (!schedule.workdays.includes(weekday)) continue;
    for (const range of schedule.ranges.filter(isValidRange)) {
      const r0 = fromZonedYmdHm(specYmd, range.start, scheduleTz);
      const r1 = fromZonedYmdHm(specYmd, range.end, scheduleTz);
      const a = Math.max(r0.getTime(), dayStart.getTime());
      const b = Math.min(r1.getTime(), dayEnd.getTime());
      if (a >= b) continue;
      const startMin = minutesFromMidnightInZone(new Date(a), displayTimeZone);
      const endPartsYmd = zonedYmd(new Date(b), displayTimeZone);
      const endMin =
        endPartsYmd === displayYmd
          ? minutesFromMidnightInZone(new Date(b), displayTimeZone)
          : 24 * 60;
      if (endMin > startMin) bands.push({ startMin, endMin });
    }
  }

  bands.sort((x, y) => x.startMin - y.startMin);
  return bands;
}

/** Build an instant from civil YMD + HH:mm in an explicit IANA timezone. */
export function wallClockInstant(
  ymd: string,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  return fromZonedWallClock(
    Number(ymd.slice(0, 4)),
    Number(ymd.slice(5, 7)),
    Number(ymd.slice(8, 10)),
    hour,
    minute,
    timeZone,
  );
}

/** @deprecated Prefer wallClockInstant + display TZ; kept for schedule-local slots. */
export function slotInstant(
  ymd: string,
  hour: number,
  minute: number,
  schedule: ScheduleConfig = DEFAULT_SCHEDULE,
): Date {
  return wallClockInstant(
    ymd,
    hour,
    minute,
    resolveScheduleTimezone(schedule),
  );
}

export { minutesFromMidnightInZone, zonedYmd, fromZonedWallClock, addDaysYmd };
