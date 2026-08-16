"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/atoms/Button";

export type ManageableAppointment = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  patientId: string;
};

type AppointmentManageModalProps = {
  open: boolean;
  appointment: ManageableAppointment | null;
  timeZone: string;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onCancelAppointment: () => void;
  onReschedule: () => void;
};

/**
 * Manage an existing appointment: cancel or start reschedule.
 * Cancelled ghosts only offer rebook (original slot stays as ghost).
 */
export function AppointmentManageModal({
  open,
  appointment,
  timeZone,
  pending,
  error,
  onClose,
  onCancelAppointment,
  onReschedule,
}: AppointmentManageModalProps) {
  const t = useTranslations("AppointmentManage");
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const isGhost = appointment?.status === "cancelled";

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      setConfirmCancel(false);
      el.showModal();
    }
    if (!open && el.open) el.close();
  }, [open]);

  if (!open || !appointment) return null;

  const when = `${appointment.startsAt.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  })} → ${appointment.endsAt.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  })}`;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="fixed left-1/2 top-1/2 z-50 m-0 w-[min(100%,24rem)] -translate-x-1/2 -translate-y-1/2 rounded-md border border-stone-200 bg-white p-0 text-stone-900 shadow-lg backdrop:bg-stone-950/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="space-y-4 p-4">
        <div>
          <h2
            id={titleId}
            className="font-serif text-lg text-teal-800 dark:text-teal-300"
          >
            {isGhost ? t("ghostTitle") : t("title")}
          </h2>
          <p className="mt-1 font-medium text-stone-900 dark:text-slate-50">
            {appointment.title}
          </p>
          <p className="mt-0.5 text-sm text-stone-600 dark:text-slate-300">
            {when}
          </p>
          <p className="text-xs text-stone-500 dark:text-slate-400">
            {isGhost
              ? t("ghostHint")
              : t("status", { status: appointment.status })}
          </p>
        </div>

        {error ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}

        {confirmCancel && !isGhost ? (
          <div className="space-y-3 rounded-md border border-amber-500/40 bg-amber-50 p-3 dark:bg-amber-950/30">
            <p className="text-sm text-amber-950 dark:text-amber-100">
              {t("cancelConfirm")}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={onCancelAppointment}
              >
                {pending ? t("cancelling") : t("cancelYes")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() => setConfirmCancel(false)}
              >
                {t("cancelNo")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={onReschedule}
            >
              {isGhost ? t("rebook") : t("reschedule")}
            </Button>
            {!isGhost ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() => setConfirmCancel(true)}
              >
                {t("cancel")}
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={onClose}
            >
              {t("close")}
            </Button>
          </div>
        )}
      </div>
    </dialog>
  );
}
