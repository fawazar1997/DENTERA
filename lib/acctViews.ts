// The accounting tabs' figures, from what the robot stored: trial balances,
// account statements, the unposted list, the chart and the mapping, plus
// the PMS revenue for the reconciliation. The balance sheet, receivables,
// payables and financing follow the clinic's account rules (lib/acctRules.ts).
// Actual figures; estimates only in their own column; differences are shown
// as they are, nothing is adjusted.

import { MODEL_BS, MODEL_PNL, PNL_SUBTOTALS, subtotal, type BsLine, type PnlLine } from "./financeModel";
import { tbFor, buildPnl, type Pnl, type PnlValues } from "./acctPnl";
import {
  ASSET_KEYS,
  COMMISSIONS,
  DOCTORS_ACCRUED,
  LAB_COSTS,
  LIABILITY_KEYS,
  MATERIALS,
  bsClass,
  isCash,
  isLabRevenue,
  isMurabaha,
  isReceivable,
  isSupplier,
  norm,
  pnlRule,
  ALLOWANCE,
  MURABAHA_CURRENT,
  MURABAHA_NONCURRENT,
  type BsKey,
} from "./acctRules";
import type { Account, AcctBasis, AcctBranch, Statement, StLine, TbFile, TbMonth, Unposted } from "./acct";

const round2 = (n: number) => Math.round(n * 100) / 100;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400_000);
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400_000).toISOString().slice(0, 10);

/** The latest stored trial balance of the year for a branch and basis (closing balances as of its last day). */
export function latestTb(tb: Record<string, TbMonth | null>, branch: AcctBranch, basis: AcctBasis): TbFile | undefined {
  for (const month of Object.keys(tb).sort().reverse()) {
    const file = tbFor(tb[month], branch, basis);
    if (file) return file;
  }
  return undefined;
}

/** The first stored trial balance of the year (its opening balances are the year's). */
export function firstTb(tb: Record<string, TbMonth | null>, branch: AcctBranch, basis: AcctBasis): TbFile | undefined {
  for (const month of Object.keys(tb).sort()) {
    const file = tbFor(tb[month], branch, basis);
    if (file) return file;
  }
  return undefined;
}

const nameOf = (code: string, chart: Map<string, Account>, fallback = "") => chart.get(code)?.ar || chart.get(code)?.en || fallback;

// --- المركز المالي ---

export type BsAccount = { code: string; name: string; amount: number; flag: boolean };
export type BsRow = { key: BsKey; amount: number; y2025: number | null; y2026: number | null; accounts: BsAccount[] };
export type BalanceSheet = {
  asOf?: string;
  assets: BsRow[];
  liabilities: BsRow[];
  /** Equity accounts one by one, then this year's profit (the P&L accounts' balances). */
  equity: { code: string; name: string; amount: number }[];
  yearProfit: number;
  totals: { assets: number; liabilities: number; equity: number; currentAssets: number; currentLiabilities: number };
  /** Current assets ÷ current liabilities. */
  currentRatio: number | null;
  /** Assets − (liabilities + equity): shown as it is, never adjusted. */
  difference: number;
  /** Assets in credit, liabilities in debit (shown, never adjusted). */
  flags: BsAccount[];
};

const MODEL_OF: Partial<Record<BsKey, BsLine>> = {
  cash: "cash",
  receivables: "receivables",
  inventory: "inventory",
  prepaid: "prepaid",
  fixedAssets: "fixedAssets",
  payables: "payables",
  accrued: "accrued",
  severance: "severance",
  zakatProvision: "zakatProvision",
  relatedParties: "relatedParties",
};
const NON_CURRENT: BsKey[] = ["fixedAssets", "murabahaNonCurrent", "severance"];

