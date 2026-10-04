import { Phone, Mail, Clock } from "lucide-react";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getSiteDictionary } from "@/lib/content";
import { telHref } from "@/lib/phone";
import { getActiveBranches, getSettings } from "@/lib/db";
import { PageBanner } from "@/components/PageBanner";
import { CallButton } from "@/components/CallButton";
import { BranchCards } from "@/components/BranchCards";
import { Reveal } from "@/components/Reveal";

// Content is edited live from the control panel, so render on request
// (the database read itself is cached until the next save).
export const dynamic = "force-dynamic";

export default async function ContactPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const dict = await getSiteDictionary(locale);
  const settings = await getSettings();
  const branches = await getActiveBranches();

  return (
    <>
      <PageBanner
        title={dict.contact.title}
        subtitle={dict.contact.subtitle}
        imageUrl={settings.banners?.contact}
      />

      <section className="section-y bg-white">
        <div className="container-x grid gap-8 lg:grid-cols-5">
          <Reveal className="lg:col-span-3">
            <div className="relative h-full overflow-hidden rounded-xl2 bg-gradient-to-br from-ink-900 to-ink-950 p-8 text-white shadow-soft sm:p-12">
              <div
                className="bg-hero-grid absolute inset-0 opacity-10 [background-size:20px_20px]"
                aria-hidden="true"
              />
              <div
                className="absolute -bottom-20 -end-20 h-64 w-64 rounded-full bg-primary-500/25 blur-3xl"
                aria-hidden="true"
              />
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500 text-white">
                  <Phone className="h-7 w-7" />
                </div>
                <h2 className="mt-6 text-3xl font-semibold tracking-tight">
                  {dict.contact.bookingTitle}
                </h2>
                <p className="mt-3 max-w-lg text-sand-200">
                  {dict.contact.bookingBody}
                </p>
                <a
                  href={telHref(dict.booking.phone)}
                  dir="ltr"
                  className="mt-8 inline-block text-4xl font-bold tracking-tight text-primary-300 transition hover:text-primary-200 sm:text-5xl"
                >
                  {dict.booking.phone}
                </a>
                <div>
                  <CallButton
                    dict={dict}
                    variant="accent"
                    showNumber={false}
                    className="mt-8 px-8 py-4 text-base"
                  />
                </div>
              </div>
            </div>
          </Reveal>

          <div className="space-y-4 lg:col-span-2">
            <Reveal delay={80}>
              <a
                href={telHref(dict.booking.phone)}
                className="card flex items-start gap-4 p-6 hover:shadow-soft"
              >
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-500">
                    {dict.contact.phoneLabel}
                  </p>
                  <p className="mt-1 font-semibold text-ink-900" dir="ltr">
                    {dict.booking.phone}
                  </p>
                </div>
              </a>
            </Reveal>
            <Reveal delay={160}>
              <a
                href={`mailto:${dict.contact.emailValue}`}
                className="card flex items-start gap-4 p-6 hover:shadow-soft"
              >
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-500">
                    {dict.contact.emailLabel}
                  </p>
                  <p className="mt-1 font-medium text-ink-900" dir="ltr">
                    {dict.contact.emailValue}
                  </p>
                </div>
              </a>
            </Reveal>
            <Reveal delay={240}>
              <div className="card flex items-start gap-4 p-6">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-500">
                    {dict.contact.hoursLabel}
                  </p>
                  <p className="mt-1 font-medium text-ink-900">
                    {dict.contact.hoursValue}
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {branches.length > 0 && (
        <section className="section-y bg-ink-50/60">
          <div className="container-x">
            <h2 className="text-center text-3xl font-semibold tracking-tight text-ink-950">
              {dict.contact.branchesTitle}
            </h2>
            <div className="mx-auto mt-10 max-w-4xl">
              <BranchCards branches={branches} locale={locale} dict={dict} />
            </div>
          </div>
        </section>
      )}
    </>
  );
}
