import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * Layered marketing hero: reception BG + floating devices + desk prop + HTML copy.
 * Height ~30–40vh, full bleed.
 */
export async function HeroBanner() {
  const t = await getTranslations("Home");
  const tApp = await getTranslations("App");

  return (
    <section
      aria-label={t("bannerLabel")}
      className="hero-banner relative w-full overflow-hidden border-b border-teal-900/10"
    >
      <div className="hero-banner__stage relative mx-auto h-[clamp(30vh,38vh,40vh)] w-full min-h-[220px] max-w-[1600px]">
        {/* Capa 0 — fondo */}
        <Image
          src="/hero/fondo-base.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="hero-banner__bg object-cover object-[center_70%]"
          aria-hidden
        />

        {/* Soft veil for text contrast on the right */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/55 dark:to-teal-950/40"
          aria-hidden
        />

        {/* Capa 2 — devices (float) */}
        <div
          className="hero-banner__devices pointer-events-none absolute inset-y-0 left-0 z-[2] w-[58%] sm:w-[55%] lg:w-[52%]"
          aria-hidden
        >
          <div className="hero-banner__laptop absolute bottom-[8%] left-[8%] w-[78%] max-w-[520px] sm:left-[10%] sm:w-[72%]">
            <Image
              src="/hero/portatil.png"
              alt=""
              width={1024}
              height={571}
              priority
              className="h-auto w-full drop-shadow-xl"
            />
          </div>
          <div className="hero-banner__tablet absolute bottom-[18%] left-[2%] w-[34%] max-w-[220px] sm:left-[4%] sm:w-[30%]">
            <Image
              src="/hero/tablet.png"
              alt=""
              width={1024}
              height={1024}
              priority
              className="h-auto w-full drop-shadow-lg"
            />
          </div>
        </div>

        {/* Capa 3 — desk accessories */}
        <div
          className="hero-banner__desk pointer-events-none absolute bottom-[2%] right-[2%] z-[3] hidden w-[22%] max-w-[180px] sm:block md:right-[4%] md:w-[18%]"
          aria-hidden
        >
          <Image
            src="/hero/cuaderno.png"
            alt=""
            width={1024}
            height={1024}
            className="hero-banner__prop h-auto w-full drop-shadow-md"
          />
        </div>

        {/* Capa 1 — copy (HTML) */}
        <div className="hero-banner__copy absolute inset-x-3 bottom-3 z-[4] flex max-w-[min(100%,22rem)] flex-col gap-2 rounded-2xl bg-white/75 p-3 backdrop-blur-sm sm:inset-x-auto sm:bottom-auto sm:right-[4%] sm:top-1/2 sm:-translate-y-1/2 sm:bg-transparent sm:p-0 sm:backdrop-blur-none md:max-w-md lg:right-[6%]">
          <h1 className="hero-banner__title font-serif text-xl leading-tight tracking-tight text-teal-800 sm:text-2xl md:text-3xl lg:text-4xl">
            {t("title")}
          </h1>
          <p className="hero-banner__subtitle text-xs leading-relaxed text-teal-900/80 sm:text-sm md:text-base">
            {t("description")}
          </p>
          <Link
            href="/privacy"
            className="hero-banner__cta inline-flex h-10 w-fit items-center text-sm font-medium text-teal-800 underline underline-offset-4 transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            {tApp("privacyLink")}
          </Link>
        </div>
      </div>
    </section>
  );
}
