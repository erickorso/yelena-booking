"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/atoms/Button";
import { SearchableSelect } from "@/components/molecules/SearchableSelect";
import type {
  ClinicAppointmentRow,
  ClinicPatientOption,
  ClinicPeerOption,
} from "@/components/organisms/clinic/clinicTypes";
import { patientSearchBlob } from "@/lib/patients/patientSearch";

type ClinicTransferTabProps = {
  patients: ClinicPatientOption[];
  peers: ClinicPeerOption[];
  appointments: ClinicAppointmentRow[];
  appointmentId: string;
  toSpecialistId: string;
  pending: boolean;
  onAppointmentIdChange: (id: string) => void;
  onToSpecialistIdChange: (id: string) => void;
  onSubmit: (event: React.FormEvent) => void;
};

export function ClinicTransferTab({
  patients,
  peers,
  appointments,
  appointmentId,
  toSpecialistId,
  pending,
  onAppointmentIdChange,
  onToSpecialistIdChange,
  onSubmit,
}: ClinicTransferTabProps) {
  const t = useTranslations("Clinic");

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-md border border-stone-200 p-4 dark:border-slate-700"
    >
      <h2 className="font-serif text-xl text-teal-800 dark:text-teal-300">
        {t("transferTitle")}
      </h2>
      <p className="text-sm text-stone-600 dark:text-slate-300">
        {t("transferSubtitle")}
      </p>
      <SearchableSelect
        label={t("transferAppointment")}
        placeholder={t("transferApptPlaceholder")}
        searchPlaceholder={t("transferApptSearch")}
        emptyLabel={t("patientEmpty")}
        value={appointmentId}
        onChange={onAppointmentIdChange}
        options={appointments
          .filter(
            (a) =>
              a.status !== "cancelled" && a.transfer?.status !== "pending",
          )
          .map((a) => {
            const patient = patients.find((p) => p.id === a.patientId);
            return {
              id: a.id,
              label: `${patient?.displayName ?? a.patientId.slice(0, 6)} · ${new Date(a.startsAt).toLocaleString()}`,
              searchText: `${patientSearchBlob({
                displayName: patient?.displayName ?? "",
                email: patient?.email ?? "",
                patientNumber: patient?.patientNumber,
              })} ${a.startsAt}`,
            };
          })}
      />
      <SearchableSelect
        label={t("transferTo")}
        placeholder={t("transferToPlaceholder")}
        searchPlaceholder={t("patientSearch")}
        emptyLabel={t("patientEmpty")}
        value={toSpecialistId}
        onChange={onToSpecialistIdChange}
        options={peers.map((p) => ({
          id: p.id,
          label: `${p.displayName} · ${p.specialty}`,
          searchText: `${p.displayName} ${p.specialty}`,
        }))}
      />
      <Button
        type="submit"
        disabled={pending || !appointmentId || !toSpecialistId}
      >
        {pending ? t("transferSending") : t("transferCta")}
      </Button>
    </form>
  );
}
