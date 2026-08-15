import { getTranslations, setRequestLocale } from "next-intl/server";
import { MarketingShell } from "@/components/templates/MarketingShell";
import { SpecialistDirectory } from "@/components/organisms/SpecialistDirectory";

export default async function SpecialistsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Directory");

  return (
    <MarketingShell>
      <section className="space-y-6">
        <div>
          <h1 className="font-serif text-3xl text-teal-800 dark:text-teal-300">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">
            {t("subtitle")}
          </p>
        </div>
        <SpecialistDirectory />
      </section>
    </MarketingShell>
  );
}
