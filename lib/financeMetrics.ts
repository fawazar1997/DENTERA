// The dashboard's figures for one day, from the monthly daily summaries:
// today and month-to-date against last week / last month / last year,
// targets (expected · actual · variance), revenue splits, invoices,
// collections, quality lists and doctors. Pure.

import { addInto } from "./financeAgg";
import { lumpedBetween, type LabRevenue } from "./financeLab";
import {
  MODEL_TARGETS,
  isPartner,
  partnerOf,
  emptyBranchDay,
  type BranchDay,
  type FinanceBranch,
  type FinanceSettings,
  type FlagRef,
  type Installments,
  type MonthAgg,
  type PayMethod,
  type Specialty,
} from "./financeTypes";

// --- Dates (YYYY-MM-DD, calendar arithmetic in UTC) ---

const toDate = (d: string) => new Date(`${d}T00:00:00Z`);
const fromDate = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => fromDate(new Date(toDate(d).getTime() + n * 86400000));
export const monthOf = (d: string) => d.slice(0, 7);
export const dayOfMonth = (d: string) => Number(d.slice(8, 10));
/** 0 = Sunday … 5 = Friday. */
export const weekday = (d: string) => toDate(d).getUTCDay();
export const daysInMonth = (month: string) => new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).getUTCDate();
export function shiftMonth(month: string, by: number): string {
  const d = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7) - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}
/** The same day `by` months away (clamped to that month's length). */
export function sameDayIn(date: string, by: number): string {
  const month = shiftMonth(monthOf(date), by);
  return `${month}-${String(Math.min(dayOfMonth(date), daysInMonth(month))).padStart(2, "0")}`;
}

/** Today in Riyadh (YYYY-MM-DD). */
export function riyadhDate(at = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

// --- Reading the summaries ---

export type Aggs = Record<string, MonthAgg | undefined>;

function dayTotal(aggs: Aggs, date: string, branches: FinanceBranch[]): BranchDay | null {
  const day = aggs[monthOf(date)]?.days[date];
  if (!day) return null;
  let total: BranchDay | null = null;
  for (const b of branches) {
    const d = day[b];
    if (d) total = addInto(total ?? emptyBranchDay(), d);
  }
  return total;
}

function rangeTotal(aggs: Aggs, from: string, to: string, branches: FinanceBranch[]): BranchDay {
  const total = emptyBranchDay();
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const day = dayTotal(aggs, d, branches);
    if (day) addInto(total, day);
  }
  return total;
}

const change = (now: number, before: number) => (before ? (now - before) / Math.abs(before) : null);

// --- Targets ---

/** How busy each weekday is (from the summaries loaded); Friday off unless the data says otherwise. */
export function weekdayWeights(aggs: Aggs): number[] {
  const sums = new Array(7).fill(0);
  const counts = new Array(7).fill(0);
  for (const agg of Object.values(aggs)) {
    if (!agg) continue;
    for (const [date, branches] of Object.entries(agg.days)) {
      const net = Object.values(branches).reduce((s, b) => s + (b?.net ?? 0), 0);
      sums[weekday(date)] += net;
      counts[weekday(date)]++;
    }
  }
  const avg = sums.map((s, i) => (counts[i] ? s / counts[i] : 0));
  const known = avg.filter((a) => a > 0);
  if (known.length < 4) return [1, 1, 1, 1, 1, 0, 1]; // no history yet: every day but Friday
  const mean = known.reduce((s, a) => s + a, 0) / known.length;
  return avg.map((a) => a / mean);
}

export type MonthTotals = Record<string, number>;

/**
 * A month's target: its own (from the settings), or its share of the
 * year's target by last year's monthly revenue (or by days when there's no
 * history). Months with their own target are taken out of the share first.
 */
export function monthTarget(month: string, settings: FinanceSettings, history: MonthTotals): number {
  if (settings.monthTargets[month]) return settings.monthTargets[month];
  const year = month.slice(0, 4);
  const yearTarget = settings.yearTargets[year] ?? MODEL_TARGETS[year] ?? 0;
  if (!yearTarget) return 0;
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  const fixed = months.filter((m) => settings.monthTargets[m]);
  const rest = yearTarget - fixed.reduce((s, m) => s + settings.monthTargets[m], 0);
  const open = months.filter((m) => !settings.monthTargets[m]);
  // Last year's revenue per month; missing months get the average of the known ones, by length.
  const last = open.map((m) => history[`${+year - 1}${m.slice(4)}`] ?? 0);
  const known = last.filter((v) => v > 0);
  const perDay = known.length ? known.reduce((s, v) => s + v, 0) / open.filter((_, i) => last[i] > 0).reduce((s, m) => s + daysInMonth(m), 0) : 0;
  const weights = open.map((m, i) => (known.length >= 6 ? last[i] || perDay * daysInMonth(m) : daysInMonth(m)));
  const sum = weights.reduce((s, w) => s + w, 0);
  const index = open.indexOf(month);
  return sum ? (rest * weights[index]) / sum : 0;
}

