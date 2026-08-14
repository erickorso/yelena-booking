import type { ReactNode } from "react";
import { AppHeader } from "@/components/organisms/AppHeader";

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-50 via-stone-50 to-stone-100 dark:from-teal-950 dark:via-zinc-950 dark:to-zinc-900">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-10">
        {children}
      </main>
    </div>
  );
}
