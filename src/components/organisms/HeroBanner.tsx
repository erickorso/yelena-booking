import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { HeroDeviceParticles } from "@/components/organisms/HeroDeviceParticles";
import { HeroDeviceTilt } from "@/components/organisms/HeroDeviceTilt";
import { HeroParticleTitle } from "@/components/organisms/HeroParticleTitle";

/**
 * Layered marketing hero: reception BG + floating devices + particle title only.
 */
export async function HeroBanner() {
  const t = await getTranslations("Home");

  return (
    <section
      aria-label={t("bannerLabel")}
      className="hero-banner relative w-full overflow-hidden"
    >
      <div className="hero-banner__stage relative mx-auto h-[clamp(40vh,52vh,580px)] w-full min-h-[320px] max-w-[1600px]">
        <Image
          src="/hero/fondo-base.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="hero-banner__bg object-cover object-[12%_center] sm:object-[center_70%]"
          aria-hidden
        />

        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/25 dark:to-teal-950/30"
          aria-hidden
        />

        {/* Devices: ocultos en mobile para dejar ver recepción/personas del fondo */}
        <div className="hero-banner__devices absolute inset-y-0 left-0 z-[2] hidden w-[58%] sm:block sm:w-[52%] lg:w-[48%]">
          <HeroDeviceParticles className="pointer-events-none absolute inset-0 z-0" count={64} color="15,118,110" />
          <div className="hero-banner__laptop absolute bottom-[8%] left-[8%] z-[1] w-[78%] max-w-[520px] sm:left-[10%] sm:w-[72%]">
            <HeroDeviceTilt maxTilt={12}>
              <Image
                src="/hero/portatil.png"
                alt=""
                width={1024}
                height={571}
                priority
                className="pointer-events-none h-auto w-full drop-shadow-xl"
              />
            </HeroDeviceTilt>
          </div>
          <div className="hero-banner__tablet absolute bottom-[18%] left-[2%] z-[2] w-[34%] max-w-[220px] sm:left-[4%] sm:w-[30%]">
            <HeroDeviceTilt maxTilt={14}>
              <Image
                src="/hero/tablet.png"
                alt=""
                width={1024}
                height={1024}
                priority
                className="pointer-events-none h-auto w-full drop-shadow-lg"
              />
            </HeroDeviceTilt>
          </div>
        </div>

        {/* Título: mobile sobre la mitad con recepción; desktop derecha */}
        <div className="hero-banner__copy absolute inset-x-3 top-[14%] bottom-[8%] z-[4] sm:inset-y-5 sm:left-auto sm:right-[3%] sm:w-[48%] lg:right-[4%]">
          <HeroParticleTitle text={t("title")} density={4800} />
        </div>
      </div>
    </section>
  );
}
