"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/providers/AuthProvider";
import { getIdToken } from "@/services/authService";
import type { SpecialistStatus } from "@/types/domain";
import { SpecialistClinicPanel } from "@/components/organisms/SpecialistClinicPanel";

export function SpecialistApprovalStatus() {
  const t = useTranslations("Dashboard");
  const { user } = useAuth();
  const [status, setStatus] = useState<SpecialistStatus | null>(null);
  const [specialty, setSpecialty] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      try {
        const token = await getIdToken(user);
        const response = await fetch("/api/specialists/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await response.json()) as {
          specialist?: {
            status: SpecialistStatus;
            specialty: string;
          } | null;
        };
        if (!cancelled && data.specialist) {
          setStatus(data.specialist.status);
          setSpecialty(data.specialist.specialty);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) {
    return <p className="text-sm text-stone-600 dark:text-slate-300">{t("loadingStatus")}</p>;
  }

  if (status === "pending") {
    return (
      <div
        role="status"
        className="rounded-md border border-amber-500/40 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-400/40 dark:bg-amber-950/40 dark:text-amber-100"
      >
        <p className="font-medium">{t("pendingTitle")}</p>
        <p className="mt-1">{t("pendingBody")}</p>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div
        role="status"
        className="rounded-md border border-red-500/40 bg-red-50 px-4 py-3 text-sm text-red-950 dark:border-red-400/40 dark:bg-red-950/40 dark:text-red-100"
      >
        <p className="font-medium">{t("rejectedTitle")}</p>
        <p className="mt-1">{t("rejectedBody")}</p>
      </div>
    );
  }

  if (status === "active") {
    return (
      <div className="space-y-6">
        <p className="text-sm text-stone-600 dark:text-slate-300">
          {t("activeBody", { specialty })}
        </p>
        <SpecialistClinicPanel />
      </div>
    );
  }

  return (
    <p className="text-sm text-stone-600 dark:text-slate-300">{t("specialistBody")}</p>
  );
}
