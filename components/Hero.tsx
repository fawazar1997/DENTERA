import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import { CallButton } from "./CallButton";

export function Hero({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const stats = [
    { value: dict.stats.yearsValue, label: dict.stats.yearsLabel },
    { value: dict.stats.doctorsValue, label: dict.stats.doctorsLabel },
    { value: dict.stats.patientsValue, label: dict.stats.patientsLabel },
    { value: dict.stats.departmentsValue, label: dict.stats.departmentsLabel },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 via-paper to-paper">
      <div
        className="bg-hero-grid absolute inset-0 opacity-40 [background-size:22px_22px]"
        aria-hidden="true"
      />
      <div className="container-x relative grid gap-12 py-16 sm:py-20 lg:grid-cols-2 lg:items-center lg:py-28">
        <div className="animate-fade-up opacity-0">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-1.5 text-sm font-semibold text-primary-800">
            <ShieldCheck className="h-4 w-4" />
            {dict.hero.eyebrow}
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tighter text-ink-950 sm:text-5xl lg:text-6xl">
            {dict.hero.title}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-600">
            {dict.hero.subtitle}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <CallButton dict={dict} label={dict.hero.ctaPrimary} />
            <Link href={`/${locale}/departments`} className="btn-outline">
              {dict.hero.ctaSecondary}
            </Link>
          </div>

          <dl className="mt-14 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt className="sr-only">{stat.label}</dt>
                <dd className="text-2xl font-extrabold text-primary-700 sm:text-3xl">
                  {stat.value}
                </dd>
                <dd className="mt-1 text-xs font-medium text-ink-500 sm:text-sm">
                  {stat.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div
          className="relative mx-auto aspect-square w-full max-w-md animate-fade-up opacity-0 lg:max-w-none"
          style={{ animationDelay: "150ms" }}
        >
          <div className="absolute -top-6 end-6 h-32 w-32 rounded-3xl bg-accent-200/60 blur-2xl" />
          <div className="absolute -bottom-8 start-8 h-40 w-40 rounded-3xl bg-primary-200/70 blur-2xl" />
          <div className="relative flex h-full w-full items-center justify-center rounded-xl2 border border-primary-100 bg-white/80 p-10 shadow-soft backdrop-blur">
            <div className="grid w-full grid-cols-2 gap-4">
              <div className="col-span-2 rounded-xl2 bg-primary-600 p-6 text-white shadow-soft">
                <p className="text-sm font-medium text-primary-100">
                  {dict.stats.yearsLabel}
                </p>
                <p className="mt-1 text-3xl font-extrabold">
                  {dict.stats.yearsValue}
                </p>
              </div>
              <div className="rounded-xl2 bg-accent-100 p-5">
                <p className="text-xs font-medium text-accent-800">
                  {dict.stats.doctorsLabel}
                </p>
                <p className="mt-1 text-2xl font-extrabold text-accent-700">
                  {dict.stats.doctorsValue}
                </p>
              </div>
              <div className="rounded-xl2 bg-primary-50 p-5">
                <p className="text-xs font-medium text-primary-800">
                  {dict.stats.departmentsLabel}
                </p>
                <p className="mt-1 text-2xl font-extrabold text-primary-700">
                  {dict.stats.departmentsValue}
                </p>
              </div>
              <div className="col-span-2 rounded-xl2 border border-ink-100 p-5">
                <p className="text-xs font-medium text-ink-500">
                  {dict.stats.patientsLabel}
                </p>
                <p className="mt-1 text-2xl font-extrabold text-ink-900">
                  {dict.stats.patientsValue}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
