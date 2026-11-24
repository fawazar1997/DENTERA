// Reading the clinic system's (PMS) Excel reports into the financial data:
// invoice lines (the detailed sales report), payments by method, and
// Invisalign installments. The kind of report is recognised by its column
// names (English or Arabic); a banner above the header and a «Total» row at
// the end are skipped (rows without a valid date), and dates may come as
// text, Excel day numbers, or with day and month swapped.

import { readSpreadsheet } from "./spreadsheet";
import { readDate, westernDigits } from "./dateParse";
import type { FinLine, FinPayment, FinanceBranch, InvoiceKind, Installments, PayMethod, SalesInvoice } from "./financeTypes";

const norm = (s: unknown) => String(s ?? "").replace(/\s+/g, " ").trim();
const key = (s: string) => norm(s).toLowerCase().replace(/[\s_.\-/()]+/g, "");

type Field = string;
const HEADERS: Record<Field, string[]> = {
  inv: ["invseqno", "invoiceno", "invoicenumber", "invno", "رقمالفاتورة", "الفاتورة"],
  date: ["invdate", "invoicedate", "date", "التاريخ", "تاريخالفاتورة", "paymentdate", "receiptdate", "تاريخالدفع"],
  branch: ["branchname", "branch", "الفرع", "clinic", "العيادة"],
  doctor: ["doctorname", "doctor", "الطبيب", "اسمالطبيب", "dr"],
  patient: ["patientfileno", "fileno", "patientno", "رقمالملف", "patientid", "الملف"],
  patientName: ["patientname", "patientfullname", "patient", "اسمالمريض", "المريض"],
  nationalId: ["nationalid", "patientidnumber", "idno", "idnumber", "iqama", "iqamano", "identity", "رقمالهوية", "الهوية", "رقمالإقامة"],
  gross: ["gross", "grossamount", "amountbeforediscount", "totalbeforediscount", "subtotal", "الإجماليقبلالخصم", "السعر"],
  discount: ["discount", "discountamount", "totaldiscount", "الخصم", "قيمةالخصم"],
  net: ["net", "netamount", "nettotal", "الصافي", "صافي", "afterdiscount"],
  total: ["total", "totalamount", "الإجمالي", "المجموع"],
  vat: ["vat", "vatamount", "tax", "taxamount", "الضريبة", "ضريبة"],
  type: ["invtype", "invoicetype", "cashorinsurance", "type", "paymenttype", "نوعالفاتورة", "النوع"],
  status: ["status", "invstatus", "invoicestatus", "الحالة", "iscancelled", "cancelled"],
  service: ["servicename", "servicenameen", "service", "category", "servicecategory", "treatment", "procedure", "الخدمة", "التصنيف", "الإجراء"],
  method: ["paymentmethod", "method", "paymode", "paymentmode", "طريقةالدفع", "نوعالدفع", "وسيلةالدفع"],
  amount: ["amount", "paidamount", "paid", "المبلغ", "المدفوع", "value", "القيمة"],
  dueDate: ["duedate", "installmentdate", "تاريخالاستحقاق", "الاستحقاق"],
  installment: ["installmentamount", "installment", "قيمةالقسط", "القسط"],
  remaining: ["remaining", "remainingamount", "balance", "المتبقي", "الرصيد"],
  // The PMS detailed sales report: unit price × quantity, and the service group.
  unitPrice: ["soldprice", "unitprice", "price", "السعر"],
  qty: ["qtysold", "qty", "quantity", "الكمية"],
  serviceGroup: ["servicegroupname", "servicegroup", "مجموعةالخدمة"],
  // The PMS Sales Report: one row per invoice.
  salesNet: ["totalpriceafterdiscount"],
  clinic: ["clinc", "clinic"],
};

/** Payment methods as wide columns (some collection reports have one column per method). */
const METHOD_COLUMNS: [PayMethod, RegExp][] = [
  ["cash", /^(cash|نقد|نقدي|كاش)/i],
  ["card", /^(card|mada|visa|master|network|pos|stc ?pay|apple ?pay|شبكة|مدى|بطاقة)/i],
  ["transfer", /^(transfer|bank|تحويل|بنك)/i],
  ["tabby", /^(tabby|تابي)/i],
  ["tamara", /^(tamara|تمارا)/i],
  // Other financing / gateways (Emkan, Moyasar).
  ["other", /^(emkan|moyasar|إمكان|ميسر)/i],
];

