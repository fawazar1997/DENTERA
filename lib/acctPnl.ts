// The income statement from the trial balances: each month's movement per
// model line (actual only, never estimated), with the financial model's
// 2026F (budget) and 2025H (last year) over the same period for comparison.

import { MODEL_PNL, PNL_SUBTOTALS, subtotal, type PnlLine } from "./financeModel";
import { isPnlCode, lineOf, type Mapping } from "./acctMapping";
import { norm } from "./acctRules";
import type { Account, AcctBasis, AcctBranch, TbFile, TbMonth, TbRow } from "./acct";

export type PnlValues = Partial<Record<PnlLine, number>>;

export type PnlMonth = {
  month: string;
  /** No trial balance stored for this month yet («لم يُسجَّل بعد»). */
  missing: boolean;
  /** The trial balance covers only part of the month («شهر غير مكتمل»). */
  partial: boolean;
  from?: string;
  to?: string;
  values: PnlValues;
  /** Debits equal credits in this trial balance (shown, never adjusted). */
  balanced: boolean;
  /** Share of the month covered (for prorating the model), 0–1. */
  coverage: number;
  /** The books look closed: commissions at their usual level and depreciation booked (after spreading). */
  closed: boolean;
  /** For the monthly table: depreciation booked once for several months spread over them. */
  display: PnlValues;
  /** Estimated costs not yet booked in an unclosed month (shown apart, never added to actual). */
  estimate: PnlValues;
};

export type Pnl = {
  year: string;
  branch: AcctBranch;
  basis: AcctBasis;
  months: PnlMonth[];
  ytd: PnlValues;
  budget: PnlValues;
  lastYear: PnlValues;
  /** Where «last year» comes from: the 2025 trial balances (actual), the financial model, or both. */
  lastYearSource: "actual" | "model" | "mixed";
  /** Accounts with movement that are on no line (code, name, amount). */
  unmapped: { code: string; name: string; amount: number }[];
  /** The estimated costs of the unclosed months, year to date (negative). */
  ytdEstimate: PnlValues;
  /** The checks against the trial balance (sums of the accounts themselves). */
  check: {
    /** 51xx accounts in the trial balance (credit − debit, so negative) vs what the lines carry from them. */
    tb51: number;
    lines51: number;
    /** Every income-statement account (4 and 5) vs the sum of the lines: the profit or loss. */
    tbNet: number;
    linesNet: number;
  };
  importedAt?: string;
};

const daysIn = (month: string) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
const round2 = (n: number) => Math.round(n * 100) / 100;

/** The file for a branch and basis; the whole clinic is the two branches together when no consolidated export is stored. */
export function tbFor(month: TbMonth | null | undefined, branch: AcctBranch, basis: AcctBasis): TbFile | undefined {
  if (!month) return undefined;
  const own = month[`${branch}|${basis}`];
  if (own || branch !== "all") return own;
  const a = month[`abha|${basis}`];
  const k = month[`khamis|${basis}`];
  if (!a || !k) return undefined;
  const byCode = new Map<string, TbRow>();
  for (const r of [...a.rows, ...k.rows]) {
    const s = byCode.get(r.code);
    if (s) byCode.set(r.code, { ...s, open: s.open + r.open, dr: s.dr + r.dr, cr: s.cr + r.cr, close: s.close + r.close });
    else byCode.set(r.code, { ...r });
  }
  return { from: a.from < k.from ? a.from : k.from, to: a.to < k.to ? a.to : k.to, rows: [...byCode.values()], importedAt: a.importedAt < k.importedAt ? a.importedAt : k.importedAt };
}

/** A trial balance's P&L per line: revenue positive, expenses negative (the model's signs). */
export function pnlOf(rows: TbRow[], mapping: Mapping, chart: Map<string, Account>) {
  const values: PnlValues = {};
  const unmapped: { code: string; name: string; amount: number }[] = [];
  const sums = { tb51: 0, lines51: 0, tbNet: 0, linesNet: 0 };
  for (const r of rows) {
    if (!isPnlCode(r.code)) continue;
    const amount = r.cr - r.dr;
    if (!amount) continue;
    const is51 = norm(r.code).startsWith("51");
    sums.tbNet += amount;
    if (is51) sums.tb51 += amount;
    // The chart's names, else the trial balance's own account name.
    const line = lineOf(r.code, mapping, chart.has(r.code) ? chart : new Map([[r.code, { code: r.code, parent: "", en: r.name, ar: r.name, nature: "", type: "", path: "", hidden: false }]]));
    if (!line || !MODEL_PNL.some((m) => m.line === line)) {
      unmapped.push({ code: r.code, name: r.name, amount: round2(amount) });
      continue;
    }
    values[line as PnlLine] = round2((values[line as PnlLine] ?? 0) + amount);
    sums.linesNet += amount;
    if (is51) sums.lines51 += amount;
  }
  return { values, unmapped, sums };
}

