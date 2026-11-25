// Loads the accounting tabs' figures from storage (see lib/acctViews.ts).
// Every tab also gets the alerts shown at its top and the check table.

import { readAcctSettings, readChart, readMapping, readStatements, readTbYear, readUnposted, type AcctBasis, type AcctBranch } from "./acct";
import { buildPnl } from "./acctPnl";
import {
  alertsView,
  arApView,
  balanceSheet,
  buildAlerts,
  cashView,
  financingView,
  firstTb,
  labRevenueByMonth,
  latestTb,
  verification,
} from "./acctViews";
import type { Mapping } from "./acctMapping";
import { readFinanceStatus, readMonthAgg, type FinanceBranch } from "./finance";

export type AcctTab = "balance" | "cash" | "arap" | "financing" | "alerts";
export const ACCT_TABS = ["balance", "cash", "arap", "financing", "alerts"] as const satisfies readonly AcctTab[];
export const ACCT_TAB_NAMES: Record<"ar" | "en", Record<AcctTab, string>> = {
  ar: { balance: "المركز المالي", cash: "النقدية والبنوك", arap: "الذمم", financing: "التمويل", alerts: "التنبيهات والمطابقة" },
  en: { balance: "Balance sheet", cash: "Cash & banks", arap: "Receivables & payables", financing: "Financing", alerts: "Alerts & reconciliation" },
};

/** PMS revenue (Sales Report net) per month: the clinic branches only (the PMS has no lab). */
async function pmsRevenue(year: string, branch: AcctBranch): Promise<Record<string, number>> {
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  const branches: FinanceBranch[] = branch === "all" ? ["abha", "khamis"] : [branch];
  const aggs = await Promise.all(months.map((m) => readMonthAgg(m).catch(() => undefined)));
  const out: Record<string, number> = {};
  months.forEach((m, i) => {
    const agg = aggs[i];
    if (!agg) return;
    out[m] = Object.values(agg.days).reduce((s, day) => s + branches.reduce((t, b) => t + (day[b]?.net ?? 0), 0), 0);
  });
  return out;
}

export async function loadAcctTab(tab: AcctTab, branch: AcctBranch, basis: AcctBasis, upTo: string) {
  const year = upTo.slice(0, 4);
  const prevYear = String(Number(year) - 1);
  const [tb, prevTb, chartFile, mapping, statements, unposted, settings, pms, status] = await Promise.all([
    readTbYear(year),
    readTbYear(prevYear),
    readChart(),
    readMapping(),
    readStatements(year),
    readUnposted(),
    readAcctSettings(),
    pmsRevenue(year, branch),
    readFinanceStatus(),
  ]);
  const chartList = chartFile?.accounts ?? [];
  const chart = new Map(chartList.map((a) => [a.code, a]));
  const map = mapping as Mapping;
  const pnlOf = (b: AcctBasis, br: AcctBranch = branch) => buildPnl({ year, branch: br, basis: b, tb, prevTb, chart: chartList, mapping: map, upTo });
  const pnl = pnlOf(basis);
  const prevPnl = buildPnl({ year: prevYear, branch: "all", basis, tb: prevTb, chart: chartList, mapping: map, upTo: `${prevYear}-12-31` });
  // Banks, receivables, payables and financing are the company's: the whole clinic's trial balance.
  const file = latestTb(tb, branch, basis);
  const fileAll = latestTb(tb, "all", basis);
  const bs = balanceSheet(file, chart);
  const cash = cashView(statements, fileAll, chart, upTo);
  const arap = arApView(statements, fileAll, chart, upTo);
  const pnlAll = branch === "all" ? pnl : pnlOf(basis, "all");
  const fin = financingView({ statements, file: fileAll, openFile: firstTb(tb, "all", basis), chart, pnl: pnlAll, prevPnl: prevPnl.months.some((m) => !m.missing) ? prevPnl : null, maturities: settings.maturities, upTo });
  const alerts = alertsView({
    unposted,
    posted: basis === "posted" ? pnl : pnlOf("posted"),
    withUnposted: basis === "all" ? pnl : pnlOf("all"),
    pmsRevenue: pms,
    labRevenue: labRevenueByMonth(tb, branch, "all"),
    threshold: settings.reconThreshold,
  });
  const lastRun = status.runs.find((r) => r.source !== "upload");
  const top = buildAlerts({ pnl, bs, cash, fin, alerts, bankMinimums: settings.bankMinimums, lastRun });
  const check = verification({ pnl, tb, branch, basis, bs, arap, fin, cash });
  const common = { top, check, threshold: settings.reconThreshold };
  switch (tab) {
    case "balance":
      return { tab, data: bs, ...common } as const;
    case "cash":
      return { tab, data: cash, ...common } as const;
    case "arap":
      return { tab, data: arap, ...common } as const;
    case "financing":
      return { tab, data: fin, ...common } as const;
    case "alerts":
      return { tab, data: alerts, ...common } as const;
  }
}

export type AcctTabData = Awaited<ReturnType<typeof loadAcctTab>>;
