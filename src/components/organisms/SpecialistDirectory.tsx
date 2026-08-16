import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/atoms/Button";
import { clsx } from "clsx";
import type { DirectorySpecialist } from "@/lib/specialists/listDirectorySpecialists";

type Props = {
  specialists: DirectorySpecialist[];
  errorMessage?: string | null;
};

/** Public directory list — Server Component (HTML from SSR/ISR, no client waterfall). */
export async function SpecialistDirectory({
  specialists,
  errorMessage = null,
}: Props) {
  const t = await getTranslations("Directory");

  if (errorMessage) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        {errorMessage}
      </p>
    );
  }

  if (specialists.length === 0) {
    return (
      <p className="text-sm text-stone-600 dark:text-slate-300">{t("empty")}</p>
    );
  }

  return (
    <ul className="space-y-4" aria-label={t("title")}>
      {specialists.map((item) => (
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
              className={clsx(
                buttonVariants({ variant: "secondary", size: "sm" }),
              )}
            >
              {t("bookCta")}
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
