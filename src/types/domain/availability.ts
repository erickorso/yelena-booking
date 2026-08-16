/** Allowed consultation lengths (minutes). */
export const SLOT_DURATION_OPTIONS = [
  15, 20, 30, 45, 60, 75, 90, 105, 120,
] as const;

export type SlotDurationMinutes = (typeof SLOT_DURATION_OPTIONS)[number];

export const DEFAULT_SLOT_MINUTES: SlotDurationMinutes = 30;

/** 0 = Sunday … 6 = Saturday (JS Date.getDay()). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEEKDAYS: readonly Weekday[] = [0, 1, 2, 3, 4, 5, 6];

export interface TimeRange {
  /** HH:mm in specialist schedule timezone */
  start: string;
  end: string;
}

/**
 * Specialist weekly working hours (domain snapshot).
 * Used by availability engine and booking APIs.
 */
export interface SpecialistSchedule {
  workdays: readonly Weekday[];
  ranges: readonly TimeRange[];
  /** Default booking length when clicking the calendar. */
  slotMinutes?: SlotDurationMinutes;
  /** IANA timezone; omit → interpret as local wall-clock (legacy). */
  timezone?: string;
}

export interface AvailabilityRule {
  id: string;
  specialistId: string;
  weekday: Weekday;
  slots: TimeRange[];
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AvailabilityOverrideType = "block" | "custom_slots";

export interface AvailabilityOverride {
  id: string;
  specialistId: string;
  date: string; // YYYY-MM-DD
  type: AvailabilityOverrideType;
  slots: TimeRange[];
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const HM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isWeekday(value: unknown): value is Weekday {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 6
  );
}

export function isSlotDurationMinutes(
  value: unknown,
): value is SlotDurationMinutes {
  return (
    typeof value === "number" &&
    (SLOT_DURATION_OPTIONS as readonly number[]).includes(value)
  );
}

export function isValidTimeRange(range: TimeRange): boolean {
  if (!HM.test(range.start) || !HM.test(range.end)) return false;
  const [sh, sm] = range.start.split(":").map(Number);
  const [eh, em] = range.end.split(":").map(Number);
  return (sh! * 60 + sm!) < (eh! * 60 + em!);
}

export function assertValidSchedule(schedule: SpecialistSchedule): void {
  if (!schedule.workdays.length) {
    throw new Error("Schedule must include at least one workday");
  }
  if (!schedule.workdays.every(isWeekday)) {
    throw new Error("Invalid weekday in schedule");
  }
  if (!schedule.ranges.length) {
    throw new Error("Schedule must include at least one time range");
  }
  if (!schedule.ranges.every(isValidTimeRange)) {
    throw new Error("Invalid schedule time range (expected HH:mm, start < end)");
  }
  if (
    schedule.slotMinutes !== undefined &&
    !isSlotDurationMinutes(schedule.slotMinutes)
  ) {
    throw new Error("slotMinutes must be between 15 and 120 in 15-min steps");
  }
}
