// Demo data for the financial dashboard (shown only when asked, clearly
// labelled, never stored): realistic invoice lines and payments for the
// months around a date, so the dashboard can be reviewed before the
// clinic system's data arrives.

import { aggregateMonth } from "./financeAgg";
import { addDays, daysInMonth, monthOf, shiftMonth, weekday, type Aggs, type MonthTotals } from "./financeMetrics";
import type { FinLine, FinPayment, FinanceBranch, Installments, PayMethod } from "./financeTypes";

const DOCTORS: { name: string; branch: FinanceBranch; level: number; service: string }[] = [
  { name: "Prof. Ibrahim AlShahrani", branch: "abha", level: 3.2, service: "Implant fixture" },
  { name: "Prof. Manea Al-Ahmari", branch: "abha", level: 2.6, service: "Invisalign treatment" },
  { name: "Dr.Ali Alqahtani", branch: "khamis", level: 2.1, service: "Implant crown" },
  { name: "Dr. Waleed Saeed Asiri", branch: "abha", level: 1.9, service: "Composite veneer" },
  { name: "Dr. Raed Abdullah Al-Manea", branch: "abha", level: 1.7, service: "Orthodontic braces" },
  { name: "Dr. Abdullah Awn", branch: "abha", level: 1.5, service: "Root canal" },
  { name: "Dr. Malek abazeed", branch: "khamis", level: 1.4, service: "E-max crown" },
  { name: "Dr. Abdulmajeed Al-Shahrani", branch: "abha", level: 1.3, service: "Scaling" },
  { name: "Dr. Mohammed Thamer Alqahtani", branch: "khamis", level: 1.1, service: "Implant fixture" },
  { name: "Dr. Ola Daoud", branch: "abha", level: 1.0, service: "Whitening" },
  { name: "Dr. Lujain Alasiri", branch: "khamis", level: 0.9, service: "Filling" },
  { name: "Dr. Ghadeer Saleh Al-Wadaei", branch: "abha", level: 0.7, service: "Filling" },
  { name: "Dr. Saad Sabrah", branch: "khamis", level: 0.6, service: "Extraction" },
  { name: "Dental Lab", branch: "lab", level: 0.8, service: "Lab work" },
];

/** A small seeded random generator (same date → same data). */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const seedOf = (text: string) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

function demoMonth(month: string, current: string): { lines: FinLine[]; payments: FinPayment[] } {
  const lines: FinLine[] = [];
  const payments: FinPayment[] = [];
  const n = daysInMonth(month);
  const season = 1 + 0.15 * Math.sin((+month.slice(5, 7) / 12) * Math.PI * 2);
  for (let i = 1; i <= n; i++) {
    const date = `${month}-${String(i).padStart(2, "0")}`;
    if (weekday(date) === 5) continue; // Friday
    const r = rng(seedOf(date));
    let inv = 0;
    for (const doc of DOCTORS) {
      // A few doctors have off days; one slows down recently.
      if (r() < 0.12) continue;
      const slow = doc.name.includes("Abdullah Awn") && month === current ? 0.55 : 1;
      const visits = Math.max(0, Math.round((3 + r() * 5) * doc.level * slow));
      for (let v = 0; v < visits; v++) {
        inv++;
        const gross = Math.round((600 + r() * 2400) * (doc.level > 2 ? 1.8 : 1) * season);
        const pct = r() < 0.07 ? 0.45 + r() * 0.2 : r() * 0.25;
        const discount = Math.round(gross * pct);
        const net = gross - discount;
        const kind = r() < 0.08 ? "credit" : r() < 0.015 ? "return" : "invoice";
        lines.push({
          inv: `${doc.branch}-${date.replace(/-/g, "")}${String(inv).padStart(3, "0")}`,
          date,
          branch: doc.branch,
          doctor: doc.name,
          patient: `P${Math.floor(r() * 90000) + 10000}`,
          hasId: r() > 0.04,
          gross,
          discount,
          net: kind === "return" ? -net : net,
          kind,
          cancelled: r() < 0.01 || undefined,
          service: doc.service,
        });
        const method: PayMethod = (["cash", "card", "card", "card", "transfer", "tabby", "tamara"] as PayMethod[])[Math.floor(r() * 7)];
        if (kind === "invoice") payments.push({ date, branch: doc.branch, method, amount: net });
      }
    }
  }
  return { lines, payments };
}

export function demoData(date: string): { aggs: Aggs; history: MonthTotals; installments: Installments } {
  const month = monthOf(date);
  const months = [0, -1, -2, -3, -12].map((k) => shiftMonth(month, k));
  const aggs: Aggs = {};
  for (const m of months) {
    const { lines, payments } = demoMonth(m, month);
    // Only up to the chosen day in its own month.
    const upTo = (d: string) => d <= date;
    aggs[m] = aggregateMonth(m, lines.filter((l) => upTo(l.date)), payments.filter((p) => upTo(p.date)), { doctorSpecialty: {} });
  }
  const history: MonthTotals = {};
  for (let k = 1; k <= 14; k++) {
    const m = shiftMonth(month, -k);
    const season = 1 + 0.15 * Math.sin((+m.slice(5, 7) / 12) * Math.PI * 2);
    history[m] = Math.round(5_100_000 * season * (daysInMonth(m) / 30));
  }
  return {
    aggs,
    history,
    installments: {
      at: `${addDays(date, 0)}T06:00:00Z`,
      dueToday: { count: 14, amount: 18650 },
      overdue: { count: 37, amount: 61200, patients: 22 },
      remaining: { amount: 1284500, patients: 186 },
    },
  };
}
