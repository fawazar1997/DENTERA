import { randomBytes, timingSafeEqual } from "node:crypto";
import { getDoctors } from "./db";
import { partnerDoctors, shownName, withOfficialNames } from "./financeNames";
import type { Doctor } from "./types";
import type { Locale } from "./i18n";
import { readPrivateFile, putPrivateFile } from "./privateBlob";
import { aggregateMonth } from "./financeAgg";
import { readReport, type ImportResult } from "./financeImport";
import { readTbMonth } from "./acct";
import { isLabRevenue } from "./acctRules";
import { buildDashboard, monthOf, riyadhDate, sameDayIn, shiftMonth, type Aggs, type Dashboard, type MonthTotals } from "./financeMetrics";
import {
  DEFAULT_PARTNERS,
  OLD_DEFAULT_PARTNERS,
  MODEL_TARGETS,
  type FinLine,
  type FinPayment,
  type FinanceBranch,
  type FinanceRun,
  type FinanceSettings,
  type FinanceStatus,
  type Installments,
  type MonthAgg,
  type SalesInvoice,
} from "./financeTypes";

export * from "./financeTypes";

// The financial dashboard's store (private files: in Blob online, under
// data/private-files locally):
//   finance/lines/<YYYY-MM>.json   the month's invoice lines and payments
//   finance/days/<YYYY-MM>.json    its daily summary (what the dashboard reads)
//   finance/months.json            revenue per month (targets, year to date)
//   finance/installments.json      Invisalign installments, latest import
//   finance/settings.json          targets, partners, specialties, share link
//   finance/status.json            the robot's / uploads' last runs

/** A month's stored reports: detailed lines, payments, and the Sales Report's invoices. */
type MonthData = { lines: FinLine[]; payments: FinPayment[]; sales?: SalesInvoice[] };

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

export async function readFinanceSettings(): Promise<FinanceSettings> {
  const saved = await readJson<Partial<FinanceSettings>>("finance/settings.json");
  return {
    yearTargets: { ...MODEL_TARGETS, ...(saved?.yearTargets ?? {}) },
    monthTargets: saved?.monthTargets ?? {},
    // The first default (one partner) is replaced by the full list.
    partners:
      !saved?.partners || OLD_DEFAULT_PARTNERS.some((old) => JSON.stringify(old) === JSON.stringify(saved.partners))
        ? DEFAULT_PARTNERS
        : saved.partners,
    doctorSpecialty: saved?.doctorSpecialty ?? {},
    shareKey: saved?.shareKey,
    maghrabiKey: saved?.maghrabiKey,
    hiddenTabs: saved?.hiddenTabs ?? {},
  };
}

export async function saveFinanceSettings(settings: FinanceSettings): Promise<void> {
  await writeJson("finance/settings.json", settings);
}

export async function readFinanceStatus(): Promise<FinanceStatus> {
  return (await readJson<FinanceStatus>("finance/status.json")) ?? { runs: [] };
}

export async function recordRun(run: FinanceRun): Promise<void> {
  const status = await readFinanceStatus();
  const runs = [run, ...status.runs].slice(0, 50);
  await writeJson("finance/status.json", {
    runs,
    lastRunAt: run.at,
    lastSuccessAt: run.ok ? run.at : status.lastSuccessAt,
  } satisfies FinanceStatus);
}

export async function readMonthAgg(month: string): Promise<MonthAgg | undefined> {
  return (await readJson<MonthAgg>(`finance/days/${month}.json`)) ?? undefined;
}

export async function readMonthTotals(): Promise<MonthTotals> {
  return (await readJson<MonthTotals>("finance/months.json")) ?? {};
}

export async function readInstallments(): Promise<Installments | undefined> {
  return (await readJson<Installments>("finance/installments.json")) ?? undefined;
}

