"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { clsx } from "clsx";
import { DashboardGate } from "@/components/organisms/DashboardGate";
import { SpecialistApprovalStatus } from "@/components/organisms/SpecialistApprovalStatus";
import { MarketingShell } from "@/components/templates/MarketingShell";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/atoms/Button";
import { useToast } from "@/components/providers/ToastProvider";

function GcalToastFromQuery() {
  const tg = useTranslations("GoogleCalendar");
  const searchParams = useSearchParams();
  const { success, error: toastError } = useToast();

  useEffect(() => {
    const gcal = searchParams.get("gcal");
    if (gcal === "connected") {
      success(tg("connectSuccess"));
      window.history.replaceState({}, "", window.location.pathname);
    } else if (gcal === "error") {
      toastError(tg("connectError"));
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams, success, toastError, tg]);

  return null;
}

export default function SpecialistDashboardPage() {
  const t = useTranslations("Dashboard");

  return (
    <MarketingShell>
      <DashboardGate allowed={["especialista"]} title={t("specialistTitle")}>
        <Suspense fallback={null}>
          <GcalToastFromQuery />
        </Suspense>
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
