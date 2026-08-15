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

const SLOT_MINUTES = 30;
/** Mon–Fri */
const WORKDAYS = new Set([1, 2, 3, 4, 5]);
const RANGES: ReadonlyArray<{ start: string; end: string }> = [
  { start: "09:00", end: "13:00" },
  { start: "15:00", end: "18:00" },
];

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

/**
 * Default clinic hours (local TZ of the runtime): Mon–Fri morning + afternoon, 30 min.
 * Excludes blocking appointments and past start times.
 */
export function computeFreeSlots(
  day: Date,
  busy: BusyInterval[],
  now: Date = new Date(),
): FreeSlot[] {
  if (!WORKDAYS.has(day.getDay())) return [];

  const candidates: FreeSlot[] = [];
  for (const range of RANGES) {
    let cursor = atLocal(day, range.start);
    const end = atLocal(day, range.end);
    while (cursor.getTime() + SLOT_MINUTES * 60_000 <= end.getTime()) {
      const slotEnd = new Date(cursor.getTime() + SLOT_MINUTES * 60_000);
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

export function parseDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y!, m! - 1, d!, 12, 0, 0, 0);
}

export function toDateInputValue(d: Date): string {
  return ymd(d);
}

export { SLOT_MINUTES };