export function balanceSheet(file: TbFile | undefined, chart: Map<string, Account>): BalanceSheet {
  const rows = new Map<BsKey, BsRow>();
  const equity: BalanceSheet["equity"] = [];
  const flags: BsAccount[] = [];
  let yearProfit = 0;
  for (const r of file?.rows ?? []) {
    if (/^[45]/.test(norm(r.code))) {
      yearProfit += -r.close; // credit balances are profit
      continue;
    }
    if (Math.abs(r.close) < 0.5) continue;
    const name = nameOf(r.code, chart, r.name);
    const c = bsClass(r.code, name, r.close);
    if (c.group === "equity") {
      equity.push({ code: r.code, name, amount: round2(-r.close) });
      continue;
    }
    // Assets as debit balances (+); liabilities as credit balances (+).
    const amount = round2(c.group === "asset" ? r.close : -r.close);
    const acc = { code: r.code, name, amount, flag: c.flag };
    if (c.flag) flags.push(acc);
    const row = rows.get(c.key) ?? {
      key: c.key,
      amount: 0,
      y2025: MODEL_OF[c.key] ? MODEL_BS.find((m) => m.line === MODEL_OF[c.key])!.y2025 : null,
      y2026: MODEL_OF[c.key] ? MODEL_BS.find((m) => m.line === MODEL_OF[c.key])!.y2026 : null,
      accounts: [],
    };
    row.amount = round2(row.amount + amount);
    row.accounts.push(acc);
    rows.set(c.key, row);
  }
  const pick = (keys: BsKey[]) =>
    keys.map((k) => rows.get(k) ?? { key: k, amount: 0, y2025: MODEL_OF[k] ? MODEL_BS.find((m) => m.line === MODEL_OF[k])!.y2025 : null, y2026: MODEL_OF[k] ? MODEL_BS.find((m) => m.line === MODEL_OF[k])!.y2026 : null, accounts: [] });
  const assets = pick(ASSET_KEYS);
  const liabilities = pick(LIABILITY_KEYS);
  const sum = (list: { amount: number }[]) => round2(list.reduce((s, r) => s + r.amount, 0));
  const currentAssets = sum(assets.filter((r) => !NON_CURRENT.includes(r.key)));
  const currentLiabilities = sum(liabilities.filter((r) => !NON_CURRENT.includes(r.key)));
  const totals = { assets: sum(assets), liabilities: sum(liabilities), equity: round2(sum(equity) + yearProfit), currentAssets, currentLiabilities };
  return {
    asOf: file?.to,
    assets,
    liabilities,
    equity,
    yearProfit: round2(yearProfit),
    totals,
    currentRatio: currentLiabilities > 0 ? Math.round((currentAssets / currentLiabilities) * 100) / 100 : null,
    difference: round2(totals.assets - totals.liabilities - totals.equity),
    flags,
  };
}

// --- النقدية والبنوك ---

export type Payment = { date: string; code: string; desc: string; amount: number };
export type CashView = {
  asOf?: string;
  banks: { code: string; name: string; balance: number; inMonth: number; outMonth: number; source: "statement" | "trial balance" }[];
  total: number;
  /** Each day of the last 30: money in, money out (all bank and cash accounts with statements) and the end-of-day balance. */
  daily: { date: string; in: number; out: number; balance: number }[];
  topPayments: { week: Payment[]; month: Payment[]; year: Payment[] };
  /** Payments left out as transfers between the company's own accounts. */
  internalTransfers: number;
};

/**
 * A statement's opening balance, anchored on the trial balance: the trial
 * balance's closing minus the year's movements (the statement's own opening
 * row may carry either sign).
 */
function anchoredOpening(st: Statement, tbClose: number | undefined): number {
  if (tbClose === undefined) return st.opening;
  return round2(tbClose - st.lines.reduce((s, l) => s + l.dr - l.cr, 0));
}

const INTERNAL_TEXT = /حوال[ةه]\s*(إلى|الى|من|ل)\s*(حساب\s*)?(بنك\s*)?\d{2,4}\b|تحويل\s*(بين|إلى|الى)\s*(الحسابات|حساب|بنك|الصندوق)|transfer\s*(to|from|between)\s*(acc|bank|account|cash)|1102-|1101-/i;

