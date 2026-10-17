import { localePath } from "@/lib/i18n";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarClock, Tag } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import type { Offer } from "@/lib/types";
import { discountPercent, formatOfferDate, formatPrice } from "@/lib/offerFormat";

export function OfferCard({
  offer,
  locale,
  dict,
}: {
  offer: Offer;
  locale: Locale;
  dict: Dictionary;
}) {
  const ar = locale === "ar";
  const Arrow = ar ? ArrowLeft : ArrowRight;
  const title = ar ? offer.titleAr : offer.titleEn;
  const summary = ar ? offer.summaryAr : offer.summaryEn;
  const discount = discountPercent(offer.priceNow, offer.priceWas);

  return (
    <Link
      href={localePath(locale, `/offers/${offer.id}`)}
      className="card group flex h-full flex-col overflow-hidden hover:-translate-y-1 hover:shadow-soft"
    >
      <div className="relative aspect-[16/7] overflow-hidden bg-gradient-to-br from-ink-900 to-primary-800">
        {offer.imageUrl ? (
          <Image
          unoptimized
            src={offer.imageUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/brand/dentera-mark.svg"
            alt=""
            className="absolute inset-0 m-auto h-[62%] w-auto opacity-40"
          />
        )}
        {discount && (
          <span className="absolute start-3 top-3 inline-flex items-center gap-1 rounded-full bg-accent-500 px-2.5 py-1 text-xs font-bold text-ink-900">
            <Tag className="h-3.5 w-3.5" />
            {dict.offers.save} {discount}%
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-lg font-bold text-ink-900 group-hover:text-primary-700">
          {title}
        </h3>
        {summary && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-600">
            {summary}
          </p>
        )}
        {offer.priceNow ? (
          <p className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-primary-700">
              {formatPrice(offer.priceNow, dict.offers.currency)}
            </span>
            {offer.priceWas && offer.priceWas > offer.priceNow && (
              <span className="text-sm text-ink-400 line-through">
                {formatPrice(offer.priceWas, dict.offers.currency)}
              </span>
            )}
          </p>
        ) : null}
        {offer.endsAt && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-500">
            <CalendarClock className="h-4 w-4" />
            {dict.offers.validUntil} {formatOfferDate(offer.endsAt, locale)}
          </p>
        )}
        <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-bold text-primary-700">
          {dict.offers.viewOffer}
          <Arrow className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}
