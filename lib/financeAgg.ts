// Turning a month's invoice lines and payments into its daily summary (per
// branch): revenue, discounts, invoices, patients, doctors, specialties,
// payment methods and the quality lists. Pure: used when data is imported
// and when the settings that shape it change.

import {
  HIGH_DISCOUNT,
  emptyBranchDay,
  type BranchDay,
  type FinLine,
  type FinPayment,
  type FinanceBranch,
  type FinanceSettings,
  type FlagRef,
  type MonthAgg,
  type SalesInvoice,
  type Specialty,
} from "./financeTypes";

const SPECIALTY_RULES: [Specialty, RegExp][] = [
  ["implant", /implant|abutment|bone ?graft|sinus|زراع|زرع|طعم عظم|رفع الجيب/i],
  ["ortho", /ortho|invisalign|aligner|braces|retainer|bracket|تقويم|انفزلاين|إنفزلاين|انفيزالاين|مثبت/i],
  ["cosmetic", /veneer|lumineer|cosmetic|whiten|bleach|smile|hollywood|e-?max|zircon|فينير|لومينير|تجميل|تبييض|ابتسام|زركون|عدسات/i],
];

/** A line's specialty: from its service, else the doctor's, else general. */
export function specialtyOf(service: string | undefined, doctor: string, settings: Pick<FinanceSettings, "doctorSpecialty">): Specialty {
  const text = service ?? "";
  for (const [specialty, re] of SPECIALTY_RULES) if (re.test(text)) return specialty;
  return settings.doctorSpecialty[doctor] ?? "general";
}

const round = (n: number) => Math.round(n * 100) / 100;
const MAX_FLAGS = 300;

/**
 * `sales`: the PMS Sales Report's invoices. Where a day has them, its revenue,
 * invoices, patients, credit and returns come from them (the main source);
 * doctors, specialties and the quality lists still come from the detailed
 * lines.
 */
