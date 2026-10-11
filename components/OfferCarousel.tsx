"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Tag } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { discountPercent, formatPrice } from "@/lib/offerFormat";

export type OfferSlide = {
  id: string;
  title: string;
  summary?: string;
  imageUrl?: string;
  priceNow?: number;
  priceWas?: number;
};

const INTERVAL_MS = 6000;

/**
 * The home page banner: live promotional offers that rotate on their own
 * (paused on hover/focus) and each open the offer's page when clicked.
 */
export function OfferCarousel({
  slides,
  locale,
  labels,
}: {
  slides: OfferSlide[];
  locale: Locale;
  labels: { viewOffer: string; currency: string; save: string; previous: string; next: string };
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const rtl = locale === "ar";

  const go = useCallback(
    (delta: number) => setIndex((i) => (i + delta + count) % count),
    [count]
  );

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => go(1), INTERVAL_MS);
    return () => clearInterval(timer);
  }, [count, paused, go]);

  const Forward = rtl ? ArrowLeft : ArrowRight;
  // Visual "previous" sits at the start side, so arrows mirror in RTL.
  const PrevIcon = rtl ? ChevronRight : ChevronLeft;
  const NextIcon = rtl ? ChevronLeft : ChevronRight;

  return (
    <section
      aria-roledescription="carousel"
      className="relative h-[22rem] w-full overflow-hidden bg-ink-950 sm:h-[26rem] lg:h-[30rem]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {slides.map((slide, i) => {
        const discount = discountPercent(slide.priceNow, slide.priceWas);
        const active = i === index;
        return (
          <Link
            key={slide.id}
            href={`/${locale}/offers/${slide.id}`}
            aria-hidden={!active}
            tabIndex={active ? 0 : -1}
            className={`group absolute inset-0 transition-opacity duration-700 ease-out ${
              active ? "z-10 opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            {slide.imageUrl ? (
              <Image
                src={slide.imageUrl}
                alt=""
                fill
                priority={i === 0}
                quality={90}
                sizes="100vw"
                className={`object-cover transition-transform duration-[7000ms] ease-out ${
                  active ? "scale-105" : "scale-100"
                }`}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-ink-900 via-ink-900 to-primary-800">
                <div
                  className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,#0cb8cd_1px,transparent_0)] [background-size:22px_22px]"
                  aria-hidden="true"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/dentera-mark.svg"
                  alt=""
                  className="absolute end-[6%] top-1/2 h-[80%] w-auto -translate-y-1/2 opacity-20"
                />
              </div>
            )}
            <div
              className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/45 to-transparent sm:bg-gradient-to-r sm:from-ink-950/85 sm:via-ink-950/45 sm:to-transparent rtl:sm:bg-gradient-to-l"
              aria-hidden="true"
            />
            <div className="container-x relative flex h-full items-end pb-20 sm:items-center sm:pb-8">
              <div
                className={`max-w-xl text-white transition duration-700 ${
                  active ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                }`}
              >
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-500 px-3 py-1 text-xs font-bold text-ink-900">
                  <Tag className="h-3.5 w-3.5" />
                  {discount ? `${labels.save} ${discount}%` : labels.viewOffer}
                </span>
                <h2 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
                  {slide.title}
                </h2>
                {slide.summary && (
                  <p className="mt-3 line-clamp-2 text-base text-sand-100 sm:text-lg">
                    {slide.summary}
                  </p>
                )}
                {slide.priceNow ? (
                  <p className="mt-4 flex items-baseline gap-3">
                    <span className="text-3xl font-extrabold text-primary-300">
                      {formatPrice(slide.priceNow, labels.currency)}
                    </span>
                    {slide.priceWas && slide.priceWas > slide.priceNow && (
                      <span className="text-lg text-sand-300 line-through">
                        {formatPrice(slide.priceWas, labels.currency)}
                      </span>
                    )}
                  </p>
                ) : null}
                <span className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-ink-900 transition group-hover:bg-primary-50">
                  {labels.viewOffer}
                  <Forward className="h-4 w-4 transition group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
                </span>
              </div>
            </div>
          </Link>
        );
      })}

      {count > 1 && (
        <div className="absolute inset-x-0 bottom-5 z-20">
          <div className="container-x flex items-center justify-between gap-4">
            <div className="flex gap-2">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={slide.title}
                  aria-current={i === index}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === index ? "w-8 bg-primary-400" : "w-2 bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label={labels.previous}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/30"
              >
                <PrevIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label={labels.next}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/30"
              >
                <NextIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
