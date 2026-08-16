import { clsx } from "clsx";
import type { InputHTMLAttributes } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export function Input({
  id,
  label,
  error,
  hint,
  className,
  ...props
}: InputProps) {
  const inputId = id ?? props.name;
  const hintId = hint && inputId ? `${inputId}-hint` : undefined;
  const errorId = error && inputId ? `${inputId}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <label className="flex flex-col gap-1.5 text-sm text-stone-800 dark:text-slate-100">
      <span className="font-medium">
        {label}
        {props.required ? (
          <span className="text-red-600" aria-hidden>
            {" "}
            *
          </span>
        ) : null}
      </span>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={clsx(
          "h-10 rounded-md border border-stone-300 bg-white px-3 text-stone-900 outline-none focus-visible:border-teal-700 focus-visible:ring-2 focus-visible:ring-teal-700/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50 dark:placeholder:text-slate-400",
          error &&
            "border-red-600 focus-visible:border-red-600 focus-visible:ring-red-600/30 dark:border-red-400",
          className,
        )}
        {...props}
      />
      {hint && !error ? (
        <span id={hintId} className="text-xs text-stone-500 dark:text-slate-400">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span
          id={errorId}
          role="alert"
          className="text-xs text-red-600 dark:text-red-400"
        >
          {error}
        </span>
      ) : null}
    </label>
  );
}
