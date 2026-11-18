import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Briefcase, GraduationCap, HeartHandshake, Lock, Sparkles } from "lucide-react";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getSiteDictionary } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { readCareers } from "@/lib/careers";
import { careersText } from "@/lib/careersText";
import { driveHealth } from "@/lib/googleDrive";
import { Reveal } from "@/components/Reveal";
import { ApplicationForm } from "@/components/careers/ApplicationForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = await getSiteDictionary(locale);
  const t = careersText(locale);
  return pageMetadata({ locale, siteName: dict.meta.siteName, path: "/careers", title: t.metaTitle, description: t.metaDescription });
}

const WHY_ICONS = [Sparkles, HeartHandshake, GraduationCap];

/** The careers page: why Dentera, and the application form. */
export default async function CareersPage({ params }: { params: { locale: string } }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const ar = locale === "ar";
  const t = careersText(locale);
  const store = await readCareers();
  if (!store.settings.visible) notFound();
  const fields = store.fields.filter((f) => !f.hidden);
  const ready = store.settings.open && Boolean(store.folders.parent) && (await driveHealth()) === "ok";

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 via-paper to-paper">
        <div className="absolute -top-24 start-[5%] h-72 w-72 rounded-full bg-primary-200/50 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-24 start-[45%] h-72 w-72 rounded-full bg-accent-200/50 blur-3xl" aria-hidden="true" />
        <div className="container-x relative py-14 text-center sm:py-20">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-primary-700 shadow-sm ring-1 ring-primary-100">
            <Briefcase className="h-3.5 w-3.5" /> {t.eyebrow}
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-ink-950 sm:text-5xl">
            {t.heroTitle}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-ink-600">{store.settings.intro || t.heroBody}</p>
          {ready && (
            <a href="#apply" className="btn-primary mt-8 px-7 py-3.5 text-base">
              {t.apply}
            </a>
          )}
          <div className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-2">
            {fields
              .filter((f) => f.id !== "other")
              .map((f) => (
                <span key={f.id} className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-ink-700 shadow-sm ring-1 ring-ink-100">
                  {ar ? f.nameAr : f.nameEn}
                </span>
              ))}
          </div>
        </div>
      </section>

      <section className="bg-paper pb-6">
        <div className="container-x">
          <h2 className="text-center text-2xl font-extrabold text-ink-950">{t.whyTitle}</h2>
          <div className="mx-auto mt-6 grid max-w-5xl gap-4 sm:grid-cols-3">
            {t.why.map(([title, body], i) => {
              const Icon = WHY_ICONS[i % WHY_ICONS.length];
              return (
                <Reveal key={title} delay={i * 80}>
                  <div className="card h-full p-6">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink-950 text-primary-300">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 font-bold text-ink-950">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{body}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section id="apply" className="scroll-mt-20 bg-paper py-12 sm:py-16">
        <div className="container-x">
          <div className="mx-auto max-w-3xl">
            {ready ? (
              <ApplicationForm
                locale={locale}
                fields={fields.map((f) => ({ id: f.id, name: ar ? f.nameAr : f.nameEn, clinical: f.clinical, specialty: f.specialty }))}
              />
            ) : (
              <div className="card p-8 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 text-ink-600">
                  <Lock className="h-5 w-5" />
                </span>
                <h2 className="mt-4 text-xl font-extrabold text-ink-950">{t.closedTitle}</h2>
                <p className="mt-2 text-ink-600">{store.settings.open ? t.errors.unavailable : t.closedBody}</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
