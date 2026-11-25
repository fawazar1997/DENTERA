import Link from "next/link";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Banknote, BellRing, CheckCircle2, ClipboardCheck, Clock, Droplets, Landmark, Scale, Users, Wallet } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import type { Locale } from "@/lib/i18n";
import type { AcctBasis, AcctBranch } from "@/lib/acct";
import type { AcctTab, AcctTabData } from "@/lib/acctLoad";
import type { Aging, Alert, CheckRow } from "@/lib/acctViews";
import type { BsKey } from "@/lib/acctRules";
import { RiyalIcon } from "@/components/RiyalIcon";
import { LastUpdate } from "./LastUpdate";
import { reasonText } from "@/lib/financeRefreshText";

// The accounting tabs (المركز المالي، النقدية والبنوك، الذمم، التمويل،
// التنبيهات والمطابقة), server-rendered in the dashboard's light identity.
// Alerts at the top of every tab; whole riyals, negatives in brackets;
// differences shown as they are, never adjusted.

type Icon = ComponentType<{ className?: string }>;

const AR = {
  tabs: { balance: "المركز المالي", cash: "النقدية والبنوك", arap: "الذمم", financing: "التمويل", alerts: "التنبيهات والمطابقة" } as Record<AcctTab, string>,
  sub: "من النظام المحاسبي — ميزان المراجعة وكشوف الحسابات",
  asOf: "كما في",
  all: "الكل",
  abha: "أبها",
  khamis: "خميس مشيط",
  posted: "المرحّل فقط",
  withUnposted: "شامل غير المرحّل",
  noData: "لم تصل البيانات بعد. يستوردها الروبوت يوميًا.",
  fromModel: "من النموذج المالي",
  alertsTitle: "التنبيهات",
  noAlerts: "لا توجد تنبيهات.",
  alert: {
    expenseSpike: (m: string) => `بنود مصروفات زادت أكثر من 15% عن متوسطها الشهري (${m})`,
    bankLow: () => "حسابات بنكية رصيدها تحت الحد المحدد",
    pmsGap: () => "فرق بين إيراد PMS وإيراد الحسابات يتجاوز حد المطابقة",
    unpostedOld: (n: string) => `${n} قيد غير مرحّل تجاوز 7 أيام`,
    signFlag: () => "حسابات برصيد عكس طبيعتها (أصل دائن أو التزام مدين)",
    unmapped: () => "حسابات إيرادات أو مصروفات غير مربوطة ببند في قائمة الدخل",
    plVsTb: () => "إجمالي قائمة الدخل لا يساوي ميزان المراجعة",
    bsImbalance: () => "المركز المالي لا يتوازن بعد التبويب",
    financeCostMissing: () => "تكلفة تمويل غير مسجلة رغم وجود رصيد مرابحة",
    unclosedMonths: () => "أشهر دفاترها غير مقفولة (عمولات ناقصة أو بلا استهلاك)",
    lastRunFailed: (d: string) => `آخر تحديث فشل في ${d}`,
    murabahaOverdue: () => "قسط مرابحة مستحق لم يُسجَّل سداده",
  } as Record<Alert["kind"], (d: string) => string>,
  lines: {
    commissions: "عمولات الأطباء والفنيين",
    materials: "المواد والمستهلكات",
    labs: "مصروفات المعامل",
    otherOperating: "مصروفات تشغيلية أخرى",
    personnel: "تكاليف الموظفين",
    ga: "مصروفات عمومية وإدارية",
  } as Record<string, string>,
  bs: {
    assets: "الأصول",
    liabilities: "الالتزامات",
    equity: "حقوق الملكية",
    yearProfit: "أرباح السنة الحالية",
    total: "الإجمالي",
    actual: "الفعلي",
    y2025: "نهاية 2025",
    y2026: "مستهدف نهاية 2026",
    balanced: "المركز المالي متوازن",
    difference: "فرق غير متوازن",
    differenceHint: "الأصول − (الالتزامات + حقوق الملكية). يُعرض الفرق كما هو دون أي قيد تسوية أو تعديل على الأرباح المبقاة.",
    currentRatio: "نسبة السيولة (التداول)",
    currentRatioHint: "الأصول المتداولة ÷ الالتزامات المتداولة",
    flags: "حسابات برصيد عكس طبيعتها",
    keys: {
      cash: "النقدية (البنوك والصناديق)",
      receivables: "الذمم المدينة (بالصافي بعد المخصص)",
      inventory: "المخزون",
      prepaid: "مصروفات مقدمة وأرصدة مدينة أخرى",
      vatRecoverable: "ضريبة قيمة مضافة مستردة",
      otherDebit: "أرصدة مدينة لحسابات التزامات",
      fixedAssets: "الأصول الثابتة (بالصافي)",
      payables: "الموردون والمعامل ونسب الأطباء المستحقة",
      patientAdvances: "دفعات مقدمة من المرضى",
      accrued: "مستحقات والتزامات أخرى",
      murabahaCurrent: "المرابحة — الجزء المتداول",
      murabahaNonCurrent: "المرابحة — الجزء غير المتداول",
      severance: "مخصص نهاية الخدمة",
      zakatProvision: "مخصص الزكاة",
      relatedParties: "أطراف ذات علاقة",
      equity: "حقوق الملكية",
    } as Record<BsKey, string>,
  },
  cash: {
    total: "إجمالي النقدية",
    in: "الوارد هذا الشهر",
    out: "المنصرف هذا الشهر",
    banks: "البنوك والصناديق",
    bank: "الحساب",
    balance: "الرصيد",
    fromTb: "من ميزان المراجعة",
    daily: "الحركة اليومية — آخر 30 يومًا",
    dayIn: "الوارد",
    dayOut: "المنصرف",
    dayEnd: "رصيد آخر اليوم",
    topWeek: "أكبر 10 مدفوعات — آخر 7 أيام",
    topMonth: "أكبر 10 مدفوعات — هذا الشهر",
    date: "التاريخ",
    desc: "البيان",
    amount: "المبلغ",
    internal: (n: number) => `استُبعدت ${n} حركة تحويل بين حسابات الشركة.`,
    noStatements: "لم تصل كشوف الحسابات البنكية بعد؛ الأرصدة من ميزان المراجعة.",
  },
  arap: {
    receivables: "الذمم المدينة (بالصافي)",
    agingTitle: "إجمالي الذمم حسب العمر",
    allowanceLine: "المخصص (2202)",
    netLine: "الصافي",
    payables: "الدائنون",
    customerCredits: "أرصدة دائنة في حسابات العملاء",
    patientAdvances: "دفعات مقدمة من المرضى",
    customerCredit: "رصيد دائن لعميل",
    creditsNote: "حسابات ذمم مدينة برصيد دائن، تُعرض هنا كالتزام ولا تدخل في إجمالي الموردين والمعامل.",
    allCreditors: "إجمالي الدائنين شامل الأرصدة الدائنة للعملاء",
    gross: "إجمالي الذمم",
    allowance: "مخصص الديون المشكوك فيها",
    dso: "متوسط أيام التحصيل",
    dpo: "متوسط أيام سداد الموردين",
    days: "يوم",
    basisDso: "الذمم الصافية ÷ المبيعات الآجلة لآخر 90 يومًا",
    basisDpo: "الموردون المحليون ÷ مشترياتهم الآجلة لآخر 90 يومًا",
    account: "الحساب",
    balance: "الرصيد",
    aging: "الأعمار",
    b0: "0–30",
    b31: "31–60",
    b61: "61–90",
    b91: "+90",
    noAging: "لا يوجد كشف حساب",
    noBasis: "لا تتوفر كشوف الحسابات",
  },
  fin: {
    balance: "رصيد المرابحة (2201 + 2103)",
    opening: "الرصيد الافتتاحي",
    drawn: "سحوبات خلال السنة",
    repaid: "سداد خلال السنة",
    closing: "الرصيد الحالي",
    cost: "مصاريف التمويل منذ بداية السنة",
    current: "المتداول",
    nonCurrent: "غير المتداول",
    splitAccounts: "التقسيم على أساس الحسابات: 2103 متداول، 2201 غير متداول.",
    splitSchedule: "التقسيم حسب جدول الاستحقاق المُدخل في الإعدادات.",
    ratio: "الدين إلى EBITDA",
    ttm: "EBITDA آخر 12 شهرًا",
    ttmHint: (n: number, src: string) => `${n} شهر فعلي من 2026 + بقية الأشهر من 2025 (${src})`,
    srcActual: "فعلي",
    srcModel: "النموذج المالي",
    srcMixed: "فعلي ونموذج",
    schedule: "جدول الاستحقاقات",
    noSchedule: "أضف جدول استحقاقات المرابحة من الإعدادات.",
    date: "تاريخ الاستحقاق",
    amount: "القسط",
    after: "المتبقي بعد القسط",
    part: "التصنيف",
    accounts: "الحسابات",
    scheduleTotal: "المتبقي حسب الجدول",
    scheduleCurrent: "منه متداول (خلال 12 شهرًا)",
    scheduleNonCurrent: "منه غير متداول",
    book: "الرصيد الدفتري (2201 + 2103)",
    bookDiff: "الفرق بين الدفاتر والجدول",
    bookNote: "التقسيم إلى متداول وغير متداول من الجدول، والرصيد من ميزان المراجعة؛ الفرق معروض كما هو دون أي تسوية.",
    overdueTag: "مستحق لم يُسدَّد",
  },
  alerts: {
    unposted: "قيود غير مرحّلة",
    overdue: "تجاوزت 7 أيام دون ترحيل",
    impactRev: "أثر غير المرحّل على الإيرادات",
    impactExp: "أثر غير المرحّل على المصروفات",
    module: "المصدر",
    no: "رقم القيد",
    date: "التاريخ",
    branch: "الفرع",
    age: "العمر (يوم)",
    none: "لا توجد قيود غير مرحّلة تجاوزت 7 أيام.",
    recon: "مطابقة الإيرادات: الحسابات مقابل PMS",
    month: "الشهر",
    pms: "PMS (العيادات)",
    acct: "الحسابات (بدون المعمل)",
    lab: "المعمل (4103/4106/4109)",
    diff: "الفرق",
    pct: "النسبة",
    flagged: "يتجاوز حد المطابقة",
    threshold: (p: string) => `حد المطابقة ${p} — يُعدّل من الإعدادات. إيراد المعمل معروض منفصلًا لأن PMS لا يشمله.`,
    noUnposted: "لم تصل قائمة القيود غير المرحّلة بعد.",
    check: "جدول التحقق مع ميزان المراجعة",
    checkHint: "عمود الميزان مجموع الحسابات نفسها حسب أرقامها مباشرة؛ أي فرق يعني ربطًا أو تبويبًا مختلفًا.",
    item: "البند",
    dashboard: "الداشبورد",
    tb: "ميزان المراجعة",
    checkKeys: {
      revenue: "الإيرادات",
      commissions: "عمولات الأطباء والفنيين",
      personnel: "تكاليف الموظفين",
      materials: "المواد والمستهلكات",
      labs: "مصروفات المعامل",
      ga: "مصروفات عمومية وإدارية",
      otherOperating: "مصروفات تشغيلية أخرى",
      ebitda: "EBITDA",
      netIncome: "صافي الربح",
      receivables: "الذمم المدينة (بالصافي)",
      payables: "الدائنون",
      murabaha: "المرابحة",
      cash: "النقدية",
    } as Record<string, string>,
  },
};
const EN: typeof AR = {
  tabs: { balance: "Balance sheet", cash: "Cash & banks", arap: "Receivables & payables", financing: "Financing", alerts: "Alerts & reconciliation" },
  sub: "From the accounting system — trial balance and account statements",
  asOf: "As of",
  all: "All",
  abha: "Abha",
  khamis: "Khamis Mushait",
  posted: "Posted only",
  withUnposted: "Incl. not posted",
  noData: "No data has arrived yet. The robot imports it daily.",
  fromModel: "From the financial model",
  alertsTitle: "Alerts",
  noAlerts: "No alerts.",
  alert: {
    expenseSpike: (m: string) => `Expense lines more than 15% above their monthly average (${m})`,
    bankLow: () => "Bank accounts below their minimum",
    pmsGap: () => "PMS vs accounting revenue gap above the threshold",
    unpostedOld: (n: string) => `${n} unposted entries older than 7 days`,
    signFlag: () => "Accounts on the unusual side (asset in credit or liability in debit)",
    unmapped: () => "Revenue or expense accounts not on any income-statement line",
    plVsTb: () => "The income statement does not add up to the trial balance",
    bsImbalance: () => "The balance sheet does not balance after classification",
    financeCostMissing: () => "No financing cost booked although Murabaha is outstanding",
    unclosedMonths: () => "Months not closed in the books (commissions short or no depreciation)",
    lastRunFailed: (d: string) => `The last update failed at ${d}`,
    murabahaOverdue: () => "A Murabaha installment is due with no repayment booked",
  },
  lines: {
    commissions: "Doctors' & technicians' commissions",
    materials: "Materials & consumables",
    labs: "Dental labs",
    otherOperating: "Other operating",
    personnel: "Staff costs",
    ga: "General & administrative",
  },
  bs: {
    ...AR.bs,
    assets: "Assets",
    liabilities: "Liabilities",
    equity: "Equity",
    yearProfit: "Profit for the current year",
    total: "Total",
    actual: "Actual",
    y2025: "End of 2025",
    y2026: "End of 2026 target",
    balanced: "The balance sheet balances",
    difference: "Out of balance by",
    differenceHint: "Assets − (liabilities + equity). The difference is shown as it is — no adjusting entry and no change to retained earnings.",
    currentRatio: "Current ratio",
    currentRatioHint: "Current assets ÷ current liabilities",
    flags: "Accounts on the unusual side",
    keys: {
      cash: "Cash (banks and cash boxes)",
      receivables: "Receivables (net of allowance)",
      inventory: "Inventory",
      prepaid: "Prepayments & other debit balances",
      vatRecoverable: "VAT recoverable",
      otherDebit: "Liability accounts in debit",
      fixedAssets: "Fixed assets (net)",
      payables: "Suppliers, labs & doctors' accrued commissions",
      patientAdvances: "Patients' advance payments",
      accrued: "Accrued & other liabilities",
      murabahaCurrent: "Murabaha — current part",
      murabahaNonCurrent: "Murabaha — non-current part",
      severance: "End-of-service provision",
      zakatProvision: "Zakat provision",
      relatedParties: "Related parties",
      equity: "Equity",
    },
  },
  cash: {
    total: "Total cash",
    in: "Received this month",
    out: "Paid this month",
    banks: "Banks and cash boxes",
    bank: "Account",
    balance: "Balance",
    fromTb: "from the trial balance",
    daily: "Daily movement — last 30 days",
    dayIn: "In",
    dayOut: "Out",
    dayEnd: "End of day",
    topWeek: "Top 10 payments — last 7 days",
    topMonth: "Top 10 payments — this month",
    date: "Date",
    desc: "Description",
    amount: "Amount",
    internal: (n: number) => `${n} transfers between the company's own accounts left out.`,
    noStatements: "Bank statements have not arrived yet; balances are from the trial balance.",
  },
  arap: {
    receivables: "Receivables (net)",
    agingTitle: "Gross receivables by age",
    allowanceLine: "Allowance (2202)",
    netLine: "Net",
    payables: "Payables",
    customerCredits: "Credit balances on customer accounts",
    patientAdvances: "Advance payments from patients",
    customerCredit: "Customer credit balance",
    creditsNote: "Receivable accounts in credit, shown here as a liability and not counted in suppliers and labs.",
    allCreditors: "All creditors, incl. customers' credit balances",
    gross: "Gross receivables",
    allowance: "Allowance for doubtful debts",
    dso: "Days sales outstanding",
    dpo: "Days payables outstanding (suppliers)",
    days: "days",
    basisDso: "Net receivables ÷ last 90 days' credit sales",
    basisDpo: "Local suppliers ÷ their last 90 days' credit purchases",
    account: "Account",
    balance: "Balance",
    aging: "Aging",
    b0: "0–30",
    b31: "31–60",
    b61: "61–90",
    b91: "90+",
    noAging: "No statement",
    noBasis: "Statements not available",
  },
  fin: {
    balance: "Murabaha balance (2201 + 2103)",
    opening: "Opening balance",
    drawn: "Drawn this year",
    repaid: "Repaid this year",
    closing: "Current balance",
    cost: "Financing costs, year to date",
    current: "Current",
    nonCurrent: "Non-current",
    splitAccounts: "Split by account: 2103 current, 2201 non-current.",
    splitSchedule: "Split by the maturity schedule entered in Settings.",
    ratio: "Debt to EBITDA",
    ttm: "EBITDA, last 12 months",
    ttmHint: (n: number, src: string) => `${n} actual months of 2026 + the rest from 2025 (${src})`,
    srcActual: "actual",
    srcModel: "financial model",
    srcMixed: "actual and model",
    schedule: "Maturity schedule",
    noSchedule: "Add the Murabaha maturity schedule in Settings.",
    date: "Due date",
    amount: "Installment",
    after: "Remaining after it",
    part: "Class",
    accounts: "Accounts",
    scheduleTotal: "Remaining per schedule",
    scheduleCurrent: "of which current (within 12 months)",
    scheduleNonCurrent: "of which non-current",
    book: "Book balance (2201 + 2103)",
    bookDiff: "Books less schedule",
    bookNote: "Current and non-current come from the schedule, the balance from the trial balance; the difference is shown as it is, never adjusted.",
    overdueTag: "Due, not paid",
  },
  alerts: {
    ...AR.alerts,
    unposted: "Unposted entries",
    overdue: "Unposted for more than 7 days",
    impactRev: "Unposted effect on revenue",
    impactExp: "Unposted effect on expenses",
    module: "Source",
    no: "Entry no.",
    date: "Date",
    branch: "Branch",
    age: "Age (days)",
    none: "No unposted entries older than 7 days.",
    recon: "Revenue reconciliation: accounting vs PMS",
    month: "Month",
    pms: "PMS (clinics)",
    acct: "Accounting (without the lab)",
    lab: "Lab (4103/4106/4109)",
    diff: "Difference",
    pct: "Share",
    flagged: "Above the reconciliation threshold",
    threshold: (p: string) => `Reconciliation threshold ${p} — change it in Settings. Lab revenue is shown apart since the PMS has no lab.`,
    noUnposted: "The unposted entries list has not arrived yet.",
    check: "Check against the trial balance",
    checkHint: "The trial-balance column sums the accounts themselves by number; any difference means a different mapping or classification.",
    item: "Item",
    dashboard: "Dashboard",
    tb: "Trial balance",
    checkKeys: {
      revenue: "Revenue",
      commissions: "Doctors' & technicians' commissions",
      personnel: "Staff costs",
      materials: "Materials & consumables",
      labs: "Dental labs",
      ga: "General & administrative",
      otherOperating: "Other operating",
      ebitda: "EBITDA",
      netIncome: "Net income",
      receivables: "Receivables (net)",
      payables: "Payables",
      murabaha: "Murabaha",
      cash: "Cash",
    },
  },
};

