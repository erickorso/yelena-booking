"use client";

import { useTranslations } from "next-intl";
import { DashboardGate } from "@/components/organisms/DashboardGate";
import { SpecialistApprovalStatus } from "@/components/organisms/SpecialistApprovalStatus";
import { MarketingShell } from "@/components/templates/MarketingShell";

export default function SpecialistDashboardPage() {
  const t = useTranslations("Dashboard");

  return (
    <MarketingShell>
      <DashboardGate allowed={["especialista"]} title={t("specialistTitle")}>
        <SpecialistApprovalStatus />
      </DashboardGate>
    </MarketingShell>
  );
}
