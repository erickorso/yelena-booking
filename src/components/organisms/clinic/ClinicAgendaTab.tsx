"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/atoms/Button";
import { SearchableSelect } from "@/components/molecules/SearchableSelect";
import {
  AppointmentManageModal,
  type ManageableAppointment,
} from "@/components/molecules/AppointmentManageModal";
import {
  WeekCalendar,
  type CalendarEvent,
  type CalendarSlot,
} from "@/components/molecules/WeekCalendar";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import type { ScheduleConfig } from "@/lib/availability/defaultSlots";
import { resolveScheduleTimezone } from "@/lib/availability/defaultSlots";
import {
  addDaysYmd,
  fromZonedYmdHm,
  zonedYmd,
} from "@/lib/availability/scheduleTimeZone";
import { resolvePatientTimezone } from "@/lib/timezones";
import { getIdToken } from "@/services/authService";
import type {
  ClinicAppointmentRow,
  ClinicPatientOption,
} from "@/components/organisms/clinic/clinicTypes";

type ClinicAgendaTabProps = {
  selfUid: string | undefined;
  patients: ClinicPatientOption[];
  appointments: ClinicAppointmentRow[];
  patientId: string;
  onPatientIdChange: (id: string) => void;
  selectedSlot: CalendarSlot | null;
  onSelectSlot: (slot: CalendarSlot | null) => void;
  schedule: ScheduleConfig;
  bookPending: boolean;
  onSubmit: (event: React.FormEvent) => void;
  onAppointmentsChanged: () => void;
};

