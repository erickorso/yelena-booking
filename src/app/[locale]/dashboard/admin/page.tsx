"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DashboardGate } from "@/components/organisms/DashboardGate";
import { AdminSpecialistQueue } from "@/components/organisms/AdminSpecialistQueue";
import { AdminPatientsPanel } from "@/components/organisms/AdminPatientsPanel";
import { AdminMailTestPanel } from "@/components/organisms/AdminMailTestPanel";
import { PanelTabs } from "@/components/molecules/PanelTabs";
import { MarketingShell } from "@/components/templates/MarketingShell";

export default function AdminDashboardPage() {
  const t = useTranslations("Dashboard");
  const ta = useTranslations("Admin");
  const [tab, setTab] = useState("patients");

  const tabs = [
    { id: "patients", label: ta("tabPatients") },
    { id: "queue", label: ta("tabQueue") },
    { id: "mail", label: ta("tabMail") },
  ];

  return (
    <MarketingShell>
      <DashboardGate allowed={["admin"]} title={t("adminTitle")}>
        <p className="mb-6 text-stone-600 dark:text-slate-300">{t("adminBody")}</p>
        <PanelTabs tabs={tabs} activeId={tab} onChange={setTab}>
          {tab === "patients" ? <AdminPatientsPanel /> : null}
          {tab === "queue" ? <AdminSpecialistQueue /> : null}
          {tab === "mail" ? <AdminMailTestPanel /> : null}
        </PanelTabs>
      </DashboardGate>
    </MarketingShell>
  );
}
