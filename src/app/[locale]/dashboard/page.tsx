"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { MarketingShell } from "@/components/templates/MarketingShell";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function DashboardIndexPage() {
  const { status, role } = useAuth();
  const router = useRouter();
  const t = useTranslations("Auth");

  useEffect(() => {
    if (status === "loading") return;
    if (status === "anonymous") {
      router.replace("/login");
      return;
    }
    if (status === "unverified") {
      router.replace("/verify-email");
      return;
    }
    if (role === "admin") router.replace("/dashboard/admin");
    else if (role === "especialista") router.replace("/dashboard/specialist");
    else if (role === "paciente") router.replace("/dashboard/patient");
    else router.replace("/register");
  }, [status, role, router]);

  return (
    <MarketingShell>
      <p className="text-sm text-zinc-600">{t("loading")}</p>
    </MarketingShell>
  );
}
