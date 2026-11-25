// The clinic's own account rules (as reviewed against the Microchips trial
// balance): which accounts make each income-statement line and each
// balance-sheet line. Codes are compared by their digits only, so
// «5103-00012», «510300012» and «5103 00012» are the same account, while
// «5103-0012» (51030012) is a different one.

import type { PnlLine } from "./financeModel";

/** An account code's digits («5103-00012» → «510300012»). */
export const norm = (code: string) => String(code ?? "").replace(/\D/g, "");

const set = (...codes: string[]) => new Set(codes.map(norm));

/** Doctors' and technicians' commissions. */
export const COMMISSIONS = set("5103-00012", "5103-0013");
/** Staff costs besides the 5101 accounts. */
const PERSONNEL_EXTRA = set("5103-0012");
/** Dental lab costs. */
export const LAB_COSTS = set("5103-0005", "5103-0014");
/** Materials and consumables. */
export const MATERIALS = set("5103-0001", "5103-0004", "5103-00025", "5103-0011");
/** Advertising (a general and administrative expense although under 5103). */
const ADVERTISING = set("5103-00011");
/** Zakat (under 5102, but its own line). */
const ZAKAT = set("5102-0007");
/** The dental lab's revenue accounts (not in the PMS). */
export const LAB_REVENUE_PREFIXES = ["4103", "4106", "4109"];
export const isLabRevenue = (code: string) => LAB_REVENUE_PREFIXES.some((p) => norm(code).startsWith(p));

/**
 * The income-statement line of an account by the clinic's rules, or null
 * when no rule covers it (then a saved choice or the name decides, and an
 * unmapped account is reported).
 */
export function pnlRule(code: string): PnlLine | null {
  const n = norm(code);
  if (n.startsWith("41")) return "revenue"; // net of returns and discounts (their accounts are under 41)
  if (n.startsWith("42")) return "otherIncome";
  if (n.startsWith("5101")) return "personnel";
  if (ZAKAT.has(n)) return "zakat";
  if (n.startsWith("5102")) return "ga"; // bank charges 5102-00015 and 5102-00031 included
  if (n.startsWith("5104")) return "depreciation";
  if (n.startsWith("5103")) {
    if (COMMISSIONS.has(n)) return "commissions";
    if (PERSONNEL_EXTRA.has(n)) return "personnel";
    if (LAB_COSTS.has(n)) return "labs";
    if (MATERIALS.has(n)) return "materials";
    if (ADVERTISING.has(n)) return "ga";
    return "otherOperating";
  }
  return null;
}

// --- Balance sheet ---

export type BsGroup = "asset" | "liability" | "equity";
export type BsKey =
  | "cash"
  | "receivables"
  | "inventory"
  | "prepaid"
  | "vatRecoverable"
  | "otherDebit"
  | "fixedAssets"
  | "payables"
  | "patientAdvances"
  | "accrued"
  | "murabahaCurrent"
  | "murabahaNonCurrent"
  | "severance"
  | "zakatProvision"
  | "relatedParties"
  | "equity";

export const ASSET_KEYS: BsKey[] = ["cash", "receivables", "inventory", "prepaid", "vatRecoverable", "otherDebit", "fixedAssets"];
export const LIABILITY_KEYS: BsKey[] = ["payables", "patientAdvances", "accrued", "murabahaCurrent", "murabahaNonCurrent", "severance", "zakatProvision", "relatedParties"];

/** Trade receivables (patients' credit, Tabby, Tamara, lab customers…). */
export const RECEIVABLES = set("110502", "110503", "110504", "110506", "110507");
/** Patients' account: a receivable when debit, patients' advance payments when credit. */
export const PATIENTS = norm("110501");
/** Allowance for doubtful debts (deducted from receivables). */
export const ALLOWANCE = norm("2202");
/** Murabaha: the current part and the long-term part. */
export const MURABAHA_CURRENT = norm("2103");
export const MURABAHA_NONCURRENT = norm("2201");
/** Local suppliers. */
export const SUPPLIERS_PREFIX = "2101";
/** Doctors' accrued commissions. */
export const DOCTORS_ACCRUED = norm("2105-0006");
/** VAT: recoverable when debit, payable when credit. */
export const VAT = norm("2109-0001");

export const isCash = (code: string) => /^110[12]/.test(norm(code));
export const isReceivable = (code: string) => [...RECEIVABLES].some((r) => norm(code).startsWith(r));
export const isSupplier = (code: string) => norm(code).startsWith(SUPPLIERS_PREFIX);
export const isMurabaha = (code: string) => norm(code).startsWith(MURABAHA_CURRENT) || norm(code).startsWith(MURABAHA_NONCURRENT);

/**
 * Where a balance-sheet account goes, given its closing balance (debit +).
 * «flag» marks a balance on the unusual side (an asset in credit, a
 * liability in debit) for the alerts; it is shown, never adjusted.
 */
export function bsClass(code: string, name: string, close: number): { key: BsKey; group: BsGroup; flag: boolean } {
  const n = norm(code);
  const text = name.toLowerCase();
  const debit = close > 0;
  if (n.startsWith("3")) return { key: "equity", group: "equity", flag: false };
  if (n.startsWith("1")) {
    if (n.startsWith(PATIENTS)) return debit ? { key: "receivables", group: "asset", flag: false } : { key: "patientAdvances", group: "liability", flag: false };
    const key: BsKey = isCash(n)
      ? "cash"
      : isReceivable(n)
        ? "receivables"
        : n.startsWith("1108")
          ? "inventory"
          : n.startsWith("11")
            ? "prepaid" // 1103 custody, 1104 advances, 1106 prepaid rent, 1107 deposits and the zakat authority, others
            : "fixedAssets";
    return { key, group: "asset", flag: close < -0.5 };
  }
  if (n.startsWith(ALLOWANCE)) return { key: "receivables", group: "asset", flag: debit }; // contra-asset: normally credit
  if (n.startsWith("2")) {
    if (n.startsWith(VAT) && debit) return { key: "vatRecoverable", group: "asset", flag: false };
    if (n.startsWith(MURABAHA_CURRENT)) return { key: "murabahaCurrent", group: "liability", flag: debit };
    if (n.startsWith(MURABAHA_NONCURRENT)) return { key: "murabahaNonCurrent", group: "liability", flag: debit };
    // A liability in debit is shown among the assets, and flagged.
    if (debit && close > 0.5) return { key: "otherDebit", group: "asset", flag: true };
    if (n.startsWith(SUPPLIERS_PREFIX) || n.startsWith(DOCTORS_ACCRUED) || /\blab|معمل|مختبر/.test(text)) return { key: "payables", group: "liability", flag: false };
    if (/end of service|eosb|severance|نهاية الخدمة/.test(text)) return { key: "severance", group: "liability", flag: false };
    if (/zakat|زكاة/.test(text)) return { key: "zakatProvision", group: "liability", flag: false };
    if (/related|partner|shareholder|أطراف|اطراف|شريك|شركاء/.test(text)) return { key: "relatedParties", group: "liability", flag: false };
    return { key: "accrued", group: "liability", flag: false };
  }
  // 4 and 5 are income-statement accounts (this year's profit, in equity).
  return { key: "equity", group: "equity", flag: false };
}