export function cashView(statements: Statement[], file: TbFile | undefined, chart: Map<string, Account>, upTo: string): CashView {
  const cashSt = statements.filter((s) => isCash(s.code));
  const tbByNorm = new Map((file?.rows ?? []).map((r) => [norm(r.code), r]));
  const stByNorm = new Map(cashSt.map((s) => [norm(s.code), s]));
  const month = upTo.slice(0, 7);
  // Journal entries that put money into one of the company's cash or bank accounts.
  const inflowJe = new Set(cashSt.flatMap((s) => s.lines.filter((l) => l.dr > 0 && l.je).map((l) => `${l.je}`)));
  const isInternal = (l: StLine) => (l.je && inflowJe.has(l.je)) || INTERNAL_TEXT.test(l.desc);

  const banks: CashView["banks"] = [];
  const codes = new Set<string>([...stByNorm.keys(), ...[...tbByNorm.keys()].filter((c) => isCash(c))]);
  const series: { opening: number; lines: StLine[] }[] = [];
  for (const n of [...codes].sort()) {
    const st = stByNorm.get(n);
    const tbRow = tbByNorm.get(n);
    const code = st?.code ?? tbRow!.code;
    const name = nameOf(code, chart, tbRow?.name);
    if (st) {
      const opening = anchoredOpening(st, tbRow?.close);
      const balance = round2(opening + st.lines.reduce((s, l) => s + l.dr - l.cr, 0));
      const inMonth = st.lines.filter((l) => l.date.startsWith(month) && !isInternal(l)).reduce((s, l) => s + l.dr, 0);
      const outMonth = st.lines.filter((l) => l.date.startsWith(month) && !isInternal(l)).reduce((s, l) => s + l.cr, 0);
      banks.push({ code, name, balance, inMonth: round2(inMonth), outMonth: round2(outMonth), source: "statement" });
      series.push({ opening, lines: st.lines });
    } else if (tbRow && Math.abs(tbRow.close) >= 0.5) {
      banks.push({ code, name, balance: round2(tbRow.close), inMonth: 0, outMonth: 0, source: "trial balance" });
    }
  }
  // Last 30 days: in, out (transfers between own accounts left out) and the end-of-day total.
  const daily: CashView["daily"] = [];
  if (series.length) {
    for (let d = addDays(upTo, -29); d <= upTo; d = addDays(d, 1)) {
      let bal = 0;
      let inflow = 0;
      let outflow = 0;
      for (const s of series) {
        bal += s.opening + s.lines.filter((l) => l.date <= d).reduce((t, l) => t + l.dr - l.cr, 0);
        for (const l of s.lines.filter((x) => x.date === d && !isInternal(x))) {
          inflow += l.dr;
          outflow += l.cr;
        }
      }
      daily.push({ date: d, in: round2(inflow), out: round2(outflow), balance: round2(bal) });
    }
  }
  const all = cashSt.flatMap((st) => st.lines.filter((l) => l.cr > 0).map((l) => ({ l, st })));
  const payments = all.filter(({ l }) => !isInternal(l)).map(({ l, st }) => ({ date: l.date, code: st.code, desc: l.desc, amount: l.cr }));
  const top = (rows: Payment[]) => [...rows].sort((a, b) => b.amount - a.amount).slice(0, 10);
  const weekFrom = addDays(upTo, -6);
  return {
    asOf: cashSt.length ? cashSt.map((s) => s.to).sort().pop() : file?.to,
    banks,
    total: round2(banks.reduce((s, b) => s + b.balance, 0)),
    daily,
    topPayments: { week: top(payments.filter((p) => p.date >= weekFrom && p.date <= upTo)), month: top(payments.filter((p) => p.date.startsWith(month))), year: top(payments) },
    internalTransfers: all.length - payments.length,
  };
}

