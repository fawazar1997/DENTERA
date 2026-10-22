import type { Metadata } from "next";
import Link from "next/link";
import { BannerImage } from "@/components/BannerImage";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FileText,
  MapPin,
  Tag,
} from "lucide-react";
import { isLocale, defaultLocale, type Locale, localePath } from "@/lib/i18n";
import { getSiteDictionary } from "@/lib/content";
import {
  getActiveBranches,
  getDepartment,
  getOffer,
  isOfferExpired,
} from "@/lib/db";
import { discountPercent, formatOfferDate, formatPrice } from "@/lib/offerFormat";
import { CallButton } from "@/components/CallButton";
import { DepartmentIcon } from "@/components/IconMap";
import { Reveal } from "@/components/Reveal";

// Content is edited live from the control panel, so render on request
// (the database read itself is cached until the next save).
export const dynamic = "force-dynamic";

type Params = { locale: string; id: string };

function resolveLocale(value: string): Locale {
  return isLocale(value) ? value : defaultLocale;
}

/** "One item per line" fields → list items. */
function lines(text?: string): string[] {
  return (text ?? "")
    .split("\n")
    .map((line) => line.replace(/^[\s•\-–*]+/, "").trim())
    .filter(Boolean);
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const locale = resolveLocale(params.locale);
  const offer = await getOffer(params.id);
  if (!offer || !offer.active) return {};
  const dict = await getSiteDictionary(locale);
  const title = locale === "ar" ? offer.titleAr : offer.titleEn;
  return {
    title: `${title} — ${dict.meta.siteName}`,
    description: (locale === "ar" ? offer.summaryAr : offer.summaryEn) || title,
  };
}

export default async function OfferPage({ params }: { params: Params }) {
  const locale = resolveLocale(params.locale);
  const offer = await getOffer(params.id);
  // Hidden offers 404; ended ones stay reachable (old links) but say so.
  if (!offer || !offer.active) notFound();

  const dict = await getSiteDictionary(locale);
  const ar = locale === "ar";
  const BackArrow = ar ? ArrowRight : ArrowLeft;
  const department = offer.departmentId
    ? await getDepartment(offer.departmentId)
    : undefined;
  const branches = (await getActiveBranches()).filter((b) =>
    offer.branchIds?.includes(b.id)
  );
  const expired = isOfferExpired(offer);
  const title = ar ? offer.titleAr : offer.titleEn;
  const summary = ar ? offer.summaryAr : offer.summaryEn;
  const details = lines(ar ? offer.detailsAr : offer.detailsEn);
  const terms = lines(ar ? offer.termsAr : offer.termsEn);
  const discount = discountPercent(offer.priceNow, offer.priceWas);

  return (
    <>
      <section
        className={`relative isolate overflow-hidden bg-ink-950 ${
          // A 4:5 phone image shows whole on phones.
          offer.mobileImageUrl ? "max-sm:min-h-[125vw]" : ""
        }`}
      >
        {offer.imageUrl || offer.mobileImageUrl ? (
          <BannerImage
            src={(offer.imageUrl ?? offer.mobileImageUrl)!}
            mobileSrc={offer.mobileImageUrl}
            priority
            className="-z-20"
          />
        ) : (
          <div className="absolute inset-0 -z-20 bg-gradient-to-br from-ink-900 to-primary-800" />
        )}
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950/90 via-ink-950/55 to-ink-950/20"
          aria-hidden="true"
        />
        <div className="container-x py-10 sm:py-14">
          <Link
            href={localePath(locale, `/offers`)}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-primary-200 hover:text-white"
          >
            <BackArrow className="h-4 w-4" />
            {dict.offers.allOffers}
          </Link>
          <div className="mt-16 max-w-3xl animate-fade-up text-white opacity-0 sm:mt-24">
            {discount && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-500 px-3 py-1 text-sm font-bold text-ink-900">
                <Tag className="h-4 w-4" />
                {dict.offers.save} {discount}%
              </span>
            )}
            <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">
              {title}
            </h1>
            {summary && (
              <p className="mt-4 max-w-2xl text-lg text-sand-100">{summary}</p>
            )}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-b from-primary-50/60 to-paper py-10 sm:py-14">
        <div className="container-x grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div className="space-y-6">
            {expired && (
              <div className="rounded-xl2 border border-accent-300 bg-accent-50 p-4 font-bold text-ink-800">
                {dict.offers.ended}
              </div>
            )}
            {details.length > 0 && (
              <Reveal>
                <section className="card p-6 sm:p-8">
                  <h2 className="text-lg font-bold text-ink-900">
                    {dict.offers.details}
                  </h2>
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {details.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-ink-700">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-500" />
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </Reveal>
            )}
            {terms.length > 0 && (
              <Reveal delay={80}>
                <section className="card p-6 sm:p-8">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-ink-900">
                    <FileText className="h-5 w-5 text-primary-600" />
                    {dict.offers.terms}
                  </h2>
                  <ul className="mt-4 list-disc space-y-2 ps-5 text-sm leading-relaxed text-ink-600 marker:text-primary-400">
                    {terms.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </section>
              </Reveal>
            )}
            {(department || branches.length > 0) && (
              <Reveal delay={120}>
                <section className="card grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
                  {department && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-ink-400">
                        {dict.offers.department}
                      </p>
                      <Link
                        href={localePath(locale, `/doctors?department=${department.id}`)}
                        className="mt-2 inline-flex items-center gap-2 font-bold text-ink-900 hover:text-primary-700"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500 text-white">
                          <DepartmentIcon department={department} className="h-5 w-5" />
                        </span>
                        {ar ? department.nameAr : department.nameEn}
                      </Link>
                    </div>
                  )}
                  {branches.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-ink-400">
                        {dict.offers.branches}
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {branches.map((branch) => (
                          <li key={branch.id}>
                            <a
                              href={branch.mapUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 font-bold text-ink-900 hover:text-primary-700"
                            >
                              <MapPin className="h-4 w-4 text-primary-600" />
                              {ar ? branch.nameAr : branch.nameEn}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              </Reveal>
            )}
          </div>

          <aside className="lg:sticky lg:top-24">
            <div className="card overflow-hidden">
              <div className="bg-gradient-to-br from-ink-900 to-ink-950 p-6 text-white">
                {offer.priceNow ? (
                  <>
                    <p className="text-4xl font-extrabold text-primary-300">
                      {formatPrice(offer.priceNow, dict.offers.currency)}
                    </p>
                    {offer.priceWas && offer.priceWas > offer.priceNow && (
                      <p className="mt-1 text-sand-300 line-through">
                        {formatPrice(offer.priceWas, dict.offers.currency)}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-2xl font-extrabold">{title}</p>
                )}
                {offer.endsAt && (
                  <p className="mt-4 flex items-center gap-1.5 text-sm text-sand-200">
                    <CalendarClock className="h-4 w-4" />
                    {dict.offers.validUntil} {formatOfferDate(offer.endsAt, locale)}
                  </p>
                )}
              </div>
              <div className="p-6">
                <h2 className="font-bold text-ink-900">{dict.offers.bookTitle}</h2>
                <p className="mt-1 text-sm text-ink-600">{dict.offers.bookBody}</p>
                {!expired && <CallButton dict={dict} className="mt-5 w-full" />}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
