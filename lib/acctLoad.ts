// Loads one accounting tab's figures from storage (see lib/acctViews.ts).

import { readAcctSettings, readChart, readMapping, readStatements, readTbYear, readUnposted, type AcctBasis, type AcctBranch } from "./acct";
import { buildPnl } from "./acctPnl";
import { alertsView, arApView, balanceSheet, cashView, financingView, latestTb } from "./acctViews";
import type { Mapping } from "./acctMapping";
import { readMonthAgg, FINANCE_BRANCHES, type FinanceBranch } from "./finance";

export type AcctTab = "balance" | "cash" | "arap" | "financing" | "alerts";
export const ACCT_TABS = ["balance", "cash", "arap", "financing", "alerts"] as const satisfies readonly AcctTab[];
export const ACCT_TAB_NAMES: Record<"ar" | "en", Record<AcctTab, string>> = {
  ar: { balance: "المركز المالي", cash: "النقدية والبنوك", arap: "الذمم", financing: "التمويل", alerts: "التنبيهات والمطابقة" },
  en: { balance: "Balance sheet", cash: "Cash & banks", arap: "Receivables & payables", financing: "Financing", alerts: "Alerts & reconciliation" },
};

/** PMS revenue (Sales Report net) per month of a year, for one branch or the whole clinic. */
async function pmsRevenue(year: string, branch: AcctBranch): Promise<Record<string, number>> {
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  const branches: FinanceBranch[] = branch === "all" ? FINANCE_BRANCHES : [branch];
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
  const [tb, prevTb, chartFile, mapping, statements, unposted, settings] = await Promise.all([
    readTbYear(year),
    tab === "financing" || tab === "alerts" ? readTbYear(String(Number(year) - 1)) : Promise.resolve({}),
    readChart(),
    readMapping(),
    tab === "cash" || tab === "arap" || tab === "financing" ? readStatements(year) : Promise.resolve([]),
    tab === "alerts" ? readUnposted() : Promise.resolve(null),
    readAcctSettings(),
  ]);
  const chartList = chartFile?.accounts ?? [];
  const chart = new Map(chartList.map((a) => [a.code, a]));
  const map = mapping as Mapping;
  const file = latestTb(tb, branch, basis);
  const pnl = (b: AcctBasis) => buildPnl({ year, branch, basis: b, tb, prevTb, chart: chartList, mapping: map, upTo });
  switch (tab) {
    case "balance":
      return { tab, data: balanceSheet(file, chart, map) } as const;
    case "cash":
      // Banks are the company's, not a branch's: the whole clinic's trial balance.
      return { tab, data: cashView(statements, latestTb(tb, "all", basis), chart, upTo) } as const;
    case "arap":
      return { tab, data: arApView(statements, latestTb(tb, "all", basis), chart, upTo) } as const;
    case "financing":
      return { tab, data: financingView(statements, latestTb(tb, "all", basis), pnl(basis), settings.maturities, upTo) } as const;
    case "alerts": {
      const [posted, withUnposted, pms] = [pnl("posted"), pnl("all"), await pmsRevenue(year, branch)];
      return { tab, data: alertsView({ unposted, posted, withUnposted, pmsRevenue: pms, threshold: settings.reconThreshold }), threshold: settings.reconThreshold } as const;
    }
  }
}

export type AcctTabData = Awaited<ReturnType<typeof loadAcctTab>>;
