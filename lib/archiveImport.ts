import { ARCHIVE_BRANCHES, foldArabic, type ArchiveKind, type PastLetter } from "./archive";
import { driveIdFromLink } from "./googleDrive";

// Reading the old letters register (the Google Sheet behind the Google
// Forms, downloaded as Excel or CSV) into past letters. Columns are found by
// their headings, so the order doesn't matter and extra columns are ignored.

type Field =
  | "ignore"
  | "timestamp"
  | "employeeNo"
  | "number"
  | "party"
  | "department"
  | "letterType"
  | "title"
  | "letterDate"
  | "file";

// Checked in this order; a heading takes the first rule it matches.
const RULES: [Field, RegExp][] = [
  ["ignore", /بريد|email|e-mail/],
  ["timestamp", /طابع|timestamp|وقت الارسال|تاريخ الرفع|تاريخ الارسال/],
  ["employeeNo", /وظيفي|employee/],
  ["number", /رقم|number|\bno\b/],
  ["party", /جهه|sender|from|party/],
  ["department", /اداره|department|القسم/],
  ["letterType", /نوع|type/],
  ["title", /عنوان|موضوع|subject|title/],
  ["letterDate", /تاريخ|date/],
  ["file", /مرفق|ملف|attach|file|رابط|link/],
];

function fieldOf(heading: string): Field | null {
  const text = foldArabic(heading);
  if (!text) return null;
  return RULES.find(([, re]) => re.test(text))?.[0] ?? null;
}

const digits = (text: string) =>
  text.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

type DateOrder = "dmy" | "mdy";

/** A date cell as { day: YYYY-MM-DD, time }, or null when it isn't a date. */
function parseDate(raw: string, order: DateOrder): { day: string; time?: string } | null {
  const text = digits(raw).trim();
  const pad = (n: number) => String(n).padStart(2, "0");
  const valid = (y: number, m: number, d: number) => y > 1900 && y < 2200 && m >= 1 && m <= 12 && d >= 1 && d <= 31;
  // Excel day number (from an .xlsx file).
  if (/^\d{5}(\.\d+)?$/.test(text)) {
    const serial = Number(text);
    if (serial > 20000 && serial < 120000) {
      const ms = Math.round((serial - 25569) * 86400000);
      const iso = new Date(ms).toISOString();
      const time = iso.slice(11, 19);
      return { day: iso.slice(0, 10), time: time === "00:00:00" ? undefined : time };
    }
  }
  const time = text.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(ص|م|am|pm)?/i);
  let clock: string | undefined;
  if (time) {
    let h = Number(time[1]);
    const ampm = time[4]?.toLowerCase();
    if ((ampm === "م" || ampm === "pm") && h < 12) h += 12;
    if ((ampm === "ص" || ampm === "am") && h === 12) h = 0;
    clock = `${pad(h)}:${time[2]}:${time[3] ?? "00"}`;
  }
  let m = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m && valid(+m[1], +m[2], +m[3])) return { day: `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`, time: clock };
  m = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) {
    const [a, b, y] = [+m[1], +m[2], +m[3]];
    const [d, mo] = order === "mdy" ? [b, a] : [a, b];
    if (valid(y, mo, d)) return { day: `${y}-${pad(mo)}-${pad(d)}`, time: clock };
  }
  return null;
}

/** A Riyadh date and time as an ISO timestamp (undefined when invalid). */
function isoAt(day?: string, time = "12:00:00"): string | undefined {
  if (!day) return undefined;
  const t = new Date(`${day}T${time}+03:00`);
  return Number.isNaN(t.getTime()) ? undefined : t.toISOString();
}

/** Day/month or month/day: whichever the file's dates show (day first if unclear). */
function detectOrder(cells: string[]): DateOrder {
  let dmy = 0;
  let mdy = 0;
  for (const cell of cells) {
    const m = digits(cell).match(/^(\d{1,2})[-/.](\d{1,2})[-/.]\d{4}/);
    if (!m) continue;
    if (+m[1] > 12) dmy++;
    if (+m[2] > 12) mdy++;
  }
  return mdy > dmy ? "mdy" : "dmy";
}

