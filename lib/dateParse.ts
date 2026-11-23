// Reading dates typed or imported in many shapes (Excel day numbers,
// 2026-11-23, 23/11/2026, 11/23/2026, ٢٣-١١-٢٠٢٦, 5 Nov 2026, ٥ نوفمبر ٢٠٢٦),
// shared by the past-letters import and the e-signature values.

/** Arabic-Indic and Persian digits as 0-9. */
export const westernDigits = (text: string) =>
  text.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

export type DateOrder = "dmy" | "mdy";

export type DateParts = { y: number; m: number; d: number; time?: string };

const MONTHS: [RegExp, number][] = [
  [/^(jan(uary)?|يناير|جانفي|كانون الثاني)$/, 1],
  [/^(feb(ruary)?|فبراير|فيفري|شباط)$/, 2],
  [/^(mar(ch)?|مارس|آذار|اذار)$/, 3],
  [/^(apr(il)?|أبريل|ابريل|إبريل|نيسان)$/, 4],
  [/^(may|مايو|ماي|أيار|ايار)$/, 5],
  [/^(june?|يونيو|يونيه|جوان|حزيران)$/, 6],
  [/^(july?|يوليو|يوليه|جويلية|تموز)$/, 7],
  [/^(aug(ust)?|أغسطس|اغسطس|أوت|آب)$/, 8],
  [/^(sep(t(ember)?)?|سبتمبر|أيلول|ايلول)$/, 9],
  [/^(oct(ober)?|أكتوبر|اكتوبر|تشرين الأول)$/, 10],
  [/^(nov(ember)?|نوفمبر|تشرين الثاني)$/, 11],
  [/^(dec(ember)?|ديسمبر|كانون الأول)$/, 12],
];

function monthOf(word: string): number | null {
  const w = word.trim().toLowerCase().replace(/\.$/, "");
  for (const [re, n] of MONTHS) if (re.test(w)) return n;
  return null;
}

const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

function valid(y: number, m: number, d: number): boolean {
  return y > 1900 && y < 2200 && m >= 1 && m <= 12 && d >= 1 && d <= daysIn(y, m);
}

/** A two-digit year as 20xx (or 19xx from 70). */
const fullYear = (y: number, raw: string) => (raw.length <= 2 ? (y < 70 ? 2000 + y : 1900 + y) : y);

/** The day, month, year (and time) of a date cell, or null when it isn't one. */
export function readDate(raw: string, order: DateOrder = "dmy"): DateParts | null {
  const text = westernDigits(String(raw ?? "")).trim();
  if (!text) return null;
  const pad = (n: number) => String(n).padStart(2, "0");

  // Excel day number (from an .xlsx file).
  if (/^\d{5}(\.\d+)?$/.test(text)) {
    const serial = Number(text);
    if (serial > 20000 && serial < 120000) {
      const iso = new Date(Math.round((serial - 25569) * 86400000)).toISOString();
      const time = iso.slice(11, 19);
      return { y: +iso.slice(0, 4), m: +iso.slice(5, 7), d: +iso.slice(8, 10), time: time === "00:00:00" ? undefined : time };
    }
    return null;
  }

  const clockMatch = text.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(ص|م|am|pm)?/i);
  let time: string | undefined;
  if (clockMatch) {
    let h = Number(clockMatch[1]);
    const ampm = clockMatch[4]?.toLowerCase();
    if ((ampm === "م" || ampm === "pm") && h < 12) h += 12;
    if ((ampm === "ص" || ampm === "am") && h === 12) h = 0;
    time = `${pad(h)}:${clockMatch[2]}:${clockMatch[3] ?? "00"}`;
  }

  // 2026-11-23 (also 2026/11/23, 2026.11.23, with a time after).
  let m = text.match(/^(\d{4})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{1,2})(?!\d)/);
  if (m && valid(+m[1], +m[2], +m[3])) return { y: +m[1], m: +m[2], d: +m[3], time };

  // 23-11-2026, 23/11/26, 11/23/2026.
  m = text.match(/^(\d{1,2})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{4}|\d{2})(?!\d)/);
  if (m) {
    const [a, b] = [+m[1], +m[2]];
    const y = fullYear(+m[3], m[3]);
    // Day first unless the file says otherwise, or the first part can't be a month.
    const [d, mo] = order === "mdy" && a <= 12 ? [b, a] : a > 12 || order === "dmy" ? [a, b] : [b, a];
    if (valid(y, mo, d)) return { y, m: mo, d, time };
    if (valid(y, d, mo)) return { y, m: d, d: mo, time };
    return null;
  }

  // 5 Nov 2026, ٥ نوفمبر ٢٠٢٦, 5-Nov-26.
  const cleaned = text.replace(/[,،]/g, " ").replace(/\s+/g, " ");
  m = cleaned.match(/^(\d{1,2})[\s\-/.]+([^\d\s\-/.][^\d\-/.]*?)[\s\-/.]+(\d{4}|\d{2})(?!\d)/);
  if (m) {
    const mo = monthOf(m[2]);
    const y = fullYear(+m[3], m[3]);
    if (mo && valid(y, mo, +m[1])) return { y, m: mo, d: +m[1], time };
  }
  // Nov 5, 2026.
  m = cleaned.match(/^([^\d\s\-/.][^\d\-/.]*?)[\s\-/.]+(\d{1,2})[\s\-/.]+(\d{4}|\d{2})(?!\d)/);
  if (m) {
    const mo = monthOf(m[1]);
    const y = fullYear(+m[3], m[3]);
    if (mo && valid(y, mo, +m[2])) return { y, m: mo, d: +m[2], time };
  }
  return null;
}

/** Day/month or month/day: whichever a column's dates show (day first if unclear). */
export function detectOrder(cells: string[]): DateOrder {
  let dmy = 0;
  let mdy = 0;
  for (const cell of cells) {
    const m = westernDigits(String(cell ?? "")).trim().match(/^(\d{1,2})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{4}|\d{2})(?!\d)/);
    if (!m) continue;
    if (+m[1] > 12) dmy++;
    if (+m[2] > 12) mdy++;
  }
  return mdy > dmy ? "mdy" : "dmy";
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** YYYY-MM-DD */
export const isoDay = (p: DateParts) => `${p.y}-${pad2(p.m)}-${pad2(p.d)}`;

/** DD-MM-YYYY */
export const dmyDay = (p: DateParts) => `${pad2(p.d)}-${pad2(p.m)}-${p.y}`;
