"use client";

import { useId, useState, type ReactNode } from "react";
import { clsx } from "clsx";

type CollapsibleSectionProps = {
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  defaultOpen?: boolean;
  /** Controlled open state (optional). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  /** Show instead of children while async data loads. */
  loading?: boolean;
  skeleton?: ReactNode;
  className?: string;
  /** Visually quieter nested section. */
  nested?: boolean;
};

/**
 * Accessible collapsible panel for long forms / async blocks.
 */
export function CollapsibleSection({
  title,
  subtitle,
  meta,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  children,
  loading = false,
  skeleton,
  className,
  nested = false,
}: CollapsibleSectionProps) {
  const panelId = useId();
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = openProp ?? uncontrolled;

  function setOpen(next: boolean) {
    onOpenChange?.(next);
    if (openProp === undefined) setUncontrolled(next);
  }

  return (
    <section
      className={clsx(
        nested
          ? "rounded-md border border-stone-200/80 dark:border-slate-700/80"
          : "rounded-md border border-stone-200 dark:border-slate-700",
        className,
      )}
    >
      <h2 className={nested ? "text-base" : "font-serif text-xl"}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          className={clsx(
            "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
            "hover:bg-stone-50 dark:hover:bg-slate-900/60",
            nested
              ? "font-medium text-stone-800 dark:text-slate-100"
              : "text-teal-800 dark:text-teal-300",
          )}
          onClick={() => setOpen(!open)}
        >
          <span
            aria-hidden
            className={clsx(
              "mt-1 inline-block text-xs text-stone-500 transition-transform dark:text-slate-400",
              open && "rotate-90",
            )}
          >
            ▸
          </span>
          <span className="min-w-0 flex-1">
            <span className="block">{title}</span>
            {subtitle ? (
              <span className="mt-0.5 block text-sm font-normal text-stone-600 dark:text-slate-300">
                {subtitle}
              </span>
            ) : null}
            {meta ? (
              <span className="mt-0.5 block text-xs font-normal text-stone-500 dark:text-slate-400">
                {meta}
              </span>
            ) : null}
          </span>
        </button>
      </h2>
      {open ? (
        <div id={panelId} className="space-y-4 border-t border-stone-200 px-4 py-4 dark:border-slate-700">
          {loading ? (skeleton ?? children) : children}
        </div>
      ) : null}
    </section>
  );
}
