"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Search, Star, X } from "lucide-react";
import type { GoogleReview } from "@/lib/googleReviews";
import { SubmitButton } from "./SubmitButton";

type Labels = {
  shownTitle: string;
  shownEmpty: string;
  all: string;
  allBranches: string;
  allStars: string;
  starsAtLeast: string;
  withText: string;
  search: string;
  show: string;
  more: string;
  none: string;
  anonymous: string;
  reply: string;
  remove: string;
  moveUp: string;
  moveDown: string;
  save: string;
  saved: string;
};

const PAGE = 30;

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${rating}/5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < rating ? "fill-primary-500 text-primary-500" : "text-ink-200"}`}
        />
      ))}
    </span>
  );
}

/**
 * Every fetched Google review, filterable, with a tick to show it on the
 * website; the ticked ones are listed on top in their display order.
 * Saved with the surrounding form (hidden "shown" fields, in order).
 */
export function ReviewsPicker({
  reviews,
  initialShown,
  branchNames,
  locale,
  labels,
}: {
  reviews: GoogleReview[];
  initialShown: string[];
  branchNames: Record<string, string>;
  locale: string;
  labels: Labels;
}) {
  const byId = useMemo(() => new Map(reviews.map((r) => [r.id, r])), [reviews]);
  const [shown, setShown] = useState(() => initialShown.filter((id) => byId.has(id)));
  const [branch, setBranch] = useState("");
  const [minStars, setMinStars] = useState(0);
  const [withText, setWithText] = useState(true);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);

  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const matching = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reviews
      .filter(
        (r) =>
          (!branch || r.branchId === branch) &&
          r.rating >= minStars &&
          (!withText || r.comment.length > 0) &&
          (!q || r.comment.toLowerCase().includes(q) || r.author.toLowerCase().includes(q))
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [reviews, branch, minStars, withText, query]);

  const toggle = (id: string) =>
    setShown((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  const move = (index: number, by: -1 | 1) =>
    setShown((current) => {
      const next = [...current];
      const target = index + by;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const arrow =
    "flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-600 transition hover:border-primary-400 hover:text-ink-900 disabled:pointer-events-none disabled:opacity-30";

  const meta = (r: GoogleReview) => (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
      <span className="font-bold text-ink-900">{r.author || labels.anonymous}</span>
      <Stars rating={r.rating} />
      <span>{date(r.createdAt)}</span>
      {branchNames[r.branchId] && (
        <span className="rounded-full bg-ink-50 px-2 py-0.5 font-bold">{branchNames[r.branchId]}</span>
      )}
    </span>
  );

  return (
    <div className="space-y-8">
      {shown.map((id) => (
        <input key={id} type="hidden" name="shown" value={id} />
      ))}

      <section>
        <h3 className="font-extrabold text-ink-950">
          {labels.shownTitle} <span className="text-sm text-ink-400">({shown.length})</span>
        </h3>
        {shown.length === 0 ? (
          <p className="mt-2 rounded-xl bg-ink-50 px-4 py-3 text-sm text-ink-500">{labels.shownEmpty}</p>
        ) : (
          <ol className="mt-3 divide-y divide-ink-100 rounded-xl2 border border-ink-100 bg-white">
            {shown.map((id, i) => {
              const r = byId.get(id)!;
              return (
                <li key={id} className="flex items-start gap-3 p-3">
                  <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-ink-50 text-xs font-bold text-ink-500">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    {meta(r)}
                    <span dir="auto" className="mt-1 line-clamp-2 block text-sm text-ink-700">{r.comment}</span>
                  </span>
                  <span className="flex flex-shrink-0 gap-1.5">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title={labels.moveUp} aria-label={labels.moveUp} className={arrow}>
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === shown.length - 1} title={labels.moveDown} aria-label={labels.moveDown} className={arrow}>
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => toggle(id)} title={labels.remove} aria-label={labels.remove} className={arrow}>
                      <X className="h-4 w-4" />
                    </button>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        <div className="mt-4">
          <SubmitButton label={labels.save} savedLabel={labels.saved} />
        </div>
      </section>

      <section>
        <h3 className="font-extrabold text-ink-950">
          {labels.all} <span className="text-sm text-ink-400">({matching.length})</span>
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-ink-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(PAGE);
              }}
              placeholder={labels.search}
              className="input ps-9"
            />
          </label>
          <select value={branch} onChange={(e) => { setBranch(e.target.value); setLimit(PAGE); }} className="input">
            <option value="">{labels.allBranches}</option>
            {Object.entries(branchNames).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          <select value={minStars} onChange={(e) => { setMinStars(Number(e.target.value)); setLimit(PAGE); }} className="input">
            <option value={0}>{labels.allStars}</option>
            {[5, 4, 3, 2].map((n) => (
              <option key={n} value={n}>{n === 5 ? "5 ★" : `${n} ${labels.starsAtLeast}`}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm font-bold text-ink-700">
            <input type="checkbox" checked={withText} onChange={(e) => setWithText(e.target.checked)} className="h-5 w-5 rounded border-ink-300" />
            {labels.withText}
          </label>
        </div>

        {matching.length === 0 ? (
          <p className="mt-4 text-sm text-ink-500">{labels.none}</p>
        ) : (
          <ul className="mt-4 grid gap-3 lg:grid-cols-2">
            {matching.slice(0, limit).map((r) => {
              const isShown = shown.includes(r.id);
              return (
                <li key={r.id}>
                  <label
                    className={`flex h-full cursor-pointer items-start gap-3 rounded-xl2 border bg-white p-4 transition ${
                      isShown ? "border-primary-500 ring-2 ring-primary-100" : "border-ink-100 hover:border-ink-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isShown}
                      onChange={() => toggle(r.id)}
                      aria-label={labels.show}
                      className="mt-0.5 h-5 w-5 flex-shrink-0 rounded border-ink-300"
                    />
                    <span className="min-w-0 flex-1">
                      {meta(r)}
                      {r.comment && <span dir="auto" className="mt-2 block whitespace-pre-line text-sm leading-relaxed text-ink-700">{r.comment}</span>}
                      {r.reply && (
                        <span className="mt-2 block rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500">
                          <span className="font-bold">{labels.reply}: </span>
                          {r.reply}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        {matching.length > limit && (
          <button type="button" onClick={() => setLimit((n) => n + PAGE)} className="btn-outline mt-4">
            {labels.more}
          </button>
        )}
      </section>
    </div>
  );
}
