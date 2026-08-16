import { describe, expect, it } from "vitest";
import {
  formatGoogleDateTime,
  fromZonedWallClock,
  fromZonedYmdHm,
  getZonedParts,
  zonedYmd,
} from "@/lib/availability/scheduleTimeZone";

describe("scheduleTimeZone", () => {
  it("maps Caracas 09:20 to 13:20Z", () => {
    const d = fromZonedYmdHm("2026-08-19", "09:20", "America/Caracas");
    expect(d.toISOString()).toBe("2026-08-19T13:20:00.000Z");
    expect(zonedYmd(d, "America/Caracas")).toBe("2026-08-19");
    expect(getZonedParts(d, "America/Caracas").hour).toBe(9);
    expect(getZonedParts(d, "America/Caracas").minute).toBe(20);
  });

  it("maps Madrid summer 09:20 to 07:20Z", () => {
    const d = fromZonedWallClock(2026, 8, 19, 9, 20, "Europe/Madrid");
    expect(d.toISOString()).toBe("2026-08-19T07:20:00.000Z");
  });

  it("formats Google dateTime in specialist TZ", () => {
    const d = new Date("2026-08-19T07:20:00.000Z");
    expect(formatGoogleDateTime(d, "Europe/Madrid")).toBe(
      "2026-08-19T09:20:00",
    );
  });
});
