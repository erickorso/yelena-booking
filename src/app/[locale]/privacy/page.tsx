import { getTranslations, setRequestLocale } from "next-intl/server";
import { MarketingShell } from "@/components/templates/MarketingShell";
import { Link } from "@/i18n/navigation";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Privacy");

  return (
    <MarketingShell>
      <article className="prose prose-stone max-w-3xl dark:prose-invert">
        <p className="text-sm">
          <Link href="/" className="text-teal-800 underline dark:text-teal-300">
            {t("backHome")}
          </Link>
        </p>
        <h1 className="font-serif text-3xl text-teal-800 dark:text-teal-300">
          {t("title")}
        </h1>
        <p className="text-sm text-stone-500 dark:text-slate-400">{t("updated")}</p>
        <p>{t("intro")}</p>

        <h2>{t("dataTitle")}</h2>
        <p>{t("dataBody")}</p>

        <h2>{t("googleTitle")}</h2>
        <p>{t("googleBody")}</p>

        <h2>{t("storageTitle")}</h2>
        <p>{t("storageBody")}</p>

        <h2>{t("rightsTitle")}</h2>
        <p>{t("rightsBody")}</p>

        <h2>{t("contactTitle")}</h2>
        <p>{t("contactBody")}</p>
      </article>
    </MarketingShell>
  );
}
