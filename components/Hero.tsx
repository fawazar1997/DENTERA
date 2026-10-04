import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import { CallButton } from "./CallButton";
import { StatsStrip } from "./StatsStrip";
import { DoctorPhoto } from "./DoctorPhoto";

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

          {/* Branch photo: the second column, so it sits on the left in
              Arabic (RTL) and on the right in English. */}
          <div
            className="relative mx-auto w-full max-w-md animate-fade-up opacity-0 lg:max-w-none"
            style={{ animationDelay: "150ms" }}
          >
            <div
              className="absolute -bottom-5 -end-5 top-8 start-8 rounded-[2rem] bg-sand-300/60"
              aria-hidden="true"
            />
            <div
              className="absolute -start-4 -top-4 h-24 w-24 rounded-3xl bg-primary-500/90"
              aria-hidden="true"
            />
            <DoctorPhoto
              photoUrl={imageUrl}
              name={dict.meta.siteName}
              priority
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="relative aspect-[4/5] w-full rounded-[2rem] shadow-soft ring-8 ring-white sm:aspect-[5/5] lg:aspect-[4/5] lg:max-h-[36rem]"
            />
          </div>
        </div>
      </section>

      <StatsStrip stats={stats} />
    </>
  );
}
