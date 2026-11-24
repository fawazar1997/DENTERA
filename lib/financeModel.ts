// The financial model («Dentera Medical Company - Financial Model», existing
// clinics) line by line: 2025H (the actual 2025, the only 2025 detail there
// is: no Dentech, no 2025 trial balance) as «last year», and 2026F as the
// budget. Amounts in SAR for the whole year; the dashboard spreads them over
// the months and labels them «من النموذج المالي». Expenses are negative.

export type PnlLine =
  | "revenue"
  | "commissions"
  | "materials"
  | "labs"
  | "otherOperating"
  | "personnel"
  | "ga"
  | "otherIncome"
  | "impairments"
  | "depreciation"
  | "financial"
  | "zakat";

export type BsLine =
  | "fixedAssets"
  | "inventory"
  | "receivables"
  | "prepaid"
  | "cash"
  | "shareCapital"
  | "statutoryReserves"
  | "retainedEarnings"
  | "relatedParties"
  | "murabaha"
  | "severance"
  | "payables"
  | "accrued"
  | "fixedAssetSuppliers"
  | "zakatProvision";

/** P&L lines in statement order, with the model's 2025H and 2026F (sheet «P&L»). */
export const MODEL_PNL: { line: PnlLine; y2025: number; y2026: number }[] = [
  { line: "revenue", y2025: 60114867, y2026: 63144656 },
  { line: "commissions", y2025: -21651881, y2026: -22585197 },
  { line: "materials", y2025: -8437337, y2026: -8862579 },
  { line: "labs", y2025: -4017796, y2026: -4122601 },
  { line: "otherOperating", y2025: -889975, y2026: -921846 },
  { line: "personnel", y2025: -11490748, y2026: -12340956 },
  { line: "ga", y2025: -3279153, y2026: -4345496 },
  { line: "otherIncome", y2025: 1606037, y2026: 802550 },
  { line: "impairments", y2025: 0, y2026: 0 },
  { line: "depreciation", y2025: -2581347, y2026: -2138476 },
  { line: "financial", y2025: -399057, y2026: -399057 },
  { line: "zakat", y2025: 0, y2026: -214006 },
];

/** Balance sheet lines at year end (sheet «BS»): 2025H and 2026F. */
export const MODEL_BS: { line: BsLine; y2025: number; y2026: number }[] = [
  { line: "fixedAssets", y2025: 12134162, y2026: 10641023 },
  { line: "inventory", y2025: 4529924, y2026: 4721484 },
  { line: "receivables", y2025: 573650, y2026: 602562 },
  { line: "prepaid", y2025: 763401, y2026: 801267 },
  { line: "cash", y2025: 3399325, y2026: 11993133 },
  { line: "shareCapital", y2025: 20000, y2026: 20000 },
  { line: "statutoryReserves", y2025: 6000, y2026: 6000 },
  { line: "retainedEarnings", y2025: 9036963, y2026: 16803819 },
  { line: "relatedParties", y2025: 8524, y2026: 8524 },
  { line: "murabaha", y2025: 3545390, y2026: 2069445 },
  { line: "severance", y2025: 1110284, y2026: 1429378 },
  { line: "payables", y2025: 3337093, y2026: 3666850 },
  { line: "accrued", y2025: 4336208, y2026: 4541447 },
  { line: "fixedAssetSuppliers", y2025: 0, y2026: 0 },
  { line: "zakatProvision", y2025: 0, y2026: 214006 },
];

type Sub = { key: string; from: PnlLine[] };

/** The statement's subtotals, each the sum of the lines up to it. */
export const PNL_SUBTOTALS: Sub[] = [
  { key: "grossMargin", from: ["revenue", "commissions", "materials", "labs", "otherOperating"] },
  { key: "ebitda", from: ["revenue", "commissions", "materials", "labs", "otherOperating", "personnel", "ga", "otherIncome", "impairments"] },
  { key: "ebit", from: ["revenue", "commissions", "materials", "labs", "otherOperating", "personnel", "ga", "otherIncome", "impairments", "depreciation"] },
  { key: "ebt", from: ["revenue", "commissions", "materials", "labs", "otherOperating", "personnel", "ga", "otherIncome", "impairments", "depreciation", "financial"] },
  { key: "netIncome", from: ["revenue", "commissions", "materials", "labs", "otherOperating", "personnel", "ga", "otherIncome", "impairments", "depreciation", "financial", "zakat"] },
];

/** A subtotal from line amounts. */
export function subtotal(values: Partial<Record<PnlLine, number>>, sub: Sub): number {
  return sub.from.reduce((s, l) => s + (values[l] ?? 0), 0);
}
