import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buttonVariants } from "@/components/atoms/Button";
import { MarketingShell } from "@/components/templates/MarketingShell";
import { Link } from "@/i18n/navigation";
import { clsx } from "clsx";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Home");
  const tApp = await getTranslations("App");

  const pillars = [
    { key: "appointments" as const },
    { key: "staff" as const },
    { key: "history" as const },
  ];

  return (
    <MarketingShell wide>
      <section aria-label={t("bannerLabel")} className="border-b border-teal-900/10">
        <div className="relative w-full bg-[#eef3ef]">
          <Image
            src="/hero-yelena.jpg"
            alt={t("bannerAlt")}
            width={1024}
            height={434}
            priority
            sizes="100vw"
            className="h-auto w-full object-cover object-center"
          />
        </div>

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:py-10">
          <div className="max-w-xl">
            <h1 className="font-serif text-2xl tracking-tight text-teal-900 dark:text-teal-100 sm:text-3xl">
              {t("title")}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)] sm:text-base">
              {t("description")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/specialists"
              className={clsx(buttonVariants({ variant: "primary", size: "lg" }), "h-12")}
            >
              {tApp("ctaDirectory")}
            </Link>
            <Link
              href="/register"
              className={clsx(buttonVariants({ variant: "secondary", size: "lg" }), "h-12")}
            >
              {tApp("ctaRegister")}
            </Link>
            <Link
              href="/login"
              className={clsx(buttonVariants({ variant: "ghost", size: "lg" }), "h-12")}
            >
              {tApp("ctaLogin")}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:py-16">
        <h2 className="font-serif text-2xl tracking-tight text-teal-900 dark:text-teal-200 sm:text-3xl">
          {t("pillarsTitle")}
        </h2>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">{t("pillarsSubtitle")}</p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-3">
          {pillars.map(({ key }, index) => (
            <li
              key={key}
              className="rounded-2xl border border-teal-900/10 bg-[var(--surface)] p-5 shadow-sm shadow-teal-900/5 dark:border-teal-400/15"
            >
              <span
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-800 dark:bg-teal-900/50 dark:text-teal-200"
                aria-hidden
              >
                {index + 1}
              </span>
              <h3 className="mt-3 text-lg font-semibold text-teal-900 dark:text-teal-100">
                {t(`pillars.${key}.title`)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                {t(`pillars.${key}.body`)}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </MarketingShell>
  );
}