// --- الذمم ---

export type Aging = { b0: number; b31: number; b61: number; b91: number };
export type ArApGroup = { code: string; name: string; balance: number; aging: Aging | null; note?: "allowance" };
export type ArApView = {
  asOf?: string;
  receivables: ArApGroup[];
  payables: ArApGroup[];
  totals: { receivablesGross: number; allowance: number; receivables: number; payables: number; suppliers: number; arAging: Aging; apAging: Aging };
  /** Days sales outstanding (net receivables) / days payables outstanding (local suppliers), 90-day basis. */
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

export function arApView(statements: Statement[], file: TbFile | undefined, chart: Map<string, Account>, upTo: string): ArApView {
  const st = new Map(statements.map((s) => [norm(s.code), s]));
  const from90 = addDays(upTo, -89);
  const rows = file?.rows ?? [];
  const group = (code: string, name: string, balance: number, side: "dr" | "cr"): ArApGroup => {
    const s = st.get(norm(code));
    return { code, name, balance: round2(balance), aging: s ? ageBalance(s.lines, balance, side, upTo) : null };
  };
  // Receivables: the trade accounts (and the patients' account when in debit), less the allowance.
  const receivables = rows
    .filter((r) => (isReceivable(r.code) || (norm(r.code).startsWith("110501") && r.close > 0)) && Math.abs(r.close) >= 0.5)
    .map((r) => group(r.code, nameOf(r.code, chart, r.name), r.close, "dr"))
    .sort((a, b) => b.balance - a.balance);
  const allowanceRows = rows.filter((r) => norm(r.code).startsWith(ALLOWANCE) && Math.abs(r.close) >= 0.5);
  const allowance = round2(allowanceRows.reduce((s, r) => s + r.close, 0)); // credit: negative
  // Payables: local suppliers, labs and doctors' accrued commissions (in credit); never the loan or an expense account.
  const payables = rows
    .filter((r) => {
      const n = norm(r.code);
      if (!n.startsWith("21") || isMurabaha(r.code)) return false;
      const name = nameOf(r.code, chart, r.name);
      return (isSupplier(r.code) || n.startsWith(norm(DOCTORS_ACCRUED)) || /\blab|معمل|مختبر/i.test(name)) && r.close < -0.5;
    })
    .map((r) => group(r.code, nameOf(r.code, chart, r.name), -r.close, "cr"))
    .sort((a, b) => b.balance - a.balance);
  const sumAging = (list: ArApGroup[]): Aging =>
    list.reduce((a, r) => (r.aging ? { b0: a.b0 + r.aging.b0, b31: a.b31 + r.aging.b31, b61: a.b61 + r.aging.b61, b91: a.b91 + r.aging.b91 } : a), { b0: 0, b31: 0, b61: 0, b91: 0 });
  const recent = (codes: string[], side: "dr" | "cr") =>
    codes.reduce((s, c) => s + (st.get(norm(c))?.lines.filter((l) => l.date >= from90 && l.date <= upTo).reduce((t, l) => t + l[side], 0) ?? 0), 0);
  const receivablesGross = round2(receivables.reduce((s, r) => s + r.balance, 0));
  const net = round2(receivablesGross + allowance);
  const suppliers = payables.filter((p) => isSupplier(p.code));
  const suppliersTotal = round2(suppliers.reduce((s, r) => s + r.balance, 0));
  const creditSales90 = round2(recent(receivables.map((r) => r.code), "dr"));
  const creditPurchases90 = round2(recent(suppliers.map((r) => r.code), "cr"));
  return {
    asOf: file?.to,
    receivables: [...receivables, ...allowanceRows.map((r) => ({ code: r.code, name: nameOf(r.code, chart, r.name), balance: round2(r.close), aging: null, note: "allowance" as const }))],
    payables,
    totals: {
      receivablesGross,
      allowance,
      receivables: net,
      payables: round2(payables.reduce((s, r) => s + r.balance, 0)),
      suppliers: suppliersTotal,
      arAging: sumAging(receivables),
      apAging: sumAging(payables),
    },
    dso: creditSales90 > 0 ? Math.round((net / creditSales90) * 90) : null,
    dpo: creditPurchases90 > 0 ? Math.round((suppliersTotal / creditPurchases90) * 90) : null,
    basis: { creditSales90, creditPurchases90 },
  };
}

// --- التمويل ---

export type Maturity = { date: string; amount: number };
export type FinancingView = {
  asOf?: string;
  accounts: { code: string; name: string; balance: number; part: "current" | "nonCurrent" }[];
  balance: number;
  opening: number;
  drawn: number;
  repaid: number;
  financeCostYtd: number;
  current: number;
  nonCurrent: number;
  /** How current / non-current is split: by account (2103 / 2201) until a maturity schedule is entered. */
  splitBasis: "accounts" | "schedule";
  maturities: Maturity[];
  /** Trailing 12 months EBITDA: this year's actual months + the rest of the 12 from last year. */
  ebitdaTtm: number;
  ttmActualMonths: number;
  ttmLastYear: "actual" | "model" | "mixed";
  debtToEbitda: number | null;
  /** Murabaha outstanding but no financing cost booked this year. */
  costMissing: boolean;
};

const EBITDA = PNL_SUBTOTALS.find((s) => s.key === "ebitda")!;

export function financingView(args: {
  statements: Statement[];
  file: TbFile | undefined;
  openFile: TbFile | undefined;
  chart: Map<string, Account>;
  pnl: Pnl;
  prevPnl: Pnl | null;
  maturities: Maturity[];
  upTo: string;
}): FinancingView {
  const { file, openFile, chart, pnl, upTo } = args;
  const rows = (file?.rows ?? []).filter((r) => isMurabaha(r.code));
  const accounts = rows
    .map((r) => ({ code: r.code, name: nameOf(r.code, chart, r.name), balance: round2(-r.close), part: norm(r.code).startsWith(MURABAHA_CURRENT) ? ("current" as const) : ("nonCurrent" as const) }))
    .filter((a) => Math.abs(a.balance) >= 0.5);
  const balance = round2(accounts.reduce((s, a) => s + a.balance, 0));
  const opening = round2(-(openFile?.rows ?? []).filter((r) => isMurabaha(r.code)).reduce((s, r) => s + r.open, 0));
  // Movements from the statements, leaving out entries that only move between 2201 and 2103.
  const loans = args.statements.filter((s) => isMurabaha(s.code));
  const jeIn = (s: Statement) => new Set(s.lines.map((l) => l.je).filter(Boolean));
  const shared = loans.length > 1 ? [...jeIn(loans[0])].filter((je) => loans.slice(1).every((s) => jeIn(s).has(je))) : [];
  const moves = loans.flatMap((s) => s.lines.filter((l) => !shared.includes(l.je)));
  const repaid = round2(moves.reduce((s, l) => s + l.dr, 0));
  const drawn = round2(moves.reduce((s, l) => s + l.cr, 0));
  const in12 = addDays(upTo, 365);
  const upcoming = args.maturities.filter((m) => m.date > upTo).sort((a, b) => a.date.localeCompare(b.date));
  const bySchedule = upcoming.length > 0;
  const current = bySchedule
    ? round2(Math.min(balance, upcoming.filter((m) => m.date <= in12).reduce((s, m) => s + m.amount, 0)))
    : round2(accounts.filter((a) => a.part === "current").reduce((s, a) => s + a.balance, 0));
  // Trailing 12 months: this year's months so far, then last year's remaining months (actual when stored).
  const present = pnl.months.filter((m) => !m.missing);
  const covered = present.reduce((s, m) => s + m.coverage, 0);
  const actual = subtotal(pnl.ytd, EBITDA);
  const lastMonth = present.length ? Number(present[present.length - 1].month.slice(5, 7)) : 0;
  const lastCoverage = present.length ? present[present.length - 1].coverage : 1;
  let fromLastYear = 0;
  let actualPrev = 0;
  let modelPrev = 0;
  const model2025 = subtotal(Object.fromEntries(MODEL_PNL.map((m) => [m.line, m.y2025])) as PnlValues, EBITDA) / 12;
  for (let m = lastMonth; m <= 12 && covered < 12; m++) {
    const share = m === lastMonth ? 1 - lastCoverage : 1;
    if (share <= 0) continue;
    const prev = args.prevPnl?.months.find((x) => Number(x.month.slice(5, 7)) === m && !x.missing);
    if (prev) {
      fromLastYear += subtotal(prev.values, EBITDA) * share;
      actualPrev++;
    } else {
      fromLastYear += model2025 * share;
      modelPrev++;
    }
  }
  const ebitdaTtm = round2(actual + fromLastYear);
  return {
    asOf: file?.to,
    accounts,
    balance,
    opening,
    drawn,
    repaid,
    financeCostYtd: round2(-(pnl.ytd.financial ?? 0)),
    current,
    nonCurrent: round2(balance - current),
    splitBasis: bySchedule ? "schedule" : "accounts",
    maturities: upcoming,
    ebitdaTtm,
    ttmActualMonths: Math.round(covered * 10) / 10,
    ttmLastYear: actualPrev && modelPrev ? "mixed" : modelPrev ? "model" : "actual",
    debtToEbitda: ebitdaTtm > 0 && balance > 0 ? Math.round((balance / ebitdaTtm) * 100) / 100 : null,
    costMissing: balance > 0 && !(pnl.ytd.financial ?? 0),
  };
}

// --- التنبيهات والمطابقة ---

export type Alert = { kind: AlertKind; detail?: string; items?: { label: string; amount?: number }[] };
export type AlertKind =
  | "expenseSpike"
  | "bankLow"
  | "pmsGap"
  | "unpostedOld"
  | "signFlag"
  | "unmapped"
  | "plVsTb"
  | "bsImbalance"
  | "financeCostMissing"
  | "unclosedMonths";

export type ReconRow = { month: string; pms: number | null; accounting: number | null; lab: number; diff: number | null; pct: number | null; flagged: boolean };
export type AlertsView = {
  asOf?: string;
  unposted: (Unposted & { age: number })[];
  overdue: (Unposted & { age: number })[];
  /** The not-posted entries' effect this year (with-not-posted minus posted-only). */
  unpostedImpact: { revenue: number; expenses: number };
  recon: ReconRow[];
};

/** Lab revenue per month (4103, 4106, 4109), from the trial balances. */
export function labRevenueByMonth(tb: Record<string, TbMonth | null>, branch: AcctBranch, basis: AcctBasis): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [month, data] of Object.entries(tb)) {
    const file = tbFor(data, branch, basis);
    if (file) out[month] = round2(file.rows.filter((r) => isLabRevenue(r.code)).reduce((s, r) => s + r.cr - r.dr, 0));
  }
  return out;
}

