"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";

export type SearchableOption = {
  id: string;
  label: string;
  searchText?: string;
};

type SearchableSelectProps = {
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  options: SearchableOption[];
  value: string;
  onChange: (id: string) => void;
  required?: boolean;
  name?: string;
  /** Return label for create row, or null to hide. */
  getCreateOptionLabel?: (query: string) => string | null;
  onCreateOption?: (query: string) => void;
  createPending?: boolean;
};

/**
 * Combobox with client-side filter. Optional creatable row from current query.
 */
export function SearchableSelect({
  label,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  options,
  value,
  onChange,
  required,
  name,
  getCreateOptionLabel,
  onCreateOption,
  createPending,
}: SearchableSelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((o) => o.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const source = q
      ? options.filter((o) => {
          const hay = (o.searchText ?? o.label).toLowerCase();
          return hay.includes(q);
        })
      : options;
    return source.slice(0, 50);
  }, [options, query]);

  const createLabel = getCreateOptionLabel?.(query.trim()) ?? null;

  useEffect(() => {
    if (!open) return;
    function onDocClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function pick(id: string) {
    onChange(id);
    setQuery("");
    setOpen(false);
  }

  return (
    <div
      ref={rootRef}
      className="relative flex flex-col gap-1.5 text-sm text-stone-800 dark:text-slate-100"
    >
      <span className="font-medium" id={`${listId}-label`}>
        {label}
      </span>
      {name ? (
        <input type="hidden" name={name} value={value} required={required} />
      ) : null}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${listId}-label`}
        className={clsx(
          "flex h-10 w-full items-center justify-between rounded-md border border-stone-300 bg-white px-3 text-left dark:border-slate-600 dark:bg-slate-900",
          !selected && "text-stone-500 dark:text-slate-400",
        )}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <span aria-hidden className="ml-2 text-stone-400">
          ▾
        </span>
      </button>

      {open ? (
        <div className="absolute top-full z-20 mt-1 w-full rounded-md border border-stone-300 bg-white shadow-md dark:border-slate-600 dark:bg-slate-900">
          <div className="border-b border-stone-200 p-2 dark:border-slate-700">
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-9 w-full rounded-md border border-stone-300 bg-white px-3 outline-none focus-visible:border-teal-700 focus-visible:ring-2 focus-visible:ring-teal-700/30 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-50"
            />
          </div>
          <ul
            role="listbox"
            aria-labelledby={`${listId}-label`}
            className="max-h-56 overflow-y-auto py-1"
          >
            {filtered.length === 0 && !createLabel ? (
              <li className="px-3 py-2 text-stone-500 dark:text-slate-400">
                {emptyLabel}
              </li>
            ) : null}
            {filtered.map((o) => (
              <li key={o.id} role="option" aria-selected={o.id === value}>
                <button
                  type="button"
                  className={clsx(
                    "w-full px-3 py-2 text-left hover:bg-teal-50 dark:hover:bg-slate-800",
                    o.id === value && "bg-teal-50 dark:bg-slate-800",
                  )}
                  onClick={() => pick(o.id)}
                >
                  {o.label}
                </button>
              </li>
            ))}
            {createLabel && onCreateOption ? (
              <li role="option" aria-selected={false}>
                <button
                  type="button"
                  disabled={createPending}
                  className="w-full border-t border-stone-200 px-3 py-2 text-left font-medium text-teal-800 hover:bg-teal-50 disabled:opacity-50 dark:border-slate-700 dark:text-teal-300 dark:hover:bg-slate-800"
                  onClick={() => {
                    onCreateOption(query.trim());
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  {createPending ? "…" : createLabel}
                </button>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
