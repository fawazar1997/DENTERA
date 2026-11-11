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
import { pageMetadata } from "@/lib/seo";
import {
  getActiveBranches,
  getActiveDepartments,
  getDepartment,
  getOffer,
  isOfferExpired,
} from "@/lib/db";
import { discountPercent, formatOfferDate, formatPrice } from "@/lib/offerFormat";
import { offerBannerSizeClass } from "@/components/offerBanner";
import { BookingForm } from "@/components/BookingForm";
import { bookingFormLabels } from "@/lib/bookingLabels";
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
  return pageMetadata({
    locale,
    siteName: dict.meta.siteName,
    path: `/offers/${offer.id}`,
    title,
    description: (locale === "ar" ? offer.summaryAr : offer.summaryEn) || title,
    image: offer.imageUrl,
  });
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
  const [allBranches, allDepartments] = await Promise.all([getActiveBranches(), getActiveDepartments()]);
  const branches = allBranches.filter((b) => offer.branchIds?.includes(b.id));
  const expired = isOfferExpired(offer);
  const title = ar ? offer.titleAr : offer.titleEn;
  const summary = ar ? offer.summaryAr : offer.summaryEn;
  const details = lines(ar ? offer.detailsAr : offer.detailsEn);
  const terms = lines(ar ? offer.termsAr : offer.termsEn);
  const discount = discountPercent(offer.priceNow, offer.priceWas);

  return (
    <>
      {(offer.imageUrl || offer.mobileImageUrl) && (
        // The offer's banner, as it is and the same size as on the home page.
        <section className={`relative w-full overflow-hidden bg-ink-950 ${offerBannerSizeClass(Boolean(offer.mobileImageUrl))}`}>
          <BannerImage
            src={(offer.imageUrl ?? offer.mobileImageUrl)!}
            mobileSrc={offer.mobileImageUrl}
            priority
          />
        </section>
      )}

      <section className="bg-paper pt-8 sm:pt-10">
        <div className="container-x">
          <div className="mx-auto max-w-3xl">
          <Link
            href={localePath(locale, `/offers`)}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-primary-700 hover:text-ink-950"
          >
            <BackArrow className="h-4 w-4" />
            {dict.offers.allOffers}
          </Link>
          <div className="mt-5 max-w-3xl">
            {discount && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-500 px-3 py-1 text-sm font-bold text-ink-900">
                <Tag className="h-4 w-4" />
                {dict.offers.save} {discount}%
              </span>
            )}
            <h1 className="mt-3 text-3xl font-extrabold leading-tight text-ink-950 sm:text-4xl">{title}</h1>
            {summary && <p className="mt-3 max-w-2xl text-lg text-ink-600">{summary}</p>}
          </div>
          </div>
        </div>
      </section>

      <section className="bg-paper py-8 sm:py-10">
        {/* One centered column on every screen: the offer (price, details,
            terms) and then its booking form, with no empty side. */}
        <div className="container-x">
          <div className="mx-auto max-w-3xl space-y-6">
            {/* The price and how long it lasts (the name is already the title). */}
            {(offer.priceNow || offer.endsAt) && (
              <div className="card overflow-hidden">
                <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 bg-gradient-to-br from-ink-900 to-ink-950 p-6 text-white sm:p-7">
                  {offer.priceNow ? (
                    <div>
                      <p className="text-4xl font-extrabold text-primary-300">
                        {formatPrice(offer.priceNow, dict.offers.currency)}
                      </p>
                      {offer.priceWas && offer.priceWas > offer.priceNow && (
                        <p className="mt-1 text-sand-300 line-through">
                          {formatPrice(offer.priceWas, dict.offers.currency)}
                        </p>
                      )}
                    </div>
                  ) : null}
                  {offer.endsAt && (
                    <p className="flex items-center gap-1.5 text-sm text-sand-200">
                      <CalendarClock className="h-4 w-4" />
                      {dict.offers.validUntil} {formatOfferDate(offer.endsAt, locale)}
                    </p>
                  )}
                </div>
              </div>
            )}
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

            {!expired && (
              // Appointment request for this offer (saved with the offer, for
              // the call center), with its department and branches preset.
              <div id="book" className="scroll-mt-24">
                <h2 className="text-lg font-bold text-ink-900">{dict.offers.bookTitle}</h2>
                <p className="mt-1 text-sm text-ink-600">{dict.offers.bookBody}</p>
                <BookingForm
                  source="offers"
                  offerId={offer.id}
                  labels={bookingFormLabels(dict)}
                  departments={allDepartments.map((d) => ({ id: d.id, name: ar ? d.nameAr : d.nameEn }))}
                  defaultDepartmentId={department?.id}
                  branches={(branches.length > 0 ? branches : allBranches).map((b) => ({
                    id: b.id,
                    name: ar ? b.nameAr : b.nameEn,
                  }))}
                  className="mt-3"
                />
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
