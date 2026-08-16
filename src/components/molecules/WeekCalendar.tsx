"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import {
  checkIntervalAvailability,
  resolveSlotMinutes,
  type BusyInterval,
  type ScheduleConfig,
  DEFAULT_SCHEDULE,
} from "@/lib/availability/defaultSlots";
import { SlotDurationModal } from "@/components/molecules/SlotDurationModal";
import { useToast } from "@/components/providers/ToastProvider";
import type { SlotDurationMinutes } from "@/types/domain";

export type CalendarEvent = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  title: string;
  status: string;
};

export type CalendarSlot = {
  startsAt: string;
  endsAt: string;
};

type WeekCalendarProps = {
  events: CalendarEvent[];
  selectedSlot: CalendarSlot | null;
  onSelectSlot: (slot: CalendarSlot | null) => void;
  schedule?: ScheduleConfig;
  labels: {
    today: string;
    weekOf: string;
    hint: string;
    selected: string;
    pastSlot: string;
    outsideHours: string;
    busySlot: string;
  };
};

const DAY_START_HOUR = 7;
const DAY_END_HOUR = 19;
const HOUR_HEIGHT = 56; // px
const TOTAL_HOURS = DAY_END_HOUR - DAY_START_HOUR;
const GRID_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT;

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() + diff);
  return monday;
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function minutesFromDayStart(d: Date): number {
  return d.getHours() * 60 + d.getMinutes() - DAY_START_HOUR * 60;
}

function formatHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

function weekdayShort(d: Date, locale: string): string {
  return d.toLocaleDateString(locale, { weekday: "short" });
}

function toBusy(events: CalendarEvent[]): BusyInterval[] {
  return events.map((e) => ({
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    status: e.status,
  }));
}

/**
 * Week grid. Click empty area → duration modal → validate full interval → select.
 */
