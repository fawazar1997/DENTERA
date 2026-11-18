import type { Metadata } from "next";
import { Mail, Phone, ShieldCheck } from "lucide-react";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getSiteDictionary } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { privacyText } from "@/lib/privacyText";
import { telHref } from "@/lib/phone";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = await getSiteDictionary(locale);
  const t = privacyText(locale);
  return pageMetadata({ locale, siteName: dict.meta.siteName, path: "/privacy", title: t.metaTitle, description: t.metaDescription });
}

/** The website's privacy policy. */
export default async function PrivacyPage({ params }: { params: { locale: string } }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = await getSiteDictionary(locale);
  const t = privacyText(locale);

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 via-paper to-paper">
        <div className="absolute -top-24 start-[5%] h-72 w-72 rounded-full bg-primary-200/50 blur-3xl" aria-hidden="true" />
        <div className="container-x relative py-12 text-center sm:py-16">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-950 text-primary-300">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-ink-950 sm:text-5xl">{t.title}</h1>
          <p className="mt-3 text-sm font-semibold text-ink-500">
            {t.updated}: {t.updatedDate}
          </p>
        </div>
      </section>

      <section className="bg-paper pb-16">
        <div className="container-x">
          <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[14rem_1fr]">
            <nav aria-label={t.contents} className="hidden lg:block">
              <div className="sticky top-24">
                <p className="text-xs font-bold uppercase tracking-wide text-ink-400">{t.contents}</p>
                <ol className="mt-3 space-y-2 text-sm">
                  {t.sections.map((s) => (
                    <li key={s.id}>
                      <a href={`#${s.id}`} className="font-semibold text-ink-600 hover:text-primary-700">
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </nav>

            <article className="card space-y-8 p-6 leading-relaxed text-ink-700 sm:p-10">
              <p className="text-lg text-ink-800">{t.intro}</p>
              {t.sections.map((s, i) => (
                <section key={s.id} id={s.id} className="scroll-mt-24">
                  <h2 className="text-xl font-extrabold text-ink-950">
                    <span className="me-2 text-primary-600">{i + 1}.</span>
                    {s.title}
                  </h2>
                  {s.paragraphs?.map((p, k) => (
                    <p key={k} className="mt-3">
                      {p}
                    </p>
                  ))}
                  {s.items && (
                    <ul className="mt-3 list-disc space-y-2 ps-5 marker:text-primary-500">
                      {s.items.map((item, k) => (
                        <li key={k}>{item}</li>
                      ))}
                    </ul>
                  )}
                  {s.after?.map((p, k) => (
                      <p key={k} className="mt-3">
                        {p}
                      </p>
                    ))}
                  {s.id === "contact" && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <a href={`mailto:${dict.contact.emailValue}`} className="inline-flex items-center gap-2 rounded-xl bg-ink-50 px-4 py-3 font-bold text-ink-900 hover:bg-ink-100">
                        <Mail className="h-4 w-4 text-primary-600" />
                        <span className="text-xs font-semibold text-ink-500">{t.email}</span>
                        <span dir="ltr">{dict.contact.emailValue}</span>
                      </a>
                      <a href={telHref(dict.booking.phone)} className="inline-flex items-center gap-2 rounded-xl bg-ink-50 px-4 py-3 font-bold text-ink-900 hover:bg-ink-100">
                        <Phone className="h-4 w-4 text-primary-600" />
                        <span className="text-xs font-semibold text-ink-500">{t.phone}</span>
                        <span dir="ltr">{dict.booking.phone}</span>
                      </a>
                    </div>
                  )}
                </section>
              ))}
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
