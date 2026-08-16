import { getTranslations, setRequestLocale } from "next-intl/server";
import { MarketingShell } from "@/components/templates/MarketingShell";
import { SpecialistDirectory } from "@/components/organisms/SpecialistDirectory";
import { listDirectorySpecialists } from "@/lib/specialists/listDirectorySpecialists";

/** Revalidate public directory every minute (ISR). */
export const revalidate = 60;

export default async function SpecialistsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Directory");

  let specialists: Awaited<ReturnType<typeof listDirectorySpecialists>> = [];
  let errorMessage: string | null = null;
  try {
    specialists = await listDirectorySpecialists();
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : t("error");
  }

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
        <SpecialistDirectory
          specialists={specialists}
          errorMessage={errorMessage}
        />
      </section>
    </MarketingShell>
  );
}
