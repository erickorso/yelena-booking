"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/atoms/Button";

export type SlotSpecialistOption = {
  id: string;
  displayName: string;
  specialty: string;
};

type SpecialistSlotModalProps = {
  open: boolean;
  startsAt: string;
  endsAt: string;
  specialists: SlotSpecialistOption[];
  /** Prefer this id when present in the list. */
  preferredSpecialistId?: string | null;
  onConfirm: (specialistId: string) => void;
  onCancel: () => void;
};

function resolveInitialId(
  specialists: SlotSpecialistOption[],
  preferredSpecialistId?: string | null,
): string {
  if (
    preferredSpecialistId &&
    specialists.some((s) => s.id === preferredSpecialistId)
  ) {
    return preferredSpecialistId;
  }
  return specialists[0]?.id ?? "";
}

/**
 * Pick among specialists who can cover the same free slot.
 * Remount with a new `key` when `startsAt` changes so selection resets.
 */
export function SpecialistSlotModal({
  open,
  startsAt,
  endsAt,
  specialists,
  preferredSpecialistId,
  onConfirm,
  onCancel,
}: SpecialistSlotModalProps) {
  const t = useTranslations("PatientBooking");
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirmedRef = useRef(false);
  const [selectedId, setSelectedId] = useState(() =>
    resolveInitialId(specialists, preferredSpecialistId),
  );

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      confirmedRef.current = false;
      el.showModal();
    }
    if (!open && el.open) el.close();
  }, [open]);

  if (!open || specialists.length === 0) return null;

  const when = `${new Date(startsAt).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })} → ${new Date(endsAt).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="fixed left-1/2 top-1/2 z-50 m-0 w-[min(100%,24rem)] -translate-x-1/2 -translate-y-1/2 rounded-md border border-stone-200 bg-white p-0 text-stone-900 shadow-lg backdrop:bg-stone-950/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
      onClose={() => {
        if (confirmedRef.current) return;
        onCancel();
      }}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <div className="space-y-4 p-4">
        <div>
          <h2
            id={titleId}
            className="font-serif text-lg text-teal-800 dark:text-teal-300"
          >
            {t("specialistModalTitle")}
          </h2>
          <p className="mt-1 text-sm text-stone-600 dark:text-slate-300">
            {t("specialistModalSubtitle", { when })}
          </p>
        </div>

        <fieldset className="space-y-2">
          <legend className="sr-only">{t("specialistModalTitle")}</legend>
          {specialists.map((s) => (
            <label
              key={s.id}
              className="flex cursor-pointer items-start gap-2 rounded-md border border-stone-200 px-3 py-2 text-sm has-[:checked]:border-teal-700 has-[:checked]:bg-teal-50 dark:border-slate-600 dark:has-[:checked]:border-teal-400 dark:has-[:checked]:bg-teal-950/40"
            >
              <input
                type="radio"
                name="slot-specialist"
                value={s.id}
                checked={selectedId === s.id}
                onChange={() => setSelectedId(s.id)}
                className="mt-1"
              />
              <span>
                <span className="font-medium text-stone-900 dark:text-slate-50">
                  {s.displayName}
                </span>
                <span className="block text-xs text-stone-500 dark:text-slate-400">
                  {s.specialty}
                </span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            {t("specialistModalCancel")}
          </Button>
          <Button
            type="button"
            disabled={!selectedId}
            onClick={() => {
              confirmedRef.current = true;
              onConfirm(selectedId);
            }}
          >
            {t("specialistModalConfirm")}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
