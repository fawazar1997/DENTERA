"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { HomeSectionKey } from "@/lib/types";

/**
 * Home page sections in their display order: arrows move a section up or
 * down, the tick box shows or hides it. Saved with the surrounding form
 * (hidden "order" fields carry the sequence).
 */
export function HomeSectionsEditor({
  initialOrder,
  hidden,
  labels,
  moveUp,
  moveDown,
}: {
  initialOrder: HomeSectionKey[];
  hidden: HomeSectionKey[];
  labels: Record<HomeSectionKey, string>;
  moveUp: string;
  moveDown: string;
}) {
  const [order, setOrder] = useState(initialOrder);

  const move = (index: number, by: -1 | 1) =>
    setOrder((current) => {
      const next = [...current];
      const target = index + by;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const arrow =
    "flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-600 transition hover:border-primary-400 hover:text-primary-700 disabled:pointer-events-none disabled:opacity-30";

  return (
    <ol className="divide-y divide-ink-100">
      {order.map((section, i) => (
        <li key={section} className="flex items-center gap-3 py-3">
          <input type="hidden" name="order" value={section} />
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-ink-50 text-sm font-bold text-ink-500">
            {i + 1}
          </span>
          <label className="flex flex-1 cursor-pointer items-center justify-between gap-3">
            <span className="font-semibold text-ink-900">{labels[section]}</span>
            <input
              type="checkbox"
              name="shown"
              value={section}
              defaultChecked={!hidden.includes(section)}
              className="h-5 w-5 flex-shrink-0 rounded border-ink-300"
            />
          </label>
          <div className="flex flex-shrink-0 gap-1.5">
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              title={moveUp}
              aria-label={`${moveUp}: ${labels[section]}`}
              className={arrow}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === order.length - 1}
              title={moveDown}
              aria-label={`${moveDown}: ${labels[section]}`}
              className={arrow}
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          </div>
        </li>
      ))}
    </ol>
  );
}
