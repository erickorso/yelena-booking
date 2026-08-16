"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/atoms/Button";
import {
  SLOT_DURATION_OPTIONS,
  type SlotDurationMinutes,
} from "@/types/domain";

type SlotDurationModalProps = {
  open: boolean;
  startsAt: Date;
  defaultMinutes: SlotDurationMinutes;
  onConfirm: (minutes: SlotDurationMinutes) => void;
  onCancel: () => void;
  error: string | null;
};

/**
 * Confirm / override consultation length before committing a calendar slot.
 * Remount with a new `key` when `startsAt` changes so default minutes reset.
 */
export function SlotDurationModal({
  open,
  startsAt,
  defaultMinutes,
  onConfirm,
  onCancel,
  error,
}: SlotDurationModalProps) {
  const t = useTranslations("SlotModal");
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [minutes, setMinutes] = useState(defaultMinutes);
  const endsPreview = new Date(startsAt.getTime() + minutes * 60_000);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="w-[min(100%,24rem)] rounded-md border border-stone-200 bg-white p-0 text-stone-900 shadow-lg backdrop:bg-stone-950/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
      onClose={onCancel}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <form
        method="dialog"
        className="space-y-4 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm(minutes);
        }}
      >
        <div>
          <h2
            id={titleId}
            className="font-serif text-lg text-teal-800 dark:text-teal-300"
          >
            {t("title")}
          </h2>
          <p className="mt-1 text-sm text-stone-600 dark:text-slate-300">
            {t("subtitle", {
              start: startsAt.toLocaleString(undefined, {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              }),
            })}
          </p>
        </div>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{t("duration")}</span>
          <select
            value={minutes}
            onChange={(e) =>
              setMinutes(Number(e.target.value) as SlotDurationMinutes)
            }
            className="h-10 rounded-md border border-stone-300 bg-white px-3 dark:border-slate-600 dark:bg-slate-950"
          >
            {SLOT_DURATION_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {t("minutes", { count: m })}
                {m === defaultMinutes ? ` · ${t("defaultMark")}` : ""}
              </option>
            ))}
          </select>
        </label>

        <p className="text-xs text-stone-500 dark:text-slate-400">
          {t("endsAt", {
            end: endsPreview.toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            }),
          })}
        </p>

        {error ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            {t("cancel")}
          </Button>
          <Button type="submit">{t("confirm")}</Button>
        </div>
      </form>
    </dialog>
  );
}
