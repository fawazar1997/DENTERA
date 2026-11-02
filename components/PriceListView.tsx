"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { PriceList } from "@/lib/prices";

export type PriceListLabels = {
  search: string;
  allSections: string;
  code: string;
  currency: string;
  results: string;
  noMatches: string;
  updated: string;
  /** When the list was uploaded, already formatted (same on server and browser). */
  updatedAt: string;
};

/** 1500 → "1,500": Western digits, the same wherever it's rendered. */
function formatPrice(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Arabic-friendly matching: ignores diacritics and alef/ya/ta-marbuta forms. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

/** Staff price list: search by name or code, filter by section. */
export function PriceListView({
  list,
  locale,
  labels,
  autoFocus = false,
}: {
  list: PriceList;
  locale: Locale;
  labels: PriceListLabels;
  autoFocus?: boolean;
}) {
  const ar = locale === "ar";
  const [query, setQuery] = useState("");
  const [section, setSection] = useState(-1);

  const indexed = useMemo(
    () =>
      list.sections.map((s) => ({
        ...s,
        items: s.items.map((item) => ({
          item,
          haystack: normalize(`${item.code} ${item.nameAr} ${item.nameEn}`),
        })),
      })),
    [list]
  );

  const shown = useMemo(() => {
    const terms = normalize(query).split(" ").filter(Boolean);
    return indexed
      .map((s, i) => ({
        ...s,
        index: i,
        items: s.items.filter(({ haystack }) => terms.every((t) => haystack.includes(t))),
      }))
      .filter((s) => (section === -1 || s.index === section) && s.items.length > 0);
  }, [indexed, query, section]);
  const count = shown.reduce((n, s) => n + s.items.length, 0);

  return (
    <div>
      <div className="card p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400 ltr:left-3 rtl:right-3" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.search}
            autoFocus={autoFocus}
            className="input ltr:pl-10 rtl:pr-10"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-400 hover:text-ink-700 ltr:right-2 rtl:left-2"
              aria-label="×"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {[{ label: labels.allSections, index: -1 }, ...list.sections.map((s, i) => ({ label: ar ? s.nameAr : s.nameEn, index: i }))].map(
            ({ label, index }) => (
              <button
                key={index}
                type="button"
                onClick={() => setSection(index)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  section === index ? "bg-ink-950 text-white" : "bg-ink-50 text-ink-700 hover:bg-ink-100"
                }`}
              >
                {label}
              </button>
            )
          )}
        </div>
        <p className="mt-3 text-xs text-ink-500">
          {labels.results} {count} · {labels.updated} {labels.updatedAt}
        </p>
      </div>

      {shown.length === 0 && (
        <p className="mt-6 rounded-xl bg-ink-50 px-4 py-6 text-center text-ink-500">{labels.noMatches}</p>
      )}

      {shown.map((s) => (
        <section key={s.index} className="mt-6">
          <h2 className="mb-2 px-1 text-base font-extrabold text-ink-950">
            {ar ? s.nameAr : s.nameEn}
            <span className="ms-2 text-xs font-semibold text-ink-400">{ar ? s.nameEn : s.nameAr}</span>
          </h2>
          <ul className="card divide-y divide-ink-100 overflow-hidden">
            {s.items.map(({ item }) => (
              <li key={item.code} className="flex items-center gap-3 px-4 py-3">
                <span
                  className="w-12 flex-shrink-0 text-center text-xs font-bold tabular-nums text-ink-400"
                  title={labels.code}
                  dir="ltr"
                >
                  {item.code}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug text-ink-900" dir={ar ? "rtl" : "ltr"}>
                    {(ar ? item.nameAr : item.nameEn) || item.nameEn || item.nameAr}
                  </p>
                  {(ar ? item.nameEn : item.nameAr) && (
                    <p className="mt-0.5 text-xs leading-snug text-ink-500" dir={ar ? "ltr" : "rtl"}>
                      {ar ? item.nameEn : item.nameAr}
                    </p>
                  )}
                </div>
                <span className="flex-shrink-0 rounded-lg bg-primary-50 px-2.5 py-1 text-sm font-extrabold tabular-nums text-primary-700">
                  {formatPrice(item.price)} <span className="text-xs font-bold">{labels.currency}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