export function ClinicAgendaTab({
  selfUid,
  patients,
  appointments,
  patientId,
  onPatientIdChange,
  selectedSlot,
  onSelectSlot,
  schedule,
  bookPending,
  onSubmit,
  onAppointmentsChanged,
}: ClinicAgendaTabProps) {
  const t = useTranslations("Clinic");
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const hintId = useId();
  const [showHint, setShowHint] = useState(false);
  const [googleBusy, setGoogleBusy] = useState<CalendarEvent[]>([]);
  const [patientOtherBusy, setPatientOtherBusy] = useState<CalendarEvent[]>([]);
  const [managing, setManaging] = useState<ManageableAppointment | null>(null);
  const [managePending, setManagePending] = useState(false);
  const [manageError, setManageError] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [reschedulePending, setReschedulePending] = useState(false);
  const rescheduleTarget = useMemo(
    () => appointments.find((a) => a.id === rescheduleId) ?? null,
    [appointments, rescheduleId],
  );
  const isGhostRebook = rescheduleTarget?.status === "cancelled";

  const cancelledList = useMemo(
    () =>
      [...appointments]
        .filter((a) => a.status === "cancelled")
        .sort(
          (a, b) =>
            new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
        ),
    [appointments],
  );

  const missingPatient = !patientId;
  const missingSlot = !selectedSlot;
  const canBook = !missingPatient && !missingSlot && !rescheduleId;

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === patientId) ?? null,
    [patients, patientId],
  );
  const scheduleTz = resolveScheduleTimezone(schedule);
  const patientTz = selectedPatient
    ? resolvePatientTimezone(selectedPatient.timezone)
    : scheduleTz;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const token = await getIdToken(user);
        const today = zonedYmd(new Date(), scheduleTz);
        const from = fromZonedYmdHm(addDaysYmd(today, -7), "00:00", scheduleTz);
        const to = fromZonedYmdHm(addDaysYmd(today, 21), "00:00", scheduleTz);
        const res = await fetch(
          `/api/specialists/me/google-busy?timeMin=${encodeURIComponent(from.toISOString())}&timeMax=${encodeURIComponent(to.toISOString())}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const data = (await res.json()) as {
          busy?: { startsAt: string; endsAt: string }[];
        };
        if (cancelled || !res.ok) return;
        setGoogleBusy(
          (data.busy ?? []).map((b, i) => ({
            id: `gcal-${i}-${b.startsAt}`,
            startsAt: new Date(b.startsAt),
            endsAt: new Date(b.endsAt),
            title: t("calGoogleBusy"),
            status: "confirmed",
            source: "google" as const,
          })),
        );
      } catch {
        if (!cancelled) setGoogleBusy([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, scheduleTz, t, appointments]);

  useEffect(() => {
    if (!user || !patientId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const token = await getIdToken(user);
        const res = await fetch(
          `/api/appointments?as=specialist&patientId=${encodeURIComponent(patientId)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const data = (await res.json()) as {
          appointments?: ClinicAppointmentRow[];
        };
        if (cancelled || !res.ok) return;
        setPatientOtherBusy(
          (data.appointments ?? [])
            .filter(
              (a) =>
                (a.status === "pending" || a.status === "confirmed") &&
                Boolean(a.specialistId) &&
                a.specialistId !== selfUid,
            )
            .map((a) => ({
              id: `patient-other-${a.id}`,
              patientId: a.patientId,
              startsAt: new Date(a.startsAt),
              endsAt: new Date(a.endsAt),
              title: t("calPatientOther"),
              status: a.status,
              source: "patient_other" as const,
            })),
        );
      } catch {
        if (!cancelled) setPatientOtherBusy([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, patientId, selfUid, t, appointments]);

  const patientBusyForCalendar = patientId ? patientOtherBusy : [];

  const hintMessage = missingPatient
    ? missingSlot
      ? t("bookNeedBoth")
      : t("bookNeedPatient")
    : missingSlot
      ? t("bookNeedSlot")
      : null;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (rescheduleId) return;
    if (!canBook) {
      setShowHint(true);
      toastError(
        missingPatient ? t("bookNeedPatient") : t("bookNeedSlot"),
      );
      return;
    }
    setShowHint(false);
    onSubmit(event);
  }

  async function cancelAppointment() {
    if (!user || !managing) return;
    setManagePending(true);
    setManageError(null);
    try {
      const token = await getIdToken(user);
      const res = await fetch(`/api/appointments/${managing.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? t("cancelError"));
      success(t("cancelSuccess"));
      setManaging(null);
      onAppointmentsChanged();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("cancelError");
      setManageError(msg);
      toastError(msg);
    } finally {
      setManagePending(false);
    }
  }

  async function applyReschedule(slot: CalendarSlot) {
    if (!user || !rescheduleId) return;
    const rebookGhost = isGhostRebook;
    setReschedulePending(true);
    try {
      const token = await getIdToken(user);
      const res = await fetch(`/api/appointments/${rescheduleId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? t("rescheduleError"));
      success(rebookGhost ? t("rebookSuccess") : t("rescheduleSuccess"));
      setRescheduleId(null);
      onSelectSlot(null);
      onAppointmentsChanged();
    } catch (err) {
      toastError(err instanceof Error ? err.message : t("rescheduleError"));
    } finally {
      setReschedulePending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-md border border-stone-200 p-4 dark:border-slate-700"
      noValidate
    >
      <h2 className="font-serif text-xl text-teal-800 dark:text-teal-300">
        {t("bookTitle")}
      </h2>
      <p className="text-sm text-stone-600 dark:text-slate-300">
        {t("bookSubtitle")}
      </p>
      <SearchableSelect
        label={t("patient")}
        placeholder={t("patientPlaceholder")}
        searchPlaceholder={t("patientSearch")}
        emptyLabel={t("patientEmpty")}
        name="patientId"
        required={!rescheduleId}
        value={patientId}
        onChange={(id) => {
          onPatientIdChange(id);
          onSelectSlot(null);
          if (id) setShowHint(false);
        }}
        options={patients
          .filter((p) => p.id !== selfUid)
          .map((p) => ({
            id: p.id,
            label: `${p.displayName} · ${p.email}`,
            searchText: `${p.displayName} ${p.email}`,
          }))}
      />
      {showHint && missingPatient && !rescheduleId ? (
        <p
          role="alert"
          className="text-sm text-amber-800 dark:text-amber-200"
        >
          {t("bookNeedPatient")}
        </p>
      ) : null}
      <WeekCalendar
        key={`${patientTz}:${scheduleTz}:${patientId || "none"}`}
        events={appointments.map((a) => {
          const patient = patients.find((p) => p.id === a.patientId);
          const name = patient?.displayName ?? a.patientId.slice(0, 8);
          return {
            id: a.id,
            patientId: a.patientId,
            startsAt: new Date(a.startsAt),
            endsAt: new Date(a.endsAt),
            title: a.status === "cancelled" ? `${t("ghostPrefix")} ${name}` : name,
            status: a.status,
            source: "yelena" as const,
          };
        })}
        googleBusy={[...googleBusy, ...patientBusyForCalendar]}
        selectedSlot={selectedSlot}
        onSelectSlot={(slot) => {
          if (rescheduleId && slot) {
            void applyReschedule(slot);
            return;
          }
          onSelectSlot(slot);
          if (slot) setShowHint(false);
        }}
        onEventClick={(ev) => {
          if (ev.source === "google" || ev.source === "patient_other") return;
          setManageError(null);
          setManaging({
            id: ev.id,
            title: ev.title,
            startsAt: ev.startsAt,
            endsAt: ev.endsAt,
            status: ev.status,
            patientId: ev.patientId ?? "",
          });
        }}
        rescheduleHint={
          rescheduleId
            ? reschedulePending
              ? t("rescheduleSaving")
              : isGhostRebook
                ? t("rebookHint")
                : t("rescheduleHint")
            : null
        }
        schedule={schedule}
        displayTimeZone={patientTz}
        labels={{
          today: t("calToday"),
          weekOf: t("calWeek"),
          hint: selectedPatient ? t("calHintPatient") : t("calHint"),
          selected: t("calSelected"),
          pastSlot: t("calPast"),
          outsideHours: t("calOutside"),
          busySlot: t("calBusy"),
          timezone: t("calTimezone"),
          timezonePatient: t("calTimezonePatient"),
          timezoneSpecialist: t("calTimezoneSpecialist"),
          legendAvailable: t("calLegendAvailable"),
          legendOutside: t("calLegendOutside"),
          legendBusy: t("calLegendBusy"),
          legendGoogle: t("calLegendGoogle"),
          legendGhost: t("calLegendGhost"),
          legendPatientOther: t("calLegendPatientOther"),
        }}
      />
      {!rescheduleId ? (
        <>
          {!canBook ? (
            <p
              id={hintId}
              role="status"
              className="rounded-md border border-amber-500/30 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-400/30 dark:bg-amber-950/40 dark:text-amber-100"
            >
              {hintMessage}
            </p>
          ) : (
            <p
              id={hintId}
              role="status"
              className="text-sm text-teal-800 dark:text-teal-300"
            >
              {t("bookReady")}
            </p>
          )}
          <Button
            type="submit"
            disabled={bookPending}
            aria-describedby={hintId}
          >
            {bookPending ? t("booking") : t("bookCta")}
          </Button>
        </>
      ) : (
        <Button
          type="button"
          variant="secondary"
          disabled={reschedulePending}
          onClick={() => {
            setRescheduleId(null);
            onSelectSlot(null);
          }}
        >
          {t("rescheduleAbort")}
        </Button>
      )}

      <AppointmentManageModal
        open={managing !== null}
        appointment={managing}
        timeZone={patientTz}
        pending={managePending}
        error={manageError}
        onClose={() => {
          if (!managePending) setManaging(null);
        }}
        onCancelAppointment={() => void cancelAppointment()}
        onReschedule={() => {
          if (!managing) return;
          onPatientIdChange(managing.patientId);
          setRescheduleId(managing.id);
          setManaging(null);
          onSelectSlot(null);
        }}
      />

      <section className="space-y-2 border-t border-stone-200 pt-4 dark:border-slate-700">
        <h3 className="font-medium text-stone-800 dark:text-slate-100">
          {t("cancelledTitle")}
        </h3>
        <p className="text-xs text-stone-500 dark:text-slate-400">
          {t("cancelledSubtitle")}
        </p>
        {cancelledList.length === 0 ? (
          <p className="text-sm text-stone-600 dark:text-slate-300">
            {t("cancelledEmpty")}
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {cancelledList.map((a) => {
              const patient = patients.find((p) => p.id === a.patientId);
              const when = new Date(a.startsAt).toLocaleString(undefined, {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: patientTz,
              });
              return (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 py-2 dark:border-slate-700"
                >
                  <span className="text-stone-800 dark:text-slate-100">
                    {patient?.displayName ?? a.patientId.slice(0, 8)} · {when}
                    {a.rescheduledToId ? (
                      <span className="ml-1 text-xs text-teal-700 dark:text-teal-300">
                        ({t("cancelledRebooked")})
                      </span>
                    ) : null}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={Boolean(rescheduleId)}
                    onClick={() => {
                      onPatientIdChange(a.patientId);
                      setRescheduleId(a.id);
                      onSelectSlot(null);
                    }}
                  >
                    {t("cancelledRebook")}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </form>
  );
}
