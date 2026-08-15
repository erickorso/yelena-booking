"use client";

import { useLocale, useTranslations } from "next-intl";
import { clsx } from "clsx";
import { Button, buttonVariants } from "@/components/atoms/Button";
import { ThemeToggle } from "@/components/molecules/ThemeToggle";
import { useAuth } from "@/components/providers/AuthProvider";
import { Link, usePathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export function AppHeader() {
  const t = useTranslations("App");
  const tAuth = useTranslations("Auth");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const { status, role, logout } = useAuth();

  const nextLocale: AppLocale = locale === "es" ? "en" : "es";
  const isAuthenticated = status === "authenticated";

  return (
    <header className="flex items-center justify-between gap-4 border-b border-zinc-200 px-4 py-3 dark:border-slate-700">
      <Link href="/" className="block">
        <p className="font-serif text-xl tracking-tight text-teal-800 dark:text-teal-300">
          {t("name")}
        </p>
        <p className="text-xs text-stone-600 dark:text-slate-300">{t("tagline")}</p>
      </Link>
      <nav aria-label={t("name")} className="flex flex-wrap items-center gap-2">
        <Link
          href="/specialists"
          className={clsx(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          {t("ctaDirectory")}
        </Link>
        <Link
          href={pathname}
          locale={nextLocale}
          className={clsx(buttonVariants({ variant: "secondary", size: "sm" }))}
          aria-label={t("localeLabel")}
        >
          {nextLocale.toUpperCase()}
        </Link>
        <ThemeToggle />
        {isAuthenticated ? (
          <>
            <Link
              href="/dashboard"
              className={clsx(buttonVariants({ variant: "secondary", size: "sm" }))}
            >
              {role ?? "…"}
            </Link>
            <Button type="button" variant="ghost" size="sm" onClick={() => void logout()}>
              {tAuth("logout")}
            </Button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className={clsx(buttonVariants({ variant: "secondary", size: "sm" }))}
            >
              {t("ctaLogin")}
            </Link>
            <Link
              href="/register"
              className={clsx(buttonVariants({ variant: "primary", size: "sm" }))}
            >
              {t("ctaRegister")}
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