export function alertsView(args: {
  unposted: { asOf: string; items: Unposted[] } | null;
  posted: Pnl;
  withUnposted: Pnl;
  pmsRevenue: Record<string, number>;
  labRevenue: Record<string, number>;
  threshold: number;
}): AlertsView {
  const asOf = args.unposted?.asOf;
  const items = (args.unposted?.items ?? []).map((u) => ({ ...u, age: asOf ? daysBetween(u.date, asOf) : 0 })).sort((a, b) => b.age - a.age);
  const rev = (p: Pnl) => p.ytd.revenue ?? 0;
  const exp = (p: Pnl) => Object.entries(p.ytd).filter(([k]) => k !== "revenue" && k !== "otherIncome").reduce((s, [, v]) => s + (v ?? 0), 0);
  // Accounting revenue without the lab (the PMS has no lab), the lab apart.
  const recon = args.withUnposted.months.map((m) => {
    const pms = m.month in args.pmsRevenue ? round2(args.pmsRevenue[m.month]) : null;
    const lab = args.labRevenue[m.month] ?? 0;
    const accounting = m.missing ? null : round2((m.values.revenue ?? 0) - lab);
    const diff = accounting === null || pms === null ? null : round2(accounting - pms);
    const pct = diff === null || !pms ? null : diff / pms;
    return { month: m.month, pms, accounting, lab: round2(lab), diff, pct, flagged: pct !== null && Math.abs(pct) > args.threshold };
  });
  return {
    asOf,
    unposted: items,
    overdue: items.filter((u) => u.age > 7),
    unpostedImpact: { revenue: round2(rev(args.withUnposted) - rev(args.posted)), expenses: round2(exp(args.withUnposted) - exp(args.posted)) },
    recon,
  };
}

