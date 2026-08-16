import { describe, expect, it } from "vitest";
import {
  checkIntervalAvailability,
  computeFreeSlots,
  DEFAULT_SCHEDULE,
  hmToMinutes,
  isWithinSchedule,
  openMinuteRangesForDay,
  openMinuteRangesForDisplayDay,
  parseDateInput,
  toDateInputValue,
} from "@/lib/availability/defaultSlots";
import { fromZonedYmdHm } from "@/lib/availability/scheduleTimeZone";

describe("computeFreeSlots", () => {
  it("returns empty on Sunday", () => {
    const sunday = parseDateInput("2026-08-16")!;
    const slots = computeFreeSlots(sunday, [], new Date("2026-08-01T12:00:00Z"));
    expect(slots).toHaveLength(0);
  });

  it("excludes overlapping busy appointments", () => {
    const monday = parseDateInput("2026-08-17")!;
    const now = new Date("2026-08-01T12:00:00Z");
    const busy = [
      {
        startsAt: fromZonedYmdHm("2026-08-17", "09:00", "America/Caracas"),
        endsAt: fromZonedYmdHm("2026-08-17", "09:30", "America/Caracas"),
        status: "confirmed",
      },
    ];
    const slots = computeFreeSlots(monday, busy, now, DEFAULT_SCHEDULE);
    expect(
      slots.some(
        (s) =>
          s.startsAt.getTime() ===
          fromZonedYmdHm("2026-08-17", "09:00", "America/Caracas").getTime(),
      ),
    ).toBe(false);
    expect(
      slots.some(
        (s) =>
          s.startsAt.getTime() ===
          fromZonedYmdHm("2026-08-17", "09:30", "America/Caracas").getTime(),
      ),
    ).toBe(true);
  });

  it("respects custom workdays only", () => {
    const wednesday = parseDateInput("2026-08-19")!;
    const now = new Date("2026-08-01T12:00:00Z");
    const slots = computeFreeSlots(wednesday, [], now, {
      workdays: [1, 2],
      ranges: [{ start: "09:00", end: "12:00" }],
      timezone: "America/Caracas",
    });
    expect(slots).toHaveLength(0);
  });

  it("checks full interval availability", () => {
    const monday = fromZonedYmdHm("2026-08-17", "10:00", "America/Caracas");
    const end = fromZonedYmdHm("2026-08-17", "10:30", "America/Caracas");
    const now = new Date("2026-08-01T12:00:00Z");
    expect(
      checkIntervalAvailability(monday, end, [], DEFAULT_SCHEDULE, now).ok,
    ).toBe(true);
    const busyCheck = checkIntervalAvailability(
      monday,
      fromZonedYmdHm("2026-08-17", "11:30", "America/Caracas"),
      [
        {
          startsAt: fromZonedYmdHm("2026-08-17", "10:45", "America/Caracas"),
          endsAt: fromZonedYmdHm("2026-08-17", "11:15", "America/Caracas"),
          status: "confirmed",
        },
      ],
      DEFAULT_SCHEDULE,
      now,
    );
    expect(busyCheck.ok).toBe(false);
    if (!busyCheck.ok) expect(busyCheck.reason).toBe("busy");
  });

  it("uses custom slotMinutes for free slots", () => {
    const monday = parseDateInput("2026-08-17")!;
    const now = new Date("2026-08-01T12:00:00Z");
    const slots = computeFreeSlots(monday, [], now, {
      workdays: [1],
      ranges: [{ start: "09:00", end: "11:00" }],
      slotMinutes: 60,
      timezone: "America/Caracas",
    });
    expect(slots).toHaveLength(2);
    expect(
      (slots[0]!.endsAt.getTime() - slots[0]!.startsAt.getTime()) / 60_000,
    ).toBe(60);
  });

  it("returns empty when ranges are invalid", () => {
    const monday = parseDateInput("2026-08-17")!;
    const slots = computeFreeSlots(monday, [], new Date("2026-08-01T12:00:00Z"), {
      workdays: [1],
      ranges: [{ start: "18:00", end: "09:00" }],
      timezone: "America/Caracas",
    });
    expect(slots).toHaveLength(0);
  });
});

