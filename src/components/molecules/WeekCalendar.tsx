"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import {
  checkIntervalAvailability,
  minutesFromMidnightInZone,
  openMinuteRangesForDisplayDay,
  resolveScheduleTimezone,
  resolveSlotMinutes,
  wallClockInstant,
  zonedYmd,
  type BusyInterval,
  type ScheduleConfig,
  DEFAULT_SCHEDULE,
} from "@/lib/availability/defaultSlots";
import {
  addDaysYmd,
  fromZonedYmdHm,
  startOfWeekYmd,
} from "@/lib/availability/scheduleTimeZone";
import { SlotDurationModal } from "@/components/molecules/SlotDurationModal";
import { useToast } from "@/components/providers/ToastProvider";
import type { SlotDurationMinutes } from "@/types/domain";

export type CalendarEvent = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  title: string;
  status: string;
  patientId?: string;
  /** google = FreeBusy; patient_other = patient's booking with another specialist */
  source?: "yelena" | "google" | "patient_other";
};

export type CalendarSlot = {
  startsAt: string;
  endsAt: string;
};

type WeekCalendarProps = {
  events: CalendarEvent[];
  /** Extra busy from Google FreeBusy (shown + blocks booking). */
  googleBusy?: CalendarEvent[];
  selectedSlot: CalendarSlot | null;
  onSelectSlot: (slot: CalendarSlot | null) => void;
  schedule?: ScheduleConfig;
  /**
   * Civil clock for the grid (patient TZ when booking for a patient).
   * Specialist working hours are projected into this zone.
   */
  displayTimeZone?: string;
  /** Click a Thaydee Elena appointment block (not Google busy). */
  onEventClick?: (event: CalendarEvent) => void;
  /** Banner while picking a new slot for reschedule. */
  rescheduleHint?: string | null;
  labels: {
    today: string;
    weekOf: string;
    hint: string;
    selected: string;
    pastSlot: string;
    outsideHours: string;
    busySlot: string;
    timezone: string;
    timezonePatient?: string;
    timezoneSpecialist?: string;
    legendAvailable: string;
    legendOutside: string;
    legendBusy: string;
    legendGoogle?: string;
    legendGhost?: string;
    legendPatientOther?: string;
    ghostBadge?: string;
  };
};

const DAY_START_HOUR = 7;
const DAY_END_HOUR = 19;
const HOUR_HEIGHT = 56; // px
const TOTAL_HOURS = DAY_END_HOUR - DAY_START_HOUR;
const GRID_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT;
const GRID_START_MIN = DAY_START_HOUR * 60;
const GRID_END_MIN = DAY_END_HOUR * 60;

function bandStyle(
  startMin: number,
  endMin: number,
): { top: number; height: number } | null {
  const clippedStart = Math.max(startMin, GRID_START_MIN);
  const clippedEnd = Math.min(endMin, GRID_END_MIN);
  if (clippedEnd <= clippedStart) return null;
  return {
    top: ((clippedStart - GRID_START_MIN) / 60) * HOUR_HEIGHT,
    height: ((clippedEnd - clippedStart) / 60) * HOUR_HEIGHT,
  };
}

function formatHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

function toBusy(events: CalendarEvent[]): BusyInterval[] {
  return events
    .filter((e) => e.status !== "cancelled")
    .map((e) => ({
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      status: e.status,
    }));
}

function intervalsOverlap(
  a: { startsAt: Date; endsAt: Date },
  b: { startsAt: Date; endsAt: Date },
): boolean {
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}

/**
 * Week grid in `displayTimeZone` (patient). Specialist hours projected into that zone.
 * Click → duration modal → validate against specialist schedule (UTC) → select.
 */
