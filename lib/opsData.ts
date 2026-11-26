// Reads the stored PMS invoices for «الأداء التشغيلي» and builds each tab's data.
// The output never carries a patient key, name, file number or ID: only counts,
// amounts, invoice numbers (top discounts) and, when allowed, doctors' names.

import { getDoctors } from "./db";
import { readMonthLines, readMonthTotals, readFinanceSettings } from "./finance";
import { readPrivateFile, putPrivateFile } from "./privateBlob";
import { readTbMonth } from "./acct";
import { norm } from "./acctRules";
import { specialtyOf } from "./financeAgg";
import { officialDoctor, shownName } from "./financeNames";
import type { Locale } from "./i18n";
import {
  KPI_KEYS,
  OPS_BRANCHES,
  discounts,
  kpi,
  patientsByDoctor,
  patientsForMonth,
  productivity,
  productivityByDoctor,
  returnWithin90,
  shiftMonth,
  type BranchFilter,
  type KpiKey,
  type OpsBranch,
  type OpsInvoice,
} from "./opsMetrics";
import type { Specialty } from "./financeTypes";
import { readAppointmentsMonth, type StoredAppt } from "./opsAppointments";
import { appointmentStates, type Appointment } from "./opsMetrics";

// --- Settings ---

export type OpsSettings = {
  /** Dental chairs per branch (empty until the management enters them). */
  chairs: Partial<Record<OpsBranch, number>>;
  /** A target per card (ratios as fractions, amounts in SAR). */
  targets: Partial<Record<KpiKey, number>>;
  /** A branch or doctor above this discount ratio is flagged. */
  discountThreshold: number;
  /** Al-Maghrabi copy: doctor-level indicators (default: branches only). */
  maghrabiDoctorLevel: boolean;
};

const SETTINGS_PATH = "ops/settings.json";

export async function readOpsSettings(): Promise<OpsSettings> {
  let saved: Partial<OpsSettings> | null = null;
  try {
    const bytes = await readPrivateFile(SETTINGS_PATH);
    saved = bytes ? (JSON.parse(new TextDecoder().decode(bytes)) as Partial<OpsSettings>) : null;
  } catch {
    saved = null;
  }
  return {
    chairs: saved?.chairs ?? {},
    targets: saved?.targets ?? {},
    discountThreshold: saved?.discountThreshold ?? 0.3,
    maghrabiDoctorLevel: saved?.maghrabiDoctorLevel ?? false,
  };
}

export const saveOpsSettings = (s: OpsSettings) => putPrivateFile(SETTINGS_PATH, new TextEncoder().encode(JSON.stringify(s)), "application/json");

// --- Invoices ---