export function methodOf(text: string): PayMethod {
  for (const [m, re] of METHOD_COLUMNS) if (re.test(norm(text))) return m;
  const t = norm(text).toLowerCase();
  if (/cash|نقد|كاش/.test(t)) return "cash";
  if (/mada|visa|master|card|network|pos|شبكة|مدى|بطاق/.test(t)) return "card";
  if (/transfer|bank|تحويل/.test(t)) return "transfer";
  if (/tabby|تابي/.test(t)) return "tabby";
  if (/tamara|تمارا/.test(t)) return "tamara";
  return "other";
}

export function branchOf(text: string, fallback: FinanceBranch = "abha"): FinanceBranch {
  const t = norm(text).toLowerCase();
  if (/lab|معمل|مختبر/.test(t)) return "lab";
  if (/khamis|خميس/.test(t)) return "khamis";
  if (/abha|أبها|ابها/.test(t)) return "abha";
  return fallback;
}

const money = (v: unknown): number => {
  const t = westernDigits(String(v ?? "")).replace(/[,\s٬]/g, "").replace(/٫/g, ".").replace(/[^\d.\-]/g, "");
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
};

function isoOf(v: unknown): string | null {
  const parts = readDate(String(v ?? ""));
  return parts ? `${parts.y}-${String(parts.m).padStart(2, "0")}-${String(parts.d).padStart(2, "0")}` : null;
}

/** Finds the header row (within the first rows) and maps fields to columns. */
function header(rows: string[][]): { at: number; cols: Record<Field, number>; head: string[] } | null {
  for (let at = 0; at < Math.min(rows.length, 12); at++) {
    const head = rows[at].map((h) => key(h));
    const cols: Record<Field, number> = {};
    for (const [field, names] of Object.entries(HEADERS)) {
      // The names are in order of preference («BranchName» before «Clinic»).
      for (const name of names) {
        const i = head.indexOf(name);
        if (i >= 0) {
          cols[field] = i;
          break;
        }
      }
    }
    // One column per payment method counts too (wide collection reports).
    const methods = rows[at].filter((h) => METHOD_COLUMNS.some(([, re]) => re.test(norm(h)))).length;
    const known = Object.keys(cols).length + (methods >= 2 ? methods : 0);
    if (known >= 3 && ("date" in cols || "dueDate" in cols)) return { at, cols, head: rows[at] };
  }
  return null;
}

export type ImportResult =
  | { kind: "invoices"; lines: FinLine[]; from: string; to: string; branches: FinanceBranch[]; rows: number; skipped: number }
  | { kind: "payments"; payments: FinPayment[]; from: string; to: string; branches: FinanceBranch[]; rows: number; skipped: number }
  | { kind: "sales"; invoices: SalesInvoice[]; payments: FinPayment[]; from: string; to: string; branches: FinanceBranch[]; rows: number; skipped: number }
  | { kind: "installments"; installments: Installments; rows: number }
  | { kind: "unknown"; reason: string };

/**
 * Reads one report file. `branch`: the branch the robot exported it for,
 * used when the file has no branch column. `today`: for installments due/overdue.
 */