type T = typeof AR;
type MFn = (p: { v: number; big?: boolean }) => JSX.Element;

/** Whole riyals, negatives in brackets: 1,234 / (1,234). */
export function riyals(v: number, nl: string) {
  const r = Math.round(v) || 0;
  const s = Math.abs(r).toLocaleString(nl);
  return r < 0 ? `(${s})` : s;
}

export function AcctView({
  view,
  locale,
  branch,
  basis,
  href,
  lastUpdate,
  controls,
}: {
  view: AcctTabData;
  locale: Locale;
  branch: AcctBranch;
  basis: AcctBasis;
  href: (q: { branch?: AcctBranch; basis?: AcctBasis }) => string;
  /** The robot's last successful run. */
  lastUpdate?: string;
  /** Control Panel only: «تحديث الآن». */
  controls?: ReactNode;
}) {
  const t = locale === "ar" ? AR : EN;
  const nl = locale === "ar" ? "ar-SA-u-nu-latn" : "en-US";
  const n0 = (v: number) => riyals(v, nl);
  const pct = (v: number) => {
    const s = `${Math.abs(v * 100).toLocaleString(nl, { maximumFractionDigits: 1 })}%`;
    return v < 0 ? `(${s})` : s;
  };
  const day = (iso?: string) =>
    iso ? new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`)) : "—";
  const monthName = (m: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-15T12:00:00Z`));
  const M = ({ v, big }: { v: number; big?: boolean }) => <Money v={v} n0={n0} big={big} />;
  const asOf = "asOf" in view.data ? view.data.asOf : undefined;
  // Banks, receivables, payables and financing are the company's: no branch filter there.
  const branchable = view.tab === "balance" || view.tab === "alerts";

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-ink-100 bg-white shadow-card">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-l from-primary-500 via-primary-300 to-primary-900" aria-hidden="true" />
        <div className="relative flex flex-wrap items-end justify-between gap-4 p-6 sm:p-7">
          <div className="min-w-0">
            <p className="text-sm font-bold text-primary-700">{t.sub}</p>
            <h2 className="mt-1 text-2xl font-extrabold text-ink-950 sm:text-3xl">{t.tabs[view.tab]}</h2>
            <div className="mt-2 flex flex-wrap items-start gap-2">
              <p className="inline-flex items-center gap-2 rounded-full bg-sand-50 px-3 py-1 text-xs font-bold text-ink-600 ring-1 ring-ink-100">
                <span className={`h-2 w-2 rounded-full ${asOf ? "bg-emerald-600" : "bg-ink-300"}`} aria-hidden="true" />
                {t.asOf}: {day(asOf)}
              </p>
              <LastUpdate at={lastUpdate} locale={locale} />
              {controls}
            </div>
          </div>
          <div className="flex gap-1 rounded-full bg-sand-50 p-1 ring-1 ring-ink-100" role="group">
            {(["all", "posted"] as const).map((b) => (
              <Link
                key={b}
                href={href({ basis: b })}
                scroll={false}
                aria-current={basis === b ? "page" : undefined}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${basis === b ? "bg-primary-700 text-white shadow-sm" : "text-ink-600 hover:bg-white"}`}
              >
                {b === "posted" ? t.posted : t.withUnposted}
              </Link>
            ))}
          </div>
        </div>
        {branchable && (
          <nav className="relative flex gap-1 overflow-x-auto border-t border-ink-100 bg-sand-50/60 px-4 py-2 sm:px-6">
            {(["all", "abha", "khamis"] as const).map((b) => (
              <Link
                key={b}
                href={href({ branch: b })}
                scroll={false}
                aria-current={branch === b ? "page" : undefined}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition ${branch === b ? "bg-ink-900 text-white shadow-sm" : "text-ink-600 hover:bg-white hover:text-ink-900"}`}
              >
                {t[b]}
              </Link>
            ))}
          </nav>
        )}
      </section>

      <AlertsBar alerts={view.top} t={t} n0={n0} monthName={monthName} locale={locale} />

      {view.tab === "balance" && <BalanceBody d={view.data} t={t} M={M} pct={pct} n0={n0} nl={nl} />}
      {view.tab === "cash" && <CashBody d={view.data} t={t} M={M} n0={n0} day={day} />}
      {view.tab === "arap" && <ArApBody d={view.data} t={t} M={M} n0={n0} />}
      {view.tab === "financing" && <FinancingBody d={view.data} t={t} M={M} day={day} nl={nl} n0={n0} />}
      {view.tab === "alerts" && <AlertsBody d={view.data} check={view.check} threshold={view.threshold} t={t} M={M} n0={n0} pct={pct} day={day} monthName={monthName} />}
    </div>
  );
}

