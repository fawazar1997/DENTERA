import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Briefcase, Lock } from "lucide-react";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getSiteDictionary } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { readCareers } from "@/lib/careers";
import { careersText } from "@/lib/careersText";
import { driveHealth } from "@/lib/googleDrive";
import { ApplicationForm } from "@/components/careers/ApplicationForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = await getSiteDictionary(locale);
  const t = careersText(locale);
  return pageMetadata({ locale, siteName: dict.meta.siteName, path: "/careers", title: t.metaTitle, description: t.metaDescription });
}

/** The careers page: a short intro and the application form. */
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
