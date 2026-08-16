"use client";

import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import {
  addDaysYmd,
  startOfWeekYmd,
  zonedYmd,
} from "@/lib/availability/scheduleTimeZone";

export type AggregatedCalendarSlot = {
  startsAt: string;
  endsAt: string;
  specialists: Array<{
    id: string;
    displayName: string;
    specialty: string;
  }>;
};

type PatientAvailabilityCalendarProps = {
  slots: AggregatedCalendarSlot[];
  loading?: boolean;
  selectedStartsAt: string | null;
  timeZone?: string;
  onWeekChange: (fromYmd: string, toYmd: string) => void;
  onSelectSlot: (slot: AggregatedCalendarSlot) => void;
  labels: {
    today: string;
    weekOf: string;
    loading: string;
    empty: string;
    multiSpecialists: string;
    selected: string;
    hint: string;
  };
};

const DAY_START_HOUR = 7;
const DAY_END_HOUR = 19;
const HOUR_HEIGHT = 56;
const TOTAL_HOURS = DAY_END_HOUR - DAY_START_HOUR;
const GRID_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT;
const GRID_START_MIN = DAY_START_HOUR * 60;

function bandStyle(
  startMin: number,
  endMin: number,
): { top: number; height: number } | null {
  const clippedStart = Math.max(startMin, GRID_START_MIN);
  const clippedEnd = Math.min(endMin, DAY_END_HOUR * 60);
  if (clippedEnd <= clippedStart) return null;
  return {
    top: ((clippedStart - GRID_START_MIN) / 60) * HOUR_HEIGHT,
    height: Math.max(
      ((clippedEnd - clippedStart) / 60) * HOUR_HEIGHT,
      22,
    ),
  };
}

