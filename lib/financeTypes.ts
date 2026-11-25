// Shapes of the financial dashboard (الأداء المالي), shared by the server and
// the browser. Data comes from the clinic system (PMS) reports: invoice
// lines, payments and Invisalign installments, imported automatically by the
// robot (or by hand) and kept as one file per month plus a daily summary.

export type FinanceBranch = "abha" | "khamis" | "lab";
export const FINANCE_BRANCHES: FinanceBranch[] = ["abha", "khamis", "lab"];

export type Specialty = "implant" | "ortho" | "cosmetic" | "general";
export const SPECIALTIES: Specialty[] = ["implant", "ortho", "cosmetic", "general"];

export type PayMethod = "cash" | "card" | "transfer" | "tabby" | "tamara" | "other";
export const PAY_METHODS: PayMethod[] = ["cash", "card", "transfer", "tabby", "tamara", "other"];

/** invoice: paid now · credit: آجلة · return: مرتجع · creditNote: إشعار دائن */
export type InvoiceKind = "invoice" | "credit" | "return" | "creditNote";

/** One service line of an invoice (the sales report has one row per line). */
export type FinLine = {
  /** Invoice number (InvSeqNo). */
  inv: string;
  /** YYYY-MM-DD (Riyadh). */
  date: string;
  branch: FinanceBranch;
  doctor: string;
  patient: string;
  /** false: the invoice has no national ID / iqama number. */
  hasId: boolean | null;
  gross: number;
  discount: number;
  /** After discount, without VAT. */
  net: number;
  kind: InvoiceKind;
  cancelled?: boolean;
  /** Service category or name, for the specialty split. */
  service?: string;
};

export type FinPayment = {
  date: string;
  branch: FinanceBranch;
  method: PayMethod;
  amount: number;
  /** The branch whose report brought it (the lab's come in the branches' files). */
  origin?: FinanceBranch;
};

/**
 * One invoice of the PMS Sales Report (the main source for revenue: one row
 * per invoice, with its payments by method and what is still owed).
 */
export type SalesInvoice = {
  inv: string;
  date: string;
  branch: FinanceBranch;
  doctor: string;
  patient: string;
  hasId: boolean | null;
  /** Before discount, without VAT. */
  gross: number;
  discount: number;
  /** After discount, without VAT. */
  net: number;
  /** Still owed (آجل). */
  remaining: number;
  kind: InvoiceKind;
  /** The branch whose report brought it (the lab's come in the branches' files). */
  origin?: FinanceBranch;
};

/** One invoice in a quality list. */
export type FlagRef = { inv: string; doctor: string; patient: string; net: number; gross: number; discountPct: number };

/** One branch's day, summed from its lines and payments. */
export type BranchDay = {
  net: number;
  gross: number;
  discount: number;
  invoices: number;
  patients: number;
  credit: { count: number; amount: number };
  returns: { count: number; amount: number };
  creditNotes: { count: number; amount: number };
  cancelled: { count: number; amount: number };
  bySpecialty: Record<Specialty, number>;
  byDoctor: Record<string, { net: number; invoices: number; patients: number; discount: number }>;
  payments: Record<PayMethod, number>;
  flags: { highDiscount: FlagRef[]; noId: FlagRef[]; cancelled: FlagRef[] };
};

/** A month's daily summary: days → branch → figures. */
export type MonthAgg = {
  month: string;
  days: Record<string, Partial<Record<FinanceBranch, BranchDay>>>;
  updatedAt: string;
};

/** Invisalign installments as of the last import. */
export type Installments = {
  at: string;
  dueToday: { count: number; amount: number };
  overdue: { count: number; amount: number; patients: number };
  remaining: { amount: number; patients: number };
};

export type FinanceSettings = {
  /** Yearly revenue targets by year (from the financial model). */
  yearTargets: Record<string, number>;
  /** A month's own target, overriding the automatic spread (YYYY-MM → SAR). */
  monthTargets: Record<string, number>;
  /** Partner doctors (PMS names), first one shown first. */
  partners: string[];
  /** A doctor's specialty when the service doesn't say (PMS name → specialty). */
  doctorSpecialty: Record<string, Specialty>;
  /** The management copy's private view link secret (/finance/<key>). */
  shareKey?: string;
  /** Al-Maghrabi management's copy: its own link, never showing doctors' commission rates. */
  maghrabiKey?: string;
  /** The tabs each copy hides. */
  hiddenTabs: Partial<Record<ShareCopy, ShareTab[]>>;
};

