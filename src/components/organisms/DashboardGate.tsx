"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useRouter } from "@/i18n/navigation";
import type { AuthRole } from "@/types/domain";
import { Button } from "@/components/atoms/Button";
import { PanelSkeleton } from "@/components/atoms/Skeleton";
import { ProfilePhotoControl } from "@/components/molecules/ProfilePhotoControl";

type DashboardGateProps = {
  allowed: AuthRole[];
  title: string;
  children?: React.ReactNode;
};

export function DashboardGate({ allowed, title, children }: DashboardGateProps) {
  const t = useTranslations("Auth");
  const router = useRouter();
  const { status, role, isAllowed, isLoading, user } = useRequireAuth(allowed);

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
          <p className="mt-1 text-sm text-stone-600 dark:text-slate-300">
            {user?.email} · {role}
          </p>
        </div>
        <ProfilePhotoControl />
      </header>
      {children}
    </section>
  );
}
