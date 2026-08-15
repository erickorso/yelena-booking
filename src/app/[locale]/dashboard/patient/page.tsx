"use client";

import { useTranslations } from "next-intl";
import { DashboardGate } from "@/components/organisms/DashboardGate";
import { PromoteToSpecialistForm } from "@/components/organisms/PromoteToSpecialistForm";
import { BookSelfAppointmentForm } from "@/components/organisms/BookSelfAppointmentForm";
import { MarketingShell } from "@/components/templates/MarketingShell";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { buttonVariants } from "@/components/atoms/Button";
import { clsx } from "clsx";

export default function PatientDashboardPage() {
  const t = useTranslations("Dashboard");
  const { role } = useAuth();

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
        <BookSelfAppointmentForm />
        {role === "paciente" ? <PromoteToSpecialistForm /> : null}
      </DashboardGate>
    </MarketingShell>
  );
}
