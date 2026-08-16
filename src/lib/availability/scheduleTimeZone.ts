/**
 * Wall-clock helpers for specialist schedule IANA timezones (no extra deps).
 */

export type ZonedParts = {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
};

const WEEKDAY_TO_JS: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function partsMap(
  date: Date,
  timeZone: string,
): Record<string, string> {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  return Object.fromEntries(
    fmt
      .formatToParts(date)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value]),
  );
}

/** Calendar / clock parts of an instant in a timezone. */
export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const p = partsMap(date, timeZone);
  const weekday = WEEKDAY_TO_JS[p.weekday ?? "Mon"];
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    second: Number(p.second),
    weekday: weekday ?? 1,
  };
}

export function zonedYmd(date: Date, timeZone: string): string {
  const p = getZonedParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Google Calendar `dateTime` without offset + paired `timeZone` field. */
export function formatGoogleDateTime(date: Date, timeZone: string): string {
  const p = getZonedParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}T${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}:${String(p.second).padStart(2, "0")}`;
}

export function minutesFromMidnightInZone(date: Date, timeZone: string): number {
  const p = getZonedParts(date, timeZone);
  return p.hour * 60 + p.minute;
}

/**
 * Convert a wall-clock time in `timeZone` to a UTC Date.
 * Handles DST via offset double-pass (Intl).
 */
export function fromZonedWallClock(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
  second = 0,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);

  const getOffsetMs = (instant: number): number => {
    const p = partsMap(new Date(instant), timeZone);
    const asUtc = Date.UTC(
      Number(p.year),
      Number(p.month) - 1,
      Number(p.day),
      Number(p.hour),
      Number(p.minute),
      Number(p.second),
    );
    return asUtc - instant;
  };

  const offset1 = getOffsetMs(utcGuess);
  const refined = utcGuess - offset1;
  const offset2 = getOffsetMs(refined);
  return new Date(utcGuess - offset2);
}

export function fromZonedYmdHm(
  ymd: string,
  hm: string,
  timeZone: string,
): Date {
  const [y, mo, d] = ymd.split("-").map(Number);
  const [h, m] = hm.split(":").map(Number);
  return fromZonedWallClock(y!, mo!, d!, h ?? 0, m ?? 0, timeZone);
}

export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const utc = Date.UTC(y!, m! - 1, d! + days, 12, 0, 0);
  const dt = new Date(utc);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

/** Monday YMD of the week containing `ymd` (Mon start), in civil calendar. */
export function startOfWeekYmd(ymd: string, timeZone: string): string {
  const noon = fromZonedYmdHm(ymd, "12:00", timeZone);
  const wd = getZonedParts(noon, timeZone).weekday;
  const diff = wd === 0 ? -6 : 1 - wd;
  return addDaysYmd(ymd, diff);
}
