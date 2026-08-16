"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AppHeader } from "@/components/organisms/AppHeader";
import { Link } from "@/i18n/navigation";

export function MarketingShell({ children }: { children: ReactNode }) {
  const t = useTranslations("App");
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-50 via-stone-50 to-stone-100 dark:from-slate-900 dark:via-slate-950 dark:to-black">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-10 text-foreground">
        {children}
      </main>
      <footer className="mx-auto w-full max-w-5xl px-4 py-6 text-sm text-stone-500 dark:text-slate-400">
        <Link
          href="/privacy"
          className="underline hover:text-teal-800 dark:hover:text-teal-300"
        >
          {t("privacyLink")}
        </Link>
      </footer>
    </div>
  );
}