/** Lines estimated from their share of revenue in closed months; the others from their monthly average. */
const RATIO_LINES: PnlLine[] = ["commissions", "materials", "labs"];
const AVERAGE_LINES: PnlLine[] = ["personnel", "ga", "depreciation"];

/**
 * Depreciation booked once for several months (e.g. September for January
 * to September) spread evenly over those months, for the monthly view only.
 */
function spreadDepreciation(months: PnlMonth[]) {
  let pending: PnlMonth[] = [];
  for (const m of months) {
    if (m.missing) continue;
    const dep = m.values.depreciation ?? 0;
    if (!dep) {
      pending.push(m);
      continue;
    }
    const share = round2(dep / (pending.length + 1));
    for (const p of [...pending, m]) p.display = { ...p.display, depreciation: share };
    pending = [];
  }
}

/** Marks unclosed months and estimates their missing costs from the closed ones. */
function estimateUnclosed(months: PnlMonth[]) {
  const present = months.filter((m) => !m.missing && m.coverage > 0);
  const perFull = (m: PnlMonth, line: PnlLine) => Math.abs(m.display[line] ?? 0) / m.coverage;
  // Commissions' usual level: the months with depreciation (after spreading).
  const withDep = present.filter((m) => (m.display.depreciation ?? 0) !== 0);
  const base = (withDep.length ? withDep : present).map((m) => perFull(m, "commissions"));
  const avgComm = base.length ? base.reduce((a, b) => a + b, 0) / base.length : 0;
  for (const m of present) m.closed = (m.display.depreciation ?? 0) !== 0 && perFull(m, "commissions") >= 0.5 * avgComm;
  const closed = present.filter((m) => m.closed);
  if (!closed.length) return;
  const revClosed = closed.reduce((s, m) => s + (m.values.revenue ?? 0), 0);
  for (const m of present.filter((x) => !x.closed)) {
    const estimate: PnlValues = {};
    for (const line of [...RATIO_LINES, ...AVERAGE_LINES]) {
      const target = RATIO_LINES.includes(line)
        ? (revClosed ? closed.reduce((s, c) => s + (c.values[line] ?? 0), 0) / revClosed : 0) * (m.values.revenue ?? 0)
        : (closed.reduce((s, c) => s + (c.display[line] ?? 0) / c.coverage, 0) / closed.length) * m.coverage;
      // Costs are negative: only what is missing against the usual level is estimated.
      const missing = round2(Math.min(0, target - (m.values[line] ?? 0)));
      if (missing) estimate[line] = missing;
    }
    m.estimate = estimate;
  }
}

