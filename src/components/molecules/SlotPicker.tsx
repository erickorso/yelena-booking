"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import {
  computeFreeSlots,
  parseDateInput,
  toDateInputValue,
  type BusyInterval,
} from "@/lib/availability/defaultSlots";
import { useToast } from "@/components/providers/ToastProvider";

export type SlotIso = {
  startsAt: string;
  endsAt: string;
};

type SlotPickerProps = {
  labelDate: string;
  labelSlots: string;
  emptyLabel: string;
  weekendLabel: string;
  pastLabel?: string;
  busy: BusyInterval[];
  /** Controlled selected slot ISO start */
  value: string | null;
  onChange: (slot: SlotIso | null) => void;
  /** Optional remote slots (patient booking). If set, skips local compute. */
  remoteSlots?: SlotIso[] | null;
  remoteLoading?: boolean;
  onDateChange?: (dateYmd: string) => void;
};

function formatSlot(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Calendly-style day picker: choose date → click a free 30 min slot.
 */
export function SlotPicker({
  labelDate,
  labelSlots,
  emptyLabel,
  weekendLabel,
  pastLabel,
  busy,
  value,
  onChange,
  remoteSlots,
  remoteLoading,
  onDateChange,
}: SlotPickerProps) {
  const { error: toastError } = useToast();
  const [dateYmd, setDateYmd] = useState(() => toDateInputValue(new Date()));
  const todayYmd = toDateInputValue(new Date());

  const day = useMemo(() => parseDateInput(dateYmd), [dateYmd]);
  const isWeekend = day ? day.getDay() === 0 || day.getDay() === 6 : false;

  const localSlots = useMemo(() => {
    if (remoteSlots || !day) return [];
    return computeFreeSlots(day, busy).map((s) => ({
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
    }));
  }, [busy, day, remoteSlots]);

  const slots = remoteSlots ?? localSlots;

  function handleDate(next: string) {
    if (next < todayYmd) {
      toastError(
        pastLabel ?? "No puedes citar en un día que ya pasó.",
      );
      setDateYmd(todayYmd);
      onChange(null);
      onDateChange?.(todayYmd);
      return;
    }
    setDateYmd(next);
    onChange(null);
    onDateChange?.(next);
  }

  return (
    <div className="space-y-3">
      <label className="flex flex-col gap-1.5 text-sm text-stone-800 dark:text-slate-100">
        <span className="font-medium">{labelDate}</span>
        <input
          type="date"
          value={dateYmd}
          min={toDateInputValue(new Date())}
          onChange={(e) => handleDate(e.target.value)}
          className="h-10 rounded-md border border-stone-300 bg-white px-3 dark:border-slate-600 dark:bg-slate-900"
        />
      </label>

      <div>
        <p className="mb-2 text-sm font-medium text-stone-800 dark:text-slate-100">
          {labelSlots}
        </p>
        {remoteLoading ? (
          <p className="text-sm text-stone-500 dark:text-slate-400">…</p>
        ) : isWeekend && !remoteSlots ? (
          <p className="text-sm text-stone-600 dark:text-slate-300">
            {weekendLabel}
          </p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-stone-600 dark:text-slate-300">
            {emptyLabel}
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((slot) => {
              const selected = value === slot.startsAt;
              return (
                <li key={slot.startsAt}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    className={clsx(
                      "w-full rounded-md border px-2 py-2 text-sm transition-colors",
                      selected
                        ? "border-teal-700 bg-teal-700 text-white"
                        : "border-stone-300 bg-white text-stone-800 hover:border-teal-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100",
                    )}
                    onClick={() => onChange(selected ? null : slot)}
                  >
                    {formatSlot(slot.startsAt)}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
