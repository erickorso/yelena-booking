"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AppHeader } from "@/components/organisms/AppHeader";
import { Link } from "@/i18n/navigation";

export function MarketingShell({
  children,
  wide = false,
}: {
  children: ReactNode;
  /** Full-bleed marketing pages (home hero) */
  wide?: boolean;
}) {
  const t = useTranslations("App");
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--background)]">
      <a
        href="#main-content"
        className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:inline-flex focus:h-auto focus:w-auto focus:overflow-visible focus:rounded-md focus:bg-teal-800 focus:px-4 focus:py-2 focus:text-sm focus:text-white focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-teal-300"
      >
        {t("skipToContent")}
      </a>
      <AppHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className={
          wide
            ? "flex w-full flex-1 flex-col text-foreground outline-none"
            : "mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-10 text-foreground outline-none"
        }
      >
        {children}
      </main>
      <footer className="mx-auto w-full max-w-5xl px-4 py-6 text-sm text-[var(--muted)]">
        <Link
          href="/privacy"
          className="underline hover:text-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:hover:text-teal-300"
        >
          {t("privacyLink")}
        </Link>
      </footer>
    </div>
  );
}
