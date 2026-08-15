"use client";

import { useTranslations } from "next-intl";
import { MedicalFilesPanel } from "@/components/organisms/MedicalFilesPanel";

type ClinicFilesTabProps = {
  patientId: string;
};

export function ClinicFilesTab({ patientId }: ClinicFilesTabProps) {
  const t = useTranslations("Clinic");

  return (
    <div className="space-y-6">
      <MedicalFilesPanel mode="specialist_library" />
      {patientId ? (
        <MedicalFilesPanel mode="patient_chart" patientId={patientId} />
      ) : (
        <p className="text-sm text-stone-600 dark:text-slate-300">
          {t("filesPickPatient")}
        </p>
      )}
    </div>
  );
}
