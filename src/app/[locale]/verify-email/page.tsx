"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/atoms/Button";
import { useAuth } from "@/components/providers/AuthProvider";
import { Link, useRouter } from "@/i18n/navigation";
import { MarketingShell } from "@/components/templates/MarketingShell";
import type { AppLocale } from "@/i18n/routing";

function dashboardPath(role: string | null): string {
  if (role === "admin") return "/dashboard/admin";
  if (role === "especialista") return "/dashboard/specialist";
  if (role === "paciente") return "/dashboard/patient";
  return "/register";
}

export default function VerifyEmailPage() {
  const t = useTranslations("VerifyEmail");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const {
    status,
    user,
    role,
    resendVerification,
    refreshEmailVerification,
    logout,
  } = useAuth();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const continueUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/${locale}/login`
      : `/${locale}/login`;

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(dashboardPath(role));
    }
    if (status === "anonymous") {
      router.replace("/login");
    }
  }, [status, role, router]);

  async function onResend() {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      await resendVerification(continueUrl);
      setMessage(t("resent"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setPending(false);
    }
  }

  async function onCheck() {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const ok = await refreshEmailVerification();
      if (ok) {
        setMessage(t("activated"));
      } else {
        setMessage(t("stillPending"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setPending(false);
    }
  }

  if (status === "loading" || status === "authenticated" || status === "anonymous") {
    return (
      <MarketingShell>
        <p className="text-sm text-stone-600 dark:text-slate-300">{t("loading")}</p>
      </MarketingShell>
    );
  }

  return (
    <MarketingShell>
      <div className="mx-auto w-full max-w-md space-y-6">
        <div>
          <h1 className="font-serif text-3xl text-teal-800 dark:text-teal-300">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">
            {t("subtitle", { email: user?.email ?? "—" })}
          </p>
        </div>
        {message ? (
          <p role="status" className="text-sm text-teal-800 dark:text-teal-300">
            {message}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
        <div className="flex flex-col gap-3">
          <Button type="button" disabled={pending} onClick={() => void onCheck()}>
            {pending ? t("loading") : t("checkCta")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => void onResend()}
          >
            {t("resendCta")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => void logout()}
          >
            {t("logout")}
          </Button>
        </div>
        <p className="text-sm text-stone-600 dark:text-slate-300">
          <Link
            href="/login"
            className="font-medium text-teal-800 underline dark:text-teal-300"
          >
            {t("backLogin")}
          </Link>
        </p>
      </div>
    </MarketingShell>
  );
}
