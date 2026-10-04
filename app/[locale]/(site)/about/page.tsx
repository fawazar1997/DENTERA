import { CheckCircle2 } from "lucide-react";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getSiteDictionary } from "@/lib/content";
import { getSettings } from "@/lib/db";
import { PageBanner } from "@/components/PageBanner";
import { CtaBanner } from "@/components/CtaBanner";
import { Reveal } from "@/components/Reveal";

// Content is edited live from the control panel, so render on request
// (the database read itself is cached until the next save).
export const dynamic = "force-dynamic";

export default async function AboutPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const dict = await getSiteDictionary(locale);
  const settings = await getSettings();

  const values = [
    dict.about.value1,
    dict.about.value2,
    dict.about.value3,
    dict.about.value4,
  ];

  return (
    <>
      <PageBanner
        title={dict.about.title}
        subtitle={dict.about.subtitle}
        imageUrl={settings.banners?.about}
      />

      <section className="section-y bg-white">
        <div className="container-x grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink-950">
              {dict.about.storyTitle}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink-600">
              {dict.about.storyBody}
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="card p-7">
              <h3 className="text-lg font-semibold text-primary-700">
                {dict.about.missionTitle}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-600">
                {dict.about.missionBody}
              </p>
            </div>
            <div className="card p-7">
              <h3 className="text-lg font-semibold text-primary-700">
                {dict.about.visionTitle}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-600">
                {dict.about.visionBody}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-y bg-ink-50/60">
        <div className="container-x">
          <h2 className="text-center text-2xl font-semibold tracking-tight text-ink-950">
            {dict.about.valuesTitle}
          </h2>
          <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
            {values.map((value, i) => (
              <Reveal key={value} delay={i * 80}>
                <div className="flex items-center gap-3 rounded-xl2 bg-white p-5 shadow-card">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-primary-600" />
                  <span className="font-medium text-ink-800">{value}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaBanner locale={locale} dict={dict} />
    </>
  );
}