function minutesInZone(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

/**
 * Week grid of free (aggregated) slots for patient self-booking.
 */
export function PatientAvailabilityCalendar({
  slots,
  loading,
  selectedStartsAt,
  timeZone: timeZoneProp,
  onWeekChange,
  onSelectSlot,
  labels,
}: PatientAvailabilityCalendarProps) {
  const timeZone =
    timeZoneProp?.trim() ||
    (typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC");
  const locale =
    typeof navigator !== "undefined" ? navigator.language : "es-VE";

  const [anchorYmd, setAnchorYmd] = useState(() =>
    startOfWeekYmd(zonedYmd(new Date(), timeZone), timeZone),
  );
  const todayYmd = zonedYmd(new Date(), timeZone);

  const dayYmds = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDaysYmd(anchorYmd, i)),
    [anchorYmd],
  );

  const hours = useMemo(
    () => Array.from({ length: TOTAL_HOURS }, (_, i) => DAY_START_HOUR + i),
    [],
  );

  const weekFrom = dayYmds[0]!;
  const weekTo = dayYmds[6]!;

  useEffect(() => {
    onWeekChange(weekFrom, weekTo);
  }, [weekFrom, weekTo, onWeekChange]);

  function goToday() {
    setAnchorYmd(startOfWeekYmd(todayYmd, timeZone));
  }

  function shiftWeek(delta: number) {
    setAnchorYmd((prev) => addDaysYmd(prev, delta * 7));
  }

  const slotsByDay = useMemo(() => {
    const map = new Map<string, AggregatedCalendarSlot[]>();
    for (const ymd of dayYmds) map.set(ymd, []);
    for (const slot of slots) {
      const start = new Date(slot.startsAt);
      const ymd = zonedYmd(start, timeZone);
      const list = map.get(ymd);
      if (list) list.push(slot);
    }
    return map;
  }, [slots, dayYmds, timeZone]);

  const weekLabel = new Date(`${weekFrom}T12:00:00`).toLocaleDateString(
    locale,
    { day: "numeric", month: "short", year: "numeric" },
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-stone-800 dark:text-slate-100">
          {labels.weekOf.replace("{date}", weekLabel)}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border border-stone-300 px-2 py-1 text-sm dark:border-slate-600"
            onClick={() => shiftWeek(-1)}
          >
            ←
          </button>
          <button
            type="button"
            className="rounded-md border border-stone-300 px-2 py-1 text-sm dark:border-slate-600"
            onClick={goToday}
          >
            {labels.today}
          </button>
          <button
            type="button"
            className="rounded-md border border-stone-300 px-2 py-1 text-sm dark:border-slate-600"
            onClick={() => shiftWeek(1)}
          >
            →
          </button>
        </div>
      </div>

      <p className="text-xs text-stone-500 dark:text-slate-400">{labels.hint}</p>

      {loading ? (
        <p className="text-sm text-stone-500 dark:text-slate-400">
          {labels.loading}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-stone-200 dark:border-slate-700">
        <div
          className="grid min-w-[640px]"
          style={{ gridTemplateColumns: "3rem repeat(7, minmax(0, 1fr))" }}
        >
          <div className="border-b border-stone-200 dark:border-slate-700" />
          {dayYmds.map((ymd) => {
            const d = new Date(`${ymd}T12:00:00`);
            const isToday = ymd === todayYmd;
            return (
              <div
                key={ymd}
                className={clsx(
                  "border-b border-l border-stone-200 px-1 py-2 text-center text-xs dark:border-slate-700",
                  isToday && "bg-teal-50 dark:bg-teal-950/30",
                )}
              >
                <div className="font-medium text-stone-800 dark:text-slate-100">
                  {d.toLocaleDateString(locale, { weekday: "short" })}
                </div>
                <div className="text-stone-500 dark:text-slate-400">
                  {d.toLocaleDateString(locale, {
                    day: "numeric",
                    month: "short",
                  })}
                </div>
              </div>
            );
          })}

          <div className="relative" style={{ height: GRID_HEIGHT }}>
            {hours.map((h) => (
              <div
                key={h}
                className="absolute right-1 text-[10px] text-stone-400 dark:text-slate-500"
                style={{ top: (h - DAY_START_HOUR) * HOUR_HEIGHT - 6 }}
              >
                {`${String(h).padStart(2, "0")}:00`}
              </div>
            ))}
          </div>

          {dayYmds.map((ymd) => {
            const daySlots = slotsByDay.get(ymd) ?? [];
            return (
              <div
                key={`col-${ymd}`}
                className="relative border-l border-stone-200 dark:border-slate-700"
                style={{ height: GRID_HEIGHT }}
              >
                {hours.map((h) => (
                  <div
                    key={h}
                    className="pointer-events-none absolute inset-x-0 border-t border-stone-100 dark:border-slate-800"
                    style={{ top: (h - DAY_START_HOUR) * HOUR_HEIGHT }}
                  />
                ))}
                {daySlots.map((slot) => {
                  const start = new Date(slot.startsAt);
                  const end = new Date(slot.endsAt);
                  const style = bandStyle(
                    minutesInZone(start, timeZone),
                    minutesInZone(end, timeZone),
                  );
                  if (!style) return null;
                  const selected = selectedStartsAt === slot.startsAt;
                  const multi = slot.specialists.length > 1;
                  return (
                    <button
                      key={`${slot.startsAt}-${slot.endsAt}`}
                      type="button"
                      title={
                        multi
                          ? labels.multiSpecialists.replace(
                              "{count}",
                              String(slot.specialists.length),
                            )
                          : slot.specialists[0]?.displayName
                      }
                      aria-pressed={selected}
                      className={clsx(
                        "absolute inset-x-0.5 z-10 overflow-hidden rounded px-0.5 text-left text-[10px] leading-tight transition-colors",
                        selected
                          ? "bg-teal-700 text-white ring-2 ring-teal-900"
                          : "bg-teal-100 text-teal-900 hover:bg-teal-200 dark:bg-teal-900/50 dark:text-teal-100 dark:hover:bg-teal-800/60",
                      )}
                      style={{ top: style.top, height: style.height }}
                      onClick={() => onSelectSlot(slot)}
                    >
                      <span className="block truncate font-medium">
                        {start.toLocaleTimeString(locale, {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone,
                        })}
                      </span>
                      {multi ? (
                        <span className="block truncate opacity-80">
                          {labels.multiSpecialists.replace(
                            "{count}",
                            String(slot.specialists.length),
                          )}
                        </span>
                      ) : (
                        <span className="block truncate opacity-80">
                          {slot.specialists[0]?.displayName}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {!loading && slots.length === 0 ? (
        <p className="text-sm text-stone-600 dark:text-slate-300">
          {labels.empty}
        </p>
      ) : null}

      {selectedStartsAt ? (
        <p className="text-sm text-teal-800 dark:text-teal-300">
          {labels.selected}
        </p>
      ) : null}
    </div>
  );
}
