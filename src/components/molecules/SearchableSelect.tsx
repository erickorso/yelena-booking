"use client";

import {
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
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
  disabled?: boolean;
  /** Return label for create row, or null to hide. */
  getCreateOptionLabel?: (query: string) => string | null;
  onCreateOption?: (query: string) => void;
  createPending?: boolean;
};

/**
 * Accessible combobox with deferred client-side filter.
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
  disabled,
  getCreateOptionLabel,
  onCreateOption,
  createPending,
}: SearchableSelectProps) {
  const listId = useId();
  const triggerId = `${listId}-trigger`;
  const listboxId = `${listId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const deferredQuery = useDeferredValue(query);

  const selected = options.find((o) => o.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const source = q
      ? options.filter((o) => {
          const hay = (o.searchText ?? o.label).toLowerCase();
          return hay.includes(q);
        })
      : options;
    return source.slice(0, 50);
  }, [options, deferredQuery]);

  const createLabel = getCreateOptionLabel?.(query.trim()) ?? null;
  const optionCount = filtered.length + (createLabel && onCreateOption ? 1 : 0);

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

  function openList() {
    if (disabled) return;
    setActiveIndex(0);
    setOpen(true);
    window.requestAnimationFrame(() => searchRef.current?.focus());
  }

  function pick(id: string) {
    onChange(id);
    setQuery("");
    setOpen(false);
    document.getElementById(triggerId)?.focus();
  }

  function moveActive(delta: number) {
    if (optionCount === 0) return;
    setActiveIndex((i) => (i + delta + optionCount) % optionCount);
  }

  function activateCurrent() {
    if (activeIndex < filtered.length) {
      const opt = filtered[activeIndex];
      if (opt) pick(opt.id);
      return;
    }
    if (createLabel && onCreateOption && query.trim()) {
      onCreateOption(query.trim());
      setQuery("");
      setOpen(false);
      document.getElementById(triggerId)?.focus();
    }
  }

  function onTriggerKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openList();
    }
  }

  function onSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      document.getElementById(triggerId)?.focus();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveActive(1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      moveActive(-1);
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(Math.max(0, optionCount - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      activateCurrent();
    }
  }

  const activeOptionId =
    optionCount > 0 ? `${listId}-opt-${activeIndex}` : undefined;

  return (
    <div
      ref={rootRef}
      className="relative flex flex-col gap-1.5 text-sm text-stone-800 dark:text-slate-100"
    >
      <span className="font-medium" id={`${listId}-label`}>
        {label}
        {required ? (
          <span className="text-red-600" aria-hidden>
            {" "}
            *
          </span>
        ) : null}
      </span>
      {name ? (
        <input type="hidden" name={name} value={value} required={required} />
      ) : null}
      <button
        type="button"
        id={triggerId}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-labelledby={`${listId}-label`}
        className={clsx(
          "flex h-10 w-full items-center justify-between rounded-md border border-stone-300 bg-white px-3 text-left outline-none focus-visible:border-teal-700 focus-visible:ring-2 focus-visible:ring-teal-700/30 dark:border-slate-600 dark:bg-slate-900",
          !selected && "text-stone-500 dark:text-slate-400",
          disabled && "cursor-not-allowed opacity-50",
        )}
        onClick={() => {
          if (disabled) return;
          if (open) setOpen(false);
          else openList();
        }}
        onKeyDown={onTriggerKeyDown}
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
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onSearchKeyDown}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={activeOptionId}
              className="h-9 w-full rounded-md border border-stone-300 bg-white px-3 outline-none focus-visible:border-teal-700 focus-visible:ring-2 focus-visible:ring-teal-700/30 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-50"
            />
          </div>
          <ul
            id={listboxId}
            role="listbox"
            aria-labelledby={`${listId}-label`}
            className="max-h-56 overflow-y-auto py-1"
          >
            {filtered.length === 0 && !createLabel ? (
              <li className="px-3 py-2 text-stone-500 dark:text-slate-400" role="presentation">
                {emptyLabel}
              </li>
            ) : null}
            {filtered.map((o, index) => {
              const active = index === activeIndex;
              return (
                <li
                  key={o.id}
                  id={`${listId}-opt-${index}`}
                  role="option"
                  aria-selected={o.id === value}
                >
                  <button
                    type="button"
                    tabIndex={-1}
                    className={clsx(
                      "w-full px-3 py-2 text-left hover:bg-teal-50 dark:hover:bg-slate-800",
                      (o.id === value || active) &&
                        "bg-teal-50 dark:bg-slate-800",
                      active && "ring-2 ring-inset ring-teal-700/40",
                    )}
                    onClick={() => pick(o.id)}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    {o.label}
                  </button>
                </li>
              );
            })}
            {createLabel && onCreateOption ? (
              <li
                id={`${listId}-opt-${filtered.length}`}
                role="option"
                aria-selected={false}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  disabled={createPending}
                  className={clsx(
                    "w-full border-t border-stone-200 px-3 py-2 text-left font-medium text-teal-800 hover:bg-teal-50 disabled:opacity-50 dark:border-slate-700 dark:text-teal-300 dark:hover:bg-slate-800",
                    activeIndex === filtered.length &&
                      "bg-teal-50 ring-2 ring-inset ring-teal-700/40 dark:bg-slate-800",
                  )}
                  onMouseEnter={() => setActiveIndex(filtered.length)}
                  onClick={() => {
                    onCreateOption(query.trim());
                    setQuery("");
                    setOpen(false);
                    document.getElementById(triggerId)?.focus();
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
