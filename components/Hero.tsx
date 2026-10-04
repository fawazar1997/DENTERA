import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import { CallButton } from "./CallButton";
import { StatsStrip } from "./StatsStrip";

export function Hero({ locale, dict }: { locale: Locale; dict: Dictionary }) {
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
          className="absolute -top-24 start-[10%] h-72 w-72 rounded-full bg-primary-200/50 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-24 end-[10%] h-72 w-72 rounded-full bg-accent-200/50 blur-3xl"
          aria-hidden="true"
        />
        {/* Brand tooth mark as a large, faint watermark. */}
        <Image
          src="/brand/dentera-icon.png"
          alt=""
          width={500}
          height={500}
          aria-hidden="true"
          className="pointer-events-none absolute -end-24 top-1/2 hidden h-[34rem] w-[34rem] -translate-y-1/2 opacity-[0.12] lg:block"
        />

        <div className="container-x relative py-20 sm:py-24 lg:py-32">
          <div className="mx-auto max-w-3xl animate-fade-up text-center opacity-0">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-1.5 text-sm font-bold text-primary-800">
              <ShieldCheck className="h-4 w-4" />
              {dict.hero.eyebrow}
            </span>
            <h1 className="mt-6 text-5xl font-extrabold leading-[1.1] tracking-tight text-ink-950 sm:text-6xl lg:text-7xl">
              {dict.hero.title}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-600 sm:text-xl">
              {dict.hero.subtitle}
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
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
        </div>
      </section>

      <StatsStrip stats={stats} />
    </>
  );
}
