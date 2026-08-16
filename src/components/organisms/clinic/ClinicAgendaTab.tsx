"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/atoms/Button";
import { SearchableSelect } from "@/components/molecules/SearchableSelect";
import { WeekCalendar, type CalendarSlot } from "@/components/molecules/WeekCalendar";
import { useToast } from "@/components/providers/ToastProvider";
import type { ScheduleConfig } from "@/lib/availability/defaultSlots";
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
}: ClinicAgendaTabProps) {
  const t = useTranslations("Clinic");
  const { error: toastError } = useToast();
  const hintId = useId();
  const [showHint, setShowHint] = useState(false);

  const missingPatient = !patientId;
  const missingSlot = !selectedSlot;
  const canBook = !missingPatient && !missingSlot;

  const hintMessage = missingPatient
    ? missingSlot
      ? t("bookNeedBoth")
      : t("bookNeedPatient")
    : missingSlot
      ? t("bookNeedSlot")
      : null;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
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
        required
        value={patientId}
        onChange={(id) => {
          onPatientIdChange(id);
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
      {showHint && missingPatient ? (
        <p
          role="alert"
          className="text-sm text-amber-800 dark:text-amber-200"
        >
          {t("bookNeedPatient")}
        </p>
      ) : null}
      <WeekCalendar
        events={appointments
          .filter((a) => a.status !== "cancelled")
          .map((a) => {
            const patient = patients.find((p) => p.id === a.patientId);
            return {
              id: a.id,
              startsAt: new Date(a.startsAt),
              endsAt: new Date(a.endsAt),
              title: patient?.displayName ?? a.patientId.slice(0, 8),
              status: a.status,
            };
          })}
        selectedSlot={selectedSlot}
        onSelectSlot={(slot) => {
          onSelectSlot(slot);
          if (slot) setShowHint(false);
        }}
        schedule={schedule}
        labels={{
          today: t("calToday"),
          weekOf: t("calWeek"),
          hint: t("calHint"),
          selected: t("calSelected"),
          pastSlot: t("calPast"),
          outsideHours: t("calOutside"),
          busySlot: t("calBusy"),
          timezone: t("calTimezone"),
          legendAvailable: t("calLegendAvailable"),
          legendOutside: t("calLegendOutside"),
          legendBusy: t("calLegendBusy"),
        }}
      />
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
    </form>
  );
}
