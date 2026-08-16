"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AppHeader } from "@/components/organisms/AppHeader";
import { Link } from "@/i18n/navigation";

export function MarketingShell({ children }: { children: ReactNode }) {
  const t = useTranslations("App");
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-50 via-stone-50 to-stone-100 dark:from-slate-900 dark:via-slate-950 dark:to-black">
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
        className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-10 text-foreground outline-none"
      >
        {children}
      </main>
      <footer className="mx-auto w-full max-w-5xl px-4 py-6 text-sm text-stone-500 dark:text-slate-400">
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
