"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp } from "lucide-react";

export type LogoOrderItem = {
  id: string;
  name: string;
  logoUrl?: string;
  hidden: boolean;
};

/**
 * One gallery's logos in their display order: arrows move a logo up or
 * down. Saved with the surrounding form (hidden "order" fields carry the
 * sequence).
 */
export function LogoOrderEditor({
  items,
  moveUp,
  moveDown,
  hiddenLabel,
}: {
  items: LogoOrderItem[];
  moveUp: string;
  moveDown: string;
  hiddenLabel: string;
}) {
  const [order, setOrder] = useState(items);

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
      {order.map((item, i) => (
        <li key={item.id} className="flex items-center gap-3 py-2.5">
          <input type="hidden" name="order" value={item.id} />
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-ink-50 text-sm font-bold text-ink-500">
            {i + 1}
          </span>
          <div className="flex h-10 w-16 flex-shrink-0 items-center justify-center rounded-md border border-ink-100 bg-white p-1">
            {item.logoUrl ? (
              <Image
                src={item.logoUrl}
                alt=""
                width={120}
                height={60}
                className="max-h-8 w-auto object-contain"
              />
            ) : (
              <span className="text-xs text-ink-300">—</span>
            )}
          </div>
          <span className="min-w-0 flex-1 truncate font-semibold text-ink-900">
            {item.name}
            {item.hidden && (
              <span className="ms-2 rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-500">
                {hiddenLabel}
              </span>
            )}
          </span>
          <div className="flex flex-shrink-0 gap-1.5">
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              title={moveUp}
              aria-label={`${moveUp}: ${item.name}`}
              className={arrow}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === order.length - 1}
              title={moveDown}
              aria-label={`${moveDown}: ${item.name}`}
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
