// E-signature values, one way everywhere (the copies table, the Excel import,
// the previews, the server and the printed document):
//   date    → 23-11-2026, from any shape (Excel day numbers, 2026-11-23, 23/11/26, 5 Nov 2026…)
//   number  → 25,000
//   amount  → 25,000 ريال, optionally with the amount in words
// A value is stored in its plain form (23-11-2026, 25000) and dressed when printed.

import { detectOrder, dmyDay, readDate, westernDigits, type DateOrder } from "./dateParse";
import type { EsignAutoVar, EsignVarType, EsignVariable } from "./esignTypes";

export { detectOrder };
export type { DateOrder };

export type ValueLang = "ar" | "en";

/** The automatic variables and their names in each language. */
export const AUTO_VARS: { key: EsignAutoVar; ar: string; en: string }[] = [
  { key: "today", ar: "تاريخ الطلب", en: "Request date" },
  { key: "ref", ar: "رقم الطلب", en: "Request no." },
  { key: "title", ar: "عنوان الطلب", en: "Request title" },
];

export const autoVarName = (key: EsignAutoVar, lang: ValueLang = "ar") =>
  AUTO_VARS.find((a) => a.key === key)?.[lang] ?? key;

/** Today in Riyadh as 23-11-2026. */
export function riyadhToday(at: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Riyadh", day: "2-digit", month: "2-digit", year: "numeric" }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")}-${get("month")}-${get("year")}`;
}

/** A date as 23-11-2026, or null when it isn't one. */
export function normalizeDate(raw: string, order: DateOrder = "dmy"): string | null {
  const parts = readDate(raw, order);
  return parts ? dmyDay(parts) : null;
}

/** A number typed with Arabic digits, commas, «ريال» or «SAR», or null. */
export function parseNumber(raw: string): number | null {
  const text = westernDigits(String(raw ?? ""))
    .replace(/٫/g, ".")
    .replace(/(ريال(\s*سعودي)?|ر\.?\s?س\.?|sar|s\.r\.?|riyals?|rials?)/gi, "")
    .replace(/[٬,\s ٬]/g, "")
    .trim();
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

/** 25000 → 25,000; 1250.5 → 1,250.50 (at most two decimals). */
export function formatNumber(raw: string): string | null {
  const n = parseNumber(raw);
  if (n === null) return null;
  const whole = Number.isInteger(Math.round(n * 100) / 100);
  return n.toLocaleString("en-US", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
}

/**
 * A value in its stored form: dates as 23-11-2026, numbers plain (25000).
 * ok is false when a date or number can't be read (the raw text is kept).
 */
export function normalizeValue(raw: string, type: EsignVarType = "text", order: DateOrder = "dmy"): { value: string; ok: boolean } {
  const text = String(raw ?? "").trim();
  if (!text) return { value: "", ok: true };
  if (type === "date") {
    const date = normalizeDate(text, order);
    return date ? { value: date, ok: true } : { value: text, ok: false };
  }
  if (type === "number" || type === "amount") {
    const n = parseNumber(text);
    return n === null ? { value: text, ok: false } : { value: String(Math.round(n * 100) / 100), ok: true };
  }
  return { value: text, ok: true };
}

/** A value as it is printed (formatted by its variable's type). */
export function displayValue(value: string, variable?: Pick<EsignVariable, "type" | "words"> | EsignVarType, lang: ValueLang = "ar"): string {
  const v = String(value ?? "").trim();
  if (!v) return "";
  const type = typeof variable === "string" ? variable : variable?.type ?? "text";
  const words = typeof variable === "object" && variable?.words;
  if (type === "date") return normalizeDate(v) ?? v;
  if (type === "number") return formatNumber(v) ?? v;
  if (type === "amount") {
    const n = parseNumber(v);
    if (n === null) return v;
    const shown = formatNumber(v)!;
    const base = lang === "ar" ? `${shown} ريال` : `SAR ${shown}`;
    return words ? `${base} (${amountInWords(n, lang)})` : base;
  }
  return v;
}

// --- Amounts in words (تفقيط) ---

const ONES = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
const TEENS = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
const TENS = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
const HUNDREDS = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];
/** Thousand, million, billion: one, two, three to ten. */
const SCALES: [string, string, string][] = [
  ["", "", ""],
  ["ألف", "ألفان", "آلاف"],
  ["مليون", "مليونان", "ملايين"],
  ["مليار", "ملياران", "مليارات"],
];

function arabicBelow1000(n: number): string {
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (h) parts.push(HUNDREDS[h]);
  if (r) {
    if (r < 10) parts.push(ONES[r]);
    else if (r < 20) parts.push(TEENS[r - 10]);
    else {
      const o = r % 10;
      const t = Math.floor(r / 10);
      parts.push(o ? `${ONES[o]} و${TENS[t]}` : TENS[t]);
    }
  }
  return parts.join(" و");
}

/** A whole number in Arabic words (25000 → خمسة وعشرون ألف). */
export function arabicWords(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return "صفر";
  const groups: string[] = [];
  for (let i = 0; n > 0 && i < SCALES.length; i++) {
    const g = n % 1000;
    n = Math.floor(n / 1000);
    if (!g) continue;
    if (i === 0) groups.push(arabicBelow1000(g));
    else {
      const [one, two, few] = SCALES[i];
      groups.push(g === 1 ? one : g === 2 ? two : g <= 10 ? `${arabicBelow1000(g)} ${few}` : `${arabicBelow1000(g)} ${one}`);
    }
  }
  return groups.reverse().join(" و");
}

const EN_ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const EN_SCALES = ["", "thousand", "million", "billion"];

function englishBelow1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(`${EN_ONES[h]} hundred`);
  if (r) parts.push(r < 20 ? EN_ONES[r] : EN_TENS[Math.floor(r / 10)] + (r % 10 ? `-${EN_ONES[r % 10]}` : ""));
  return parts.join(" and ");
}

/** A whole number in English words. */
export function englishWords(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return "zero";
  const groups: string[] = [];
  for (let i = 0; n > 0 && i < EN_SCALES.length; i++) {
    const g = n % 1000;
    n = Math.floor(n / 1000);
    if (g) groups.push(`${englishBelow1000(g)}${EN_SCALES[i] ? ` ${EN_SCALES[i]}` : ""}`);
  }
  return groups.reverse().join(" ");
}

/** An amount in words: خمسة وعشرون ألف ريال سعودي وخمسون هللة فقط لا غير. */
export function amountInWords(amount: number, lang: ValueLang = "ar"): string {
  const cents = Math.round(Math.abs(amount) * 100);
  const riyals = Math.floor(cents / 100);
  const halalas = cents % 100;
  if (lang === "en") {
    const main = riyals ? `${englishWords(riyals)} Saudi riyal${riyals === 1 ? "" : "s"}` : "";
    const small = halalas ? `${englishWords(halalas)} halala${halalas === 1 ? "" : "s"}` : "";
    const text = [main, small].filter(Boolean).join(" and ") || "zero Saudi riyals";
    return `${text.charAt(0).toUpperCase()}${text.slice(1)} only`;
  }
  const main = riyals ? `${arabicWords(riyals)} ريال سعودي` : "";
  const small = halalas ? `${arabicWords(halalas)} هللة` : "";
  const text = main && small ? `${main} و${small}` : main || small || "صفر ريال سعودي";
  return `${text} فقط لا غير`;
}
