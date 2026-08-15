"use client";

import { useTranslations } from "next-intl";
import { DashboardGate } from "@/components/organisms/DashboardGate";
import { MarketingShell } from "@/components/templates/MarketingShell";

export default function PatientDashboardPage() {
  const t = useTranslations("Dashboard");

  return (
    <MarketingShell>
      <DashboardGate allowed={["paciente"]} title={t("patientTitle")}>
        <p className="text-zinc-600 dark:text-zinc-400">{t("patientBody")}</p>
      </DashboardGate>
    </MarketingShell>
  );
}
