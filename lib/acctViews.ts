// The accounting tabs' figures, from what the robot stored: trial balances,
// account statements, the unposted list, the chart and the mapping, plus
// the PMS revenue for the reconciliation. Actual only: missing data is
// reported as missing, differences are shown, nothing is adjusted.

import { MODEL_BS, MODEL_PNL, PNL_SUBTOTALS, subtotal, type BsLine } from "./financeModel";
import { lineOf, type Mapping } from "./acctMapping";
import { tbFor, buildPnl, type Pnl } from "./acctPnl";
import type { Account, AcctBasis, AcctBranch, Statement, StLine, TbFile, TbMonth, Unposted } from "./acct";

const round2 = (n: number) => Math.round(n * 100) / 100;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400_000);

/** The latest stored trial balance of the year for a branch and basis (closing balances as of its last day). */
export function latestTb(tb: Record<string, TbMonth | null>, branch: AcctBranch, basis: AcctBasis): TbFile | undefined {
  for (const month of Object.keys(tb).sort().reverse()) {
    const file = tbFor(tb[month], branch, basis);
    if (file) return file;
  }
  return undefined;
}

const nameOf = (code: string, chart: Map<string, Account>, fallback = "") => chart.get(code)?.ar || chart.get(code)?.en || fallback;

// --- المركز المالي ---

export type BsRow = { line: BsLine; amount: number; y2025: number; y2026: number };
export type BalanceSheet = {
  asOf?: string;
  assets: BsRow[];
  liabilities: BsRow[];
  equity: BsRow[];
  /** This year's profit so far (the P&L accounts' balances), part of equity until the year is closed. */
  yearProfit: number;
  totals: { assets: number; liabilities: number; equity: number };
  /** Assets − (liabilities + equity): shown as it is, never adjusted. */
  difference: number;
  unmapped: { code: string; name: string; amount: number }[];
};

const ASSETS: BsLine[] = ["fixedAssets", "inventory", "receivables", "prepaid", "cash"];
const LIABILITIES: BsLine[] = ["murabaha", "severance", "payables", "accrued", "fixedAssetSuppliers", "zakatProvision", "relatedParties"];
const EQUITY: BsLine[] = ["shareCapital", "statutoryReserves", "retainedEarnings"];

export function balanceSheet(file: TbFile | undefined, chart: Map<string, Account>, mapping: Mapping): BalanceSheet {
  const sums: Partial<Record<BsLine, number>> = {};
  const unmapped: BalanceSheet["unmapped"] = [];
  let yearProfit = 0;
  for (const r of file?.rows ?? []) {
    if (/^[45]/.test(r.code)) {
      yearProfit += -r.close; // credit balances are profit
      continue;
    }
    if (!r.close) continue;
    const line = lineOf(r.code, mapping, chart.has(r.code) ? chart : new Map([[r.code, { code: r.code, parent: "", en: r.name, ar: r.name, nature: "", type: "", path: "", hidden: false }]]));
    if (!line || !MODEL_BS.some((m) => m.line === line)) {
      unmapped.push({ code: r.code, name: nameOf(r.code, chart, r.name), amount: round2(r.close) });
      continue;
    }
    // Assets are debit balances (+); liabilities and equity credit balances, shown positive.
    const sign = ASSETS.includes(line as BsLine) ? 1 : -1;
    sums[line as BsLine] = (sums[line as BsLine] ?? 0) + sign * r.close;
  }
  const row = (line: BsLine): BsRow => {
    const m = MODEL_BS.find((x) => x.line === line)!;
    return { line, amount: round2(sums[line] ?? 0), y2025: m.y2025, y2026: m.y2026 };
  };
  const assets = ASSETS.map(row);
  const liabilities = LIABILITIES.map(row);
  const equity = EQUITY.map(row);
  const sum = (rows: BsRow[]) => round2(rows.reduce((s, r) => s + r.amount, 0));
  const totals = { assets: sum(assets), liabilities: sum(liabilities), equity: round2(sum(equity) + yearProfit) };
  return {
    asOf: file?.to,
    assets,
    liabilities,
    equity,
    yearProfit: round2(yearProfit),
    totals,
    difference: round2(totals.assets - totals.liabilities - totals.equity),
    unmapped,
  };
}

// --- النقدية والبنوك ---

