import { CheckCircle2 } from "lucide-react";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { CtaBanner } from "@/components/CtaBanner";

export default function AboutPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const dict = getDictionary(locale);

  const values = [
    dict.about.value1,
    dict.about.value2,
    dict.about.value3,
    dict.about.value4,
  ];

  return (
    <>
      <section className="section-y bg-gradient-to-b from-primary-50 to-white">
        <div className="container-x text-center">
          <h1 className="text-4xl font-extrabold text-ink-950 sm:text-5xl">
            {dict.about.title}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-600">
            {dict.about.subtitle}
          </p>
        </div>
      </section>

      <section className="section-y bg-white">
        <div className="container-x grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-2xl font-extrabold text-ink-950">
              {dict.about.storyTitle}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink-600">
              {dict.about.storyBody}
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="card p-7">
              <h3 className="text-lg font-bold text-primary-700">
                {dict.about.missionTitle}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-600">
                {dict.about.missionBody}
              </p>
            </div>
            <div className="card p-7">
              <h3 className="text-lg font-bold text-primary-700">
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
          <h2 className="text-center text-2xl font-extrabold text-ink-950">
            {dict.about.valuesTitle}
          </h2>
          <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
            {values.map((value) => (
              <div
                key={value}
                className="flex items-center gap-3 rounded-xl2 bg-white p-5 shadow-card"
              >
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-primary-600" />
                <span className="font-medium text-ink-800">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBanner locale={locale} dict={dict} />
    </>
  );
}
