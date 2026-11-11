"use client";

import { localePath } from "@/lib/i18n";
import { useCallback, useEffect, useState } from "react";
import { BannerImage } from "./BannerImage";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Tag } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { offerBannerSizeClass } from "./offerBanner";

export type OfferSlide = {
  id: string;
  /** For screen readers (and shown only when the offer has no image). */
  title: string;
  imageUrl?: string;
  /** Optional phone version, shown below 640px. */
  mobileImageUrl?: string;
};

const INTERVAL_MS = 6000;

/**
 * The home page banner: live promotional offers that rotate on their own
 * (paused on hover/focus). The offer's own banner image shows as it is —
 * no overlay or text on it — with one standout button to the offer's page.
 */
export function OfferCarousel({
  slides,
  locale,
  labels,
}: {
  slides: OfferSlide[];
  locale: Locale;
  labels: { viewOffer: string; previous: string; next: string };
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
  const current = slides[index];

  return (
    <section
      aria-roledescription="carousel"
      className={`relative w-full overflow-hidden bg-ink-950 ${offerBannerSizeClass(slides.some((s) => s.mobileImageUrl))}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {slides.map((slide, i) => {
        const active = i === index;
        return (
          <Link
            key={slide.id}
            href={localePath(locale, `/offers/${slide.id}`)}
            aria-label={slide.title}
            aria-hidden={!active}
            tabIndex={-1}
            className={`absolute inset-0 transition-opacity duration-700 ease-out ${
              active ? "z-10 opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            {slide.imageUrl || slide.mobileImageUrl ? (
              <BannerImage
                src={(slide.imageUrl ?? slide.mobileImageUrl)!}
                mobileSrc={slide.mobileImageUrl}
                priority={i === 0}
              />
            ) : (
              // No image yet: a plain brand background with the offer's name.
              <div className="absolute inset-0 flex items-center bg-gradient-to-br from-ink-900 via-ink-900 to-primary-800">
                <p className="container-x text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">
                  {slide.title}
                </p>
              </div>
            )}
          </Link>
        );
      })}

      <div className="absolute inset-x-0 bottom-4 z-20 sm:bottom-6">
        <div className="container-x flex items-center justify-between gap-3">
          {current && (
            <Link
              href={localePath(locale, `/offers/${current.id}`)}
              className="group inline-flex items-center gap-2 rounded-full bg-primary-400 px-5 py-3 text-sm font-extrabold text-ink-950 shadow-lg shadow-ink-950/30 ring-4 ring-white/40 transition hover:bg-primary-300 focus-visible:outline-none focus-visible:ring-white sm:px-6 sm:text-base"
            >
              <Tag className="h-4 w-4" />
              {labels.viewOffer}
              <Forward className="h-4 w-4 transition group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
            </Link>
          )}

          {count > 1 && (
            <div className="flex items-center gap-2 rounded-full bg-ink-950/45 p-1.5 backdrop-blur">
              <div className="hidden gap-1.5 px-2 sm:flex">
                {slides.map((slide, i) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={slide.title}
                    aria-current={i === index}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === index ? "w-7 bg-primary-400" : "w-2 bg-white/60 hover:bg-white/90"
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label={labels.previous}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/30"
              >
                <PrevIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label={labels.next}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/30"
              >
                <NextIcon className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
