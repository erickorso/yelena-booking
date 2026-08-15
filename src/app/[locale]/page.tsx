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

  return (
    <MarketingShell>
      <section className="flex flex-col gap-6">
        <p className="font-serif text-5xl leading-tight tracking-tight text-teal-800 dark:text-teal-300">
          {tApp("name")}
        </p>
        <h1 className="max-w-2xl text-2xl font-medium text-stone-900 dark:text-slate-50">
          {t("title")}
        </h1>
        <p className="max-w-xl text-base text-stone-600 dark:text-slate-300">
          {t("description")}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/specialists"
            className={clsx(buttonVariants({ variant: "primary", size: "lg" }))}
          >
            {tApp("ctaDirectory")}
          </Link>
          <Link
            href="/register"
            className={clsx(buttonVariants({ variant: "secondary", size: "lg" }))}
          >
            {tApp("ctaRegister")}
          </Link>
          <Link
            href="/login"
            className={clsx(buttonVariants({ variant: "ghost", size: "lg" }))}
          >
            {tApp("ctaLogin")}
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}