const EXPENSE_LINES: PnlLine[] = ["commissions", "materials", "labs", "otherOperating", "personnel", "ga"];

/** The alerts shown at the top of the accounting tabs. */
export function buildAlerts(args: {
  pnl: Pnl;
  bs: BalanceSheet;
  cash: CashView;
  fin: FinancingView;
  alerts: AlertsView;
  bankMinimums: Record<string, number>;
}): Alert[] {
  const out: Alert[] = [];
  const { pnl, bs, cash, fin, alerts } = args;
  // An expense line more than 15% above its monthly average (the last full month against the closed months before it).
  const full = pnl.months.filter((m) => !m.missing && !m.partial);
  const last = full[full.length - 1];
  const before = full.slice(0, -1).filter((m) => m.closed);
  if (last && before.length >= 2) {
    const spikes = EXPENSE_LINES.map((line) => {
      const avg = before.reduce((s, m) => s + Math.abs(m.display[line] ?? 0), 0) / before.length;
      const now = Math.abs(last.display[line] ?? 0);
      return { line, avg, now };
    }).filter((x) => x.avg > 0 && x.now > x.avg * 1.15);
    if (spikes.length) out.push({ kind: "expenseSpike", detail: last.month, items: spikes.map((x) => ({ label: x.line, amount: round2(x.now - x.avg) })) });
  }
  // Banks under their minimum.
  const low = cash.banks.filter((b) => {
    const min = args.bankMinimums[norm(b.code)];
    return min !== undefined && b.balance < min;
  });
  if (low.length) out.push({ kind: "bankLow", items: low.map((b) => ({ label: `${b.code} ${b.name}`, amount: b.balance })) });
  const gaps = alerts.recon.filter((r) => r.flagged);
  if (gaps.length) out.push({ kind: "pmsGap", items: gaps.map((r) => ({ label: r.month, amount: r.diff ?? 0 })) });
  if (alerts.overdue.length) out.push({ kind: "unpostedOld", detail: String(alerts.overdue.length) });
  if (bs.flags.length) out.push({ kind: "signFlag", items: bs.flags.map((f) => ({ label: `${f.code} ${f.name}`, amount: f.amount })) });
  if (pnl.unmapped.length) out.push({ kind: "unmapped", items: pnl.unmapped.map((u) => ({ label: `${u.code} ${u.name}`, amount: u.amount })) });
  if (Math.abs(pnl.check.tb51 - pnl.check.lines51) >= 1 || Math.abs(pnl.check.tbNet - pnl.check.linesNet) >= 1)
    out.push({ kind: "plVsTb", items: [{ label: "51xx", amount: round2(pnl.check.tb51 - pnl.check.lines51) }, { label: "4–5", amount: round2(pnl.check.tbNet - pnl.check.linesNet) }] });
  if (Math.abs(bs.difference) >= 1) out.push({ kind: "bsImbalance", items: [{ label: "", amount: bs.difference }] });
  if (fin.costMissing) out.push({ kind: "financeCostMissing", items: [{ label: "", amount: fin.balance }] });
  const unclosed = pnl.months.filter((m) => !m.missing && !m.closed);
  if (unclosed.length) out.push({ kind: "unclosedMonths", items: unclosed.map((m) => ({ label: m.month })) });
  return out;
}