function AlertsBar({ alerts, t, n0, monthName, locale }: { alerts: Alert[]; t: T; n0: (v: number) => string; monthName: (m: string) => string; locale: string }) {
  const when = (iso: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh" }).format(new Date(iso));
  const dayOf = (iso: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
  if (!alerts.length)
    return (
      <p className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800 ring-1 ring-emerald-200">
        <CheckCircle2 className="h-4 w-4" /> {t.noAlerts}
      </p>
    );
  return (
    <section className="rounded-2xl bg-amber-50/80 p-4 ring-1 ring-amber-200" aria-label={t.alertsTitle}>
      <h3 className="flex items-center gap-2 font-extrabold text-amber-900">
        <BellRing className="h-5 w-5" /> {t.alertsTitle} ({alerts.length})
      </h3>
      <ul className="mt-2 space-y-2 text-sm text-amber-950">
        {alerts.map((a, i) => (
          <li key={i}>
            <p className="flex items-start gap-2 font-bold">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700" />
              {t.alert[a.kind](a.kind === "expenseSpike" && a.detail ? monthName(a.detail) : a.kind === "lastRunFailed" && a.detail ? when(a.detail) : a.detail ?? "")}
            </p>
            {a.items && a.items.some((x) => x.label || x.amount !== undefined) && (
              <ul className="ms-6 mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-amber-900">
                {a.items.slice(0, 8).map((x, j) => (
                  <li key={j} className="tabular-nums">
                    {a.kind === "unclosedMonths" || a.kind === "pmsGap"
                      ? monthName(x.label)
                      : a.kind === "lastRunFailed"
                        ? reasonText(x.label, locale)
                        : a.kind === "murabahaOverdue"
                          ? dayOf(x.label)
                          : t.lines[x.label] ?? x.label}
                    {x.amount !== undefined && <span className="ms-1 font-bold">{n0(x.amount)}</span>}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function BalanceBody({ d, t, M, pct, n0, nl }: { d: Extract<AcctTabData, { tab: "balance" }>["data"]; t: T; M: MFn; pct: (v: number) => string; n0: (v: number) => string; nl: string }) {
  if (!d.asOf) return <Empty text={t.noData} />;
  const ok = Math.abs(d.difference) < 1;
  const block = (title: string, rows: typeof d.assets, total: number) => (
    <Card title={title} icon={Scale} aside={<span className="text-[11px] font-medium text-ink-400">{t.fromModel}: {t.bs.y2025} · {t.bs.y2026}</span>}>
      <div className="overflow-x-auto">
        <Table head={["", t.bs.actual, t.bs.y2025, t.bs.y2026]}>
          {rows.map((r) => (
            <tr key={r.key} className="align-top">
              <Td>
                {r.accounts.length > 0 ? (
                  <details>
                    <summary className="cursor-pointer">{t.bs.keys[r.key]}</summary>
                    <ul className="mt-1 space-y-0.5 text-xs text-ink-500">
                      {r.accounts.map((a) => (
                        <li key={a.code} className="flex justify-between gap-3">
                          <span>
                            <span dir="ltr" className="font-mono">
                              {a.code}
                            </span>{" "}
                            {a.name}
                          </span>
                          <span className={`tabular-nums ${a.flag ? "font-bold text-amber-700" : ""}`}>{n0(a.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : (
                  t.bs.keys[r.key]
                )}
              </Td>
              <Td num>
                <M v={r.amount} />
              </Td>
              <Td num muted>
                {r.y2025 === null ? "—" : n0(r.y2025)}
              </Td>
              <Td num muted>
                {r.y2026 === null ? "—" : n0(r.y2026)}
              </Td>
            </tr>
          ))}
          <tr className="bg-sand-50/70 font-extrabold">
            <Td>{t.bs.total}</Td>
            <Td num>
              <M v={total} />
            </Td>
            <Td num muted>
              {""}
            </Td>
            <Td num muted>
              {""}
            </Td>
          </tr>
        </Table>
      </div>
    </Card>
  );
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Landmark} title={t.bs.assets} value={<M v={d.totals.assets} big />} />
        <Kpi icon={Wallet} title={t.bs.liabilities} value={<M v={d.totals.liabilities} big />} hint={d.totals.assets ? pct(d.totals.liabilities / d.totals.assets) : undefined} />
        <Kpi icon={Users} title={t.bs.equity} value={<M v={d.totals.equity} big />} />
        <Kpi icon={Droplets} title={t.bs.currentRatio} value={<Big text={d.currentRatio === null ? "—" : `${d.currentRatio.toLocaleString(nl, { maximumFractionDigits: 2 })}×`} />} hint={t.bs.currentRatioHint} />
      </div>
      <div className={`flex items-start gap-3 rounded-2xl p-4 ring-1 ${ok ? "bg-emerald-50 text-emerald-900 ring-emerald-200" : "bg-amber-50 text-amber-900 ring-amber-200"}`} role="status">
        {ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" /> : <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />}
        <div>
          <p className="font-extrabold">
            {ok ? t.bs.balanced : `${t.bs.difference}: `}
            {!ok && <M v={d.difference} />}
          </p>
          <p className="text-xs opacity-80">{t.bs.differenceHint}</p>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {block(t.bs.assets, d.assets, d.totals.assets)}
        <div className="space-y-6">
          {block(t.bs.liabilities, d.liabilities, d.totals.liabilities)}
          <Card title={t.bs.equity} icon={Users}>
            <Table head={["", t.bs.actual]}>
              {d.equity.map((e) => (
                <tr key={e.code}>
                  <Td>
                    <span dir="ltr" className="me-2 font-mono text-xs text-ink-400">
                      {e.code}
                    </span>
                    {e.name}
                  </Td>
                  <Td num>
                    <M v={e.amount} />
                  </Td>
                </tr>
              ))}
              <tr>
                <Td>{t.bs.yearProfit}</Td>
                <Td num>
                  <M v={d.yearProfit} />
                </Td>
              </tr>
              <tr className="bg-sand-50/70 font-extrabold">
                <Td>{t.bs.total}</Td>
                <Td num>
                  <M v={d.totals.equity} />
                </Td>
              </tr>
            </Table>
          </Card>
        </div>
      </div>
    </>
  );
}

function CashBody({ d, t, M, n0, day }: { d: Extract<AcctTabData, { tab: "cash" }>["data"]; t: T; M: MFn; n0: (v: number) => string; day: (iso?: string) => string }) {
  if (!d.banks.length) return <Empty text={t.noData} />;
  const inM = d.banks.reduce((s, b) => s + b.inMonth, 0);
  const outM = d.banks.reduce((s, b) => s + b.outMonth, 0);
  const fromStatements = d.banks.some((b) => b.source === "statement");
  const payTable = (rows: typeof d.topPayments.week) =>
    rows.length ? (
      <Table head={[t.cash.date, t.cash.desc, t.cash.amount]}>
        {rows.map((p, i) => (
          <tr key={i}>
            <Td>{day(p.date)}</Td>
            <Td wrap>
              <span className="line-clamp-2">{p.desc || "—"}</span>
            </Td>
            <Td num>
              <M v={p.amount} />
            </Td>
          </tr>
        ))}
      </Table>
    ) : (
      <p className="text-sm text-ink-500">—</p>
    );
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi icon={Banknote} title={t.cash.total} value={<M v={d.total} big />} />
        <Kpi icon={ArrowDownRight} title={t.cash.in} value={<M v={inM} big />} />
        <Kpi icon={ArrowUpRight} title={t.cash.out} value={<M v={outM} big />} />
      </div>
      {!fromStatements && <Note text={t.cash.noStatements} />}
      {d.daily.length > 1 && (
        <Card title={t.cash.daily} icon={Wallet}>
          <AreaChart points={d.daily.map((p) => ({ label: day(p.date), value: p.balance }))} n0={n0} />
          <div className="mt-4 max-h-[360px] overflow-auto">
            <Table head={[t.cash.date, t.cash.dayIn, t.cash.dayOut, t.cash.dayEnd]}>
              {[...d.daily].reverse().map((p) => (
                <tr key={p.date}>
                  <Td>{day(p.date)}</Td>
                  <Td num>{p.in ? n0(p.in) : "—"}</Td>
                  <Td num>{p.out ? n0(-p.out) : "—"}</Td>
                  <Td num>
                    <M v={p.balance} />
                  </Td>
                </tr>
              ))}
            </Table>
          </div>
        </Card>
      )}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card title={t.cash.banks} icon={Landmark}>
          <Table head={[t.cash.bank, t.cash.balance]}>
            {d.banks.map((b) => (
              <tr key={b.code}>
                <Td>
                  <span className="block font-bold text-ink-900">{b.name || b.code}</span>
                  <span dir="ltr" className="font-mono text-[11px] text-ink-400">
                    {b.code}
                  </span>
                  {b.source === "trial balance" && <span className="ms-2 text-[10px] text-ink-400">{t.cash.fromTb}</span>}
                </Td>
                <Td num>
                  <M v={b.balance} />
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title={t.cash.topWeek} icon={ArrowUpRight}>
          {payTable(d.topPayments.week)}
        </Card>
        <Card title={t.cash.topMonth} icon={ArrowUpRight}>
          {payTable(d.topPayments.month)}
        </Card>
      </div>
      {d.internalTransfers > 0 && <Note text={t.cash.internal(d.internalTransfers)} />}
    </>
  );
}

const AGING_KEYS = ["b0", "b31", "b61", "b91"] as const;
/** One hue, lighter to darker with age (ordinal magnitude). */
const AGING_COLORS = ["#7fd6e1", "#2fb3c6", "#0a7f91", "#0b4f5c"];

function AgingBar({ aging, t, n0 }: { aging: Aging; t: T; n0: (v: number) => string }) {
  const total = AGING_KEYS.reduce((s, k) => s + aging[k], 0);
  if (!total) return <span className="text-xs text-ink-400">—</span>;
  return (
    <div className="flex h-3 w-full min-w-[96px] gap-[2px] overflow-hidden rounded-full bg-ink-50">
      {AGING_KEYS.map((k, i) =>
        aging[k] > 0 ? <span key={k} title={`${t.arap[k]}: ${n0(aging[k])}`} style={{ width: `${(aging[k] / total) * 100}%`, background: AGING_COLORS[i] }} className="h-full first:rounded-s-full last:rounded-e-full" /> : null,
      )}
    </div>
  );
}

function AgingLegend({ aging, t, n0 }: { aging: Aging; t: T; n0: (v: number) => string }) {
  return (
    <ul className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
      {AGING_KEYS.map((k, i) => (
        <li key={k} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 flex-shrink-0 rounded-sm" style={{ background: AGING_COLORS[i] }} aria-hidden="true" />
          <span className="text-ink-500">{t.arap[k]}</span>
          <span className="ms-auto font-bold tabular-nums text-ink-900">{n0(aging[k])}</span>
        </li>
      ))}
    </ul>
  );
}

function ArApBody({ d, t, M, n0 }: { d: Extract<AcctTabData, { tab: "arap" }>["data"]; t: T; M: MFn; n0: (v: number) => string }) {
  if (!d.asOf) return <Empty text={t.noData} />;
  const accountName = (r: (typeof d.receivables)[number]) =>
    r.note === "allowance" ? t.arap.allowance : r.note === "patientAdvances" ? t.arap.patientAdvances : r.name || r.code;
  const table = (rows: typeof d.receivables, withAging = true) => (
    <div className="mt-4 max-h-[460px] overflow-auto">
      <Table head={withAging ? [t.arap.account, t.arap.balance, t.arap.aging] : [t.arap.account, t.arap.balance]}>
        {rows.map((r) => (
          <tr key={r.code}>
            <Td>
              <span className="block font-bold text-ink-900">{accountName(r)}</span>
              <span dir="ltr" className="font-mono text-[11px] text-ink-400">
                {r.code}
              </span>
              {r.note === "patientAdvances" && <span className="ms-2 text-[11px] text-ink-500">{r.name}</span>}
            </Td>
            <Td num>
              <M v={r.balance} />
            </Td>
            {withAging && <Td>{r.aging ? <AgingBar aging={r.aging} t={t} n0={n0} /> : <span className="text-[11px] text-ink-400">{t.arap.noAging}</span>}</Td>}
          </tr>
        ))}
      </Table>
    </div>
  );
  const summaryRow = (label: string, v: number, strong = false) => (
    <div className={`flex items-center justify-between gap-3 py-1.5 text-sm ${strong ? "border-t border-ink-200 font-extrabold text-ink-950" : "text-ink-700"}`}>
      <span>{label}</span>
      <M v={v} />
    </div>
  );
  const trade = d.receivables.filter((r) => r.note !== "allowance");
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={ArrowDownRight} title={t.arap.receivables} value={<M v={d.totals.receivables} big />} hint={`${t.arap.gross}: ${n0(d.totals.receivablesGross)} · ${t.arap.allowance}: ${n0(d.totals.allowance)}`} />
        <Kpi
          icon={ArrowUpRight}
          title={t.arap.payables}
          value={<M v={d.totals.payables} big />}
          hint={d.totals.customerCredits ? `${t.arap.customerCredits}: ${n0(d.totals.customerCredits)}` : undefined}
        />
        <Kpi icon={Clock} title={t.arap.dso} value={<Big text={d.dso === null ? "—" : `${d.dso} ${t.arap.days}`} />} hint={d.dso === null ? t.arap.noBasis : t.arap.basisDso} />
        <Kpi icon={Clock} title={t.arap.dpo} value={<Big text={d.dpo === null ? "—" : `${d.dpo} ${t.arap.days}`} />} hint={d.dpo === null ? t.arap.noBasis : t.arap.basisDpo} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Receivables: the buckets add up to the gross above them; allowance and net follow. */}
        <Card title={t.arap.agingTitle} icon={Users} aside={<M v={d.totals.receivablesGross} />}>
          <AgingBar aging={d.totals.arAging} t={t} n0={n0} />
          <AgingLegend aging={d.totals.arAging} t={t} n0={n0} />
          <div className="mt-3 rounded-xl bg-sand-50 px-3 py-1 ring-1 ring-ink-100">
            {summaryRow(t.arap.gross, d.totals.receivablesGross)}
            {summaryRow(t.arap.allowanceLine, d.totals.allowance)}
            {summaryRow(t.arap.netLine, d.totals.receivables, true)}
          </div>
          {table(trade)}
        </Card>
        <Card title={t.arap.payables} icon={Users} aside={<M v={d.totals.payables} />}>
          <AgingBar aging={d.totals.apAging} t={t} n0={n0} />
          <AgingLegend aging={d.totals.apAging} t={t} n0={n0} />
          {table(d.payables)}
          {d.customerCredits.length > 0 && (
            <div className="mt-5 border-t border-ink-100 pt-4">
              <h4 className="flex items-center justify-between gap-3 text-sm font-extrabold text-ink-900">
                {t.arap.customerCredits}
                <M v={d.totals.customerCredits} />
              </h4>
              <p className="mt-1 text-xs text-ink-500">{t.arap.creditsNote}</p>
              {table(d.customerCredits, false)}
              <div className="mt-3 rounded-xl bg-sand-50 px-3 py-1 ring-1 ring-ink-100">
                {summaryRow(t.arap.allCreditors, d.totals.payables + d.totals.customerCredits, true)}
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function FinancingBody({ d, t, M, day, nl, n0 }: { d: Extract<AcctTabData, { tab: "financing" }>["data"]; t: T; M: MFn; day: (iso?: string) => string; nl: string; n0: (v: number) => string }) {
  if (!d.asOf) return <Empty text={t.noData} />;
  const src = d.ttmLastYear === "actual" ? t.fin.srcActual : d.ttmLastYear === "model" ? t.fin.srcModel : t.fin.srcMixed;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Landmark} title={t.fin.balance} value={<M v={d.balance} big />} />
        <Kpi icon={Scale} title={t.fin.ratio} value={<Big text={d.debtToEbitda === null ? "—" : `${d.debtToEbitda.toLocaleString(nl, { maximumFractionDigits: 2 })}×`} />} hint={`${t.fin.ttm}: ${n0(d.ebitdaTtm)} — ${t.fin.ttmHint(d.ttmActualMonths, src)}`} />
        <Kpi icon={Wallet} title={t.fin.current} value={<M v={d.current} big />} hint={`${t.fin.nonCurrent}: ${n0(d.nonCurrent)}`} />
        <Kpi icon={Banknote} title={t.fin.cost} value={<M v={d.financeCostYtd} big />} />
      </div>
      <Note text={d.splitBasis === "schedule" ? t.fin.splitSchedule : t.fin.splitAccounts} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title={t.fin.balance} icon={Landmark}>
          <Table head={["", t.fin.closing]}>
            <tr>
              <Td>{t.fin.opening}</Td>
              <Td num>
                <M v={d.opening} />
              </Td>
            </tr>
            <tr>
              <Td>{t.fin.repaid}</Td>
              <Td num>
                <M v={-d.repaid} />
              </Td>
            </tr>
            <tr>
              <Td>{t.fin.drawn}</Td>
              <Td num>
                <M v={d.drawn} />
              </Td>
            </tr>
            <tr className="bg-sand-50/70 font-extrabold">
              <Td>{t.fin.closing}</Td>
              <Td num>
                <M v={d.balance} />
              </Td>
            </tr>
          </Table>
          <p className="mt-4 text-xs font-bold text-ink-500">{t.fin.accounts}</p>
          <Table head={["", t.fin.closing]}>
            {d.accounts.map((a) => (
              <tr key={a.code}>
                <Td>
                  <span dir="ltr" className="me-2 font-mono text-xs text-ink-400">
                    {a.code}
                  </span>
                  {a.name} · {a.part === "current" ? t.fin.current : t.fin.nonCurrent}
                </Td>
                <Td num>
                  <M v={a.balance} />
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
      <Card title={t.fin.schedule} icon={Clock}>
        {d.schedule.length || d.overdue.length ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="max-h-[520px] overflow-auto">
              <Table head={[t.fin.date, t.fin.amount, t.fin.after, t.fin.part]}>
                {d.overdue.map((m) => (
                  <tr key={`o-${m.date}`} className="bg-red-50/60">
                    <Td>{day(m.date)}</Td>
                    <Td num>
                      <M v={m.amount} />
                    </Td>
                    <Td num>—</Td>
                    <Td>
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-800 ring-1 ring-red-200">{t.fin.overdueTag}</span>
                    </Td>
                  </tr>
                ))}
                {d.schedule.map((m) => (
                  <tr key={m.date}>
                    <Td>{day(m.date)}</Td>
                    <Td num>
                      <M v={m.amount} />
                    </Td>
                    <Td num>
                      <M v={m.after} />
                    </Td>
                    <Td>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${m.current ? "bg-primary-50 text-primary-800 ring-primary-200" : "bg-sand-50 text-ink-600 ring-ink-100"}`}
                      >
                        {m.current ? t.fin.current : t.fin.nonCurrent}
                      </span>
                    </Td>
                  </tr>
                ))}
              </Table>
            </div>
            <div className="self-start rounded-xl bg-sand-50 p-4 ring-1 ring-ink-100">
              {(
                [
                  [t.fin.scheduleTotal, d.scheduleTotal, true],
                  [t.fin.scheduleCurrent, d.scheduleCurrent, false],
                  [t.fin.scheduleNonCurrent, d.scheduleTotal - d.scheduleCurrent, false],
                  [t.fin.book, d.balance, true],
                  [t.fin.bookDiff, d.bookDiff, true],
                ] as const
              ).map(([label, v, strong], i) => (
                <div
                  key={label}
                  className={`flex items-center justify-between gap-3 py-1.5 text-sm ${i === 3 ? "mt-2 border-t border-ink-200 pt-3" : ""} ${strong ? "font-extrabold text-ink-950" : "text-ink-700"}`}
                >
                  <span>{label}</span>
                  <M v={v} />
                </div>
              ))}
              <p className="mt-3 text-xs leading-relaxed text-ink-500">{t.fin.bookNote}</p>
            </div>
          </div>
        ) : (
          <Note text={t.fin.noSchedule} />
        )}
      </Card>
    </>
  );
}

function AlertsBody({
  d,
  check,
  threshold,
  t,
  M,
  n0,
  pct,
  day,
  monthName,
}: {
  d: Extract<AcctTabData, { tab: "alerts" }>["data"];
  check: CheckRow[];
  threshold: number;
  t: T;
  M: MFn;
  n0: (v: number) => string;
  pct: (v: number) => string;
  day: (iso?: string) => string;
  monthName: (m: string) => string;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={BellRing} title={t.alerts.unposted} value={<Big text={d.asOf ? String(d.unposted.length) : "—"} />} />
        <Kpi icon={AlertTriangle} title={t.alerts.overdue} value={<Big text={d.asOf ? String(d.overdue.length) : "—"} tone={d.overdue.length ? "warn" : undefined} />} />
        <Kpi icon={ArrowDownRight} title={t.alerts.impactRev} value={<M v={d.unpostedImpact.revenue} big />} />
        <Kpi icon={ArrowUpRight} title={t.alerts.impactExp} value={<M v={d.unpostedImpact.expenses} big />} />
      </div>
      <Card title={t.alerts.check} icon={ClipboardCheck}>
        <p className="-mt-2 mb-3 text-xs text-ink-500">{t.alerts.checkHint}</p>
        <div className="overflow-x-auto">
          <Table head={[t.alerts.item, t.alerts.dashboard, t.alerts.tb, t.alerts.diff]}>
            {check.map((r) => (
              <tr key={r.key} className={Math.abs(r.diff) >= 1 ? "bg-amber-50/70" : ""}>
                <Td>{t.alerts.checkKeys[r.key] ?? r.key}</Td>
                <Td num>{n0(r.dashboard)}</Td>
                <Td num>{n0(r.tb)}</Td>
                <Td num>{Math.abs(r.diff) < 1 ? <CheckCircle2 className="ms-auto h-4 w-4 text-emerald-700" aria-label="0" /> : <span className="font-extrabold text-amber-800">{n0(r.diff)}</span>}</Td>
              </tr>
            ))}
          </Table>
        </div>
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title={t.alerts.overdue} icon={AlertTriangle}>
          {!d.asOf ? (
            <Note text={t.alerts.noUnposted} />
          ) : d.overdue.length ? (
            <div className="max-h-[460px] overflow-auto">
              <Table head={[t.alerts.module, t.alerts.no, t.alerts.date, t.alerts.branch, t.alerts.age]}>
                {d.overdue.map((u) => (
                  <tr key={`${u.module}-${u.no}`}>
                    <Td>{u.module || "—"}</Td>
                    <Td>
                      <span dir="ltr" className="font-mono text-xs">
                        {u.no}
                      </span>
                    </Td>
                    <Td>{day(u.date)}</Td>
                    <Td>{u.branch || "—"}</Td>
                    <Td num>
                      <span className={u.age > 30 ? "font-extrabold text-red-700" : "font-bold text-amber-700"}>{u.age}</span>
                    </Td>
                  </tr>
                ))}
              </Table>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm font-bold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> {t.alerts.none}
            </p>
          )}
        </Card>
        <Card title={t.alerts.recon} icon={Scale}>
          <p className="-mt-2 mb-3 text-xs text-ink-500">{t.alerts.threshold(pct(threshold))}</p>
          <div className="overflow-x-auto">
            <Table head={[t.alerts.month, t.alerts.pms, t.alerts.acct, t.alerts.diff, t.alerts.pct, t.alerts.lab]}>
              {d.recon.map((r) => (
                <tr key={r.month} className={r.flagged ? "bg-amber-50/70" : ""}>
                  <Td>{monthName(r.month)}</Td>
                  <Td num>{r.pms === null ? "—" : n0(r.pms)}</Td>
                  <Td num>{r.accounting === null ? "—" : n0(r.accounting)}</Td>
                  <Td num>{r.diff === null ? "—" : <span className={r.flagged ? "font-extrabold text-amber-800" : ""}>{n0(r.diff)}</span>}</Td>
                  <Td num>
                    {r.pct === null ? (
                      "—"
                    ) : (
                      <span className={`inline-flex items-center gap-1 ${r.flagged ? "font-extrabold text-amber-800" : "text-ink-500"}`} title={r.flagged ? t.alerts.flagged : undefined}>
                        {r.flagged && <AlertTriangle className="h-3.5 w-3.5" aria-label={t.alerts.flagged} />}
                        {pct(r.pct)}
                      </span>
                    )}
                  </Td>
                  <Td num muted>
                    {r.lab ? n0(r.lab) : "—"}
                  </Td>
                </tr>
              ))}
            </Table>
          </div>
        </Card>
      </div>
    </>
  );
}

// --- Small pieces ---

function Money({ v, n0, big }: { v: number; n0: (v: number) => string; big?: boolean }) {
  return (
    <span className={`inline-flex items-baseline gap-1 tabular-nums ${big ? "text-2xl font-extrabold text-ink-950" : ""}`}>
      {n0(v)}
      <RiyalIcon className="h-[0.62em] w-auto self-center opacity-80" />
    </span>
  );
}

function Big({ text, tone }: { text: string; tone?: "warn" }) {
  return <span className={`text-2xl font-extrabold tabular-nums ${tone === "warn" ? "text-amber-700" : "text-ink-950"}`}>{text}</span>;
}

function Chip({ icon: I }: { icon: Icon }) {
  return (
    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-900 text-white shadow-sm">
      <I className="h-5 w-5" />
    </span>
  );
}

function Kpi({ icon, title, value, hint }: { icon: Icon; title: string; value: ReactNode; hint?: string }) {
  return (
    <section className="card relative min-w-0 overflow-hidden p-5">
      <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-primary-500 to-primary-900 opacity-80" aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink-600">{title}</p>
          <div className="mt-2">{value}</div>
          {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
        </div>
        <Chip icon={icon} />
      </div>
    </section>
  );
}

function Card({ title, icon, aside, children }: { title: string; icon: Icon; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="card relative min-w-0 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-3 font-extrabold text-ink-950">
          <Chip icon={icon} />
          {title}
        </h3>
        {aside && <span className="font-extrabold text-ink-950">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <table className="w-full text-sm">
      <thead className="sticky top-0 z-[1] bg-white">
        <tr className="text-xs text-ink-500">
          {head.map((h, i) => (
            <th key={`${h}-${i}`} className={`whitespace-nowrap border-b border-ink-100 px-2 py-2.5 font-bold ${i === 0 ? "text-start" : "text-end"}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-ink-100/70">{children}</tbody>
    </table>
  );
}

function Td({ children, num, muted, wrap }: { children: ReactNode; num?: boolean; muted?: boolean; wrap?: boolean }) {
  return (
    <td className={`px-2 py-2.5 ${num ? `whitespace-nowrap text-end tabular-nums ${muted ? "text-ink-400" : "text-ink-900"}` : `text-ink-700 ${wrap ? "" : "whitespace-nowrap"}`}`}>{children}</td>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="card p-6 text-ink-600">{text}</div>;
}

function Note({ text }: { text: string }) {
  return <p className="rounded-xl bg-sand-50 p-3 text-sm text-ink-600 ring-1 ring-ink-100">{text}</p>;
}


/** A simple area line of the daily bank total (single series: the title names it), with min and max marked. */
function AreaChart({ points, n0 }: { points: { label: string; value: number }[]; n0: (v: number) => string }) {
  const w = 720;
  const h = 200;
  const pad = 8;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / (points.length - 1)) * (w - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / span) * (h - pad * 2);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${h - pad} L${x(0).toFixed(1)},${h - pad} Z`;
  return (
    <div dir="ltr">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-48 w-full" role="img" aria-label={`${points[0].label} – ${points[points.length - 1].label}`}>
        <defs>
          <linearGradient id="cash-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#0a9db0" stopOpacity="0.28" />
            <stop offset="1" stopColor="#0a9db0" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <line x1={pad} x2={w - pad} y1={h - pad} y2={h - pad} stroke="#e7e2da" vectorEffect="non-scaling-stroke" />
        <path d={area} fill="url(#cash-area)" />
        <path d={line} fill="none" stroke="#0a9db0" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => (
          <rect key={i} x={x(i) - (w / points.length) / 2} y={0} width={w / points.length} height={h} fill="transparent">
            <title>{`${p.label}: ${n0(p.value)}`}</title>
          </rect>
        ))}
      </svg>
      <div className="flex justify-between text-xs text-ink-500">
        <span>{points[0].label}</span>
        <span className="font-bold text-ink-900">
          ▲ {n0(max)} · ▼ {n0(min)}
        </span>
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  );
}
