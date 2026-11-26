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

export async function loadOps(args: { month: string; branch: BranchFilter; doctorLevel: boolean; locale: Locale; upTo: string }) {
  const { month, branch, doctorLevel, locale, upTo } = args;
  const [settings, months] = await Promise.all([readOpsSettings(), storedMonths()]);
  const historyStart = months[0] ?? month;
  const wanted = months.filter((m) => m <= month);
  const invoices = await readInvoices(wanted, locale);
  const prev = shiftMonth(month, -1);
  const lastYear = shiftMonth(month, -12);
  const hasMonth = (m: string) => months.includes(m);

  // Cards: this month and the one before.
  const pat = patientsForMonth(invoices, month, branch, historyStart);
  const patPrev = hasMonth(prev) ? patientsForMonth(invoices, prev, branch, historyStart) : null;
  const prod = productivity(invoices, month, branch, settings.chairs);
  const prodPrev = hasMonth(prev) ? productivity(invoices, prev, branch, settings.chairs) : null;
  const prodLy = hasMonth(lastYear) ? productivity(invoices, lastYear, branch, settings.chairs) : null;
  const disc = discounts(invoices, month, branch);
  const discPrev = hasMonth(prev) ? discounts(invoices, prev, branch) : null;
  const t = settings.targets;
  const cards = KPI_KEYS.map((key) => {
    switch (key) {
      case "newPct":
        return kpi(key, pat.newPct, patPrev?.newPct ?? null, t.newPct ?? null);
      case "attendance":
      case "noShow":
        return kpi(key, null, null, t[key] ?? null); // the appointments report isn't imported yet
      case "perChairDay":
        return kpi(key, prod.perChairDay, prodPrev?.perChairDay ?? null, t.perChairDay ?? null);
      case "perDay":
        return kpi(key, prod.perDay, prodPrev?.perDay ?? null, t.perDay ?? null);
      case "discountPct":
        return kpi(key, disc.total.pct, discPrev?.total.pct ?? null, t.discountPct ?? null);
    }
  });

  const trendMonths = last12(month).filter(hasMonth);
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
    lastYear: hasMonth(lastYear) ? productivity(invoices, lastYear, b, settings.chairs) : null,
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
      lastYear: prodLy,
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
    appointments: null as null,
    months: months.slice(-24),
  };
}

export type OpsData = Awaited<ReturnType<typeof loadOps>>;
