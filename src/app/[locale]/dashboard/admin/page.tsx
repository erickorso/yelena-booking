"use client";

import { useTranslations } from "next-intl";
import { DashboardGate } from "@/components/organisms/DashboardGate";
import { AdminSpecialistQueue } from "@/components/organisms/AdminSpecialistQueue";
import { AdminMailTestPanel } from "@/components/organisms/AdminMailTestPanel";
import { MarketingShell } from "@/components/templates/MarketingShell";

export default function AdminDashboardPage() {
  const t = useTranslations("Dashboard");

  return (
    <MarketingShell>
      <DashboardGate allowed={["admin"]} title={t("adminTitle")}>
        <p className="mb-6 text-stone-600 dark:text-slate-300">{t("adminBody")}</p>
        <div className="space-y-8">
          <AdminSpecialistQueue />
          <AdminMailTestPanel />
        </div>
      </DashboardGate>
    </MarketingShell>
  );
}
