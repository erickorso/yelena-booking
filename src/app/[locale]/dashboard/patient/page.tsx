"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { DashboardGate } from "@/components/organisms/DashboardGate";
import { PromoteToSpecialistForm } from "@/components/organisms/PromoteToSpecialistForm";
import { BookSelfAppointmentForm } from "@/components/organisms/BookSelfAppointmentForm";
import { MedicalFilesPanel } from "@/components/organisms/MedicalFilesPanel";
import { PanelTabs } from "@/components/molecules/PanelTabs";
import { MarketingShell } from "@/components/templates/MarketingShell";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { buttonVariants } from "@/components/atoms/Button";
import { clsx } from "clsx";

export default function PatientDashboardPage() {
  const t = useTranslations("Dashboard");
  const { role } = useAuth();
  const [tab, setTab] = useState("booking");

  const tabs = useMemo(() => {
    const base = [
      { id: "booking", label: t("tabBooking") },
      { id: "files", label: t("tabFiles") },
    ];
    if (role === "paciente") {
      base.push({ id: "promote", label: t("tabPromote") });
    }
    return base;
  }, [role, t]);

  return (
    <MarketingShell>
      <DashboardGate
        allowed={["paciente", "especialista", "admin"]}
        title={t("patientTitle")}
      >
        <p className="text-stone-600 dark:text-slate-300">{t("patientBody")}</p>
        {role === "especialista" || role === "admin" ? (
          <Link
            href="/dashboard/specialist"
            className={clsx(buttonVariants({ variant: "secondary", size: "sm" }))}
          >
            {t("goSpecialist")}
          </Link>
        ) : null}

        <PanelTabs tabs={tabs} activeId={tab} onChange={setTab}>
          {tab === "booking" ? <BookSelfAppointmentForm /> : null}
          {tab === "files" ? <MedicalFilesPanel mode="patient_chart" /> : null}
          {tab === "promote" && role === "paciente" ? (
            <PromoteToSpecialistForm />
          ) : null}
        </PanelTabs>
      </DashboardGate>
    </MarketingShell>
  );
}
