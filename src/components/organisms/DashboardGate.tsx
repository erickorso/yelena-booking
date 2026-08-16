"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useRouter } from "@/i18n/navigation";
import type { AuthRole } from "@/types/domain";
import { Button } from "@/components/atoms/Button";
import { PanelSkeleton } from "@/components/atoms/Skeleton";
import { ProfilePhotoControl } from "@/components/molecules/ProfilePhotoControl";
import { getIdToken } from "@/services/authService";

type DashboardGateProps = {
  allowed: AuthRole[];
  title: string;
  children?: React.ReactNode;
};

export function DashboardGate({ allowed, title, children }: DashboardGateProps) {
  const t = useTranslations("Auth");
  const router = useRouter();
  const { status, role, isAllowed, isLoading, user } = useRequireAuth(allowed);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [patientNumber, setPatientNumber] = useState<string | null>(null);
  const displayName = profileName ?? user?.displayName ?? null;

  useEffect(() => {
    if (isLoading) return;
    if (status === "anonymous") {
      router.replace("/login");
      return;
    }
    if (status === "unverified") {
      router.replace("/verify-email");
      return;
    }
    if (status === "authenticated" && !role) {
      router.replace("/register");
    }
  }, [isLoading, status, role, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const token = await getIdToken(user);
        const res = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json()) as {
          displayName?: string;
          patientNumber?: string;
        };
        if (!cancelled && res.ok) {
          if (data.displayName) setProfileName(data.displayName);
          if (data.patientNumber) setPatientNumber(data.patientNumber);
        }
      } catch {
        // Keep Firebase displayName fallback.
      }
    })();

    function onProfileUpdated(event: Event) {
      const detail = (event as CustomEvent<{ displayName?: string }>).detail;
      if (detail?.displayName) setProfileName(detail.displayName);
    }
    window.addEventListener("yelena:profile-updated", onProfileUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener("yelena:profile-updated", onProfileUpdated);
    };
  }, [user]);

  if (isLoading || status === "anonymous") {
    return <PanelSkeleton />;
  }

  if (!isAllowed) {
    return (
      <div className="space-y-4">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {t("errors.forbidden")}
        </p>
        <Button type="button" onClick={() => router.push("/dashboard")}>
          {t("goDashboard")}
        </Button>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-teal-800 dark:text-teal-300">
            {title}
          </h1>
          {displayName ? (
            <p className="mt-1 text-lg font-medium text-stone-900 dark:text-slate-50">
              {displayName}
            </p>
          ) : null}
          {patientNumber ? (
            <p className="mt-0.5 font-mono text-xs tracking-wide text-stone-500 dark:text-slate-400">
              {t("patientNumber", { number: patientNumber })}
            </p>
          ) : null}
          <p className="mt-0.5 text-sm text-stone-600 dark:text-slate-300">
            {user?.email} · {role}
          </p>
        </div>
        <ProfilePhotoControl />
      </header>
      {children}
    </section>
  );
}
