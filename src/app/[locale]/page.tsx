import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/atoms/Button";
import { MarketingShell } from "@/components/templates/MarketingShell";

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
        <p className="font-serif text-5xl leading-tight tracking-tight text-teal-950 dark:text-teal-100">
          {tApp("name")}
        </p>
        <h1 className="max-w-2xl text-2xl font-medium text-zinc-800 dark:text-zinc-100">
          {t("title")}
        </h1>
        <p className="max-w-xl text-base text-zinc-600 dark:text-zinc-400">
          {t("description")}
        </p>
        <div>
          <Button type="button">{tApp("ctaDirectory")}</Button>
        </div>
      </section>
    </MarketingShell>
  );
}