/** A month's target spread over its days by weekday weight. */
export function dayTargets(month: string, target: number, weights: number[]): Record<string, number> {
  const out: Record<string, number> = {};
  const n = daysInMonth(month);
  let sum = 0;
  for (let i = 1; i <= n; i++) sum += weights[weekday(`${month}-${String(i).padStart(2, "0")}`)];
  for (let i = 1; i <= n; i++) {
    const date = `${month}-${String(i).padStart(2, "0")}`;
    out[date] = sum ? (target * weights[weekday(date)]) / sum : 0;
  }
  return out;
}

// --- The dashboard ---

export type DoctorRow = {
  doctor: string;
  net: number;
  patients: number;
  invoices: number;
  avg: number;
  before: number;
  change: number | null;
};

export type Dashboard = {
  date: string;
  hasData: boolean;
  today: { net: number; lastWeek: number; change: number | null; expected: number; variance: number };
  mtd: { net: number; lastMonth: number; lastMonthChange: number | null; lastYear: number; lastYearChange: number | null };
  target: {
    month: number;
    year: number;
    ytd: number;
    monthPct: number;
    yearPct: number;
    expectedMtd: number;
    variance: number;
    remainingDays: number;
    requiredPerDay: number;
  };
  collections: Record<PayMethod, number> & { total: number };
  counts: { invoices: number; patients: number; avg: number };
  trend: { date: string; net: number; target: number }[];
  branches: { branch: FinanceBranch; net: number; share: number }[];
  specialties: { specialty: Specialty | "lab"; net: number; share: number }[];
  /** The lab's revenue from accounting, month to date (daily + lumped entries), up to `to`. */
  labFromAccounting?: { net: number; to: string };
  discounts: { total: number; pct: number; byBranch: { branch: FinanceBranch; total: number; pct: number }[] };
  invoices: { new: number; credit: { count: number; amount: number }; returns: { count: number; amount: number }; creditNotes: { count: number; amount: number } };
  installments?: Installments;
  quality: {
    today: { highDiscount: FlagRef[]; noId: FlagRef[]; cancelled: FlagRef[] };
    mtd: { highDiscount: number; noId: number; cancelled: number };
  };
  doctorsToday: { previousDate: string | null; rows: DoctorRow[] };
  top10: DoctorRow[];
  falling: (DoctorRow & { average: number })[];
  /** found: false when no PMS doctor name matched (a spelling to fix in Settings). */
  partners: (DoctorRow & { share: number; found: boolean })[];
  top5Share: number;
};

