"use client";

import { useTranslations } from "next-intl";
import { SearchableSelect } from "@/components/molecules/SearchableSelect";
import { AsyncBoundary } from "@/components/molecules/AsyncBoundary";
import { CollapsibleSection } from "@/components/molecules/CollapsibleSection";
import { ClinicalHistoryForm } from "@/components/organisms/ClinicalHistoryForm";
import { MedicalFilesPanel } from "@/components/organisms/MedicalFilesPanel";
import type { ClinicPatientOption } from "@/components/organisms/clinic/clinicTypes";
import { patientSearchBlob } from "@/lib/patients/patientSearch";

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
    <div className="space-y-4">
      <CollapsibleSection
        title={t("filesTitle")}
        subtitle={t("filesSubtitle")}
        defaultOpen
      >
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
            searchText: patientSearchBlob(p),
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
      </CollapsibleSection>

      {patientId ? (
        <AsyncBoundary>
          <div className="space-y-4">
            <ClinicalHistoryForm patientId={patientId} />
            <MedicalFilesPanel mode="patient_chart" patientId={patientId} />
          </div>
        </AsyncBoundary>
      ) : null}

      <AsyncBoundary>
        <MedicalFilesPanel mode="specialist_library" />
      </AsyncBoundary>
    </div>
  );
}
