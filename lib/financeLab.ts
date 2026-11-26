// The dental lab's revenue, from accounting only (the PMS records no lab sales):
// 4103 − 4106 − 4109 (net of returns and discounts: credit − debit over the three
// accounts), from their account statements, which include unposted entries.
//
// Every lab entry is a manual journal entry, so the entry type can't tell daily
// from monthly ones: an entry dated on a month's last day is taken as the
// month's lumped entry (monthly figures only); any other counts on its date, in
// the daily figures and the daily chart.

import { readStatements } from "./acct";
import { isLabRevenue } from "./acctRules";
import type { Aggs } from "./financeMetrics";
import { emptyBranchDay } from "./financeTypes";

/** A month's last day (YYYY-MM-DD): entries dated on it are the month's lumped entries. */
export const isMonthEnd = (date: string) =>
  date === new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0)).toISOString().slice(0, 10);

export type LabRevenue = {
  /** Daily entries by date. */
  daily: Record<string, number>;
  /** Lumped entries by their date (monthly figures only). */
  lumped: Record<string, number>;
  /** Every entry by month. */
  byMonth: Record<string, number>;
  /** The last day the statements cover. */
  asOf?: string;
  /** How many of the three accounts have a statement (0: no lab data yet). */
  accounts: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function readLabRevenue(years: string[]): Promise<LabRevenue> {
  const out: LabRevenue = { daily: {}, lumped: {}, byMonth: {}, accounts: 0 };
  for (const year of [...new Set(years)]) {
    const statements = (await readStatements(year).catch(() => [])).filter((s) => isLabRevenue(s.code));
    for (const s of statements) {
      out.accounts++;
      if (!out.asOf || s.to > out.asOf) out.asOf = s.to;
      for (const l of s.lines) {
        const v = l.cr - l.dr;
        const month = l.date.slice(0, 7);
        out.byMonth[month] = round2((out.byMonth[month] ?? 0) + v);
        const into = isMonthEnd(l.date) ? out.lumped : out.daily;
        into[l.date] = round2((into[l.date] ?? 0) + v);
      }
    }
  }
  return out;
}

/**
 * Puts the lab's daily revenue into the daily summaries as the «lab» branch, in place of any PMS
 * lab figure (so nothing is counted twice). Left as it is when accounting has no lab statement yet.
 */
export function applyLabToAggs(aggs: Aggs, lab: LabRevenue): void {
  if (!lab.accounts) return;
  for (const agg of Object.values(aggs)) if (agg) for (const day of Object.values(agg.days)) delete day.lab;
  for (const [date, net] of Object.entries(lab.daily)) {
    const agg = aggs[date.slice(0, 7)];
    if (!agg || !net) continue;
    const day = (agg.days[date] ??= {});
    day.lab = { ...emptyBranchDay(), net, gross: net };
  }
}

/** Lumped lab entries dated from … to (inclusive). */
export const lumpedBetween = (lab: LabRevenue | undefined, from: string, to: string) =>
  lab ? Object.entries(lab.lumped).reduce((s, [d, v]) => (d >= from && d <= to ? s + v : s), 0) : 0;
