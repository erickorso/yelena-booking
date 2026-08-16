"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { DashboardGate } from "@/components/organisms/DashboardGate";
import { PromoteToSpecialistForm } from "@/components/organisms/PromoteToSpecialistForm";
import { BookSelfAppointmentForm } from "@/components/organisms/BookSelfAppointmentForm";
import { ClinicalHistoryForm } from "@/components/organisms/ClinicalHistoryForm";
import { MedicalFilesPanel } from "@/components/organisms/MedicalFilesPanel";
import { AsyncBoundary } from "@/components/molecules/AsyncBoundary";
import { PanelTabs } from "@/components/molecules/PanelTabs";
import { MarketingShell } from "@/components/templates/MarketingShell";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { buttonVariants, Button } from "@/components/atoms/Button";
import { PanelSkeleton } from "@/components/atoms/Skeleton";
import { getIdToken } from "@/services/authService";
import { clsx } from "clsx";

function PatientDashboardInner() {
  const t = useTranslations("Dashboard");
  const th = useTranslations("ClinicalHistory");
  const { user, role } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [tab, setTab] = useState(
    initialTab === "history" ||
      initialTab === "files" ||
      initialTab === "promote" ||
      initialTab === "booking"
      ? initialTab
      : "booking",
  );
  const [historyIncomplete, setHistoryIncomplete] = useState(false);
  const [historyCheckDone, setHistoryCheckDone] = useState(false);

  const tabs = useMemo(() => {
    const base = [
      { id: "booking", label: t("tabBooking") },
      { id: "history", label: t("tabHistory") },
      { id: "files", label: t("tabFiles") },
    ];
    if (role === "paciente") {
      base.push({ id: "promote", label: t("tabPromote") });
    }
    return base;
  }, [role, t]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const token = await getIdToken(user);
        const res = await fetch(
          `/api/patients/${user.uid}/clinical-history`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const data = (await res.json()) as { incomplete?: boolean };
        if (!cancelled && res.ok) {
          setHistoryIncomplete(Boolean(data.incomplete));
        }
      } finally {
        if (!cancelled) setHistoryCheckDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, tab]);

  return (
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

      {historyCheckDone && historyIncomplete && tab !== "history" ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-500/40 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-400/40 dark:bg-amber-950/40 dark:text-amber-100"
        >
          <div>
            <p className="font-medium">{th("incompleteTitle")}</p>
            <p className="mt-0.5">{th("incompleteBody")}</p>
          </div>
          <Button type="button" size="sm" onClick={() => setTab("history")}>
            {th("incompleteCta")}
          </Button>
        </div>
      ) : null}

      <PanelTabs tabs={tabs} activeId={tab} onChange={setTab}>
        {tab === "booking" ? (
          <AsyncBoundary>
            <BookSelfAppointmentForm />
          </AsyncBoundary>
        ) : null}
        {tab === "history" ? (
          <AsyncBoundary>
            <ClinicalHistoryForm
              onSaved={(incomplete) => setHistoryIncomplete(incomplete)}
            />
          </AsyncBoundary>
        ) : null}
        {tab === "files" ? (
          <AsyncBoundary>
            <MedicalFilesPanel mode="patient_chart" />
          </AsyncBoundary>
        ) : null}
        {tab === "promote" && role === "paciente" ? (
          <PromoteToSpecialistForm />
        ) : null}
      </PanelTabs>
    </DashboardGate>
  );
}

export default function PatientDashboardPage() {
  return (
    <MarketingShell>
      <Suspense fallback={<PanelSkeleton />}>
        <PatientDashboardInner />
      </Suspense>
    </MarketingShell>
  );
}
