"use client";

import { Children, useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * A row of doctor cards moved with the arrow buttons (or a swipe on
 * touch screens) — it never moves on its own. In Arabic the row starts on
 * the right and "next" brings in the cards from the left.
 */
export function DoctorsCarousel({
  children,
  rtl,
  labels,
}: {
  children: React.ReactNode;
  rtl: boolean;
  labels: { previous: string; next: string };
}) {
  const track = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    // scrollLeft runs negative in right-to-left pages, so use its size.
    const progress = Math.abs(el.scrollLeft);
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(progress > 4);
    setCanNext(progress < max - 4);
  }, []);

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);

  const move = (direction: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const items = Array.from(el.children) as HTMLElement[];
    if (items.length === 0) return;
    const box = el.getBoundingClientRect();
    const padding = parseFloat(getComputedStyle(el).paddingInlineStart) || 0;
    // Distance of a card from the row's start edge (right edge in Arabic).
    const fromStart = (item: HTMLElement) => {
      const r = item.getBoundingClientRect();
      return rtl ? box.right - padding - r.right : r.left - box.left - padding;
    };
    const current = Math.max(0, items.findIndex((item) => fromStart(item) >= -4));
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const width = items[0].offsetWidth + gap;
    // One card per click on phones; a full view's worth on wider screens.
    const perView = Math.max(1, Math.floor((el.clientWidth - 2 * padding + gap) / width));
    const target = Math.min(items.length - 1, Math.max(0, current + direction * perView));
    items[target].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  };

  const PrevIcon = rtl ? ChevronRight : ChevronLeft;
  const NextIcon = rtl ? ChevronLeft : ChevronRight;
  const button =
    "flex h-11 w-11 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-900 shadow-card transition hover:border-primary-400 hover:text-primary-700 disabled:pointer-events-none disabled:opacity-35";

  return (
    <div>
      <div
        ref={track}
        onScroll={update}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-5 overflow-x-auto px-4 pb-6 pt-2 sm:scroll-px-0 [scrollbar-width:none] sm:-mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {Children.map(children, (child) => (
          <div className="w-[78%] flex-shrink-0 snap-start sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-3.75rem)/4)]">
            {child}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-center gap-3">
        <button type="button" onClick={() => move(-1)} disabled={!canPrev} aria-label={labels.previous} className={button}>
          <PrevIcon className="h-5 w-5" />
        </button>
        <button type="button" onClick={() => move(1)} disabled={!canNext} aria-label={labels.next} className={button}>
          <NextIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
