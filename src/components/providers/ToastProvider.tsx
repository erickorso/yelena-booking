"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { clsx } from "clsx";

export type ToastVariant = "success" | "error" | "info";

type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Lightweight app toasts (create / save / error). No external deps.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setItems((prev) => [...prev, { id, message, variant }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (message) => toast(message, "success"),
      error: (message) => toast(message, "error"),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(100%-2rem,22rem)] flex-col gap-2"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={clsx(
              "pointer-events-auto rounded-md border px-4 py-3 text-sm shadow-lg",
              item.variant === "success" &&
                "border-teal-700/40 bg-teal-50 text-teal-950 dark:border-teal-400/30 dark:bg-teal-950 dark:text-teal-50",
              item.variant === "error" &&
                "border-red-600/40 bg-red-50 text-red-950 dark:border-red-400/30 dark:bg-red-950 dark:text-red-50",
              item.variant === "info" &&
                "border-stone-300 bg-white text-stone-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <p>{item.message}</p>
              <button
                type="button"
                className="shrink-0 text-xs opacity-60 hover:opacity-100"
                onClick={() => dismiss(item.id)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
