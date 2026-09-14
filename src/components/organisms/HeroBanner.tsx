import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { HeroDeviceParticles } from "@/components/organisms/HeroDeviceParticles";
import { HeroParticleTitle } from "@/components/organisms/HeroParticleTitle";

/**
 * Layered marketing hero: reception BG + floating devices + desk prop + particle title.
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
      <div className="hero-banner__stage relative mx-auto h-[clamp(30vh,42vh,48vh)] w-full min-h-[240px] max-w-[1600px]">
        <Image
          src="/hero/fondo-base.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="hero-banner__bg object-cover object-[center_70%]"
          aria-hidden
        />

        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/60 dark:to-teal-950/45"
          aria-hidden
        />

        {/* Capa 2 — devices + ambient particles */}
        <div
          className="hero-banner__devices pointer-events-none absolute inset-y-0 left-0 z-[2] w-[58%] sm:w-[55%] lg:w-[52%]"
          aria-hidden
        >
          <HeroDeviceParticles className="absolute inset-0 z-0" count={64} color="15,118,110" />
          <div className="hero-banner__laptop absolute bottom-[8%] left-[8%] z-[1] w-[78%] max-w-[520px] sm:left-[10%] sm:w-[72%]">
            <Image
              src="/hero/portatil.png"
              alt=""
              width={1024}
              height={571}
              priority
              className="h-auto w-full drop-shadow-xl"
            />
          </div>
          <div className="hero-banner__tablet absolute bottom-[18%] left-[2%] z-[2] w-[34%] max-w-[220px] sm:left-[4%] sm:w-[30%]">
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

        {/* Capa 1 — particle title + copy */}
        <div className="hero-banner__copy absolute inset-x-3 bottom-3 z-[4] flex max-w-[min(100%,24rem)] flex-col gap-2 rounded-2xl bg-white/80 p-3 backdrop-blur-sm sm:inset-x-auto sm:bottom-auto sm:right-[3%] sm:top-1/2 sm:-translate-y-1/2 sm:bg-white/50 sm:p-4 sm:backdrop-blur-md md:max-w-md lg:right-[5%]">
          <HeroParticleTitle
            text={t("title")}
            className="hero-banner__title-canvas h-[4.75rem] w-full sm:h-[5.5rem] md:h-[6.25rem]"
            density={780}
          />
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