/** The clinics' invoices of the months given (the lab and cancelled invoices left out). */
async function readInvoices(months: string[], locale: Locale): Promise<OpsInvoice[]> {
  const [settings, doctors] = await Promise.all([readFinanceSettings(), getDoctors().catch(() => [])]);
  const names = new Map<string, string>();
  const official = (pms: string) => {
    if (!names.has(pms)) {
      const d = officialDoctor(pms, doctors);
      names.set(pms, d ? shownName(d, locale) : pms);
    }
    return names.get(pms)!;
  };
  const files = await Promise.all(months.map((m) => readMonthLines(m).catch(() => null)));
  const out: OpsInvoice[] = [];
  for (const data of files) {
    if (!data) continue;
    const groups = new Map<string, typeof data.lines>();
    for (const line of data.lines) {
      if (line.branch === "lab" || line.cancelled) continue;
      const key = `${line.date}|${line.branch}|${line.inv}`;
      const list = groups.get(key);
      if (list) list.push(line);
      else groups.set(key, [line]);
    }
    for (const lines of groups.values()) {
      const first = lines[0];
      const byDoctor = new Map<string, number>();
      const byGroup: OpsInvoice["groups"] = {};
      let topService = { service: "", discount: -1 };
      for (const l of lines) {
        byDoctor.set(l.doctor, (byDoctor.get(l.doctor) ?? 0) + Math.abs(l.net));
        const g = specialtyOf(l.service, l.doctor, settings) as Specialty;
        const t = (byGroup[g] ??= { gross: 0, discount: 0, net: 0 });
        t.gross += l.gross;
        t.discount += l.discount;
        t.net += l.net;
        if (l.discount > topService.discount) topService = { service: l.service ?? "", discount: l.discount };
      }
      const doctor = [...byDoctor.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? first.doctor;
      out.push({
        inv: first.inv,
        date: first.date,
        branch: first.branch as OpsBranch,
        doctor: official(doctor),
        pkey: first.patient ?? "",
        gross: lines.reduce((s, l) => s + l.gross, 0),
        discount: lines.reduce((s, l) => s + l.discount, 0),
        net: lines.reduce((s, l) => s + l.net, 0),
        sale: first.kind === "invoice" || first.kind === "credit",
        service: topService.service.slice(0, 60),
        groups: byGroup,
      });
    }
  }
  return out;
}

/** Every stored month, oldest first (the history for «first visit in the branch»). */
async function storedMonths(): Promise<string[]> {
  return Object.keys(await readMonthTotals()).sort();
}

// --- The tabs ---

export type OpsTab = "opsPatients" | "opsAppointments" | "opsProductivity" | "opsDiscounts";
export const OPS_TABS: OpsTab[] = ["opsPatients", "opsAppointments", "opsProductivity", "opsDiscounts"];
export const OPS_TAB_NAMES: Record<"ar" | "en", Record<OpsTab, string>> = {
  ar: { opsPatients: "المرضى الجدد والعائدون", opsAppointments: "الحضور والمواعيد", opsProductivity: "الإنتاجية", opsDiscounts: "الخصومات" },
  en: { opsPatients: "New & returning patients", opsAppointments: "Attendance & appointments", opsProductivity: "Productivity", opsDiscounts: "Discounts" },
};

const last12 = (month: string) => Array.from({ length: 12 }, (_, i) => shiftMonth(month, i - 11));

/** The TB discounts of a month: 4107 Abha, 4108 Khamis (debit − credit, with unposted entries). */
async function tbDiscounts(month: string): Promise<Partial<Record<OpsBranch, number>> | null> {
  const file = (await readTbMonth(month).catch(() => null))?.["all|all"];
  if (!file) return null;
  const sum = (prefix: string) => Math.round(file.rows.filter((r) => norm(r.code).startsWith(prefix)).reduce((s, r) => s + r.dr - r.cr, 0) * 100) / 100;
  return { abha: sum("4107"), khamis: sum("4108") };
}

/** Now in Riyadh, YYYY-MM-DDTHH:mm (appointments after it are still to come). */
const riyadhNow = () => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value])
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
};

/** Before 15:00: the morning shift; from 15:00: the evening shift. */
const shiftOf = (at: string) => (at.slice(11, 16) < "15:00" ? "morning" : "evening");