export function readReport(bytes: Uint8Array, fileName: string, options: { branch?: FinanceBranch; today: string }): ImportResult {
  let rows: string[][];
  try {
    rows = readSpreadsheet(bytes, fileName);
  } catch {
    return { kind: "unknown", reason: "file" };
  }
  const h = header(rows);
  if (!h) return { kind: "unknown", reason: "header" };
  const { cols } = h;
  const body = rows.slice(h.at + 1);
  const get = (r: string[], f: Field) => (f in cols ? norm(r[cols[f]]) : "");
  const fallbackBranch = options.branch ?? "abha";

  // Installments: a due date and an installment amount.
  if ("dueDate" in cols && ("installment" in cols || "amount" in cols)) {
    const inst: Installments = {
      at: new Date().toISOString(),
      dueToday: { count: 0, amount: 0 },
      overdue: { count: 0, amount: 0, patients: 0 },
      remaining: { amount: 0, patients: 0 },
    };
    const overduePatients = new Set<string>();
    const remainingPatients = new Set<string>();
    let n = 0;
    for (const r of body) {
      const due = isoOf(get(r, "dueDate"));
      if (!due) continue;
      n++;
      const amount = money(get(r, "installment") || get(r, "amount"));
      const paid = "remaining" in cols ? amount - money(get(r, "remaining")) : /paid|مدفوع|مسدد/i.test(get(r, "status")) ? amount : 0;
      const open = Math.max(0, amount - paid);
      if (!open) continue;
      const who = get(r, "patient") || get(r, "patientName");
      remainingPatients.add(who);
      inst.remaining.amount += open;
      if (due === options.today) {
        inst.dueToday.count++;
        inst.dueToday.amount += open;
      } else if (due < options.today) {
        inst.overdue.count++;
        inst.overdue.amount += open;
        overduePatients.add(who);
      }
    }
    inst.overdue.patients = overduePatients.size;
    inst.remaining.patients = remainingPatients.size;
    return { kind: "installments", installments: inst, rows: n };
  }

  const wide = h.head.map((name, i) => [i, METHOD_COLUMNS.find(([, re]) => re.test(norm(name)))?.[0]] as const).filter(([, m]) => m);

  // The PMS Sales Report: one row per invoice, its payments by method in
  // columns («Cash Abha», «Mada Dental Lab»…), and what is still owed.
  if ("inv" in cols && "salesNet" in cols) {
    const invoices: SalesInvoice[] = [];
    const payments: FinPayment[] = [];
    let skipped = 0;
    for (const r of body) {
      const date = isoOf(get(r, "date"));
      const inv = get(r, "inv");
      if (!date || !inv) {
        skipped++;
        continue;
      }
      const doctor = get(r, "doctor").replace(/\s*-\s*Khamis$/i, "") || "—";
      const lab = /dental ?lab|معمل|مختبر/i.test(`${get(r, "clinic")} ${doctor}`);
      const own = "branch" in cols ? branchOf(get(r, "branch"), fallbackBranch) : fallbackBranch;
      const branch: FinanceBranch = lab ? "lab" : own;
      let net = money(get(r, "salesNet"));
      const discount = Math.abs(money(get(r, "discount")));
      let gross = "unitPrice" in cols ? money(get(r, "unitPrice")) : net + discount;
      const remaining = money(get(r, "remaining"));
      const typeText = `${get(r, "type")} ${get(r, "status")}`;
      let kind: InvoiceKind = "invoice";
      if (/credit ?note|إشعار ?دائن|اشعار ?دائن/i.test(typeText)) kind = "creditNote";
      else if (/return|refund|مرتجع|استرجاع/i.test(typeText) || net < 0) kind = "return";
      else if (remaining > 0.5) kind = "credit";
      if (kind === "return" || kind === "creditNote") {
        net = -Math.abs(net);
        gross = -Math.abs(gross);
      }
      const id = get(r, "nationalId");
      invoices.push({
        inv: `${own}-${inv}`,
        date,
        branch,
        doctor,
        patient: get(r, "patient") || get(r, "patientName"),
        hasId: "nationalId" in cols ? /\d{6,}/.test(westernDigits(id)) : null,
        gross,
        discount,
        net,
        remaining,
        kind,
        origin: own,
      });
      for (const [i, m] of wide) {
        const amount = money(r[i]);
        if (!amount) continue;
        const payBranch: FinanceBranch = /dental ?lab|معمل/i.test(h.head[i]) ? "lab" : own;
        payments.push({ date, branch: payBranch, method: m!, amount, origin: own });
      }
    }
    const all = span(invoices);
    // The branches whose reports these are (the lab's entries travel inside them).
    const branches = [...new Set(invoices.map((i) => i.origin!))];
    return { kind: "sales", invoices, payments, from: all.from, to: all.to, branches, rows: invoices.length, skipped };
  }

  // Payments: a method column, or one column per method.
  if (!("inv" in cols) && ("method" in cols || wide.length >= 2)) {
    const payments: FinPayment[] = [];
    let skipped = 0;
    for (const r of body) {
      const date = isoOf(get(r, "date"));
      if (!date) {
        skipped++;
        continue;
      }
      const branch = "branch" in cols ? branchOf(get(r, "branch"), fallbackBranch) : fallbackBranch;
      if ("method" in cols) {
        const amount = money(get(r, "amount") || get(r, "total"));
        if (amount) payments.push({ date, branch, method: methodOf(get(r, "method")), amount });
      } else {
        for (const [i, m] of wide) {
          const amount = money(r[i]);
          if (amount) payments.push({ date, branch, method: m!, amount });
        }
      }
    }
    return { kind: "payments", payments, ...span(payments), rows: payments.length, skipped };
  }

  // Invoice lines.
  if ("inv" in cols && ("net" in cols || "total" in cols)) {
    const lines: FinLine[] = [];
    let skipped = 0;
    for (const r of body) {
      const date = isoOf(get(r, "date"));
      const inv = get(r, "inv");
      if (!date || !inv) {
        skipped++;
        continue;
      }
      const vat = "vat" in cols ? money(get(r, "vat")) : 0;
      // Net after discount without VAT: «Net» when given; else «Total» less its VAT.
      let net = "net" in cols ? money(get(r, "net")) : money(get(r, "total")) - vat;
      // Before discount: «Gross» when given, else unit price × quantity (the
      // PMS's «SoldPrice» × «QtySold»), else net + discount.
      const qty = "qty" in cols ? money(get(r, "qty")) || 1 : 1;
      const listed = "unitPrice" in cols ? money(get(r, "unitPrice")) * qty : 0;
      let gross = "gross" in cols ? money(get(r, "gross")) : listed;
      let discount = Math.abs(money(get(r, "discount")));
      if (!gross) gross = net + discount;
      else if ("unitPrice" in cols && !("gross" in cols)) discount = Math.max(0, Math.round((Math.abs(gross) - Math.abs(net)) * 100) / 100);
      if (net < 0 && gross > 0) gross = -gross;
      const typeText = `${get(r, "type")} ${get(r, "status")}`;
      let kind: InvoiceKind = "invoice";
      if (/credit ?note|إشعار ?دائن|اشعار ?دائن/i.test(typeText)) kind = "creditNote";
      else if (/return|refund|مرتجع|استرجاع/i.test(typeText) || net < 0) kind = "return";
      else if (/credit|deferred|آجل|اجل|insurance|تأمين/i.test(typeText)) kind = "credit";
      if (kind === "return" || kind === "creditNote") net = -Math.abs(net);
      const cancelled = /cancel|void|ملغ|إلغاء|الغاء|^true$|^1$/i.test(get(r, "status"));
      const id = get(r, "nationalId");
      const group = get(r, "serviceGroup");
      // The dental lab's work is its own «branch» on the dashboard.
      const branch: FinanceBranch = /dental ?lab|معمل|مختبر/i.test(group)
        ? "lab"
        : "branch" in cols
          ? branchOf(get(r, "branch"), fallbackBranch)
          : fallbackBranch;
      lines.push({
        inv: `${branch === "lab" ? ("branch" in cols ? branchOf(get(r, "branch"), fallbackBranch) : fallbackBranch) : branch}-${inv}`,
        date,
        branch,
        doctor: get(r, "doctor").replace(/\s*-\s*Khamis$/i, "") || "—",
        patient: get(r, "patient") || get(r, "patientName"),
        hasId: "nationalId" in cols ? /\d{6,}/.test(westernDigits(id)) : null,
        gross,
        discount,
        net,
        kind,
        cancelled: cancelled || undefined,
        service: [group, get(r, "service")].filter(Boolean).join(" · ") || undefined,
      });
    }
    return { kind: "invoices", lines, ...span(lines), rows: lines.length, skipped };
  }

  return { kind: "unknown", reason: "columns" };
}

function span(items: { date: string; branch: FinanceBranch }[]): { from: string; to: string; branches: FinanceBranch[] } {
  const dates = items.map((i) => i.date).sort();
  return { from: dates[0] ?? "", to: dates[dates.length - 1] ?? "", branches: [...new Set(items.map((i) => i.branch))] };
}
