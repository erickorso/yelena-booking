"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/atoms/Button";
import { clsx } from "clsx";

type DirectorySpecialist = {
  id: string;
  displayName: string;
  specialty: string;
  location: string;
  bio: string;
  rating: number | null;
};

export function SpecialistDirectory() {
  const t = useTranslations("Directory");
  const [items, setItems] = useState<DirectorySpecialist[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/specialists");
        const data = (await response.json()) as {
          specialists?: DirectorySpecialist[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? t("error"));
        }
        if (!cancelled) {
          setItems(data.specialists ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("error"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  if (loading) {
    return <p className="text-sm text-stone-600 dark:text-slate-300">{t("loading")}</p>;
  }

  if (error) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        {error}
      </p>
    );
  }

  if (items.length === 0) {
    return <p className="text-sm text-stone-600 dark:text-slate-300">{t("empty")}</p>;
  }

  return (
    <ul className="space-y-4" aria-label={t("title")}>
      {items.map((item) => (
        <li
          key={item.id}
          className="border-b border-stone-200 py-4 dark:border-slate-700"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium text-stone-900 dark:text-slate-50">
                {item.displayName}
              </h2>
              <p className="text-sm text-teal-800 dark:text-teal-300">
                {item.specialty}
                {item.location ? ` · ${item.location}` : ""}
              </p>
              {item.bio ? (
                <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">
                  {item.bio}
                </p>
              ) : null}
              {item.rating !== null ? (
                <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
                  {t("rating", { value: item.rating })}
                </p>
              ) : null}
            </div>
            <Link
              href="/login"
              className={clsx(buttonVariants({ variant: "secondary", size: "sm" }))}
            >
              {t("bookCta")}
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
