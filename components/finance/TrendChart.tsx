"use client";

import { useState } from "react";

// The 30-day daily revenue columns with the daily target as a line (one
// axis, both in riyals). Colours checked with the dataviz validator against
// the white card: teal step for revenue, indigo step for the target.
export const REVENUE_COLOR = "#0a9db0";
export const TARGET_COLOR = "#4b4bc4";

type Point = { date: string; net: number; target: number };

const W = 760;
const H = 260;
const PAD = { top: 26, right: 12, bottom: 26, left: 52 };

function compact(n: number, locale: string): string {
  const abs = Math.abs(n);
  const fmt = (v: number, d = 1) => v.toLocaleString(locale, { maximumFractionDigits: d });
  if (abs >= 1_000_000) return `${fmt(n / 1_000_000)}M`;
  if (abs >= 1_000) return `${fmt(n / 1_000, 0)}K`;
  return fmt(n, 0);
}

function niceMax(v: number): number {
  if (v <= 0) return 1000;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  return (steps.find((s) => s * p >= v) ?? 10) * p;
}

export function TrendChart({
  points,
  labels,
  numberLocale,
}: {
  points: Point[];
  labels: { revenue: string; target: string; variance: string; sar: string };
  numberLocale: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...points.map((p) => Math.max(p.net, p.target)), 0) * 1.08);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const step = innerW / points.length;
  const barW = Math.max(4, step - 4);
  const y = (v: number) => PAD.top + innerH - (Math.max(0, v) / max) * innerH;
  const x = (i: number) => PAD.left + i * step + (step - barW) / 2;
  const ticks = [0, max / 3, (2 * max) / 3, max];
  const last = points.length - 1;
  const shown = hover ?? last;
  const p = points[shown];

  // The target as a step line across each day's column.
  const targetPath = points
    .map((pt, i) => `${i === 0 ? "M" : "L"}${PAD.left + i * step},${y(pt.target)} L${PAD.left + (i + 1) * step},${y(pt.target)}`)
    .join(" ");

  const money = (n: number) => `${Math.round(n).toLocaleString(numberLocale)} ${labels.sar}`;
  const dayLabel = (d: string) => `${d.slice(8, 10)}-${d.slice(5, 7)}`;
  const tipLeft = Math.min(Math.max(((x(shown) + barW / 2) / W) * 100, 14), 86);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-ink-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ background: REVENUE_COLOR }} />
          {labels.revenue}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ background: TARGET_COLOR }} />
          {labels.target}
        </span>
      </div>
      <div className="relative" dir="ltr">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={labels.revenue} onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#e6e1da" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="#5f6199">
                {compact(t, numberLocale)}
              </text>
            </g>
          ))}
          {points.map((pt, i) => {
            const top = y(pt.net);
            const h = PAD.top + innerH - top;
            const r = Math.min(4, barW / 2, h);
            return (
              <g key={pt.date}>
                {h > 0 && (
                  <path
                    d={`M${x(i)},${PAD.top + innerH} V${top + r} Q${x(i)},${top} ${x(i) + r},${top} H${x(i) + barW - r} Q${x(i) + barW},${top} ${x(i) + barW},${top + r} V${PAD.top + innerH} Z`}
                    fill={REVENUE_COLOR}
                    opacity={hover === null || hover === i ? 1 : 0.45}
                  />
                )}
                {(i % 5 === last % 5) && (
                  <text x={x(i) + barW / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="#5f6199">
                    {dayLabel(pt.date)}
                  </text>
                )}
              </g>
            );
          })}
          <path d={targetPath} fill="none" stroke={TARGET_COLOR} strokeWidth={2} strokeLinejoin="round" />
          {/* The shown day's value, directly labelled. */}
          {p.net > 0 && (
            <text x={x(shown) + barW / 2} y={y(p.net) - 7} textAnchor="middle" fontSize={11} fontWeight={700} fill="#141480">
              {compact(p.net, numberLocale)}
            </text>
          )}
          {/* Hit areas: the whole column. */}
          {points.map((pt, i) => (
            <rect
              key={`hit-${pt.date}`}
              x={PAD.left + i * step}
              y={PAD.top}
              width={step}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onTouchStart={() => setHover(i)}
            />
          ))}
        </svg>
        {hover !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-ink-100 bg-white px-3 py-2 text-xs shadow-card"
            style={{ left: `${tipLeft}%` }}
          >
            <p className="font-bold text-ink-900">{dayLabel(p.date)}</p>
            <p className="mt-1 flex items-center gap-1.5 text-ink-700">
              <span className="h-2 w-2 rounded-sm" style={{ background: REVENUE_COLOR }} />
              {money(p.net)}
            </p>
            <p className="flex items-center gap-1.5 text-ink-700">
              <span className="h-0.5 w-3 rounded" style={{ background: TARGET_COLOR }} />
              {money(p.target)}
            </p>
            <p className="text-ink-500">
              {labels.variance}: {money(p.net - p.target)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
