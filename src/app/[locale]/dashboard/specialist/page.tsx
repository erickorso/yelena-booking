"use client";

import { useTranslations } from "next-intl";
import { clsx } from "clsx";
import { DashboardGate } from "@/components/organisms/DashboardGate";
import { SpecialistApprovalStatus } from "@/components/organisms/SpecialistApprovalStatus";
import { MarketingShell } from "@/components/templates/MarketingShell";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/atoms/Button";

export default function SpecialistDashboardPage() {
  const t = useTranslations("Dashboard");

  return (
    <MarketingShell>
      <DashboardGate allowed={["especialista"]} title={t("specialistTitle")}>
        <Link
          href="/dashboard/patient"
          className={clsx(buttonVariants({ variant: "secondary", size: "sm" }))}
        >
          {t("goPatient")}
        </Link>
        <SpecialistApprovalStatus />
      </DashboardGate>
    </MarketingShell>
  );
}
