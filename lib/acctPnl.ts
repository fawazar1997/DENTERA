// The income statement from the trial balances: each month's movement per
// model line (actual only, never estimated), with the financial model's
// 2026F (budget) and 2025H (last year) over the same period for comparison.

import { MODEL_PNL, PNL_SUBTOTALS, subtotal, type PnlLine } from "./financeModel";
import { isPnlCode, lineOf, type Mapping } from "./acctMapping";
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
};

export type Pnl = {
  year: string;
  branch: AcctBranch;
  basis: AcctBasis;
  months: PnlMonth[];
  ytd: PnlValues;
  budget: PnlValues;
  lastYear: PnlValues;
  /** Accounts with movement that are on no line (code, name, amount). */
  unmapped: { code: string; name: string; amount: number }[];
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
  for (const r of rows) {
    if (!isPnlCode(r.code)) continue;
    const amount = r.cr - r.dr;
    if (!amount) continue;
    const line = lineOf(r.code, mapping, chart);
    if (!line || !MODEL_PNL.some((m) => m.line === line)) {
      unmapped.push({ code: r.code, name: r.name, amount: round2(amount) });
      continue;
    }
    values[line as PnlLine] = round2((values[line as PnlLine] ?? 0) + amount);
  }
  return { values, unmapped };
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
}): Pnl {
  const chart = new Map(args.chart.map((a) => [a.code, a]));
  const lastMonth = args.upTo.slice(0, 4) === args.year ? args.upTo.slice(0, 7) : `${args.year}-12`;
  const months: PnlMonth[] = [];
  const ytd: PnlValues = {};
  const budget: PnlValues = {};
  const lastYear: PnlValues = {};
  const unmapped = new Map<string, { code: string; name: string; amount: number }>();
  let importedAt: string | undefined;
  for (let m = 1; m <= Number(lastMonth.slice(5, 7)); m++) {
    const month = `${args.year}-${String(m).padStart(2, "0")}`;
    const file = tbFor(args.tb[month], args.branch, args.basis);
    if (!file) {
      months.push({ month, missing: true, partial: false, values: {}, balanced: true, coverage: 0 });
      continue;
    }
    const covered = Math.min(daysIn(month), Number(file.to.slice(8, 10)) - Number(file.from.slice(8, 10)) + 1);
    const coverage = Math.max(0, covered) / daysIn(month);
    const { values, unmapped: um } = pnlOf(file.rows, args.mapping, chart);
    const dr = file.rows.reduce((s, r) => s + r.dr, 0);
    const cr = file.rows.reduce((s, r) => s + r.cr, 0);
    months.push({ month, missing: false, partial: coverage < 1, from: file.from, to: file.to, values, balanced: Math.abs(dr - cr) < 0.01, coverage });
    for (const [line, v] of Object.entries(values)) ytd[line as PnlLine] = round2((ytd[line as PnlLine] ?? 0) + (v ?? 0));
    for (const row of MODEL_PNL) {
      budget[row.line] = round2((budget[row.line] ?? 0) + (row.y2026 / 12) * coverage);
      lastYear[row.line] = round2((lastYear[row.line] ?? 0) + (row.y2025 / 12) * coverage);
    }
    for (const u of um) {
      const s = unmapped.get(u.code);
      unmapped.set(u.code, s ? { ...s, amount: round2(s.amount + u.amount) } : u);
    }
    if (!importedAt || file.importedAt > importedAt) importedAt = file.importedAt;
  }
  return { year: args.year, branch: args.branch, basis: args.basis, months, ytd, budget, lastYear, unmapped: [...unmapped.values()].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)), importedAt };
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
