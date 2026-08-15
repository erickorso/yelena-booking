import { describe, expect, it } from "vitest";
import { computeFreeSlots } from "@/lib/availability/defaultSlots";

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
});