// --- جدول التحقق ---

export type CheckRow = { key: string; dashboard: number; tb: number; diff: number };

/**
 * The dashboard's figures next to the same figures summed straight from the
 * trial balance by account number (costs as positive amounts), to verify
 * the mapping and the classification.
 */
export function verification(args: {
  pnl: Pnl;
  tb: Record<string, TbMonth | null>;
  branch: AcctBranch;
  basis: AcctBasis;
  bs: BalanceSheet;
  arap: ArApView;
  fin: FinancingView;
  cash: CashView;
}): CheckRow[] {
  const { pnl, tb, branch, basis } = args;
  // Straight from the accounts: every month's movement of the matching accounts.
  const fromTb = (pick: (n: string) => boolean) => {
    let sum = 0;
    for (const data of Object.values(tb)) {
      const file = tbFor(data, branch, basis);
      if (file) sum += file.rows.filter((r) => pick(norm(r.code))).reduce((s, r) => s + r.cr - r.dr, 0);
    }
    return round2(sum);
  };
  const byRule = (line: PnlLine) => fromTb((n) => /^[45]/.test(n) && pnlRule(n) === line);
  const v = (line: PnlLine) => pnl.ytd[line] ?? 0;
  const ebitdaTb = PNL_SUBTOTALS.find((s) => s.key === "ebitda")!.from.reduce((s, l) => s + byRule(l), 0);
  const netTb = fromTb((n) => /^[45]/.test(n));
  const latest = latestTb(tb, "all", basis);
  const closeOf = (pick: (n: string) => boolean) => round2((latest?.rows ?? []).filter((r) => pick(norm(r.code))).reduce((s, r) => s + r.close, 0));
  const row = (key: string, dashboard: number, tbValue: number): CheckRow => ({ key, dashboard: round2(dashboard), tb: round2(tbValue), diff: round2(dashboard - tbValue) });
  const cost = (line: PnlLine) => row(line, -v(line), -byRule(line));
  return [
    row("revenue", v("revenue"), byRule("revenue")),
    cost("commissions"),
    cost("personnel"),
    cost("materials"),
    cost("labs"),
    cost("ga"),
    cost("otherOperating"),
    row("ebitda", subtotal(pnl.ytd, EBITDA), ebitdaTb),
    row("netIncome", PNL_SUBTOTALS.find((s) => s.key === "netIncome")!.from.reduce((s, l) => s + v(l), 0), netTb),
    row("receivables", args.arap.totals.receivables, closeOf((n) => isReceivable(n) || n.startsWith(ALLOWANCE)) + Math.max(0, closeOf((n) => n.startsWith("110501")))),
    row(
      "payables",
      args.arap.totals.payables,
      -round2(
        (latest?.rows ?? [])
          .filter((r) => {
            const n = norm(r.code);
            return n.startsWith("21") && !isMurabaha(n) && (isSupplier(n) || n.startsWith(norm(DOCTORS_ACCRUED)) || /\blab|معمل|مختبر/i.test(r.name)) && r.close < 0;
          })
          .reduce((s, r) => s + r.close, 0),
      ),
    ),
    row("murabaha", args.fin.balance, -closeOf((n) => n.startsWith(MURABAHA_CURRENT) || n.startsWith(MURABAHA_NONCURRENT))),
    row("cash", args.cash.total, closeOf((n) => isCash(n))),
  ];
}

export { buildPnl, COMMISSIONS, LAB_COSTS, MATERIALS };
