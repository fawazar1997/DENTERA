// The doctors' official names (Control Panel → Doctors) for the financial
// dashboard: each PMS spelling («Dr. Mohammed Al Maqbool», «Dr. Malek
// abazeed - Khamis») is matched to its official doctor, so tables show the
// official name and a doctor's names in both branches add up. Partners are
// matched by their Arabic names as written («محمد مقبول» → «د. محمد ال مقبول»).

import type { Doctor } from "./types";
import type { Locale } from "./i18n";
import type { BranchDay, FinanceBranch, MonthAgg } from "./financeTypes";
import type { Aggs } from "./financeMetrics";

const PARTICLES = new Set(["al", "el", "bin", "ibn", "abu", "abo", "dr", "prof"]);

/** Latin letters only, lower case. */
const plain = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

/** A spelling-tolerant key: no «al» prefix, q→g, no vowels, no doubled letters. */
function skeleton(word: string): string {
  return plain(word)
    .replace(/^al(?=.{3})/, "")
    .replace(/q/g, "g")
    .replace(/ph/g, "f")
    .replace(/[aeiouy]/g, "")
    .replace(/(.)\1+/g, "$1");
}

const words = (name: string) =>
  name
    .replace(/^\s*(prof|dr)\.?\s*/i, "")
    .split(/[\s.\-]+/)
    .map((w) => w.trim())
    .filter((w) => w && !PARTICLES.has(plain(w)));

type PmsName = { plain: string; skeleton: string; words: string[] };

/** Whether an official word is found in a PMS name (by spelling skeleton, else as written). */
function found(word: string, pms: PmsName): boolean {
  const sk = skeleton(word);
  if (sk.length >= 3 && pms.skeleton.includes(sk)) return true;
  // Short skeletons («Wadaei» → wd, «Abboud» → bd): a whole PMS word must have the same one.
  if (sk.length >= 2 && pms.words.some((w) => skeleton(w) === sk)) return true;
  const p = plain(word).replace(/^al(?=.{3})/, "");
  return p.length >= 3 && pms.plain.includes(p);
}

/** The official doctor a PMS name belongs to (first and last names must match; the best match wins). */
export function officialDoctor(pmsName: string, doctors: Doctor[]): Doctor | undefined {
  const pmsWords = words(pmsName.replace(/\s*-\s*(khamis|abha)\s*$/i, ""));
  const pms: PmsName = {
    plain: pmsWords.map((w) => plain(w).replace(/^al(?=.{3})/, "")).join(""),
    skeleton: pmsWords.map(skeleton).join(""),
    words: pmsWords,
  };
  let best: Doctor | undefined;
  let bestScore = 0;
  let tie = false;
  for (const d of doctors) {
    const w = words(d.nameEn);
    if (w.length < 2) continue;
    if (!found(w[0], pms) || !found(w[w.length - 1], pms)) continue;
    const score = w.filter((x) => found(x, pms)).length;
    if (score > bestScore) {
      best = d;
      bestScore = score;
      tie = false;
    } else if (score === bestScore) tie = true;
  }
  return tie ? undefined : best;
}

/** Arabic for comparing: no titles, diacritics, «ال» or spaces; one form of alef, taa marbuta and yaa. */
function arabicKey(text: string): string {
  return text
    .replace(/(^|\s)(أ\.?\s?د\.?|د\.|دكتور|الدكتور|بروف|البروف)(?=\s)/g, " ")
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");
}

const arabicWords = (text: string) =>
  arabicKey(text)
    .split(/\s+/)
    .map((w) => w.replace(/^ال(?=..)/, "").replace(/^آل$/, ""))
    .filter((w) => w.length > 1);

/** The official doctor a partner line names (Arabic as written, or the official English name). */
export function partnerDoctor(line: string, doctors: Doctor[]): Doctor | undefined {
  const name = line.split("=")[0].trim();
  if (/[؀-ۿ]/.test(name)) {
    const want = arabicWords(name);
    const hits = doctors.filter((d) => {
      const official = arabicKey(d.nameAr).replace(/\s+/g, "");
      return want.length > 0 && want.every((w) => official.includes(w));
    });
    return hits.length === 1 ? hits[0] : hits.sort((a, b) => a.nameAr.length - b.nameAr.length)[0];
  }
  return officialDoctor(name, doctors);
}

/** The name a doctor is shown under on the dashboard. */
export const shownName = (d: Doctor, locale: Locale) => (locale === "ar" ? d.nameAr : d.nameEn);

/**
 * The months' doctors under their official names (for the locale): each
 * PMS name is replaced by its official doctor's, and names that belong to
 * the same doctor add up. Unmatched names (e.g. «Dental Lab») stay as they are.
 */
export function withOfficialNames(aggs: Aggs, doctors: Doctor[], locale: Locale): Aggs {
  const cache = new Map<string, string>();
  const nameOf = (pms: string) => {
    if (!cache.has(pms)) {
      const d = officialDoctor(pms, doctors);
      cache.set(pms, d ? shownName(d, locale) : pms);
    }
    return cache.get(pms)!;
  };
  const out: Aggs = {};
  for (const [month, agg] of Object.entries(aggs)) {
    if (!agg) {
      out[month] = agg;
      continue;
    }
    const days: MonthAgg["days"] = {};
    for (const [date, branches] of Object.entries(agg.days)) {
      const copy: Partial<Record<FinanceBranch, BranchDay>> = {};
      for (const [branch, day] of Object.entries(branches) as [FinanceBranch, BranchDay | undefined][]) {
        if (!day) continue;
        const byDoctor: BranchDay["byDoctor"] = {};
        for (const [pms, d] of Object.entries(day.byDoctor)) {
          const t = (byDoctor[nameOf(pms)] ??= { net: 0, invoices: 0, patients: 0, discount: 0 });
          t.net += d.net;
          t.invoices += d.invoices;
          t.patients += d.patients;
          t.discount += d.discount;
        }
        copy[branch] = { ...day, byDoctor };
      }
      days[date] = copy;
    }
    out[month] = { ...agg, days };
  }
  return out;
}

/** The partner entries (doctor ids, or names as written) as the official doctors they name. */
export function partnerDoctors(entries: string[], doctors: Doctor[]): { entry: string; doctor?: Doctor }[] {
  return entries.map((entry) => ({ entry, doctor: doctors.find((d) => d.id === entry) ?? partnerDoctor(entry, doctors) }));
}