export type CashView = {
  asOf?: string;
  banks: { code: string; name: string; balance: number; inMonth: number; outMonth: number; source: "statement" | "trial balance" }[];
  total: number;
  /** End-of-day total of the bank accounts with statements, last 60 days. */
  daily: { date: string; balance: number }[];
  topPayments: { month: { date: string; code: string; desc: string; amount: number }[]; year: { date: string; code: string; desc: string; amount: number }[] };
};

/** A statement's balance at the end of each day (opening + debits − credits). */
function dailyBalances(st: Statement): Map<string, number> {
  const out = new Map<string, number>();
  let bal = st.opening;
  for (const l of [...st.lines].sort((a, b) => a.date.localeCompare(b.date))) {
    bal += l.dr - l.cr;
    out.set(l.date, round2(bal));
  }
  return out;
}

export function cashView(statements: Statement[], file: TbFile | undefined, chart: Map<string, Account>, upTo: string): CashView {
  const banks: CashView["banks"] = [];
  const stByCode = new Map(statements.filter((s) => s.code.startsWith("1102")).map((s) => [s.code, s]));
  const month = upTo.slice(0, 7);
  const codes = new Set<string>([...stByCode.keys(), ...(file?.rows ?? []).filter((r) => r.code.startsWith("1102")).map((r) => r.code)]);
  for (const code of [...codes].sort()) {
    const st = stByCode.get(code);
    const tbRow = file?.rows.find((r) => r.code === code);
    if (st) {
      const days = dailyBalances(st);
      const last = [...days.keys()].sort().pop();
      const inMonth = st.lines.filter((l) => l.date.startsWith(month)).reduce((s, l) => s + l.dr, 0);
      const outMonth = st.lines.filter((l) => l.date.startsWith(month)).reduce((s, l) => s + l.cr, 0);
      banks.push({ code, name: nameOf(code, chart, tbRow?.name), balance: last ? days.get(last)! : st.opening, inMonth: round2(inMonth), outMonth: round2(outMonth), source: "statement" });
    } else if (tbRow) {
      banks.push({ code, name: nameOf(code, chart, tbRow.name), balance: tbRow.close, inMonth: 0, outMonth: 0, source: "trial balance" });
    }
  }
  // The daily total: each bank's last known balance carried forward.
  const start = new Date(Date.parse(`${upTo}T00:00:00Z`) - 59 * 86400_000).toISOString().slice(0, 10);
  const series = [...stByCode.values()].map((st) => ({ st, days: dailyBalances(st) }));
  const daily: CashView["daily"] = [];
  for (let d = start; d <= upTo; d = new Date(Date.parse(`${d}T00:00:00Z`) + 86400_000).toISOString().slice(0, 10)) {
    let total = 0;
    for (const { st, days } of series) {
      let bal = st.opening;
      for (const [day, b] of days) if (day <= d) bal = b;
      total += bal;
    }
    if (series.length) daily.push({ date: d, balance: round2(total) });
  }
  const payments = [...stByCode.values()].flatMap((st) => st.lines.filter((l) => l.cr > 0).map((l) => ({ date: l.date, code: st.code, desc: l.desc, amount: l.cr })));
  const top = (rows: typeof payments) => rows.sort((a, b) => b.amount - a.amount).slice(0, 10);
  return {
    asOf: statements.length ? statements.map((s) => s.to).sort().pop() : file?.to,
    banks,
    total: round2(banks.reduce((s, b) => s + b.balance, 0)),
    daily,
    topPayments: { month: top(payments.filter((p) => p.date.startsWith(month))), year: top(payments) },
  };
}

// --- الذمم ---

export type Aging = { b0: number; b31: number; b61: number; b91: number };
export type ArApGroup = { code: string; name: string; balance: number; aging: Aging | null };
export type ArApView = {
  asOf?: string;
  receivables: ArApGroup[];
  payables: ArApGroup[];
  totals: { receivables: number; payables: number; arAging: Aging; apAging: Aging };
  /** Days sales outstanding / days payables outstanding (90-day basis), null when the basis is missing. */
  dso: number | null;
  dpo: number | null;
  basis: { creditSales90: number; creditPurchases90: number };
};

/**
 * Ages an open balance first-in-first-out: the balance is made of the most
 * recent increases (debits for receivables, credits for payables).
 */