export function WeekCalendar({
  events,
  googleBusy = [],
  selectedSlot,
  onSelectSlot,
  schedule = DEFAULT_SCHEDULE,
  displayTimeZone,
  onEventClick,
  rescheduleHint,
  labels,
}: WeekCalendarProps) {
  const { error: toastError } = useToast();
  const scheduleTz = resolveScheduleTimezone(schedule);
  const timeZone = displayTimeZone?.trim() || scheduleTz;
  const [anchorYmd, setAnchorYmd] = useState(() =>
    startOfWeekYmd(zonedYmd(new Date(), timeZone), timeZone),
  );
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const locale =
    typeof navigator !== "undefined" ? navigator.language : "es-VE";

  const todayYmd = zonedYmd(new Date(), timeZone);
  const slotMinutes = resolveSlotMinutes(schedule);

  const allBusyEvents = useMemo(
    () => [...events, ...googleBusy],
    [events, googleBusy],
  );

  const dayYmds = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDaysYmd(anchorYmd, i)),
    [anchorYmd],
  );

  const hours = useMemo(
    () => Array.from({ length: TOTAL_HOURS }, (_, i) => DAY_START_HOUR + i),
    [],
  );

  function goToday() {
    setAnchorYmd(startOfWeekYmd(todayYmd, timeZone));
  }

  function shiftWeek(delta: number) {
    setAnchorYmd((prev) => addDaysYmd(prev, delta * 7));
  }

  function handleColumnClick(
    dayYmd: string,
    event: React.MouseEvent<HTMLDivElement>,
  ) {
    if (dayYmd < todayYmd) {
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

    const startsAt = wallClockInstant(dayYmd, h, m, timeZone);
    if (startsAt <= new Date()) {
      toastError(labels.pastSlot);
      return;
    }

    const probeEnd = new Date(startsAt.getTime() + slotMinutes * 60_000);
    const probe = checkIntervalAvailability(
      startsAt,
      probeEnd,
      toBusy(allBusyEvents),
      schedule,
    );
    if (!probe.ok) {
      const msg =
        probe.reason === "past"
          ? labels.pastSlot
          : probe.reason === "outside_hours"
            ? labels.outsideHours
            : probe.reason === "busy"
              ? labels.busySlot
              : labels.outsideHours;
      toastError(msg);
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
      toBusy(allBusyEvents),
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

  const weekLabelDate = fromZonedYmdHm(anchorYmd, "12:00", timeZone);
  const weekLabel = `${weekLabelDate.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
    timeZone,
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
        <span className="rounded-md bg-stone-100 px-2 py-1 text-xs text-stone-700 dark:bg-slate-800 dark:text-slate-200">
          {labels.timezonePatient
            ? `${labels.timezonePatient}: ${timeZone}`
            : `${labels.timezone}: ${timeZone}`}
        </span>
        {timeZone !== scheduleTz ? (
          <span className="rounded-md bg-stone-100 px-2 py-1 text-xs text-stone-700 dark:bg-slate-800 dark:text-slate-200">
            {labels.timezoneSpecialist
              ? `${labels.timezoneSpecialist}: ${scheduleTz}`
              : `Especialista: ${scheduleTz}`}
          </span>
        ) : null}
      </div>
      <p className="text-xs text-stone-500 dark:text-slate-400">
        {labels.hint} · {slotMinutes} min
      </p>
      {rescheduleHint ? (
        <p
          role="status"
          className="rounded-md border border-amber-500/40 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100"
        >
          {rescheduleHint}
        </p>
      ) : null}
      <ul
        className="flex flex-wrap gap-3 text-xs text-stone-600 dark:text-slate-300"
        aria-label="Leyenda"
      >
        <li className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-4 rounded-sm bg-emerald-200/90 ring-1 ring-emerald-400/60 dark:bg-emerald-900/50"
            aria-hidden
          />
          {labels.legendAvailable}
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-4 rounded-sm bg-stone-200/90 ring-1 ring-stone-300 dark:bg-slate-800"
            aria-hidden
          />
          {labels.legendOutside}
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-4 rounded-sm bg-rose-600/85"
            aria-hidden
          />
          {labels.legendBusy}
        </li>
        {labels.legendGoogle ? (
          <li className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-4 rounded-sm bg-violet-700/85"
              aria-hidden
            />
            {labels.legendGoogle}
          </li>
        ) : null}
        {labels.legendGhost ? (
          <li className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-4 rounded-sm border border-dashed border-stone-500 bg-stone-300/50 dark:bg-slate-600/40"
              aria-hidden
            />
            {labels.legendGhost}
          </li>
        ) : null}
        {labels.legendPatientOther ? (
          <li className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-4 rounded-sm bg-amber-700/85"
              aria-hidden
            />
            {labels.legendPatientOther}
          </li>
        ) : null}
      </ul>

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
            timeZone,
          })}
          {" → "}
          {new Date(selectedSlot.endsAt).toLocaleTimeString(locale, {
            hour: "2-digit",
            minute: "2-digit",
            timeZone,
          })}{" "}
          ({selectedDurationMin} min)
          {timeZone !== scheduleTz ? (
            <>
              {" · "}
              {new Date(selectedSlot.startsAt).toLocaleTimeString(locale, {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: scheduleTz,
              })}
              –
              {new Date(selectedSlot.endsAt).toLocaleTimeString(locale, {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: scheduleTz,
              })}{" "}
              ({scheduleTz})
            </>
          ) : null}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-stone-200 dark:border-slate-700">
        <div
          className="min-w-[720px]"
          style={{ display: "grid", gridTemplateColumns: "56px repeat(7, 1fr)" }}
        >
          <div className="border-b border-stone-200 bg-stone-50 dark:border-slate-700 dark:bg-slate-900" />
          {dayYmds.map((dayYmd) => {
            const noon = fromZonedYmdHm(dayYmd, "12:00", timeZone);
            const isToday = dayYmd === todayYmd;
            const isPast = dayYmd < todayYmd;
            return (
              <div
                key={dayYmd}
                className={clsx(
                  "border-b border-l border-stone-200 px-1 py-2 text-center dark:border-slate-700",
                  isPast && "opacity-45",
                )}
              >
                <p className="text-[11px] uppercase tracking-wide text-stone-500 dark:text-slate-400">
                  {noon.toLocaleDateString(locale, {
                    weekday: "short",
                    timeZone,
                  })}
                </p>
                <p
                  className={clsx(
                    "mx-auto mt-0.5 flex h-8 w-8 items-center justify-center text-sm font-semibold",
                    isToday &&
                      "rounded-full bg-teal-700 text-white dark:bg-teal-500",
                    !isToday && "text-stone-800 dark:text-slate-100",
                  )}
                >
                  {noon.toLocaleDateString(locale, {
                    day: "numeric",
                    timeZone,
                  })}
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

          {dayYmds.map((dayYmd) => {
            const dayEvents = allBusyEvents.filter(
              (e) => zonedYmd(e.startsAt, timeZone) === dayYmd,
            );
            const isPastDay = dayYmd < todayYmd;
            const openBands = openMinuteRangesForDisplayDay(
              dayYmd,
              timeZone,
              schedule,
            );
            const selectedOnDay =
              selectedSlot &&
              zonedYmd(new Date(selectedSlot.startsAt), timeZone) === dayYmd
                ? selectedSlot
                : null;

            return (
              <div
                key={`col-${dayYmd}`}
                role="presentation"
                data-calendar-day={dayYmd}
                data-calendar-past={isPastDay ? "1" : "0"}
                className={clsx(
                  "relative border-l border-stone-200 dark:border-slate-700",
                  isPastDay
                    ? "cursor-not-allowed bg-stone-100/90 dark:bg-slate-950/50"
                    : "cursor-crosshair bg-stone-100/70 dark:bg-slate-950/35",
                )}
                style={{ height: GRID_HEIGHT }}
                onClick={(e) => handleColumnClick(dayYmd, e)}
              >
                {hours.map((h) => (
                  <div
                    key={h}
                    className="pointer-events-none absolute inset-x-0 border-t border-stone-200/80 dark:border-slate-800"
                    style={{ top: (h - DAY_START_HOUR) * HOUR_HEIGHT }}
                  />
                ))}

                {!isPastDay
                  ? openBands.map((band) => {
                      const style = bandStyle(band.startMin, band.endMin);
                      if (!style) return null;
                      return (
                        <div
                          key={`open-${band.startMin}-${band.endMin}`}
                          aria-hidden
                          data-slot="available"
                          data-day={dayYmd}
                          className="pointer-events-none absolute inset-x-0 bg-emerald-200/55 dark:bg-emerald-900/35"
                          style={style}
                        />
                      );
                    })
                  : null}

                {dayEvents.map((ev) => {
                  const topMin =
                    minutesFromMidnightInZone(ev.startsAt, timeZone) -
                    DAY_START_HOUR * 60;
                  const endMin =
                    minutesFromMidnightInZone(ev.endsAt, timeZone) -
                    DAY_START_HOUR * 60;
                  if (endMin <= 0 || topMin >= TOTAL_HOURS * 60) return null;
                  const top = Math.max(0, (topMin / 60) * HOUR_HEIGHT);
                  const height = Math.max(
                    18,
                    ((Math.min(endMin, TOTAL_HOURS * 60) - Math.max(topMin, 0)) /
                      60) *
                      HOUR_HEIGHT,
                  );
                  const isGoogle = ev.source === "google";
                  const isPatientOther = ev.source === "patient_other";
                  const isGhost = !isGoogle && !isPatientOther && ev.status === "cancelled";
                  const hasSplitPartner =
                    !isGoogle &&
                    !isPatientOther &&
                    dayEvents.some(
                      (other) =>
                        other.id !== ev.id &&
                        other.source !== "google" &&
                        other.source !== "patient_other" &&
                        intervalsOverlap(ev, other) &&
                        (isGhost
                          ? other.status !== "cancelled"
                          : other.status === "cancelled"),
                    );
                  const clickable =
                    !isGoogle && !isPatientOther && Boolean(onEventClick);
                  return (
                    <div
                      key={ev.id}
                      title={`${ev.title} · ${ev.status}`}
                      role={clickable ? "button" : undefined}
                      tabIndex={clickable ? 0 : undefined}
                      onClick={
                        clickable
                          ? (e) => {
                              e.stopPropagation();
                              onEventClick?.(ev);
                            }
                          : undefined
                      }
                      onKeyDown={
                        clickable
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.stopPropagation();
                                onEventClick?.(ev);
                              }
                            }
                          : undefined
                      }
                      className={clsx(
                        "absolute z-[1] overflow-hidden rounded-md px-1.5 py-0.5 text-[11px] leading-tight shadow-sm",
                        isGoogle &&
                          "pointer-events-none inset-x-1 bg-violet-700/90 text-white",
                        isPatientOther &&
                          "pointer-events-none inset-x-1 bg-amber-700/85 text-white",
                        isGhost &&
                          "border border-dashed border-stone-500 bg-stone-400/35 text-stone-800 dark:border-slate-400 dark:bg-slate-600/45 dark:text-slate-100",
                        !isGoogle &&
                          !isPatientOther &&
                          !isGhost &&
                          "bg-rose-600/90 text-white",
                        hasSplitPartner && isGhost && "left-1 w-[calc(50%-0.35rem)]",
                        hasSplitPartner &&
                          !isGhost &&
                          !isGoogle &&
                          !isPatientOther &&
                          "left-[50%] right-1",
                        !hasSplitPartner &&
                          !isGoogle &&
                          !isPatientOther &&
                          "inset-x-1",
                        clickable &&
                          "cursor-pointer ring-offset-1 hover:ring-2 hover:ring-amber-400",
                      )}
                      style={{ top, height }}
                    >
                      <span className="block truncate font-medium">{ev.title}</span>
                      {isGhost && labels.ghostBadge ? (
                        <span className="block truncate text-[10px] opacity-80">
                          {labels.ghostBadge}
                        </span>
                      ) : null}
                    </div>
                  );
                })}

                {selectedOnDay ? (
                  <div
                    className="pointer-events-none absolute inset-x-1 z-[2] rounded-md border-2 border-dashed border-amber-500 bg-amber-400/30"
                    style={{
                      top:
                        ((minutesFromMidnightInZone(
                          new Date(selectedOnDay.startsAt),
                          timeZone,
                        ) -
                          DAY_START_HOUR * 60) /
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
