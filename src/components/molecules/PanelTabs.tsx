"use client";

import { clsx } from "clsx";
import type { ReactNode } from "react";

export type PanelTab = {
  id: string;
  label: string;
};

type PanelTabsProps = {
  tabs: PanelTab[];
  activeId: string;
  onChange: (id: string) => void;
  children: ReactNode;
  className?: string;
};

/**
 * Horizontal tab strip + single active panel. Keyboard: arrows move focus between tabs.
 */
export function PanelTabs({
  tabs,
  activeId,
  onChange,
  children,
  className,
}: PanelTabsProps) {
  return (
    <div className={clsx("space-y-4", className)}>
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="flex flex-wrap gap-1 border-b border-stone-200 dark:border-slate-700"
      >
        {tabs.map((tab) => {
          const selected = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(e) => {
                const idx = tabs.findIndex((t) => t.id === tab.id);
                if (e.key === "ArrowRight") {
                  e.preventDefault();
                  const next = tabs[(idx + 1) % tabs.length];
                  onChange(next.id);
                  document.getElementById(`tab-${next.id}`)?.focus();
                } else if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
                  onChange(prev.id);
                  document.getElementById(`tab-${prev.id}`)?.focus();
                }
              }}
              className={clsx(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                selected
                  ? "border-teal-700 text-teal-800 dark:border-teal-400 dark:text-teal-300"
                  : "border-transparent text-stone-600 hover:text-stone-900 dark:text-slate-400 dark:hover:text-slate-100",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`panel-${activeId}`}
        aria-labelledby={`tab-${activeId}`}
        className="min-w-0"
      >
        {children}
      </div>
    </div>
  );
}