export function ageBalance(lines: StLine[], balance: number, side: "dr" | "cr", asOf: string): Aging {
  const aging: Aging = { b0: 0, b31: 0, b61: 0, b91: 0 };
  let left = Math.max(0, balance);
  for (const l of [...lines].sort((a, b) => b.date.localeCompare(a.date))) {
    if (left <= 0) break;
    const inc = side === "dr" ? l.dr : l.cr;
    if (inc <= 0) continue;
    const take = Math.min(inc, left);
    left -= take;
    const age = daysBetween(l.date, asOf);
    if (age <= 30) aging.b0 += take;
    else if (age <= 60) aging.b31 += take;
    else if (age <= 90) aging.b61 += take;
    else aging.b91 += take;
  }
  // Older than this year's statement (the opening balance).
  aging.b91 += left;
  return { b0: round2(aging.b0), b31: round2(aging.b31), b61: round2(aging.b61), b91: round2(aging.b91) };
}

const isReceivable = (code: string) => /^110[3-9]/.test(code);
const isPayable = (code: string, name: string) => /^210[2-9]/.test(code) || /doctor comm|technicians comm|عمولة|عمولات/i.test(name);

export function arApView(statements: Statement[], file: TbFile | undefined, chart: Map<string, Account>, upTo: string): ArApView {
  const st = new Map(statements.map((s) => [s.code, s]));
  const from90 = new Date(Date.parse(`${upTo}T00:00:00Z`) - 89 * 86400_000).toISOString().slice(0, 10);
  const groups = (pick: (code: string, name: string) => boolean, sign: 1 | -1, side: "dr" | "cr") =>
    (file?.rows ?? [])
      .filter((r) => pick(r.code, nameOf(r.code, chart, r.name)) && Math.abs(r.close) >= 0.5)
      .map((r) => {
        const balance = round2(sign * r.close);
        const s = st.get(r.code);
        return { code: r.code, name: nameOf(r.code, chart, r.name), balance, aging: s ? ageBalance(s.lines, balance, side, upTo) : null };
      })
      .sort((a, b) => b.balance - a.balance);
  const receivables = groups(isReceivable, 1, "dr");
  const payables = groups(isPayable, -1, "cr");
  const sumAging = (rows: ArApGroup[]): Aging =>
    rows.reduce((a, r) => (r.aging ? { b0: a.b0 + r.aging.b0, b31: a.b31 + r.aging.b31, b61: a.b61 + r.aging.b61, b91: a.b91 + r.aging.b91 } : a), { b0: 0, b31: 0, b61: 0, b91: 0 });
  const recent = (codes: string[], side: "dr" | "cr") =>
    codes.reduce((s, c) => s + (st.get(c)?.lines.filter((l) => l.date >= from90 && l.date <= upTo).reduce((t, l) => t + l[side], 0) ?? 0), 0);
  const totals = {
    receivables: round2(receivables.reduce((s, r) => s + r.balance, 0)),
    payables: round2(payables.reduce((s, r) => s + r.balance, 0)),
    arAging: sumAging(receivables),
    apAging: sumAging(payables),
  };
  const creditSales90 = round2(recent(receivables.map((r) => r.code), "dr"));
  const creditPurchases90 = round2(recent(payables.map((r) => r.code), "cr"));
  return {
    asOf: file?.to,
    receivables,
    payables,
    totals,
    dso: creditSales90 > 0 ? Math.round((totals.receivables / creditSales90) * 90) : null,
    dpo: creditPurchases90 > 0 ? Math.round((totals.payables / creditPurchases90) * 90) : null,
    basis: { creditSales90, creditPurchases90 },
  };
}

// --- التمويل ---

export type Maturity = { date: string; amount: number };
export type FinancingView = {
  asOf?: string;
  balance: number;
  opening: number;
  drawn: number;
  repaid: number;
  financeCostYtd: number;
  current: number;
  nonCurrent: number;
  maturities: Maturity[];
  /** Trailing 12 months EBITDA: this year's actual months + the model's 2025H for the rest (labelled). */
  ebitdaTtm: number;
  ttmActualMonths: number;
  debtToEbitda: number | null;
  hasStatement: boolean;
};