describe("openMinuteRangesForDay", () => {
  it("maps work ranges and skips non-workdays", () => {
    const monday = fromZonedYmdHm("2026-08-17", "12:00", "America/Caracas");
    expect(openMinuteRangesForDay(monday, DEFAULT_SCHEDULE)).toEqual([
      { startMin: 9 * 60, endMin: 13 * 60 },
      { startMin: 15 * 60, endMin: 18 * 60 },
    ]);
    const sunday = fromZonedYmdHm("2026-08-16", "12:00", "America/Caracas");
    expect(openMinuteRangesForDay(sunday, DEFAULT_SCHEDULE)).toEqual([]);
  });
});

describe("isWithinSchedule timezone", () => {
  it("accepts Caracas wall-clock inside morning range", () => {
    const starts = fromZonedYmdHm("2026-08-19", "09:20", "America/Caracas");
    const ends = fromZonedYmdHm("2026-08-19", "09:40", "America/Caracas");
    expect(isWithinSchedule(starts, ends, DEFAULT_SCHEDULE)).toBe(true);
    // Same local Madrid click bug: 09:20 CEST → 07:20Z is NOT Caracas 09:20
    expect(
      isWithinSchedule(
        new Date("2026-08-19T07:20:00.000Z"),
        new Date("2026-08-19T07:40:00.000Z"),
        DEFAULT_SCHEDULE,
      ),
    ).toBe(false);
  });

  it("accepts Madrid wall-clock when schedule TZ is Europe/Madrid", () => {
    const schedule = {
      ...DEFAULT_SCHEDULE,
      timezone: "Europe/Madrid",
    };
    // 09:20 Madrid summer = 07:20Z
    expect(
      isWithinSchedule(
        new Date("2026-08-19T07:20:00.000Z"),
        new Date("2026-08-19T07:40:00.000Z"),
        schedule,
      ),
    ).toBe(true);
  });

  it("rejects weekend and lunch gap", () => {
    const weekend = fromZonedYmdHm("2026-08-16", "10:00", "America/Caracas");
    const weekendEnd = fromZonedYmdHm("2026-08-16", "10:30", "America/Caracas");
    expect(isWithinSchedule(weekend, weekendEnd)).toBe(false);

    const lunch = fromZonedYmdHm("2026-08-17", "13:30", "America/Caracas");
    const lunchEnd = fromZonedYmdHm("2026-08-17", "14:00", "America/Caracas");
    expect(isWithinSchedule(lunch, lunchEnd)).toBe(false);
  });
});

describe("openMinuteRangesForDisplayDay", () => {
  it("projects Madrid morning hours onto Caracas wall-clock", () => {
    const bands = openMinuteRangesForDisplayDay("2026-08-19", "America/Caracas", {
      workdays: [1, 2, 3, 4, 5],
      ranges: [{ start: "09:00", end: "13:00" }],
      timezone: "Europe/Madrid",
    });
    // 09:00 Madrid (CEST=UTC+2) → 03:00 Caracas (UTC-4)
    expect(bands.some((b) => b.startMin === 3 * 60 && b.endMin === 7 * 60)).toBe(
      true,
    );
  });
});

describe("date helpers", () => {
  it("parses and formats date input", () => {
    expect(parseDateInput("bad")).toBeNull();
    const d = parseDateInput("2026-08-17");
    expect(d).not.toBeNull();
    expect(toDateInputValue(d!)).toBe("2026-08-17");
  });

  it("converts hh:mm to minutes", () => {
    expect(hmToMinutes("09:30")).toBe(9 * 60 + 30);
  });
});