export function buildPnl(args: {
  year: string;
  branch: AcctBranch;
  basis: AcctBasis;
  /** Stored trial balances by month (YYYY-MM). */
  tb: Record<string, TbMonth | null>;
  chart: Account[];
  mapping: Mapping;
  /** The last day with data (yesterday, Riyadh). */
  upTo: string;
  /** Last year's stored trial balances by month (actual comparison when present). */
  prevTb?: Record<string, TbMonth | null>;
}): Pnl {
  let actualMonths = 0;
  let modelMonths = 0;
  const chart = new Map(args.chart.map((a) => [a.code, a]));
  const lastMonth = args.upTo.slice(0, 4) === args.year ? args.upTo.slice(0, 7) : `${args.year}-12`;
  const months: PnlMonth[] = [];
  const ytd: PnlValues = {};
  const budget: PnlValues = {};
  const lastYear: PnlValues = {};
  const unmapped = new Map<string, { code: string; name: string; amount: number }>();
  const check = { tb51: 0, lines51: 0, tbNet: 0, linesNet: 0 };
  let importedAt: string | undefined;
  for (let m = 1; m <= Number(lastMonth.slice(5, 7)); m++) {
    const month = `${args.year}-${String(m).padStart(2, "0")}`;
    const file = tbFor(args.tb[month], args.branch, args.basis);
    if (!file) {
      months.push({ month, missing: true, partial: false, values: {}, balanced: true, coverage: 0, closed: false, display: {}, estimate: {} });
      continue;
    }
    const covered = Math.min(daysIn(month), Number(file.to.slice(8, 10)) - Number(file.from.slice(8, 10)) + 1);
    const coverage = Math.max(0, covered) / daysIn(month);
    const { values, unmapped: um, sums } = pnlOf(file.rows, args.mapping, chart);
    check.tb51 += sums.tb51;
    check.lines51 += sums.lines51;
    check.tbNet += sums.tbNet;
    check.linesNet += sums.linesNet;
    const dr = file.rows.reduce((s, r) => s + r.dr, 0);
    const cr = file.rows.reduce((s, r) => s + r.cr, 0);
    months.push({ month, missing: false, partial: coverage < 1, from: file.from, to: file.to, values, balanced: Math.abs(dr - cr) < 0.5, coverage, closed: true, display: { ...values }, estimate: {} });
    for (const [line, v] of Object.entries(values)) ytd[line as PnlLine] = round2((ytd[line as PnlLine] ?? 0) + (v ?? 0));
    const prevMonth = `${Number(args.year) - 1}${month.slice(4)}`;
    const prevFile = tbFor(args.prevTb?.[prevMonth], args.branch, args.basis);
    const prevValues = prevFile ? pnlOf(prevFile.rows, args.mapping, chart).values : null;
    if (prevValues) actualMonths++;
    else modelMonths++;
    for (const row of MODEL_PNL) {
      budget[row.line] = round2((budget[row.line] ?? 0) + (row.y2026 / 12) * coverage);
      // The same period last year: its actual month when stored, else the model's share.
      const ly = prevValues ? (prevValues[row.line] ?? 0) * coverage : (row.y2025 / 12) * coverage;
      lastYear[row.line] = round2((lastYear[row.line] ?? 0) + ly);
    }
    for (const u of um) {
      const s = unmapped.get(u.code);
      unmapped.set(u.code, s ? { ...s, amount: round2(s.amount + u.amount) } : u);
    }
    if (!importedAt || file.importedAt > importedAt) importedAt = file.importedAt;
  }
  const lastYearSource = actualMonths && modelMonths ? "mixed" : actualMonths ? "actual" : "model";
  spreadDepreciation(months);
  estimateUnclosed(months);
  const ytdEstimate: PnlValues = {};
  for (const m of months) for (const [line, v] of Object.entries(m.estimate)) ytdEstimate[line as PnlLine] = round2((ytdEstimate[line as PnlLine] ?? 0) + (v ?? 0));
  const r2 = (n: number) => round2(n);
  return {
    year: args.year,
    branch: args.branch,
    basis: args.basis,
    months,
    ytd,
    budget,
    lastYear,
    lastYearSource,
    ytdEstimate,
    check: { tb51: r2(check.tb51), lines51: r2(check.lines51), tbNet: r2(check.tbNet), linesNet: r2(check.linesNet) },
    unmapped: [...unmapped.values()].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)), importedAt };
}

/** Lines and subtotals in statement order, for the table. */
export const PNL_ROWS: ({ kind: "line"; key: PnlLine } | { kind: "sub"; key: string })[] = [
  { kind: "line", key: "revenue" },
  { kind: "line", key: "commissions" },
  { kind: "line", key: "materials" },
  { kind: "line", key: "labs" },
  { kind: "line", key: "otherOperating" },
  { kind: "sub", key: "grossMargin" },
  { kind: "line", key: "personnel" },
  { kind: "line", key: "ga" },
  { kind: "line", key: "otherIncome" },
  { kind: "line", key: "impairments" },
  { kind: "sub", key: "ebitda" },
  { kind: "line", key: "depreciation" },
  { kind: "sub", key: "ebit" },
  { kind: "line", key: "financial" },
  { kind: "sub", key: "ebt" },
  { kind: "line", key: "zakat" },
  { kind: "sub", key: "netIncome" },
];

/** A row's value: a line, or a subtotal of the lines before it. */
export function rowValue(values: PnlValues, row: (typeof PNL_ROWS)[number]): number {
  if (row.kind === "line") return values[row.key] ?? 0;
  const sub = PNL_SUBTOTALS.find((s) => s.key === row.key);
  return sub ? subtotal(values, sub) : 0;
}

/** The income statement as the dashboard shows it, from what is stored. */
export async function loadPnl(year: string, branch: AcctBranch, basis: AcctBasis, upTo: string): Promise<Pnl> {
  const { readTbYear, readChart, readMapping } = await import("./acct");
  const [tb, prevTb, chart, mapping] = await Promise.all([readTbYear(year), readTbYear(String(Number(year) - 1)), readChart(), readMapping()]);
  return buildPnl({ year, branch, basis, tb, prevTb, chart: chart?.accounts ?? [], mapping: mapping as Mapping, upTo });
}
