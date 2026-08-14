"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { clsx } from "clsx";
import { Button, buttonVariants } from "@/components/atoms/Button";
import { Link, usePathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

function useIsClient() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}

export function AppHeader() {
  const t = useTranslations("App");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const isClient = useIsClient();

  const nextLocale: AppLocale = locale === "es" ? "en" : "es";

  return (
    <header className="flex items-center justify-between gap-4 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <div>
        <p className="font-serif text-xl tracking-tight text-teal-900 dark:text-teal-300">
          {t("name")}
        </p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">{t("tagline")}</p>
      </div>
      <nav aria-label={t("name")} className="flex items-center gap-2">
        <Link
          href={pathname}
          locale={nextLocale}
          className={clsx(buttonVariants({ variant: "secondary", size: "sm" }))}
          aria-label={t("localeLabel")}
        >
          {nextLocale.toUpperCase()}
        </Link>
        {isClient ? (
          <Button
            variant="ghost"
            size="sm"
            aria-label={t("themeSystem")}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? t("themeLight") : t("themeDark")}
          </Button>
        ) : (
          <Button variant="ghost" size="sm" disabled aria-hidden>
            …
          </Button>
        )}
      </nav>
    </header>
  );
}
