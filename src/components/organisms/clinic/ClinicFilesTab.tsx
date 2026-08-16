"use client";

import { useTranslations } from "next-intl";
import { SearchableSelect } from "@/components/molecules/SearchableSelect";
import { ClinicalHistoryForm } from "@/components/organisms/ClinicalHistoryForm";
import { MedicalFilesPanel } from "@/components/organisms/MedicalFilesPanel";
import type { ClinicPatientOption } from "@/components/organisms/clinic/clinicTypes";

type ClinicFilesTabProps = {
  patients: ClinicPatientOption[];
  patientId: string;
  onPatientIdChange: (id: string) => void;
};

/**
 * Documentos del especialista: elige paciente → historia + archivos de esa ficha
 * (subidas ligadas a consulta; última por defecto). Biblioteca personal aparte.
 */
export function ClinicFilesTab({
  patients,
  patientId,
  onPatientIdChange,
}: ClinicFilesTabProps) {
  const t = useTranslations("Clinic");
  const selected = patients.find((p) => p.id === patientId);

  return (
    <div className="space-y-8">
      <section className="space-y-3 rounded-md border border-stone-200 p-4 dark:border-slate-700">
        <div>
          <h2 className="font-serif text-xl text-teal-800 dark:text-teal-300">
            {t("filesTitle")}
          </h2>
          <p className="mt-1 text-sm text-stone-600 dark:text-slate-300">
            {t("filesSubtitle")}
          </p>
        </div>
        <SearchableSelect
          label={t("patient")}
          placeholder={t("patientPlaceholder")}
          searchPlaceholder={t("patientSearch")}
          emptyLabel={t("patientEmpty")}
          value={patientId}
          onChange={onPatientIdChange}
          options={patients.map((p) => ({
            id: p.id,
            label: `${p.displayName} · ${p.email}`,
            searchText: `${p.displayName} ${p.email}`,
          }))}
        />
        {selected ? (
          <p className="text-sm text-teal-800 dark:text-teal-300">
            {t("filesSelected", { name: selected.displayName })}
          </p>
        ) : (
          <p role="status" className="text-sm text-amber-800 dark:text-amber-200">
            {t("filesPickPatient")}
          </p>
        )}
      </section>

      {patientId ? (
        <>
          <ClinicalHistoryForm patientId={patientId} />
          <MedicalFilesPanel mode="patient_chart" patientId={patientId} />
        </>
      ) : null}

      <details className="rounded-md border border-stone-200 p-4 dark:border-slate-700">
        <summary className="cursor-pointer text-sm font-medium text-stone-800 dark:text-slate-100">
          {t("filesLibraryToggle")}
        </summary>
        <div className="mt-4">
          <MedicalFilesPanel mode="specialist_library" />
        </div>
      </details>
    </div>
  );
}
