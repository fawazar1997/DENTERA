"use client";

import { useEffect, useRef, useState } from "react";

type Stat = { value: string; label: string };

/** Splits "+50,000" / "50,000+" / "9" into prefix, number and suffix. */
function parse(value: string) {
  const match = value.match(/^(\D*)([\d,.]+)(\D*)$/);
  if (!match) return null;
  const digits = match[2].replace(/,/g, "");
  const target = Number(digits);
  if (!Number.isFinite(target)) return null;
  return {
    prefix: match[1],
    suffix: match[3],
    target,
    grouped: match[2].includes(","),
  };
}

function CountUp({ value, run }: { value: string; run: boolean }) {
  const parsed = parse(value);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!parsed || !run) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCurrent(parsed.target);
      return;
    }
    const duration = 1600;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setCurrent(Math.round(parsed.target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, value]);

  // Non-numeric values (e.g. text) are shown as they are.
  if (!parsed) return <>{value}</>;
  const number = parsed.grouped
    ? current.toLocaleString("en-US")
    : String(current);
  return (
    <>
      {parsed.prefix}
      {run ? number : value.replace(/[\d,.]+/, "0")}
      {parsed.suffix}
    </>
  );
}

/** The home page numbers as a full-width band that counts up into view. */
export function StatsStrip({ stats }: { stats: Stat[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRun(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-ink-900 to-ink-950">
      <div
        className="absolute inset-0 opacity-15 [background-image:radial-gradient(circle_at_1px_1px,#0cb8cd_1px,transparent_0)] [background-size:22px_22px]"
        aria-hidden="true"
      />
      <div
        ref={ref}
        className="container-x relative grid grid-cols-2 gap-y-10 py-12 sm:py-14 lg:grid-cols-4"
      >
        {stats.map((stat, i) => (
          <dl
            key={i}
            className={`px-4 text-center ${
              i > 0 ? "lg:border-s lg:border-white/10" : ""
            } ${i % 2 === 1 ? "border-s border-white/10 lg:border-s" : ""}`}
          >
            <dt className="sr-only">{stat.label}</dt>
            <dd className="text-4xl font-extrabold tabular-nums text-primary-300 sm:text-5xl"
            >
              <CountUp value={stat.value} run={run} />
            </dd>
            <dd className="mt-2 text-sm text-sand-200 sm:text-base">
              {stat.label}
            </dd>
          </dl>
        ))}
      </div>
    </section>
  );
}