export function buildDashboard(input: {
  date: string;
  branches: FinanceBranch[];
  aggs: Aggs;
  settings: FinanceSettings;
  history: MonthTotals;
  installments?: Installments;
  /** The lab's revenue from accounting (its daily part is already in «aggs» as the lab branch). */
  lab?: LabRevenue;
}): Dashboard {
  const { date, branches, aggs, settings, history, lab } = input;
  const month = monthOf(date);
  const first = `${month}-01`;
  // The lab's lumped (monthly) entries count in month and year figures only, never in a day's.
  const withLab = branches.includes("lab") && Boolean(lab?.accounts);
  const lumped = (from: string, to: string) => (withLab ? lumpedBetween(lab, from, to) : 0);

  const today = dayTotal(aggs, date, branches) ?? emptyBranchDay();
  const lastWeek = dayTotal(aggs, addDays(date, -7), branches);
  const mtd = rangeTotal(aggs, first, date, branches);
  mtd.net += lumped(first, date);
  const lmDate = sameDayIn(date, -1);
  const lastMonth = rangeTotal(aggs, `${monthOf(lmDate)}-01`, lmDate, branches);
  lastMonth.net += lumped(`${monthOf(lmDate)}-01`, lmDate);
  const lyDate = sameDayIn(date, -12);
  const lastYear = rangeTotal(aggs, `${monthOf(lyDate)}-01`, lyDate, branches);
  lastYear.net += lumped(`${monthOf(lyDate)}-01`, lyDate);
  const hasData = Object.values(aggs).some((a) => a && Object.keys(a.days).length > 0);

  // Targets (the company's: shown in full whatever the branch filter, scaled when filtered).
  const weights = weekdayWeights(aggs);
  const allBranches = branches.length === 3;
  const branchShare = allBranches ? 1 : shareOfBranches(aggs, branches);
  const mTarget = monthTarget(month, settings, history) * branchShare;
  const perDay = dayTargets(month, mTarget, weights);
  const expectedMtd = Object.entries(perDay).reduce((s, [d, v]) => (d <= date ? s + v : s), 0);
  const year = month.slice(0, 4);
  const yTarget = (settings.yearTargets[year] ?? MODEL_TARGETS[year] ?? 0) * branchShare;
  let ytd = mtd.net;
  // Earlier months: the clinics' totals (PMS), plus the lab's from accounting when the lab is shown.
  const clinicShown = branches.some((b) => b !== "lab");
  const clinicShare = allBranches ? 1 : withLab ? shareOfBranches(aggs, branches.filter((b) => b !== "lab")) : branchShare;
  for (let m = `${year}-01`; m < month; m = shiftMonth(m, 1))
    ytd += (clinicShown ? (history[m] ?? 0) * clinicShare : 0) + (withLab ? lab!.byMonth[m] ?? 0 : 0);
  let remainingDays = 0;
  for (let d = addDays(date, 1); monthOf(d) === month; d = addDays(d, 1)) if (weights[weekday(d)] > 0) remainingDays++;

  // The last 30 days, with each day's target.
  const trend: Dashboard["trend"] = [];
  const targetsByMonth: Record<string, Record<string, number>> = { [month]: perDay };
  for (let i = 29; i >= 0; i--) {
    const d = addDays(date, -i);
    const m = monthOf(d);
    targetsByMonth[m] ??= dayTargets(m, monthTarget(m, settings, history) * branchShare, weights);
    trend.push({ date: d, net: dayTotal(aggs, d, branches)?.net ?? 0, target: targetsByMonth[m][d] ?? 0 });
  }

  // Splits (month to date).
  const byBranch = branches.map((b) => {
    const total = rangeTotal(aggs, first, date, [b]);
    if (b === "lab") total.net += lumped(first, date);
    return { branch: b, total };
  });
  const sumNet = mtd.net || 1;
  const specialties: Dashboard["specialties"] = (Object.keys(mtd.bySpecialty) as Specialty[]).map((s) => ({ specialty: s, net: mtd.bySpecialty[s], share: mtd.bySpecialty[s] / sumNet }));
  // The lab is its own line in the specialty split (its revenue has no specialty).
  const labMtd = byBranch.find((b) => b.branch === "lab")?.total.net ?? 0;
  if (withLab && labMtd) specialties.push({ specialty: "lab", net: labMtd, share: labMtd / sumNet });
  // Invoices, patients and the average invoice are the clinics' only (the lab has no PMS invoices).
  const todayClinics = dayTotal(aggs, date, branches.filter((b) => b !== "lab")) ?? emptyBranchDay();

  // Doctors.
  const rows = (day: BranchDay) =>
    Object.entries(day.byDoctor).map(([doctor, d]) => ({ doctor, ...d }));
  let previousDate: string | null = null;
  for (let i = 1; i <= 10; i++) {
    const d = addDays(date, -i);
    if ((dayTotal(aggs, d, branches)?.net ?? 0) > 0) {
      previousDate = d;
      break;
    }
  }
  const prevDay = previousDate ? dayTotal(aggs, previousDate, branches) : null;
  const doctorRow = (doctor: string, now: { net: number; patients: number; invoices: number }, before: number): DoctorRow => ({
    doctor,
    net: now.net,
    patients: now.patients,
    invoices: now.invoices,
    avg: now.invoices ? now.net / now.invoices : 0,
    before,
    change: change(now.net, before),
  });
  const doctorsToday = rows(today)
    .map((r) => doctorRow(r.doctor, r, prevDay?.byDoctor[r.doctor]?.net ?? 0))
    .sort((a, b) => b.net - a.net);
  for (const [doctor, d] of Object.entries(prevDay?.byDoctor ?? {})) {
    if (!today.byDoctor[doctor]) doctorsToday.push(doctorRow(doctor, { net: 0, patients: 0, invoices: 0 }, d.net));
  }

  const mtdRows = rows(mtd).map((r) => doctorRow(r.doctor, r, lastMonth.byDoctor[r.doctor]?.net ?? 0)).sort((a, b) => b.net - a.net);
  // Falling: this month so far against their average for the same days of the 3 months before.
  const past = [1, 2, 3].map((k) => {
    const d = sameDayIn(date, -k);
    return rangeTotal(aggs, `${monthOf(d)}-01`, d, branches);
  });
  const falling = mtdRows
    .concat(
      Object.keys(past[0].byDoctor)
        .filter((doc) => !mtd.byDoctor[doc])
        .map((doc) => doctorRow(doc, { net: 0, patients: 0, invoices: 0 }, lastMonth.byDoctor[doc]?.net ?? 0))
    )
    .map((r) => {
      const values = past.map((p) => p.byDoctor[r.doctor]?.net ?? 0).filter((v) => v > 0);
      const average = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
      return { ...r, average, change: change(r.net, average) };
    })
    .filter((r) => r.average >= 5000 && r.net < r.average * 0.8)
    .sort((a, b) => (a.change ?? 0) - (b.change ?? 0));

  // A partner's names (both branches, any spelling) add up.
  const partners = settings.partners.map((line) => {
    const { label, keys } = partnerOf(line);
    const now = { net: 0, patients: 0, invoices: 0 };
    let found = false;
    // The official name (exact), else the English words of an older «name = words» line.
    const isThis = (doctor: string) => doctor === line.trim() || doctor === label || isPartner(keys, doctor);
    for (const [doctor, d] of Object.entries(mtd.byDoctor)) {
      if (!isThis(doctor)) continue;
      found = true;
      now.net += d.net;
      now.patients += d.patients;
      now.invoices += d.invoices;
    }
    let before = 0;
    for (const [doctor, d] of Object.entries(lastMonth.byDoctor)) {
      if (!isThis(doctor)) continue;
      found = true;
      before += d.net;
    }
    return { ...doctorRow(label, now, before), share: now.net / sumNet, found };
  });
  const top5 = mtdRows.slice(0, 5).reduce((s, r) => s + r.net, 0);

  const collections = { ...today.payments, total: Object.values(today.payments).reduce((s, v) => s + v, 0) };

  return {
    date,
    hasData,
    today: {
      net: today.net,
      lastWeek: lastWeek?.net ?? 0,
      change: change(today.net, lastWeek?.net ?? 0),
      expected: perDay[date] ?? 0,
      variance: today.net - (perDay[date] ?? 0),
    },
    mtd: {
      net: mtd.net,
      lastMonth: lastMonth.net,
      lastMonthChange: change(mtd.net, lastMonth.net),
      lastYear: lastYear.net,
      lastYearChange: change(mtd.net, lastYear.net),
    },
    target: {
      month: mTarget,
      year: yTarget,
      ytd,
      monthPct: mTarget ? mtd.net / mTarget : 0,
      yearPct: yTarget ? ytd / yTarget : 0,
      expectedMtd,
      variance: mtd.net - expectedMtd,
      remainingDays,
      requiredPerDay: remainingDays ? Math.max(0, mTarget - mtd.net) / remainingDays : 0,
    },
    collections,
    counts: { invoices: today.invoices, patients: today.patients, avg: today.invoices ? todayClinics.net / today.invoices : 0 },
    trend,
    labFromAccounting: withLab ? { net: labMtd, to: lab!.asOf ?? date } : undefined,
    branches: byBranch.map(({ branch, total }) => ({ branch, net: total.net, share: total.net / sumNet })),
    specialties,
    discounts: {
      total: mtd.discount,
      pct: mtd.gross ? mtd.discount / mtd.gross : 0,
      byBranch: byBranch.map(({ branch, total }) => ({ branch, total: total.discount, pct: total.gross ? total.discount / total.gross : 0 })),
    },
    invoices: { new: today.invoices, credit: today.credit, returns: today.returns, creditNotes: today.creditNotes },
    installments: input.installments,
    quality: {
      today: today.flags,
      mtd: { highDiscount: mtd.flags.highDiscount.length, noId: mtd.flags.noId.length, cancelled: mtd.flags.cancelled.length },
    },
    doctorsToday: { previousDate, rows: doctorsToday },
    top10: mtdRows.slice(0, 10),
    falling,
    partners,
    top5Share: top5 / sumNet,
  };
}

/** The selected branches' share of revenue over the loaded months (to scale the company target). */
function shareOfBranches(aggs: Aggs, branches: FinanceBranch[]): number {
  let part = 0;
  let all = 0;
  for (const agg of Object.values(aggs)) {
    for (const day of Object.values(agg?.days ?? {})) {
      for (const [b, d] of Object.entries(day)) {
        all += d?.net ?? 0;
        if (branches.includes(b as FinanceBranch)) part += d?.net ?? 0;
      }
    }
  }
  return all ? part / all : branches.length / 3;
}
