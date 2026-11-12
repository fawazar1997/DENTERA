"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, MapPin, Tag } from "lucide-react";
import { localePath, type Locale } from "@/lib/i18n";
import { DoctorPhoto } from "./DoctorPhoto";

export type HeroSlide =
  | { kind: "photo"; key: string; imageUrl?: string; title: string }
  | { kind: "offer"; key: string; id: string; imageUrl: string; title: string; discount?: number | null };

const INTERVAL_MS = 5500;

/**
 * The home headline's photo frame (4:5): the branch photo and the offers
 * chosen for the home page, fading one into the next on their own (paused
 * on hover/focus, still for reduced motion). An offer's slide shows its
 * image as it is, with a button to its page.
 */
export function HeroSlides({
  slides,
  branchNames,
  locale,
  labels,
}: {
  slides: HeroSlide[];
  branchNames: string[];
  locale: Locale;
  labels: { viewOffer: string; save: string; slide: string };
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const Forward = locale === "ar" ? ArrowLeft : ArrowRight;

  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);
  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(next, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [count, paused, next]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        aria-roledescription={count > 1 ? "carousel" : undefined}
        className="relative isolate aspect-[4/5] w-full overflow-hidden rounded-[2.25rem] bg-ink-950 shadow-soft"
      >
        {slides.map((slide, i) => {
          const active = i === index;
          const fade = `absolute inset-0 transition-all duration-1000 ease-out ${
            active ? "z-10 scale-100 opacity-100" : "pointer-events-none scale-[1.03] opacity-0"
          }`;
          if (slide.kind === "photo") {
            return (
              <div key={slide.key} className={fade} aria-hidden={!active}>
                <DoctorPhoto
                  photoUrl={slide.imageUrl}
                  name={slide.title}
                  priority={i === 0}
                  sizes="(min-width: 1024px) 40vw, 90vw"
                  className="h-full w-full"
                />
                {branchNames.length > 0 && (
                  <>
                    <div
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink-950/70 to-transparent"
                      aria-hidden="true"
                    />
                    <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-2 p-5">
                      {branchNames.map((branch) => (
                        <span
                          key={branch}
                          className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-white/25 backdrop-blur-md"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          {branch}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          }
          return (
            <Link
              key={slide.key}
              href={localePath(locale, `/offers/${slide.id}`)}
              aria-label={slide.title}
              aria-hidden={!active}
              tabIndex={active ? 0 : -1}
              className={`group ${fade}`}
            >
              <Image
                src={slide.imageUrl}
                alt={slide.title}
                fill
                priority={i === 0}
                sizes="(min-width: 1024px) 40vw, 90vw"
                // Served as uploaded (already sized at upload).
                unoptimized
                className="object-cover"
              />
              {slide.discount ? (
                <span className="absolute end-4 top-4 inline-flex items-center gap-1 rounded-full bg-accent-500 px-3 py-1 text-xs font-bold text-ink-900 shadow">
                  <Tag className="h-3.5 w-3.5" />
                  {labels.save} {slide.discount}%
                </span>
              ) : null}
              {/* "Offer details": a frosted white pill with a light sweeping
                  across it, and the arrow in a navy disc that turns teal
                  and nudges forward on hover. */}
              <span className="absolute bottom-5 start-5 isolate inline-flex items-center gap-3 overflow-hidden rounded-full bg-white py-1.5 pe-1.5 ps-5 text-[0.95rem] font-extrabold text-ink-950 shadow-xl shadow-ink-950/35 ring-1 ring-white/70 backdrop-blur-md transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-2xl">
                <span
                  className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-1/3 bg-gradient-to-r from-transparent via-primary-200/80 to-transparent motion-safe:animate-shine"
                  aria-hidden="true"
                />
                <span className="flex flex-col leading-tight">
                  {labels.viewOffer}
                  <span className="mt-0.5 h-0.5 w-6 rounded-full bg-gradient-to-r from-primary-400 to-accent-400 transition-all duration-300 group-hover:w-full" />
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-950 text-primary-300 shadow-md ring-4 ring-primary-200/60 transition duration-300 group-hover:bg-primary-500 group-hover:text-white">
                  <Forward className="h-[1.1rem] w-[1.1rem] transition duration-300 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
                </span>
              </span>
            </Link>
          );
        })}
      {count > 1 && (
          <div className="absolute inset-x-0 top-4 z-20 flex justify-center">
            <div className="flex gap-1.5 rounded-full bg-ink-950/35 px-2.5 py-2 backdrop-blur">
            {slides.map((slide, i) => (
              <button
                key={slide.key}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`${labels.slide} ${i + 1}: ${slide.title}`}
                aria-current={i === index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === index ? "w-7 bg-primary-400" : "w-2 bg-white/70 hover:bg-white"
                }`}
              />
            ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
