// Microchips Accounting data for the financial dashboard: the trial balance
// (per month, per branch, posted only or with the not-posted entries) and
// the chart of accounts. Read from the robot's exports; nothing is ever
// changed in the accounting system, and differences are shown, not fixed.

import { readPrivateFile, putPrivateFile } from "./privateBlob";

export type AcctBranch = "abha" | "khamis" | "all";
/** «posted»: posted entries only; «all»: posted and not posted. */
export type AcctBasis = "posted" | "all";

/** One account of a trial balance. Opening and closing are signed (debit +, credit −). */
export type TbRow = { code: string; name: string; open: number; dr: number; cr: number; close: number };

export type TbFile = { from: string; to: string; rows: TbRow[]; importedAt: string };
/** A month's trial balances, keyed «branch|basis». */
export type TbMonth = Partial<Record<`${AcctBranch}|${AcctBasis}`, TbFile>>;

export type Account = { code: string; parent: string; en: string; ar: string; nature: string; type: string; path: string; hidden: boolean };
export type Chart = { accounts: Account[]; importedAt: string };

const key = (v: unknown) => String(v ?? "").toLowerCase().replace(/[\s_.\-/()#]+/g, "");

/** «1,234.50», «(1,234.50)», «-1234.5» → number. */
export function amount(text: unknown): number {
  const t = String(text ?? "").replace(/[,\s ]/g, "").replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  if (!t) return 0;
  const negative = /^\(.*\)$/.test(t) || /^-/.test(t) || /-$/.test(t);
  const n = Number(t.replace(/[()\-]/g, ""));
  return Number.isFinite(n) ? (negative ? -n : n) : 0;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The trial balance export: «Account No | Account Name | Opening Balance |
 * Transactions | Final Balance», each group either one signed column or
 * split into Debit | Credit on the title row below.
 */
export function parseTrialBalance(table: string[][]): TbRow[] {
  const h = table.findIndex((r) => r.some((c) => /^(accountno|accountnumber|accountcode|رقمالحساب)$/.test(key(c))));
  if (h < 0) return [];
  const head = table[h].map(key);
  const sub = (table[h + 1] ?? []).map(key);
  const hasSub = sub.some((c) => /^(debit|مدين)$/.test(c)) && sub.some((c) => /^(credit|دائن)$/.test(c));
  const codeCol = head.findIndex((c) => /^(accountno|accountnumber|accountcode|رقمالحساب)$/.test(c));
  const nameCol = head.findIndex((c) => /^(accountname|اسمالحساب|الحساب)$/.test(c));
  const groupAt = (re: RegExp) => head.findIndex((c) => re.test(c));
  const starts = [
    groupAt(/^(openingbalance|opening|الرصيدالافتتاحي|افتتاحي)/),
    groupAt(/^(transactions|movements|الحركة|الحركات)/),
    groupAt(/^(finalbalance|closingbalance|closing|الرصيدالختامي|ختامي)/),
  ];
  // Debit and credit columns of a group: on the row below, from the group's
  // first column up to the next group.
  const pair = (g: number): [number, number] => {
    const start = starts[g];
    if (start < 0) return [-1, -1];
    if (!hasSub) return [start, -1];
    const end = starts.filter((s) => s > start).sort((a, b) => a - b)[0] ?? Math.max(head.length, sub.length);
    let dr = -1;
    let cr = -1;
    for (let i = start; i < end; i++) {
      if (dr < 0 && /^(debit|مدين)$/.test(sub[i] ?? "")) dr = i;
      if (cr < 0 && /^(credit|دائن)$/.test(sub[i] ?? "")) cr = i;
    }
    return [dr, cr];
  };
  const [oDr, oCr] = pair(0);
  const [mDr, mCr] = pair(1);
  const [cDr, cCr] = pair(2);
  const at = (r: string[], i: number) => (i >= 0 ? amount(r[i]) : 0);
  const rows: TbRow[] = [];
  for (const r of table.slice(h + (hasSub ? 2 : 1))) {
    const code = String(r[codeCol] ?? "").trim();
    if (!/^\d[\d-]*$/.test(code)) continue; // totals and blank rows
    const open = hasSub ? at(r, oDr) - at(r, oCr) : at(r, oDr);
    const close = hasSub ? at(r, cDr) - at(r, cCr) : at(r, cDr);
    // One signed movement column: debit when positive.
    const move = hasSub ? null : at(r, mDr);
    rows.push({
      code,
      name: String(r[nameCol] ?? "").trim(),
      open: round2(open),
      dr: round2(move === null ? at(r, mDr) : Math.max(0, move)),
      cr: round2(move === null ? at(r, mCr) : Math.max(0, -move)),
      close: round2(close),
    });
  }
  return rows;
}

/** The chart of accounts export (Account Code | Parent Account | English Name | Arabic Name | Nature | … | Full Path). */
export function parseChart(table: string[][]): Account[] {
  const h = table.findIndex((r) => r.some((c) => key(c) === "accountcode"));
  if (h < 0) return [];
  const head = table[h].map(key);
  const col = (...names: string[]) => head.findIndex((c) => names.includes(c));
  const c = {
    code: col("accountcode"),
    parent: col("parentaccount", "parent"),
    en: col("englishname", "nameen"),
    ar: col("arabicname", "namear"),
    nature: col("nature"),
    type: col("accounttype", "type"),
    path: col("fullpath", "path"),
    hidden: col("hidden"),
  };
  const get = (r: string[], i: number) => (i >= 0 ? String(r[i] ?? "").trim() : "");
  return table
    .slice(h + 1)
    .filter((r) => /^\d[\d-]*$/.test(get(r, c.code)))
    .map((r) => ({
      code: get(r, c.code),
      // «1102 - Banks» → «1102».
      parent: (get(r, c.parent).match(/^\d[\d-]*/) ?? [""])[0],
      en: get(r, c.en),
      ar: get(r, c.ar),
      nature: get(r, c.nature),
      type: get(r, c.type),
      path: get(r, c.path),
      hidden: /^(yes|true|1|نعم)$/i.test(get(r, c.hidden)),
    }));
}

/** What a trial balance adds up to (for the robot's check and the balance test). */
export function tbTotals(rows: TbRow[]) {
  const sum = (f: (r: TbRow) => number) => round2(rows.reduce((s, r) => s + f(r), 0));
  return { rows: rows.length, dr: sum((r) => r.dr), cr: sum((r) => r.cr), open: sum((r) => r.open), close: sum((r) => r.close) };
}

// --- Storage (private Blob, next to finance/) ---

async function readJson<T>(path: string): Promise<T | null> {
  const bytes = await readPrivateFile(path).catch(() => null);
  if (!bytes) return null;
  try {
    return JSON.parse(Buffer.from(bytes).toString("utf-8")) as T;
  } catch {
    return null;
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await putPrivateFile(path, new TextEncoder().encode(JSON.stringify(value)), "application/json");
}

export const readTbMonth = (month: string) => readJson<TbMonth>(`acct/tb/${month}.json`);
export const readChart = () => readJson<Chart>("acct/chart.json");

/** Stores one trial balance (replacing the same month, branch and basis); returns what is now stored. */
export async function saveTrialBalance(month: string, branch: AcctBranch, basis: AcctBasis, file: TbFile) {
  const data = (await readTbMonth(month)) ?? {};
  data[`${branch}|${basis}`] = file;
  await writeJson(`acct/tb/${month}.json`, data);
  const stored = (await readTbMonth(month))?.[`${branch}|${basis}`];
  return tbTotals(stored?.rows ?? []);
}

export async function saveChart(accounts: Account[]) {
  await writeJson("acct/chart.json", { accounts, importedAt: new Date().toISOString() } satisfies Chart);
  return (await readChart())?.accounts.length ?? 0;
}

// --- Account mapping (Settings) ---

export const readMapping = async () => (await readJson<Record<string, string>>("acct/mapping.json")) ?? {};
export const saveMapping = (mapping: Record<string, string>) => writeJson("acct/mapping.json", mapping);

/** Every stored trial balance of a year, by month. */
export async function readTbYear(year: string): Promise<Record<string, TbMonth | null>> {
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  const files = await Promise.all(months.map((m) => readTbMonth(m)));
  return Object.fromEntries(months.map((m, i) => [m, files[i]]));
}