/** Re-sums a month after its lines changed (or the settings that shape it). */
async function rebuildMonth(month: string, data: MonthData, settings: FinanceSettings): Promise<MonthAgg> {
  const agg = aggregateMonth(month, data.lines, data.payments, settings, data.sales ?? []);
  await writeJson(`finance/days/${month}.json`, agg);
  const totals = await readMonthTotals();
  totals[month] =
    Math.round(
      Object.values(agg.days).reduce((s, day) => s + Object.values(day).reduce((t, b) => t + (b?.net ?? 0), 0), 0) * 100
    ) / 100;
  await writeJson("finance/months.json", totals);
  return agg;
}

/** Rebuilds every stored month (after the specialty settings change). */
export async function rebuildAllMonths(): Promise<number> {
  const settings = await readFinanceSettings();
  const totals = await readMonthTotals();
  let n = 0;
  for (const month of Object.keys(totals)) {
    const data = await readJson<MonthData>(`finance/lines/${month}.json`);
    if (!data) continue;
    await rebuildMonth(month, data, settings);
    n++;
  }
  return n;
}

const inRange = (date: string, from: string, to: string) => date >= from && date <= to;

/**
 * Stores one report. The period and branches it covers replace what was
 * stored for them (so re-sending the same day never counts it twice).
 */
export type IngestResult = {
  ok: boolean;
  kind: string;
  rows: number;
  months: string[];
  /** Invoices: the net read from the file, and the net now stored for its dates and branches (to check nothing was lost). */
  readNet?: number;
  storedNet?: number;
};

export async function ingestReport(result: ImportResult): Promise<IngestResult> {
  if (result.kind === "unknown") return { ok: false, kind: "unknown", rows: 0, months: [] };
  if (result.kind === "installments") {
    await writeJson("finance/installments.json", result.installments);
    return { ok: true, kind: "installments", rows: result.rows, months: [] };
  }
  if (!result.from) return { ok: true, kind: result.kind, rows: 0, months: [] };
  const settings = await readFinanceSettings();
  const months: string[] = [];
  for (let m = monthOf(result.from); m <= monthOf(result.to); m = shiftMonth(m, 1)) months.push(m);
  let storedNet = 0;
  for (const month of months) {
    const data = (await readJson<MonthData>(`finance/lines/${month}.json`)) ?? { lines: [], payments: [] };
    const covers = (item: { date: string; branch: FinanceBranch }) =>
      inRange(item.date, result.from, result.to) && result.branches.includes(item.branch);
    const inMonth = (item: { date: string }) => item.date.startsWith(month);
    if (result.kind === "invoices") {
      data.lines = data.lines.filter((l) => !covers(l)).concat(result.lines.filter(inMonth));
      storedNet += data.lines.filter((l) => covers(l) && !l.cancelled).reduce((sum, l) => sum + l.net, 0);
    } else if (result.kind === "sales") {
      // The Sales Report brings the invoices and their payments by method,
      // replacing what the same branch's report brought for those dates.
      const fromFile = (item: { date: string; branch: FinanceBranch; origin?: FinanceBranch }) =>
        inRange(item.date, result.from, result.to) && result.branches.includes(item.origin ?? item.branch);
      data.sales = (data.sales ?? []).filter((i) => !fromFile(i)).concat(result.invoices.filter(inMonth));
      data.payments = data.payments.filter((p) => !fromFile(p)).concat(result.payments.filter(inMonth));
      storedNet += data.sales.filter(fromFile).reduce((sum, i) => sum + i.net, 0);
    } else {
      data.payments = data.payments.filter((p) => !covers(p)).concat(result.payments.filter(inMonth));
    }
    await writeJson(`finance/lines/${month}.json`, data);
    await rebuildMonth(month, data, settings);
  }
  if (result.kind === "payments") return { ok: true, kind: result.kind, rows: result.rows, months };
  const round = (n: number) => Math.round(n * 100) / 100;
  const readNet =
    result.kind === "sales"
      ? result.invoices.reduce((sum, i) => sum + i.net, 0)
      : result.lines.filter((l) => !l.cancelled).reduce((sum, l) => sum + l.net, 0);
  return { ok: true, kind: result.kind, rows: result.rows, months, readNet: round(readNet), storedNet: round(storedNet) };
}

