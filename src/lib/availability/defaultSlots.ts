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

function atLocal(day: Date, hm: string): Date {
  const { h, m } = parseHm(hm);
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    h,
    m,
    0,
    0,
  );
}

function overlaps(a0: Date, a1: Date, b0: Date, b1: Date): boolean {
  return a0 < b1 && b0 < a1;
}

function ymd(d: Date): string {
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

export function resolveSlotMinutes(
  schedule: ScheduleConfig = DEFAULT_SCHEDULE,
): SlotDurationMinutes {
  return isSlotDurationMinutes(schedule.slotMinutes)
    ? schedule.slotMinutes
    : DEFAULT_SLOT_MINUTES;
}

/**
 * Free slots for a day from specialist schedule − busy appointments.
 * Grid step = schedule.slotMinutes (default 30).
 */
export function computeFreeSlots(
  day: Date,
  busy: BusyInterval[],
  now: Date = new Date(),
  schedule: ScheduleConfig = DEFAULT_SCHEDULE,
): FreeSlot[] {
  const weekday = day.getDay() as Weekday;
  if (!schedule.workdays.includes(weekday)) return [];

  const ranges = schedule.ranges.filter(isValidRange);
  if (ranges.length === 0) return [];

  const slotMinutes = resolveSlotMinutes(schedule);
  const candidates: FreeSlot[] = [];
  for (const range of ranges) {
    let cursor = atLocal(day, range.start);
    const end = atLocal(day, range.end);
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
  const weekday = startsAt.getDay() as Weekday;
  if (!schedule.workdays.includes(weekday)) return false;
  return schedule.ranges.some((range) => {
    if (!isValidRange(range)) return false;
    const day = new Date(
      startsAt.getFullYear(),
      startsAt.getMonth(),
      startsAt.getDate(),
    );
    const r0 = atLocal(day, range.start);
    const r1 = atLocal(day, range.end);
    return startsAt >= r0 && endsAt <= r1;
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
  return ymd(d);
}

export function hmToMinutes(hm: string): number {
  const { h, m } = parseHm(hm);
  return h * 60 + m;
}

/** Open work ranges for a calendar day as minutes from midnight (schedule TZ wall-clock). */
export function openMinuteRangesForDay(
  day: Date,
  schedule: ScheduleConfig = DEFAULT_SCHEDULE,
): { startMin: number; endMin: number }[] {
  const weekday = day.getDay() as Weekday;
  if (!schedule.workdays.includes(weekday)) return [];
  return schedule.ranges.filter(isValidRange).map((r) => ({
    startMin: hmToMinutes(r.start),
    endMin: hmToMinutes(r.end),
  }));
}

export function resolveScheduleTimezone(
  schedule: ScheduleConfig = DEFAULT_SCHEDULE,
): string {
  return schedule.timezone?.trim() || "America/Caracas";
}
