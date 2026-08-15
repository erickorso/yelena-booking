"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/atoms/Button";
import { SearchableSelect } from "@/components/molecules/SearchableSelect";
import { WeekCalendar, type CalendarSlot } from "@/components/molecules/WeekCalendar";
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

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-md border border-stone-200 p-4 dark:border-slate-700"
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
        onChange={onPatientIdChange}
        options={patients
          .filter((p) => p.id !== selfUid)
          .map((p) => ({
            id: p.id,
            label: `${p.displayName} · ${p.email}`,
            searchText: `${p.displayName} ${p.email}`,
          }))}
      />
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
        onSelectSlot={onSelectSlot}
        schedule={schedule}
        labels={{
          today: t("calToday"),
          weekOf: t("calWeek"),
          hint: t("calHint"),
          selected: t("calSelected"),
          pastSlot: t("calPast"),
          outsideHours: t("calOutside"),
          busySlot: t("calBusy"),
        }}
      />
      <Button type="submit" disabled={bookPending || !patientId || !selectedSlot}>
        {bookPending ? t("booking") : t("bookCta")}
      </Button>
    </form>
  );
}
