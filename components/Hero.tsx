import { localePath } from "@/lib/i18n";
import Link from "next/link";
import { MapPin, ShieldCheck } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import { CallButton } from "./CallButton";
import { StatsStrip } from "./StatsStrip";
import { DoctorPhoto } from "./DoctorPhoto";

export function Hero({
  locale,
  dict,
  imageUrl,
  branchNames = [],
}: {
  locale: Locale;
  dict: Dictionary;
  /** Branch photo from Control Panel → Banners; brand panel if absent. */
  imageUrl?: string;
  /** Branch names shown on the photo. */
  branchNames?: string[];
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
          className="bg-brand-pattern bg-primary-500 opacity-[0.12] absolute inset-0"
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
                href={localePath(locale, `/departments`)}
                className="btn-outline px-7 py-3.5 text-base"
              >
                {dict.hero.ctaSecondary}
              </Link>
            </div>
          </div>

          {/* Branch photo: the second column, so it sits on the left in
              Arabic (RTL) and on the right in English. Layered brand cards
              (beige, cyan) give it depth; branch names sit on the photo and
              a small card carries the tooth mark and a key number. */}
          <div
            className="relative mx-auto w-full max-w-md animate-fade-up opacity-0 lg:max-w-none lg:ps-10"
            style={{ animationDelay: "150ms" }}
          >
            <div className="relative">
              <div
                className="absolute inset-0 -rotate-6 scale-[0.96] rounded-[2.25rem] bg-sand-300/70 rtl:rotate-6"
                aria-hidden="true"
              />
              <div
                className="absolute inset-0 rotate-3 scale-[0.98] rounded-[2.25rem] bg-primary-200/80 rtl:-rotate-3"
                aria-hidden="true"
              />
              <div
                className="absolute -end-6 -top-6 h-28 w-28 rounded-2xl bg-brand-pattern bg-primary-500 opacity-50 [--pattern-size:110px]"
                aria-hidden="true"
              />
              <div className="relative overflow-hidden rounded-[2.25rem] shadow-soft">
                <DoctorPhoto
                  photoUrl={imageUrl}
                  name={dict.meta.siteName}
                  priority
                  sizes="(min-width: 1024px) 40vw, 90vw"
                  className="aspect-[4/5] w-full lg:aspect-[5/6]"
                />
                {branchNames.length > 0 && (
                  <>
                    <div
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink-950/70 to-transparent"
                      aria-hidden="true"
                    />
                    <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-2 p-5">
                      {branchNames.map((branch) => (
                        <span
                          key={branch}
                          className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-white/25 backdrop-blur-md"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          {branch}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="absolute -start-4 top-10 flex items-center gap-3 rounded-2xl bg-white/95 p-3 pe-5 shadow-soft backdrop-blur sm:-start-8 lg:-start-12">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/dentera-mark.svg" alt="" className="h-7 w-auto" />
                </span>
                <div>
                  <p className="text-lg font-extrabold leading-none text-ink-950">
                    {dict.stats.patientsValue}
                  </p>
                  <p className="mt-1 text-xs text-ink-500">{dict.stats.patientsLabel}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <StatsStrip stats={stats} />
    </>
  );
}