/** The two view-link copies. */
export type ShareCopy = "management" | "maghrabi";
export const SHARE_COPIES: ShareCopy[] = ["management", "maghrabi"];
export const SHARE_TABS = ["dashboard", "income", "balance", "cash", "arap", "financing", "alerts"] as const;
export type ShareTab = (typeof SHARE_TABS)[number];

export type FinanceRun = { at: string; ok: boolean; source: "robot" | "upload"; note?: string };

export type FinanceStatus = {
  lastSuccessAt?: string;
  lastRunAt?: string;
  runs: FinanceRun[];
};

/** The financial model's revenue («Services rendered»): 2026F and later years. */
export const MODEL_TARGETS: Record<string, number> = {
  "2026": 63144656,
  "2027": 66327147,
  "2028": 69670035,
  "2029": 71774070,
  "2030": 73941647,
};
/** The model's 2026 budget, the alternative to 2026F. */
export const MODEL_BUDGET_2026 = 64924056;

/**
 * The partner doctors, in the order shown: official doctors (Control Panel →
 * Doctors) chosen in Settings and stored by id. These defaults are their
 * names as written, matched to the official doctors.
 */
export const DEFAULT_PARTNERS = [
  "إبراهيم الشهراني",
  "عبد العزيز ابو ملحة",
  "عبد العزيز الشهراني",
  "غدير الوادعي",
  "محمد الوادعي",
  "ناصر الاحمري",
  "محمد مقبول",
  "فيصل عبود",
  "مانع الاحمري",
];
/** Earlier default lists (replaced by the one above while still saved unchanged). */
export const OLD_DEFAULT_PARTNERS = [
  ["Prof. Ibrahim AlShahrani"],
  [
    "إبراهيم الشهراني = Ibrahim Shahrani",
    "عبدالعزيز أبو ملحة = Abdulaziz Abumilha",
    "عبدالعزيز الشهراني = Abdulaziz Shahrani",
    "غدير الوادعي = Ghadeer Wadaei",
    "محمد الوادعي = Mohammed Wadaei",
    "ناصر الأحمري = Nasser Ahmari",
    "محمد مقبول = Mohammed Maqbool",
    "فيصل عبود = Faisal Abboud",
    "مانع الأحمري = Manea Ahmari",
  ],
];

/** Letters only, lower case, common transliteration variants made one. */
export function nameKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/^(prof|dr)\.?\s*/i, "")
    .replace(/[^a-z]/g, "")
    .replace(/mu?ha?mm?a[dm]|mohamed|mohammad|muhammad|mohamad/g, "mohammed")
    .replace(/abdul|abdel|abdal/g, "abdul")
    .replace(/(wada?a?i|wadaei|wadie|wadai)/g, "wadaei")
    .replace(/nase?r/g, "nasser")
    .replace(/(abb?o+u?d)/g, "abboud")
    .replace(/(maq|mak)bo?u?l/g, "maqbool")
    .replace(/abu ?m[ie]l[h]?a+h?/g, "abumilha")
    .replace(/mane[ae]?a?/g, "manea")
    .replace(/ghadi?e?e?r/g, "ghadeer")
    .replace(/aziz+/g, "aziz");
}

/** A partner line: the name shown and the words to look for. */
export function partnerOf(line: string): { label: string; keys: string[] } {
  const [label, words] = line.includes("=") ? line.split("=").map((x) => x.trim()) : [line.trim(), line.trim()];
  return { label: label || words, keys: (words || label).split(/\s+/).map(nameKey).filter(Boolean) };
}

/** Whether a PMS doctor name is this partner (every word found). */
export function isPartner(keys: string[], doctor: string): boolean {
  const name = nameKey(doctor);
  return keys.length > 0 && keys.every((k) => name.includes(k));
}

export function emptyBranchDay(): BranchDay {
  return {
    net: 0,
    gross: 0,
    discount: 0,
    invoices: 0,
    patients: 0,
    credit: { count: 0, amount: 0 },
    returns: { count: 0, amount: 0 },
    creditNotes: { count: 0, amount: 0 },
    cancelled: { count: 0, amount: 0 },
    bySpecialty: { implant: 0, ortho: 0, cosmetic: 0, general: 0 },
    byDoctor: {},
    payments: { cash: 0, card: 0, transfer: 0, tabby: 0, tamara: 0, other: 0 },
    flags: { highDiscount: [], noId: [], cancelled: [] },
  };
}

/** A discount above this share of the gross is a quality flag. */
export const HIGH_DISCOUNT = 0.4;
