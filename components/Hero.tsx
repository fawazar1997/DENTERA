import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import { CallButton } from "./CallButton";
import { StatsStrip } from "./StatsStrip";
import { DoctorPhoto } from "./DoctorPhoto";
import { BrandRings } from "./BrandRings";

export function Hero({
  locale,
  dict,
  imageUrl,
}: {
  locale: Locale;
  dict: Dictionary;
  /** Branch photo from Control Panel → Banners; brand panel if absent. */
  imageUrl?: string;
}) {
  const stats = [
    { value: dict.stats.yearsValue, label: dict.stats.yearsLabel },
    { value: dict.stats.doctorsValue, label: dict.stats.doctorsLabel },
    { value: dict.stats.patientsValue, label: dict.stats.patientsLabel },
    { value: dict.stats.departmentsValue, label: dict.stats.departmentsLabel },
  ];

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 via-paper to-paper">
        <div
          className="bg-hero-grid absolute inset-0 opacity-40 [background-size:22px_22px]"
          aria-hidden="true"
        />
        <div
          className="absolute -top-24 start-[5%] h-72 w-72 rounded-full bg-primary-200/50 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-24 start-[40%] h-72 w-72 rounded-full bg-accent-200/50 blur-3xl"
          aria-hidden="true"
        />

        <div className="container-x relative grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16 lg:py-24">
          <div className="animate-fade-up text-center opacity-0 lg:text-start">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-1.5 text-sm font-bold text-primary-800">
              <ShieldCheck className="h-4 w-4" />
              {dict.hero.eyebrow}
            </span>
            <h1 className="mt-6 text-5xl font-extrabold leading-[1.15] tracking-tight text-ink-950 sm:text-6xl lg:text-7xl">
              {dict.hero.title}
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-600 sm:text-xl lg:mx-0">
              {dict.hero.subtitle}
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
              <CallButton
                dict={dict}
                label={dict.hero.ctaPrimary}
                className="px-7 py-3.5 text-base"
              />
              <Link
                href={`/${locale}/departments`}
                className="btn-outline px-7 py-3.5 text-base"
              >
                {dict.hero.ctaSecondary}
              </Link>
            </div>
          </div>

          {/* Branch photo in a brand frame: the second column, so it sits
              on the left in Arabic (RTL) and on the right in English. The
              arch echoes the crown of the logo's tooth; the rings are its
              spiral. */}
          <div
            className="relative mx-auto w-full max-w-sm animate-fade-up opacity-0 sm:max-w-md lg:max-w-[28rem]"
            style={{ animationDelay: "150ms" }}
          >
            <BrandRings className="absolute -start-20 -top-16 w-56 text-primary-400/70 sm:-start-24 sm:w-64" strokeWidth={2.5} />
            <div
              className="absolute inset-0 translate-x-5 translate-y-5 rounded-b-[2.5rem] rounded-t-full border-2 border-sand-400 rtl:-translate-x-5"
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-8 -end-8 h-40 w-40 rounded-full bg-accent-200/70 blur-2xl"
              aria-hidden="true"
            />
            <DoctorPhoto
              photoUrl={imageUrl}
              name={dict.meta.siteName}
              priority
              sizes="(min-width: 1024px) 28rem, 90vw"
              className="relative aspect-[4/5] w-full rounded-b-[2.5rem] rounded-t-full shadow-soft ring-[6px] ring-white"
            />
            <div className="absolute -bottom-6 start-1/2 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-2xl bg-white/95 px-4 py-3 shadow-soft backdrop-blur rtl:translate-x-1/2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/dentera-mark.svg" alt="" className="h-6 w-auto" />
              </span>
              <div>
                <p className="text-sm font-extrabold text-ink-950">{dict.meta.siteName}</p>
                <p className="text-xs text-primary-700">{dict.meta.tagline}</p>
              </div>
            </div>
            <span
              className="absolute -end-3 top-1/3 h-5 w-5 rounded-full bg-primary-500 ring-4 ring-white"
              aria-hidden="true"
            />
          </div>
        </div>
      </section>

      <StatsStrip stats={stats} />
    </>
  );
}
