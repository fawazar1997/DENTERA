// «الأداء التشغيلي»: the clinics' operating indicators, from the PMS invoices
// already stored (Abha and Khamis only: the lab is never part of them).
//
// Pure functions (no storage): `lib/opsData.ts` reads the invoices, these turn
// them into what the tabs show. A patient key is used here to count people and
// is never part of the output.

import type { Specialty } from "./financeTypes";

export type OpsBranch = "abha" | "khamis";
export const OPS_BRANCHES: OpsBranch[] = ["abha", "khamis"];

/** One clinic invoice (summed from its lines). */
export type OpsInvoice = {
  inv: string;
  date: string;
  branch: OpsBranch;
  /** The doctor with the largest share of the invoice (official name). */
  doctor: string;
  /** Internal only: the PMS file number, never shown or sent to a page. */
  pkey: string;
  gross: number;
  discount: number;
  net: number;
  /** A sale (invoice / credit) or a correction (return / credit note: no visit). */
  sale: boolean;
  /** The service with the largest discount (for the top discounts), and the net by service group. */
  service: string;
  groups: Partial<Record<Specialty, { gross: number; discount: number; net: number }>>;
};

export type BranchFilter = OpsBranch | "all";
const inBranch = (b: BranchFilter) => (i: OpsInvoice) => b === "all" || i.branch === b;
const monthOf = (d: string) => d.slice(0, 7);
const round2 = (n: number) => Math.round(n * 100) / 100;
export const shiftMonth = (m: string, by: number) => {
  const [y, mm] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mm - 1 + by, 1));
  return d.toISOString().slice(0, 7);
};
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const ratio = (a: number, b: number) => (b ? a / b : null);

// --- New and returning patients ---

/** Each patient's visits per branch, sorted (sales only). */
function visitsByBranch(invoices: OpsInvoice[]) {
  const map = new Map<string, string[]>(); // branch|pkey → dates
  for (const i of invoices) {
    if (!i.sale || !i.pkey) continue;
    const k = `${i.branch}|${i.pkey}`;
    const list = map.get(k);
    if (list) list.push(i.date);
    else map.set(k, [i.date]);
  }
  for (const list of map.values()) list.sort();
  return map;
}

export type PatientGroup = { patients: number; invoices: number; revenue: number; avg: number | null };
export type PatientsPeriod = {
  month: string;
  newPatients: PatientGroup;
  returning: PatientGroup;
  newPct: number | null;
  /** The history before this month is shorter than a year: «new» may include returning patients. */
  partialHistory: boolean;
};

/**
 * New = the patient's first visit (invoice) in the branch falls in the month; returning = they had
 * one before. «All branches»: each person once, new if new in a branch where they came that month.
 */
export function patientsForMonth(invoices: OpsInvoice[], month: string, branch: BranchFilter, historyStart: string): PatientsPeriod {
  const first = new Map<string, string>(); // branch|pkey → first date
  for (const [k, dates] of visitsByBranch(invoices)) first.set(k, dates[0]);
  const sales = invoices.filter((i) => i.sale && monthOf(i.date) === month && inBranch(branch)(i));
  const corrections = invoices.filter((i) => !i.sale && monthOf(i.date) === month && inBranch(branch)(i));
  const isNew = (i: OpsInvoice) => monthOf(first.get(`${i.branch}|${i.pkey}`) ?? month) === month;
  // A person: new if any of their branches this month is a first visit (all branches), else per branch.
  const personNew = new Map<string, boolean>();
  for (const i of sales) {
    const person = branch === "all" ? i.pkey : `${i.branch}|${i.pkey}`;
    personNew.set(person, (personNew.get(person) ?? false) || isNew(i));
  }
  const group = (wantNew: boolean): PatientGroup => {
    const people = new Set<string>();
    let invoicesN = 0;
    let revenue = 0;
    for (const i of sales) {
      const person = branch === "all" ? i.pkey : `${i.branch}|${i.pkey}`;
      if (personNew.get(person) !== wantNew) continue;
      people.add(person);
      invoicesN++;
      revenue += i.net;
    }
    // Returns and credit notes reduce the group's revenue (by the patient's group).
    for (const c of corrections) {
      const person = branch === "all" ? c.pkey : `${c.branch}|${c.pkey}`;
      if (personNew.get(person) === wantNew) revenue += c.net;
    }
    return { patients: people.size, invoices: invoicesN, revenue: round2(revenue), avg: invoicesN ? round2(revenue / invoicesN) : null };
  };
  const n = group(true);
  const r = group(false);
  return {
    month,
    newPatients: n,
    returning: r,
    newPct: ratio(n.patients, n.patients + r.patients),
    partialHistory: shiftMonth(month, -12) < historyStart,
  };
}

