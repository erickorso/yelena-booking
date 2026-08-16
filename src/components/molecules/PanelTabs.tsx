"use client";

import { clsx } from "clsx";
import {
  startTransition,
  useId,
  type KeyboardEvent,
  type ReactNode,
} from "react";

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
  /** Accessible name for the tab list. */
  ariaLabel?: string;
};

/**
 * Horizontal tab strip + single active panel.
 * Keyboard: ←/→, Home/End. Tab changes use startTransition.
 */
export function PanelTabs({
  tabs,
  activeId,
  onChange,
  children,
  className,
  ariaLabel,
}: PanelTabsProps) {
  const baseId = useId();

  function selectTab(id: string) {
    startTransition(() => onChange(id));
    window.requestAnimationFrame(() => {
      document.getElementById(`${baseId}-tab-${id}`)?.focus();
    });
  }

  function onTabKeyDown(e: KeyboardEvent<HTMLButtonElement>, tabId: string) {
    const idx = tabs.findIndex((t) => t.id === tabId);
    if (idx < 0) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      selectTab(tabs[(idx + 1) % tabs.length]!.id);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      selectTab(tabs[(idx - 1 + tabs.length) % tabs.length]!.id);
    } else if (e.key === "Home") {
      e.preventDefault();
      selectTab(tabs[0]!.id);
    } else if (e.key === "End") {
      e.preventDefault();
      selectTab(tabs[tabs.length - 1]!.id);
    }
  }

  return (
    <div className={clsx("space-y-4", className)}>
      <div
        role="tablist"
        aria-label={ariaLabel}
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
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => selectTab(tab.id)}
              onKeyDown={(e) => onTabKeyDown(e, tab.id)}
              className={clsx(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700",
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
        id={`${baseId}-panel-${activeId}`}
        aria-labelledby={`${baseId}-tab-${activeId}`}
        tabIndex={0}
        className="min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
      >
        {children}
      </div>
    </div>
  );
}