export function WeekCalendar({
  events,
  selectedSlot,
  onSelectSlot,
  schedule = DEFAULT_SCHEDULE,
  labels,
}: WeekCalendarProps) {
  const { error: toastError } = useToast();
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const locale =
    typeof navigator !== "undefined" ? navigator.language : "es-ES";
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const slotMinutes = resolveSlotMinutes(schedule);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(anchor, i)),
    [anchor],
  );

  const hours = useMemo(
    () => Array.from({ length: TOTAL_HOURS }, (_, i) => DAY_START_HOUR + i),
    [],
  );

  function goToday() {
    setAnchor(startOfWeek(new Date()));
  }

  function shiftWeek(delta: number) {
    setAnchor((prev) => addDays(prev, delta * 7));
  }

  function handleColumnClick(day: Date, event: React.MouseEvent<HTMLDivElement>) {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    if (dayStart < today) {
      toastError(labels.pastSlot);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const minutesFromStart = (y / HOUR_HEIGHT) * 60;
    const raw = DAY_START_HOUR * 60 + minutesFromStart;
    const slotted = Math.floor(raw / slotMinutes) * slotMinutes;
    const h = Math.floor(slotted / 60);
    const m = slotted % 60;
    if (h < DAY_START_HOUR || h >= DAY_END_HOUR) return;

    const startsAt = new Date(day);
    startsAt.setHours(h, m, 0, 0);
    if (startsAt <= new Date()) {
      toastError(labels.pastSlot);
      return;
    }

    setModalError(null);
    setDraftStart(startsAt);
  }

  function confirmDuration(minutes: SlotDurationMinutes) {
    if (!draftStart) return;
    const endsAt = new Date(draftStart.getTime() + minutes * 60_000);
    const check = checkIntervalAvailability(
      draftStart,
      endsAt,
      toBusy(events),
      schedule,
    );
    if (!check.ok) {
      const msg =
        check.reason === "past"
          ? labels.pastSlot
          : check.reason === "outside_hours"
            ? labels.outsideHours
            : check.reason === "busy"
              ? labels.busySlot
              : labels.outsideHours;
      setModalError(msg);
      toastError(msg);
      return;
    }
    onSelectSlot({
      startsAt: draftStart.toISOString(),
      endsAt: endsAt.toISOString(),
    });
    setDraftStart(null);
    setModalError(null);
  }

  const weekLabel = `${anchor.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  })} · ${labels.weekOf}`;

  const selectedDurationMin = selectedSlot
    ? Math.round(
        (new Date(selectedSlot.endsAt).getTime() -
          new Date(selectedSlot.startsAt).getTime()) /
          60_000,
      )
    : slotMinutes;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="h-9 rounded-md border border-stone-300 px-3 text-sm dark:border-slate-600"
          onClick={goToday}
        >
          {labels.today}
        </button>
        <button
          type="button"
          aria-label="Previous week"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-stone-300 dark:border-slate-600"
          onClick={() => shiftWeek(-1)}
        >
          ‹
        </button>
        <button
          type="button"
          aria-label="Next week"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-stone-300 dark:border-slate-600"
          onClick={() => shiftWeek(1)}
        >
          ›
        </button>
        <p className="text-sm font-medium capitalize text-stone-800 dark:text-slate-100">
          {weekLabel}
        </p>
      </div>
      <p className="text-xs text-stone-500 dark:text-slate-400">
        {labels.hint} · {slotMinutes} min
      </p>

      {selectedSlot ? (
        <p
          role="status"
          className="rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-900 dark:bg-teal-950/40 dark:text-teal-100"
        >
          {labels.selected}:{" "}
          {new Date(selectedSlot.startsAt).toLocaleString(locale, {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
          {" → "}
          {new Date(selectedSlot.endsAt).toLocaleTimeString(locale, {
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          ({selectedDurationMin} min)
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-stone-200 dark:border-slate-700">
        <div
          className="min-w-[720px]"
          style={{ display: "grid", gridTemplateColumns: "56px repeat(7, 1fr)" }}
        >
          <div className="border-b border-stone-200 bg-stone-50 dark:border-slate-700 dark:bg-slate-900" />
          {days.map((day) => {
            const isToday = sameDay(day, today);
            const isPast = day < today;
            return (
              <div
                key={day.toISOString()}
                className={clsx(
                  "border-b border-l border-stone-200 px-1 py-2 text-center dark:border-slate-700",
                  isPast && "opacity-45",
                )}
              >
                <p className="text-[11px] uppercase tracking-wide text-stone-500 dark:text-slate-400">
                  {weekdayShort(day, locale)}
                </p>
                <p
                  className={clsx(
                    "mx-auto mt-0.5 flex h-8 w-8 items-center justify-center text-sm font-semibold",
                    isToday &&
                      "rounded-full bg-teal-700 text-white dark:bg-teal-500",
                    !isToday && "text-stone-800 dark:text-slate-100",
                  )}
                >
                  {day.getDate()}
                </p>
              </div>
            );
          })}

          <div
            className="relative border-stone-200 dark:border-slate-700"
            style={{ height: GRID_HEIGHT }}
          >
            {hours.map((h) => (
              <div
                key={h}
                className="absolute right-1 -translate-y-1/2 text-[10px] text-stone-400"
                style={{ top: (h - DAY_START_HOUR) * HOUR_HEIGHT }}
              >
                {formatHour(h)}
              </div>
            ))}
          </div>

          {days.map((day) => {
            const dayEvents = events.filter((e) => sameDay(e.startsAt, day));
            const isPastDay = day < today;
            const selectedOnDay =
              selectedSlot &&
              sameDay(new Date(selectedSlot.startsAt), day)
                ? selectedSlot
                : null;

            return (
              <div
                key={`col-${day.toISOString()}`}
                role="presentation"
                className={clsx(
                  "relative border-l border-stone-200 dark:border-slate-700",
                  isPastDay
                    ? "cursor-not-allowed bg-stone-50/80 dark:bg-slate-950/40"
                    : "cursor-crosshair",
                )}
                style={{ height: GRID_HEIGHT }}
                onClick={(e) => handleColumnClick(day, e)}
              >
                {hours.map((h) => (
                  <div
                    key={h}
                    className="pointer-events-none absolute inset-x-0 border-t border-stone-100 dark:border-slate-800"
                    style={{ top: (h - DAY_START_HOUR) * HOUR_HEIGHT }}
                  />
                ))}

                {dayEvents.map((ev) => {
                  const topMin = minutesFromDayStart(ev.startsAt);
                  const endMin = minutesFromDayStart(ev.endsAt);
                  if (endMin <= 0 || topMin >= TOTAL_HOURS * 60) return null;
                  const top = Math.max(0, (topMin / 60) * HOUR_HEIGHT);
                  const height = Math.max(
                    18,
                    ((Math.min(endMin, TOTAL_HOURS * 60) - Math.max(topMin, 0)) /
                      60) *
                      HOUR_HEIGHT,
                  );
                  return (
                    <div
                      key={ev.id}
                      title={`${ev.title} · ${ev.status}`}
                      className="pointer-events-none absolute inset-x-1 overflow-hidden rounded-md bg-teal-700/85 px-1.5 py-0.5 text-[11px] leading-tight text-white shadow-sm"
                      style={{ top, height }}
                    >
                      <span className="font-medium">{ev.title}</span>
                    </div>
                  );
                })}

                {selectedOnDay ? (
                  <div
                    className="pointer-events-none absolute inset-x-1 rounded-md border-2 border-dashed border-amber-500 bg-amber-400/30"
                    style={{
                      top:
                        (minutesFromDayStart(new Date(selectedOnDay.startsAt)) /
                          60) *
                        HOUR_HEIGHT,
                      height: (selectedDurationMin / 60) * HOUR_HEIGHT,
                    }}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <SlotDurationModal
        key={draftStart?.toISOString() ?? "closed"}
        open={draftStart !== null}
        startsAt={draftStart ?? new Date()}
        defaultMinutes={slotMinutes}
        error={modalError}
        onCancel={() => {
          setDraftStart(null);
          setModalError(null);
        }}
        onConfirm={confirmDuration}
      />
    </div>
  );
}