/** An old number tidied to the current format (ABH-2026-61 → ABH-2026-0061). */
function tidyNumber(raw: string): string {
  const text = digits(raw).trim().toUpperCase();
  // Also finds it inside extra words ("الرقم: ABH-2025-0101").
  const m = text.match(/([A-Z]+(?:-[A-Z]+)*)\s*[-–_/ ]\s*(\d{4})\s*[-–_/ ]\s*(\d{1,6})\b/);
  return m ? `${m[1]}-${m[2]}-${m[3].padStart(4, "0")}` : text;
}

/** A number cell as text (Excel keeps 1003 as "1003.0"). */
const plain = (text: string) => text.replace(/^(\d+)\.0+$/, "$1");

export type ImportReading = {
  letters: PastLetter[];
  /** Rows with no title and no number (left out). */
  incomplete: number;
  /** Headings that were recognised, for the result message. */
  columns: number;
};

/**
 * Reads the old register's rows. `branch` is used where an outgoing number
 * doesn't name its branch (ABH/KHA), and for incoming mail.
 */
export function readPastLetters(rows: string[][], kind: ArchiveKind, branch: string): ImportReading {
  // The heading row: the first of the top rows with at least two known columns.
  let headerIndex = -1;
  let columns: (Field | null)[] = [];
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    // A column takes its field only if no column before it already has.
    const used = new Set<Field>();
    const unique = rows[i].map((heading) => {
      const f = fieldOf(heading);
      if (!f || f === "ignore" || used.has(f)) return null;
      used.add(f);
      return f;
    });
    if (used.size >= 2) {
      headerIndex = i;
      columns = unique;
      break;
    }
  }
  if (headerIndex === -1) throw new Error("no-headings");

  const col = (field: Field) => columns.indexOf(field);
  const body = rows.slice(headerIndex + 1).filter((r) => r.some((c) => c));
  const order = detectOrder(body.flatMap((r) => [r[col("letterDate")] ?? "", r[col("timestamp")] ?? ""]));
  const prefixes = Object.entries(ARCHIVE_BRANCHES);

  const letters: PastLetter[] = [];
  let incomplete = 0;
  for (const row of body.slice(0, 5000)) {
    const get = (field: Field) => {
      const i = col(field);
      return i === -1 ? "" : (row[i] ?? "").trim();
    };
    const title = (get("title") || get("letterType")).slice(0, 300);
    const rawNumber = get("number");
    if (!title && !rawNumber) {
      incomplete++;
      continue;
    }
    const stamp = parseDate(get("timestamp"), order);
    const date = parseDate(get("letterDate"), order);
    const letterDate = date?.day ?? (get("letterDate").slice(0, 40) || stamp?.day || "");
    const createdAt =
      isoAt(stamp?.day, stamp?.time) ?? isoAt(date?.day) ?? new Date().toISOString();
    const fileCell = get("file");
    const link = fileCell.match(/https?:\/\/\S+?(?=[\s,]|$)/)?.[0];
    const driveFileId = link ? driveIdFromLink(link) || undefined : undefined;

    const letter: PastLetter = {
      kind,
      branch,
      department: get("department").slice(0, 120),
      title,
      letterDate,
      createdAt,
      driveLink: link,
      driveFileId,
      // Some old rows have only the file's name, no link.
      fileName: link ? "" : fileCell.slice(0, 200),
    };
    if (kind === "outgoing") {
      letter.number = tidyNumber(rawNumber).slice(0, 40) || undefined;
      letter.employeeNo = plain(get("employeeNo")).slice(0, 40) || undefined;
      letter.letterType = get("letterType").slice(0, 120) || undefined;
      const prefix = letter.number?.split("-")[0];
      const match = prefixes.find(([, p]) => p === prefix);
      if (match) letter.branch = match[0];
    } else {
      letter.party = get("party").slice(0, 200) || undefined;
      letter.letterNo = plain(digits(rawNumber)).slice(0, 60) || undefined;
    }
    letters.push(letter);
  }
  return { letters, incomplete, columns: columns.filter((c) => c && c !== "ignore").length };
}