export function aggregateMonth(
  month: string,
  lines: FinLine[],
  payments: FinPayment[],
  settings: Pick<FinanceSettings, "doctorSpecialty">,
  sales: SalesInvoice[] = []
): MonthAgg {
  const days: MonthAgg["days"] = {};
  const dayOf = (date: string, branch: FinanceBranch): BranchDay => {
    const d = (days[date] ??= {});
    return (d[branch] ??= emptyBranchDay());
  };

  // Group lines by day, branch and invoice.
  const groups = new Map<string, FinLine[]>();
  for (const line of lines) {
    if (!line.date.startsWith(month)) continue;
    const key = `${line.date}|${line.branch}|${line.inv}`;
    const list = groups.get(key);
    if (list) list.push(line);
    else groups.set(key, [line]);
  }

  const patientsByDay = new Map<string, Set<string>>();
  const doctorSets = new Map<string, { invoices: Set<string>; patients: Set<string> }>();

  for (const [key, invLines] of groups) {
    const [date, branch] = key.split("|") as [string, FinanceBranch];
    const day = dayOf(date, branch);
    const first = invLines[0];
    const gross = invLines.reduce((s, l) => s + l.gross, 0);
    const discount = invLines.reduce((s, l) => s + l.discount, 0);
    const net = invLines.reduce((s, l) => s + l.net, 0);
    const cancelled = invLines.every((l) => l.cancelled);
    const ref: FlagRef = {
      inv: first.inv,
      doctor: first.doctor,
      patient: first.patient,
      net: round(net),
      gross: round(gross),
      discountPct: gross > 0 ? round((discount / gross) * 100) : 0,
    };

    if (cancelled) {
      day.cancelled.count++;
      day.cancelled.amount += Math.abs(net);
      if (day.flags.cancelled.length < MAX_FLAGS) day.flags.cancelled.push(ref);
      continue;
    }

    day.net += net;
    day.gross += gross;
    day.discount += discount;

    if (first.kind === "return" || first.kind === "creditNote") {
      const bucket = first.kind === "return" ? day.returns : day.creditNotes;
      bucket.count++;
      bucket.amount += Math.abs(net);
    } else {
      day.invoices++;
      if (first.kind === "credit") {
        day.credit.count++;
        day.credit.amount += net;
      }
      const pKey = `${date}|${branch}`;
      if (!patientsByDay.has(pKey)) patientsByDay.set(pKey, new Set());
      patientsByDay.get(pKey)!.add(first.patient);
      if (gross > 0 && discount / gross > HIGH_DISCOUNT && day.flags.highDiscount.length < MAX_FLAGS) day.flags.highDiscount.push(ref);
      if (invLines.some((l) => l.hasId === false) && day.flags.noId.length < MAX_FLAGS) day.flags.noId.push(ref);
    }

    for (const line of invLines) {
      day.bySpecialty[specialtyOf(line.service, line.doctor, settings)] += line.net;
      const doc = (day.byDoctor[line.doctor] ??= { net: 0, invoices: 0, patients: 0, discount: 0 });
      doc.net += line.net;
      doc.discount += line.discount;
      const dKey = `${date}|${branch}|${line.doctor}`;
      if (!doctorSets.has(dKey)) doctorSets.set(dKey, { invoices: new Set(), patients: new Set() });
      if (first.kind === "invoice" || first.kind === "credit") {
        doctorSets.get(dKey)!.invoices.add(line.inv);
        doctorSets.get(dKey)!.patients.add(line.patient);
      }
    }
  }

  for (const [key, set] of patientsByDay) {
    const [date, branch] = key.split("|") as [string, FinanceBranch];
    dayOf(date, branch).patients = set.size;
  }
  for (const [key, sets] of doctorSets) {
    const [date, branch, doctor] = key.split("|") as [string, FinanceBranch, string];
    const doc = dayOf(date, branch).byDoctor[doctor];
    doc.invoices = sets.invoices.size;
    doc.patients = sets.patients.size;
  }

  for (const p of payments) {
    if (!p.date.startsWith(month)) continue;
    dayOf(p.date, p.branch).payments[p.method] += p.amount;
  }

  // The Sales Report's days replace the revenue figures from the lines.
  const salesDays = new Set(sales.filter((i) => i.date.startsWith(month)).map((i) => i.date));
  for (const date of salesDays) {
    for (const day of Object.values(days[date] ?? {})) {
      if (!day) continue;
      day.net = 0;
      day.gross = 0;
      day.discount = 0;
      day.invoices = 0;
      day.patients = 0;
      day.credit = { count: 0, amount: 0 };
      day.returns = { count: 0, amount: 0 };
      day.creditNotes = { count: 0, amount: 0 };
    }
  }
  const salesPatients = new Map<string, Set<string>>();
  for (const i of sales) {
    if (!i.date.startsWith(month)) continue;
    const day = dayOf(i.date, i.branch);
    day.net += i.net;
    day.gross += i.gross;
    day.discount += i.discount;
    if (i.kind === "return" || i.kind === "creditNote") {
      const bucket = i.kind === "return" ? day.returns : day.creditNotes;
      bucket.count++;
      bucket.amount += Math.abs(i.net);
      continue;
    }
    day.invoices++;
    if (i.kind === "credit") {
      day.credit.count++;
      day.credit.amount += i.remaining;
    }
    const key = `${i.date}|${i.branch}`;
    if (!salesPatients.has(key)) salesPatients.set(key, new Set());
    salesPatients.get(key)!.add(i.patient);
  }
  for (const [key, set] of salesPatients) {
    const [date, branch] = key.split("|") as [string, FinanceBranch];
    dayOf(date, branch).patients = set.size;
  }

  // Tidy the sums.
  for (const branches of Object.values(days)) {
    for (const day of Object.values(branches)) {
      if (!day) continue;
      day.net = round(day.net);
      day.gross = round(day.gross);
      day.discount = round(day.discount);
      for (const k of Object.keys(day.bySpecialty) as Specialty[]) day.bySpecialty[k] = round(day.bySpecialty[k]);
      for (const k of Object.keys(day.payments) as (keyof BranchDay["payments"])[]) day.payments[k] = round(day.payments[k]);
      for (const d of Object.values(day.byDoctor)) {
        d.net = round(d.net);
        d.discount = round(d.discount);
      }
      for (const b of [day.credit, day.returns, day.creditNotes, day.cancelled]) b.amount = round(b.amount);
    }
  }
  return { month, days, updatedAt: new Date().toISOString() };
}

/** Adds one branch-day into another (for "all branches" and date ranges). */
export function addInto(into: BranchDay, day: BranchDay): BranchDay {
  into.net += day.net;
  into.gross += day.gross;
  into.discount += day.discount;
  into.invoices += day.invoices;
  into.patients += day.patients;
  for (const k of ["credit", "returns", "creditNotes", "cancelled"] as const) {
    into[k].count += day[k].count;
    into[k].amount += day[k].amount;
  }
  for (const k of Object.keys(day.bySpecialty) as Specialty[]) into.bySpecialty[k] += day.bySpecialty[k];
  for (const k of Object.keys(day.payments) as (keyof BranchDay["payments"])[]) into.payments[k] += day.payments[k];
  for (const [name, d] of Object.entries(day.byDoctor)) {
    const t = (into.byDoctor[name] ??= { net: 0, invoices: 0, patients: 0, discount: 0 });
    t.net += d.net;
    t.invoices += d.invoices;
    t.patients += d.patients;
    t.discount += d.discount;
  }
  into.flags.highDiscount.push(...day.flags.highDiscount);
  into.flags.noId.push(...day.flags.noId);
  into.flags.cancelled.push(...day.flags.cancelled);
  return into;
}
