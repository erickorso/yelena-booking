import { describe, expect, it } from "vitest";
import {
  checkIntervalAvailability,
  computeFreeSlots,
  DEFAULT_SCHEDULE,
  hmToMinutes,
  isWithinSchedule,
  openMinuteRangesForDay,
  parseDateInput,
  toDateInputValue,
} from "@/lib/availability/defaultSlots";

describe("computeFreeSlots", () => {
  it("returns empty on Sunday", () => {
    const sunday = new Date(2026, 7, 16, 12, 0, 0); // Sun
    const slots = computeFreeSlots(sunday, [], new Date(2026, 7, 1));
    expect(slots).toHaveLength(0);
  });

  it("excludes overlapping busy appointments", () => {
    const monday = new Date(2026, 7, 17, 12, 0, 0); // Mon
    const now = new Date(2026, 7, 1);
    const busy = [
      {
        startsAt: new Date(2026, 7, 17, 9, 0, 0),
        endsAt: new Date(2026, 7, 17, 9, 30, 0),
        status: "confirmed",
      },
    ];
    const slots = computeFreeSlots(monday, busy, now);
    expect(
      slots.some(
        (s) =>
          s.startsAt.getHours() === 9 && s.startsAt.getMinutes() === 0,
      ),
    ).toBe(false);
    expect(
      slots.some(
        (s) =>
          s.startsAt.getHours() === 9 && s.startsAt.getMinutes() === 30,
      ),
    ).toBe(true);
  });

  it("respects custom workdays only", () => {
    const wednesday = new Date(2026, 7, 19, 12, 0, 0); // Wed
    const now = new Date(2026, 7, 1);
    const slots = computeFreeSlots(wednesday, [], now, {
      workdays: [1, 2],
      ranges: [{ start: "09:00", end: "12:00" }],
    });
    expect(slots).toHaveLength(0);
  });

  it("checks full interval availability", () => {
    const monday = new Date(2026, 7, 17, 10, 0, 0);
    const end = new Date(2026, 7, 17, 10, 30, 0);
    const now = new Date(2026, 7, 1);
    expect(
      checkIntervalAvailability(monday, end, [], DEFAULT_SCHEDULE, now).ok,
    ).toBe(true);
    const busyCheck = checkIntervalAvailability(
      monday,
      new Date(2026, 7, 17, 11, 30, 0),
      [
        {
          startsAt: new Date(2026, 7, 17, 10, 45, 0),
          endsAt: new Date(2026, 7, 17, 11, 15, 0),
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
    const monday = new Date(2026, 7, 17, 12, 0, 0);
    const now = new Date(2026, 7, 1);
    const slots = computeFreeSlots(monday, [], now, {
      workdays: [1],
      ranges: [{ start: "09:00", end: "11:00" }],
      slotMinutes: 60,
    });
    expect(slots).toHaveLength(2);
    expect(
      (slots[0]!.endsAt.getTime() - slots[0]!.startsAt.getTime()) / 60_000,
    ).toBe(60);
  });

  it("returns empty when ranges are invalid", () => {
    const monday = new Date(2026, 7, 17, 12, 0, 0);
    const slots = computeFreeSlots(monday, [], new Date(2026, 7, 1), {
      workdays: [1],
      ranges: [{ start: "18:00", end: "09:00" }],
    });
    expect(slots).toHaveLength(0);
  });
});

describe("openMinuteRangesForDay", () => {
  it("maps work ranges and skips non-workdays", () => {
    const monday = new Date(2026, 7, 17, 12, 0, 0);
    expect(openMinuteRangesForDay(monday, DEFAULT_SCHEDULE)).toEqual([
      { startMin: 9 * 60, endMin: 13 * 60 },
      { startMin: 15 * 60, endMin: 18 * 60 },
    ]);
    const sunday = new Date(2026, 7, 16, 12, 0, 0);
    expect(openMinuteRangesForDay(sunday, DEFAULT_SCHEDULE)).toEqual([]);
  });
});

describe("isWithinSchedule", () => {
  it("accepts Monday morning slot", () => {
    const starts = new Date(2026, 7, 17, 10, 0, 0);
    const ends = new Date(2026, 7, 17, 10, 30, 0);
    expect(isWithinSchedule(starts, ends)).toBe(true);
  });

  it("rejects weekend", () => {
    const starts = new Date(2026, 7, 16, 10, 0, 0);
    const ends = new Date(2026, 7, 16, 10, 30, 0);
    expect(isWithinSchedule(starts, ends)).toBe(false);
  });

  it("rejects lunch gap", () => {
    const starts = new Date(2026, 7, 17, 13, 30, 0);
    const ends = new Date(2026, 7, 17, 14, 0, 0);
    expect(isWithinSchedule(starts, ends)).toBe(false);
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