export function financingView(statements: Statement[], file: TbFile | undefined, pnl: Pnl, maturities: Maturity[], upTo: string): FinancingView {
  const loans = statements.filter((s) => s.code.startsWith("2201"));
  const tbLoans = (file?.rows ?? []).filter((r) => r.code.startsWith("2201"));
  // The statement (opening + this year's movements) when there is one, else the trial balance.
  const balance = round2(
    loans.length ? loans.reduce((s, st) => s + -(st.opening + st.lines.reduce((t, l) => t + l.dr - l.cr, 0)), 0) : -tbLoans.reduce((s, r) => s + r.close, 0),
  ) || 0;
  const opening = round2(loans.length ? -loans.reduce((s, st) => s + st.opening, 0) : -tbLoans.reduce((s, r) => s + r.open, 0));
  const drawn = round2(loans.reduce((s, st) => s + st.lines.reduce((t, l) => t + l.cr, 0), 0));
  const repaid = round2(loans.reduce((s, st) => s + st.lines.reduce((t, l) => t + l.dr, 0), 0));
  const in12 = new Date(Date.parse(`${upTo}T00:00:00Z`) + 365 * 86400_000).toISOString().slice(0, 10);
  const upcoming = maturities.filter((m) => m.date > upTo).sort((a, b) => a.date.localeCompare(b.date));
  const current = round2(Math.min(balance, upcoming.filter((m) => m.date <= in12).reduce((s, m) => s + m.amount, 0)));
  const ebitdaSub = PNL_SUBTOTALS.find((s) => s.key === "ebitda")!;
  const actualMonths = pnl.months.filter((m) => !m.missing);
  const covered = actualMonths.reduce((s, m) => s + m.coverage, 0);
  const actual = subtotal(pnl.ytd, ebitdaSub);
  const model2025 = subtotal(Object.fromEntries(MODEL_PNL.map((m) => [m.line, m.y2025])), ebitdaSub);
  const ebitdaTtm = round2(actual + model2025 * Math.max(0, 12 - covered) / 12);
  return {
    asOf: file?.to,
    balance,
    opening,
    drawn,
    repaid,
    financeCostYtd: round2(-(pnl.ytd.financial ?? 0)),
    current,
    nonCurrent: round2(balance - current),
    maturities: upcoming,
    ebitdaTtm,
    ttmActualMonths: Math.round(covered * 10) / 10,
    debtToEbitda: ebitdaTtm > 0 ? Math.round((balance / ebitdaTtm) * 100) / 100 : null,
    hasStatement: loans.length > 0,
  };
}

// --- التنبيهات والمطابقة ---

export type AlertsView = {
  asOf?: string;
  unposted: (Unposted & { age: number })[];
  overdue: (Unposted & { age: number })[];
  /** The not-posted entries' effect per P&L line this year (with-not-posted minus posted-only). */
  unpostedImpact: { revenue: number; expenses: number };
  recon: { month: string; pms: number | null; accounting: number | null; diff: number | null; pct: number | null; flagged: boolean }[];
};

export function alertsView(args: {
  unposted: { asOf: string; items: Unposted[] } | null;
  posted: Pnl;
  withUnposted: Pnl;
  pmsRevenue: Record<string, number>;
  threshold: number;
}): AlertsView {
  const asOf = args.unposted?.asOf;
  const items = (args.unposted?.items ?? []).map((u) => ({ ...u, age: asOf ? daysBetween(u.date, asOf) : 0 })).sort((a, b) => b.age - a.age);
  const rev = (p: Pnl) => p.ytd.revenue ?? 0;
  const exp = (p: Pnl) => Object.entries(p.ytd).filter(([k]) => k !== "revenue" && k !== "otherIncome").reduce((s, [, v]) => s + (v ?? 0), 0);
  const recon = args.withUnposted.months.map((m) => {
    const pms = m.month in args.pmsRevenue ? round2(args.pmsRevenue[m.month]) : null;
    const accounting = m.missing ? null : round2(m.values.revenue ?? 0);
    const diff = accounting === null || pms === null ? null : round2(accounting - pms);
    const pct = diff === null || !pms ? null : diff / pms;
    return { month: m.month, pms, accounting, diff, pct, flagged: pct !== null && Math.abs(pct) > args.threshold };
  });
  return {
    asOf,
    unposted: items,
    overdue: items.filter((u) => u.age > 7),
    unpostedImpact: { revenue: round2(rev(args.withUnposted) - rev(args.posted)), expenses: round2(exp(args.withUnposted) - exp(args.posted)) },
    recon,
  };
}

export { buildPnl };