/** The appointments part of «الحضور والمواعيد» (no patient code leaves this function). */
function appointmentsView(stored: StoredAppt[], month: string, branch: BranchFilter, doctorLevel: boolean, official: (pms: string) => string, months: string[]) {
  const now = riyadhNow();
  const inScope = stored.filter((a) => branch === "all" || a.branch === branch);
  const asAppt = (a: StoredAppt, i: number): Appointment => ({ id: String(i), at: a.at, branch: a.branch, doctor: a.doctor, attended: a.state === "attended", cancelled: a.state === "cancelled" });
  const of = (list: StoredAppt[]) => appointmentStates(list.map(asAppt), now);
  const monthRows = inScope.filter((a) => a.at.startsWith(month));
  const prev = shiftMonth(month, -1);
  const prevRows = inScope.filter((a) => a.at.startsWith(prev));
  const groupBy = <K extends string>(list: StoredAppt[], keyOf: (a: StoredAppt) => K) => {
    const map = new Map<K, StoredAppt[]>();
    for (const a of list) {
      const k = keyOf(a);
      const l = map.get(k);
      if (l) l.push(a);
      else map.set(k, [a]);
    }
    return map;
  };
  const statusWords = [...groupBy(monthRows, (a) => `${a.status || "—"}|${a.state}`).entries()]
    .map(([k, l]) => ({ status: k.split("|")[0], state: l[0].state, count: l.length }))
    .sort((a, b) => b.count - a.count);
  const newOld = { new: monthRows.filter((a) => a.newOld === "new").length, old: monthRows.filter((a) => a.newOld === "old").length };
  return {
    has: stored.length > 0,
    hasMonth: monthRows.length > 0,
    now: of(monthRows),
    prev: prevRows.length ? of(prevRows) : null,
    byBranch: OPS_BRANCHES.filter((b) => branch === "all" || b === branch).map((b) => ({ branch: b, ...of(monthRows.filter((a) => a.branch === b)) })),
    byShift: (["morning", "evening"] as const).map((s) => ({ shift: s, ...of(monthRows.filter((a) => shiftOf(a.at) === s)) })),
    byDoctor: doctorLevel
      ? [...groupBy(monthRows, (a) => official(a.doctor)).entries()].map(([name, l]) => ({ name, ...of(l) })).sort((a, b) => b.booked - a.booked)
      : null,
    trend: months.map((m) => ({ month: m, ...of(inScope.filter((a) => a.at.startsWith(m))) })),
    statusWords,
    newOld,
    confirmed: monthRows.filter((a) => a.confirmed).length,
  };
}

