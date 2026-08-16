"use client";

import { useTranslations } from "next-intl";
import { ClinicalHistoryForm } from "@/components/organisms/ClinicalHistoryForm";
import { MedicalFilesPanel } from "@/components/organisms/MedicalFilesPanel";

type ClinicFilesTabProps = {
  patientId: string;
};

export function ClinicFilesTab({ patientId }: ClinicFilesTabProps) {
  const t = useTranslations("Clinic");

  return (
    <div className="space-y-8">
      {patientId ? (
        <ClinicalHistoryForm patientId={patientId} />
      ) : (
        <p className="text-sm text-stone-600 dark:text-slate-300">
          {t("filesPickPatient")}
        </p>
      )}
      <MedicalFilesPanel mode="specialist_library" />
      {patientId ? (
        <MedicalFilesPanel mode="patient_chart" patientId={patientId} />
      ) : null}
    </div>
  );
}
