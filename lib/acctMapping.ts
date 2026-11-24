// Which line of the financial model each account belongs to. Suggested from
// the account's code and names (chart of accounts), changeable in Settings
// (stored in acct/mapping.json). Accounts left unmapped are listed on the
// dashboard so nothing is silently dropped.

import type { BsLine, PnlLine } from "./financeModel";
import type { Account } from "./acct";

export type Line = PnlLine | BsLine;
export type Mapping = Record<string, Line | "none">;

/** P&L accounts start with 4 (revenue) or 5 (expenses); 1–3 are the balance sheet. */
export const isPnlCode = (code: string) => /^[45]/.test(code);

const has = (text: string, re: RegExp) => re.test(text.toLowerCase());

/** The model line an account most likely belongs to (code first, then its English / Arabic names and path). */
export function suggestLine(code: string, account?: Pick<Account, "en" | "ar" | "path">): Line | null {
  const text = `${account?.en ?? ""} ${account?.ar ?? ""} ${account?.path ?? ""}`;
  if (code.startsWith("4")) {
    if (has(text, /other income|misc|gain|إيرادات أخرى|ايرادات اخرى|أرباح|ارباح/)) return "otherIncome";
    return "revenue";
  }
  if (code.startsWith("5")) {
    if (has(text, /zakat|زكاة|زكاه/)) return "zakat";
    if (has(text, /depreciat|amortiz|استهلاك|إطفاء|اطفاء/)) return "depreciation";
    if (has(text, /murabaha|financ|interest|loan|bank charge|مرابحة|تمويل|فوائد|قرض|عمولات بنكية|مصاريف بنكية/)) return "financial";
    if (has(text, /impair|doubtful|bad debt|انخفاض|مشكوك|ديون معدومة/)) return "impairments";
    if (has(text, /commission|incentive|عمول|حوافز|نسب الأطباء|نسبة الطبيب/)) return "commissions";
    if (has(text, /\blab|معمل|مختبر/)) return "labs";
    if (has(text, /material|consum|supplies|cost of (goods|sales)|inventory|مواد|مستهلك|تكلفة المبيعات|تكلفة البضاعة/)) return "materials";
    if (has(text, /salar|wage|payroll|gosi|staff|employee|personnel|housing|end of service|medical insurance for|رواتب|أجور|اجور|موظف|تأمينات|بدل|مكافأة نهاية|نهاية الخدمة/)) return "personnel";
    if (has(text, /direct|operating|sterili|clinic expense|تشغيل|مباشرة|تعقيم/)) return "otherOperating";
    return "ga";
  }
  if (code.startsWith("1")) {
    if (has(text, /cash|bank|petty|fund|نقد|بنك|بنوك|صندوق|عهد/)) return "cash";
    if (has(text, /receivable|customer|tabby|tamara|insurance co|مدين|عملاء|ذمم|تابي|تمارا/)) return "receivables";
    if (has(text, /inventor|stock|warehouse|مخزون|مستودع/)) return "inventory";
    if (has(text, /prepaid|advance|deposit|مقدم|مدفوعة مقدما|سلف|تأمين مسترد/)) return "prepaid";
    if (has(text, /fixed|equipment|furniture|vehicle|building|leasehold|accumulated|أصول ثابتة|معدات|أثاث|اثاث|سيارات|مباني|مجمع/)) return "fixedAssets";
    return code.startsWith("12") ? "fixedAssets" : "prepaid";
  }
  if (code.startsWith("2")) {
    if (code.startsWith("2201") || has(text, /murabaha|loan|financ|مرابحة|قرض|تمويل/)) return "murabaha";
    if (has(text, /zakat|زكاة/)) return "zakatProvision";
    if (has(text, /end of service|eosb|severance|نهاية الخدمة/)) return "severance";
    if (has(text, /related|partner|shareholder|أطراف ذات علاقة|اطراف ذات علاقة|شركاء|جاري الشريك/)) return "relatedParties";
    if (has(text, /fixed asset supplier|موردي الأصول/)) return "fixedAssetSuppliers";
    if (has(text, /accrued|accrual|provision|vat|tax|payroll payable|مستحق|مخصص|ضريبة/)) return "accrued";
    return "payables";
  }
  if (code.startsWith("3")) {
    if (has(text, /capital|رأس المال|راس المال/)) return "shareCapital";
    if (has(text, /reserve|احتياطي/)) return "statutoryReserves";
    return "retainedEarnings";
  }
  return null;
}

/** The line an account is on: the saved choice, else the suggestion. «none» leaves it out on purpose. */
export function lineOf(code: string, mapping: Mapping, chart: Map<string, Account>): Line | null {
  const saved = mapping[code];
  if (saved === "none") return null;
  return saved ?? suggestLine(code, chart.get(code));
}