export async function loadOps(args: { month: string; branch: BranchFilter; doctorLevel: boolean; locale: Locale; upTo: string }) {
  const { month, branch, doctorLevel, locale, upTo } = args;
  const [settings, allMonths] = await Promise.all([readOpsSettings(), storedMonths()]);
  // This year's records only (the management's choice): «new» = first invoice in the branch this year.
  const year = month.slice(0, 4);
  const months = allMonths.filter((m) => m.startsWith(year));
  const historyStart = `${year}-01`;
  const wanted = months.filter((m) => m <= month);
  const [invoices, apptFiles, doctorsList] = await Promise.all([
    readInvoices(wanted, locale),
    Promise.all(wanted.map((m) => readAppointmentsMonth(m))),
    getDoctors().catch(() => []),
  ]);
  const officialName = (pms: string) => {
    const d = officialDoctor(pms, doctorsList);
    return d ? shownName(d, locale) : pms;
  };
  const prev = shiftMonth(month, -1);
  const hasMonth = (m: string) => months.includes(m);

  // Cards: this month and the one before.
  const pat = patientsForMonth(invoices, month, branch, historyStart);
  const patPrev = hasMonth(prev) ? patientsForMonth(invoices, prev, branch, historyStart) : null;
  const prod = productivity(invoices, month, branch, settings.chairs);
  const prodPrev = hasMonth(prev) ? productivity(invoices, prev, branch, settings.chairs) : null;
  const disc = discounts(invoices, month, branch);
  const discPrev = hasMonth(prev) ? discounts(invoices, prev, branch) : null;
  const t = settings.targets;
  const trendMonthsAll = last12(month).filter((m) => m.startsWith(year) && m <= month);
  const appts = appointmentsView(apptFiles.flat(), month, branch, doctorLevel, officialName, trendMonthsAll);
  const cards = KPI_KEYS.map((key) => {
    switch (key) {
      case "newPct":
        return kpi(key, pat.newPct, patPrev?.newPct ?? null, t.newPct ?? null);
      case "attendance":
        return kpi(key, appts.hasMonth ? appts.now.attendance : null, appts.prev?.attendance ?? null, t.attendance ?? null);
      case "noShow":
        return kpi(key, appts.hasMonth ? appts.now.noShowRate : null, appts.prev?.noShowRate ?? null, t.noShow ?? null);
      case "perChairDay":
        return kpi(key, prod.perChairDay, prodPrev?.perChairDay ?? null, t.perChairDay ?? null);
      case "perDay":
        return kpi(key, prod.perDay, prodPrev?.perDay ?? null, t.perDay ?? null);
      case "discountPct":
        return kpi(key, disc.total.pct, discPrev?.total.pct ?? null, t.discountPct ?? null);
    }
  });

  const trendMonths = last12(month).filter((m) => m.startsWith(year) && hasMonth(m));
  const patientsTrend = trendMonths.map((m) => {
    const p = patientsForMonth(invoices, m, branch, historyStart);
    return { month: m, newPatients: p.newPatients.patients, returning: p.returning.patients, newPct: p.newPct, partial: p.partialHistory };
  });
  const patientsTrendByBranch = OPS_BRANCHES.map((b) => ({
    branch: b,
    points: trendMonths.map((m) => ({ month: m, newPct: patientsForMonth(invoices, m, b, historyStart).newPct })),
  }));
  const cohorts = trendMonths.map((m) => returnWithin90(invoices, m, branch, upTo));
  const productivityTrend = trendMonths.map((m) => ({ month: m, ...productivity(invoices, m, branch, settings.chairs) }));
  const productivityByBranch = OPS_BRANCHES.map((b) => ({
    branch: b,
    now: productivity(invoices, month, b, settings.chairs),
    prev: hasMonth(prev) ? productivity(invoices, prev, b, settings.chairs) : null,
  }));
  const discountTrend = trendMonths.map((m) => ({ month: m, ...discounts(invoices, m, branch).total }));
  const tb = await tbDiscounts(month);
  const tbCheck = OPS_BRANCHES.filter((b) => branch === "all" || b === branch).map((b) => {
    const pms = disc.byBranch.find((x) => x.key === b)?.discount ?? 0;
    const acct = tb ? tb[b] ?? null : null;
    return { branch: b, account: b === "abha" ? "4107" : "4108", pms, tb: acct, diff: acct === null ? null : Math.round((pms - acct) * 100) / 100 };
  });
  const over = [
    ...disc.byBranch.filter((x) => (x.pct ?? 0) > settings.discountThreshold).map((x) => ({ level: "branch" as const, name: x.key, pct: x.pct! })),
    ...(doctorLevel ? disc.byDoctor.filter((x) => (x.pct ?? 0) > settings.discountThreshold && x.gross > 0).map((x) => ({ level: "doctor" as const, name: x.key, pct: x.pct! })) : []),
  ];

  return {
    month,
    branch,
    doctorLevel,
    hasData: hasMonth(month),
    historyStart,
    settings: { chairs: settings.chairs, discountThreshold: settings.discountThreshold, targets: settings.targets },
    cards,
    patients: {
      now: pat,
      trend: patientsTrend,
      trendByBranch: patientsTrendByBranch,
      cohorts,
      byDoctor: doctorLevel ? patientsByDoctor(invoices, month, branch) : null,
    },
    productivity: {
      now: prod,
      prev: prodPrev,
      byBranch: productivityByBranch,
      trend: productivityTrend,
      byDoctor: doctorLevel ? productivityByDoctor(invoices, month, branch) : null,
    },
    discounts: {
      total: disc.total,
      byBranch: disc.byBranch,
      byGroup: disc.byGroup,
      byDoctor: doctorLevel ? disc.byDoctor : null,
      top: doctorLevel ? disc.top : null,
      trend: discountTrend,
      tbCheck,
      over,
    },
    appointments: appts,
    year,
    /** Months that can be chosen: every stored month (the indicators of a month use its year's records). */
    months: allMonths.slice(-24),
  };
}

export type OpsData = Awaited<ReturnType<typeof loadOps>>;
