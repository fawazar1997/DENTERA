"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Ban, History, Star } from "lucide-react";
import { careersText } from "@/lib/careersText";
import { localePath, type Locale } from "@/lib/i18n";
import { CAREER_STAGES, type CareerStage } from "@/lib/careersTypes";
import { bulkAction } from "@/lib/careersAdminActions";
import { scoreStyle } from "./scoreStyle";

export type TableRow = {
  id: string;
  ref: string;
  name: string;
  field: string;
  city: string;
  years: number;
  score: number;
  fails: number;
  stage: CareerStage;
  rating?: number;
  tags: string[];
  repeat: boolean;
  excluded: boolean;
  autoExcluded: boolean;
  createdAt: string;
};

/** The applicants list, with selection for bulk actions. */
export function ApplicantsTable({ rows, locale, returnTo }: { rows: TableRow[]; locale: Locale; returnTo: string }) {
  const t = careersText(locale);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulk, setBulk] = useState("");
  const all = rows.length > 0 && selected.length === rows.length;
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const day = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", { timeZone: "Asia/Riyadh", day: "numeric", month: "short" });

  return (
    <form action={bulkAction}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="return" value={returnTo} />
      {selected.map((id) => (
        <input key={id} type="hidden" name="ids" value={id} />
      ))}
      {selected.length > 0 && (
        <div className="sticky top-2 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-ink-950 px-4 py-3 text-sm text-white shadow-lg">
          <span className="font-bold">
            {selected.length} {t.selected}
          </span>
          <select
            name="bulk"
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            aria-label={t.bulkApply}
            className="rounded-lg border-0 bg-white/10 px-3 py-1.5 text-sm text-white"
          >
            <option value="" className="text-ink-900">—</option>
            {CAREER_STAGES.map((s) => (
              <option key={s} value={`stage:${s}`} className="text-ink-900">
                {t.bulkStage.replace("…", "")}: {t.stages[s]}
              </option>
            ))}
            <option value="tag" className="text-ink-900">{t.bulkTag}</option>
            <option value="exclude" className="text-ink-900">{t.bulkExclude}</option>
          </select>
          {bulk === "tag" && <input name="bulkTag" required maxLength={30} placeholder={t.tag} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm placeholder:text-white/60" />}
          {bulk === "exclude" && (
            <input name="bulkReason" required maxLength={300} placeholder={t.excludeReason} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm placeholder:text-white/60" />
          )}
          <button type="submit" disabled={!bulk} className="rounded-lg bg-primary-500 px-4 py-1.5 font-bold text-white disabled:opacity-40">
            {t.bulkApply}
          </button>
        </div>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[56rem] text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-xs text-ink-500">
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={all}
                  onChange={() => setSelected(all ? [] : rows.map((r) => r.id))}
                  aria-label={t.selected}
                  className="h-4 w-4 accent-primary-600"
                />
              </th>
              <th className="px-3 py-3 text-start font-bold">{t.name}</th>
              <th className="px-3 py-3 text-start font-bold">{t.field}</th>
              <th className="px-3 py-3 text-start font-bold">{t.city}</th>
              <th className="px-3 py-3 text-start font-bold">{t.years}</th>
              <th className="px-3 py-3 text-start font-bold">{t.score}</th>
              <th className="px-3 py-3 text-start font-bold">{t.stage}</th>
              <th className="px-3 py-3 text-start font-bold">{t.rating}</th>
              <th className="px-3 py-3 text-start font-bold">{t.appliedOn}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={`border-b border-ink-50 last:border-0 hover:bg-primary-50/40 ${selected.includes(r.id) ? "bg-primary-50/60" : ""}`}>
                <td className="px-3 py-3">
                  <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} aria-label={r.name} className="h-4 w-4 accent-primary-600" />
                </td>
                <td className="px-3 py-3">
                  <Link href={localePath(locale, `/admin/careers?applicant=${r.id}`)} className="font-bold text-ink-950 hover:text-primary-700">
                    {r.name}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <span className="text-xs text-ink-400" dir="ltr">{r.ref}</span>
                    {r.excluded && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-ink-900 px-2 py-0.5 text-[0.65rem] font-bold text-white">
                        <Ban className="h-3 w-3" /> {r.autoExcluded ? t.autoExcluded : t.excludedBadge}
                      </span>
                    )}
                    {r.repeat && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sand-100 px-2 py-0.5 text-[0.65rem] font-bold text-ink-700">
                        <History className="h-3 w-3" /> {t.repeat}
                      </span>
                    )}
                    {r.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-ink-100 px-2 py-0.5 text-[0.65rem] font-bold text-ink-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-3 text-ink-700">{r.field}</td>
                <td className="px-3 py-3 text-ink-700">{r.city}</td>
                <td className="px-3 py-3 text-ink-700">{r.years}</td>
                <td className="px-3 py-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold ring-1 ${scoreStyle(r.score, r.fails)}`} title={r.fails ? t.matchFail : t.matchOk}>
                    {r.fails > 0 && <AlertTriangle className="h-3 w-3" />}
                    {r.score}%
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span className="rounded-full bg-ink-50 px-2.5 py-1 text-xs font-bold text-ink-700 ring-1 ring-ink-100">{t.stages[r.stage]}</span>
                </td>
                <td className="px-3 py-3">
                  {r.rating ? (
                    <span className="inline-flex items-center gap-0.5 text-xs font-bold text-ink-700" aria-label={`${r.rating}/5`}>
                      <Star className="h-3.5 w-3.5 fill-accent-400 text-accent-400" /> {r.rating}
                    </span>
                  ) : (
                    <span className="text-ink-300">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-xs text-ink-500">{day(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </form>
  );
}