/** By doctor (the branch definition of «new»): new and returning patients seen by each doctor. */
export function patientsByDoctor(invoices: OpsInvoice[], month: string, branch: BranchFilter) {
  const first = new Map<string, string>();
  for (const [k, dates] of visitsByBranch(invoices)) first.set(k, dates[0]);
  const rows = new Map<string, { doctor: string; newP: Set<string>; retP: Set<string>; revenue: number; invoices: number }>();
  for (const i of invoices) {
    if (!i.sale || monthOf(i.date) !== month || !inBranch(branch)(i)) continue;
    const row = rows.get(i.doctor) ?? { doctor: i.doctor, newP: new Set(), retP: new Set(), revenue: 0, invoices: 0 };
    const k = `${i.branch}|${i.pkey}`;
    (monthOf(first.get(k) ?? month) === month ? row.newP : row.retP).add(k);
    row.revenue += i.net;
    row.invoices++;
    rows.set(i.doctor, row);
  }
  return [...rows.values()]
    .map((r) => ({
      doctor: r.doctor,
      newPatients: r.newP.size,
      returning: r.retP.size,
      newPct: ratio(r.newP.size, r.newP.size + r.retP.size),
      revenue: round2(r.revenue),
      avg: r.invoices ? round2(r.revenue / r.invoices) : null,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

/**
 * 90-day return: of the month's new patients (per branch), those with a second visit in the same
 * branch within 90 days of the first. A cohort whose 90 days haven't all passed is not final.
 */
export function returnWithin90(invoices: OpsInvoice[], month: string, branch: BranchFilter, upTo: string) {
  let cohort = 0;
  let returned = 0;
  let lastFirst = "";
  for (const [k, dates] of visitsByBranch(invoices)) {
    const b = k.split("|")[0] as OpsBranch;
    if (branch !== "all" && b !== branch) continue;
    if (monthOf(dates[0]) !== month) continue;
    cohort++;
    if (dates[0] > lastFirst) lastFirst = dates[0];
    const limit = addDays(dates[0], 90);
    if (dates.some((d) => d > dates[0] && d <= limit)) returned++;
  }
  const lastDay = `${month}-${String(new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).getUTCDate()).padStart(2, "0")}`;
  return { month, cohort, returned, rate: ratio(returned, cohort), complete: daysBetween(lastDay, upTo) >= 90 };
}

// --- Productivity ---

export type Productivity = {
  net: number;
  workingDays: number;
  perDay: number | null;
  chairDays: number | null;
  perChairDay: number | null;
};

/**
 * A working day = a date with an invoice. Per chair-day: net ÷ (chairs × working days), per branch;
 * for all branches, the sum of the nets ÷ the sum of (chairs × days). Missing chairs: not available.
 */
export function productivity(invoices: OpsInvoice[], month: string, branch: BranchFilter, chairs: Partial<Record<OpsBranch, number>>): Productivity {
  const branches = branch === "all" ? OPS_BRANCHES : [branch];
  let net = 0;
  let days = 0;
  let chairDays = 0;
  let chairsKnown = true;
  for (const b of branches) {
    const list = invoices.filter((i) => i.branch === b && monthOf(i.date) === month);
    const d = new Set(list.filter((i) => i.sale).map((i) => i.date)).size;
    net += list.reduce((s, i) => s + i.net, 0);
    days += d;
    const c = chairs[b];
    if (!c || c <= 0) chairsKnown = false;
    else chairDays += c * d;
  }
  return {
    net: round2(net),
    workingDays: days,
    perDay: days ? round2(net / days) : null,
    chairDays: chairsKnown ? chairDays : null,
    perChairDay: chairsKnown && chairDays ? round2(net / chairDays) : null,
  };
}

/** Per doctor: net ÷ the days with an invoice of theirs. */
export function productivityByDoctor(invoices: OpsInvoice[], month: string, branch: BranchFilter) {
  const rows = new Map<string, { doctor: string; net: number; days: Set<string> }>();
  for (const i of invoices) {
    if (monthOf(i.date) !== month || !inBranch(branch)(i)) continue;
    const row = rows.get(i.doctor) ?? { doctor: i.doctor, net: 0, days: new Set<string>() };
    row.net += i.net;
    if (i.sale) row.days.add(i.date);
    rows.set(i.doctor, row);
  }
  return [...rows.values()]
    .map((r) => ({ doctor: r.doctor, net: round2(r.net), days: r.days.size, perDay: r.days.size ? round2(r.net / r.days.size) : null }))
    .sort((a, b) => b.net - a.net);
}

// --- Discounts ---

export type DiscountTotals = { gross: number; discount: number; pct: number | null };
const discountOf = (list: OpsInvoice[]): DiscountTotals => {
  const gross = list.reduce((s, i) => s + i.gross, 0);
  const discount = list.reduce((s, i) => s + i.discount, 0);
  return { gross: round2(gross), discount: round2(discount), pct: ratio(discount, gross) };
};

/** Discounts ÷ revenue before discount, from the totals of the scope (sales only). */
export function discounts(invoices: OpsInvoice[], month: string, branch: BranchFilter) {
  const list = invoices.filter((i) => i.sale && monthOf(i.date) === month && inBranch(branch)(i));
  const byKey = <K extends string>(key: (i: OpsInvoice) => K) => {
    const m = new Map<K, OpsInvoice[]>();
    for (const i of list) m.set(key(i), [...(m.get(key(i)) ?? []), i]);
    return [...m.entries()].map(([k, l]) => ({ key: k, ...discountOf(l) })).sort((a, b) => b.discount - a.discount);
  };
  const groups: Partial<Record<Specialty, DiscountTotals>> = {};
  for (const i of list)
    for (const [g, v] of Object.entries(i.groups) as [Specialty, { gross: number; discount: number }][]) {
      const t = (groups[g] ??= { gross: 0, discount: 0, pct: null });
      t.gross += v.gross;
      t.discount += v.discount;
    }
  for (const t of Object.values(groups)) {
    t!.gross = round2(t!.gross);
    t!.discount = round2(t!.discount);
    t!.pct = ratio(t!.discount, t!.gross);
  }
  const top = [...list]
    .filter((i) => i.discount > 0)
    .sort((a, b) => b.discount - a.discount)
    .slice(0, 10)
    .map((i) => ({ inv: i.inv, date: i.date, branch: i.branch, doctor: i.doctor, service: i.service, discount: round2(i.discount), pct: ratio(i.discount, i.gross) }));
  return { total: discountOf(list), byBranch: byKey((i) => i.branch), byDoctor: byKey((i) => i.doctor), byGroup: groups, top };
}

// --- Appointments (once the PMS appointments report is imported) ---

export type Appointment = {
  id: string;
  /** Scheduled start, ISO in Riyadh time (YYYY-MM-DDTHH:mm). */
  at: string;
  branch: OpsBranch;
  doctor: string;
  attended: boolean;
  cancelled: boolean;
  /** When it was cancelled (ISO, Riyadh); missing: the cancellation can't be classed. */
  cancelledAt?: string;
};

/**
 * The 5 states over the appointments scheduled in the period. A cancellation 24 h or more before
 * the appointment is early, under 24 h late. Attendance and no-show are over (booked − early
 * cancellations), for appointments whose time has passed only; future ones stay in «booked».
 */
export function appointmentStates(list: Appointment[], now: string) {
  let booked = 0;
  let future = 0;
  let early = 0;
  let late = 0;
  let unknownCancel = 0;
  let attended = 0;
  let noShow = 0;
  for (const a of list) {
    booked++;
    if (a.cancelled) {
      if (!a.cancelledAt) unknownCancel++;
      else if (Date.parse(`${a.at}:00Z`) - Date.parse(`${a.cancelledAt}:00Z`) >= 24 * 3600_000) early++;
      else late++;
      continue;
    }
    if (a.at > now) {
      future++;
      continue;
    }
    if (a.attended) attended++;
    else noShow++;
  }
  const base = booked - future - early - unknownCancel;
  return { booked, future, early, late, unknownCancel, attended, noShow, base, attendance: ratio(attended, base), noShowRate: ratio(noShow, base) };
}

// --- The 6 cards ---

export type KpiKey = "newPct" | "attendance" | "noShow" | "perChairDay" | "perDay" | "discountPct";
export const KPI_KEYS: KpiKey[] = ["newPct", "attendance", "noShow", "perChairDay", "perDay", "discountPct"];
/** Higher is better, except no-show and discounts. */
export const KPI_HIGHER_BETTER: Record<KpiKey, boolean> = { newPct: true, attendance: true, noShow: false, perChairDay: true, perDay: true, discountPct: false };

export type Kpi = { key: KpiKey; value: number | null; previous: number | null; change: number | null; target: number | null; tone: "good" | "warn" | "bad" | null };

/** Green at or past the target, amber within 10% of it, red beyond. */
export function kpiTone(key: KpiKey, value: number | null, target: number | null): Kpi["tone"] {
  if (value === null || target === null || !target) return null;
  const higher = KPI_HIGHER_BETTER[key];
  const gap = higher ? (value - target) / Math.abs(target) : (target - value) / Math.abs(target);
  return gap >= 0 ? "good" : gap >= -0.1 ? "warn" : "bad";
}

export function kpi(key: KpiKey, value: number | null, previous: number | null, target: number | null): Kpi {
  return { key, value, previous, change: value !== null && previous ? (value - previous) / Math.abs(previous) : null, target, tone: kpiTone(key, value, target) };
}