/** Reads and stores one uploaded report file. */
export async function importReportFile(bytes: Uint8Array, fileName: string, branch?: FinanceBranch) {
  const result = readReport(bytes, fileName, { branch, today: riyadhDate() });
  return ingestReport(result);
}

/**
 * The dashboard's doctors under their official names (Control Panel →
 * Doctors), and the partners as the official doctors they are.
 */
export function officialView(aggs: Aggs, settings: FinanceSettings, doctors: Doctor[], locale: Locale): { aggs: Aggs; settings: FinanceSettings } {
  const partners = partnerDoctors(settings.partners, doctors).map(({ entry, doctor }) => (doctor ? shownName(doctor, locale) : entry));
  return { aggs: withOfficialNames(aggs, doctors, locale), settings: { ...settings, partners } };
}

/** Everything the dashboard needs for a day and branches. */
export async function loadDashboard(date: string, branches: FinanceBranch[], locale: Locale = "ar") {
  const month = monthOf(date);
  const needed = new Set<string>([
    month,
    shiftMonth(month, -1),
    shiftMonth(month, -2),
    shiftMonth(month, -3),
    monthOf(sameDayIn(date, -12)),
  ]);
  const [settings, history, installments, status, ...list] = await Promise.all([
    readFinanceSettings(),
    readMonthTotals(),
    readInstallments(),
    readFinanceStatus(),
    ...[...needed].map((m) => readMonthAgg(m)),
  ]);
  const stored: Aggs = {};
  [...needed].forEach((m, i) => (stored[m] = list[i] as MonthAgg | undefined));
  const doctors = await getDoctors().catch(() => []);
  const view = officialView(stored, settings, doctors, locale);
  const dashboard = buildDashboard({ date, branches, aggs: view.aggs, settings: view.settings, history, installments });
  if (branches.includes("lab")) await addLabFromAccounting(dashboard, date).catch(() => undefined);
  return { dashboard, settings, status };
}

/**
 * The PMS has no dental-lab sales: when its lab is empty for the month, the
 * branch and specialty splits take the lab's revenue (4103, 4106, 4109) from
 * the month's trial balance (with unposted entries), only when that trial
 * balance does not run past the chosen day. The KPIs stay the PMS's.
 */
async function addLabFromAccounting(d: Dashboard, date: string) {
  const lab = d.branches.find((b) => b.branch === "lab");
  if (!lab || lab.net !== 0) return;
  const file = (await readTbMonth(monthOf(date)))?.["all|all"];
  if (!file || file.to > date) return;
  const net = Math.round(file.rows.filter((r) => isLabRevenue(r.code)).reduce((s, r) => s + r.cr - r.dr, 0));
  if (net <= 0) return;
  lab.net = net;
  const sum = d.branches.reduce((s, b) => s + b.net, 0) || 1;
  d.branches.forEach((b) => (b.share = b.net / sum));
  d.specialties.push({ specialty: "lab", net, share: 0 });
  const sumS = d.specialties.reduce((s, x) => s + x.net, 0) || 1;
  d.specialties.forEach((x) => (x.share = x.net / sumS));
  d.labFromAccounting = { net, to: file.to };
}

// --- Keys ---

export function newShareKey(): string {
  return randomBytes(24).toString("base64url");
}

export function sameKey(saved: string | undefined, key: string): boolean {
  if (!saved || !key) return false;
  const a = Buffer.from(saved);
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The robot's key (FINANCE_INGEST_KEY, a sensitive Vercel variable). */
export function ingestKeyOk(header: string | null): boolean {
  const expected = process.env.FINANCE_INGEST_KEY || "";
  const given = (header ?? "").replace(/^Bearer\s+/i, "").trim();
  return expected.length >= 24 && sameKey(expected, given);
}
