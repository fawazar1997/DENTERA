import Link from "next/link";
import { Activity, BadgePercent, CalendarCheck, CalendarDays, Info, Stethoscope, TrendingDown, TrendingUp, Users, Wallet } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import type { Locale } from "@/lib/i18n";
import type { OpsData, OpsTab } from "@/lib/opsData";
import { OPS_TAB_NAMES } from "@/lib/opsData";
import type { BranchFilter, Kpi, KpiKey } from "@/lib/opsMetrics";
import { RiyalIcon } from "@/components/RiyalIcon";
import { LastUpdate } from "./LastUpdate";

type Icon = ComponentType<{ className?: string }>;

const AR = {
  sub: "الأداء التشغيلي — من فواتير نظام العيادة (أبها وخميس مشيط؛ المعمل مستبعد)",
  all: "كل الفروع",
  branches: { abha: "أبها", khamis: "خميس مشيط" } as Record<string, string>,
  month: "الشهر",
  show: "عرض",
  na: "غير متاح",
  noCompare: "المقارنة غير متاحة",
  prev: "الشهر السابق",
  target: "الهدف",
  noTarget: "بلا هدف",
  tones: { good: "ضمن الهدف", warn: "قريب من الهدف", bad: "دون الهدف" },
  cards: {
    newPct: "نسبة المرضى الجدد",
    attendance: "نسبة الحضور",
    noShow: "نسبة عدم الحضور",
    perChairDay: "الإيراد لكل كرسي في اليوم",
    perDay: "الإيراد لكل يوم عمل",
    discountPct: "نسبة الخصومات",
  } as Record<KpiKey, string>,
  defs: {
    newPct: "المريض الجديد: أول فاتورة له في الفرع خلال الشهر. العائد: له فاتورة سابقة في الفرع. «كل الفروع»: يُحتسب الشخص مرة واحدة، ويُعد جديدًا إذا كان جديدًا في فرع زاره خلال الشهر. النسبة = الجدد ÷ (الجدد + العائدون).",
    attendance: "المواعيد التي حان وقتها: نسبة الحضور = الحضور ÷ (المحجوزة − الإلغاءات المسبقة ≥ 24 ساعة). الإلغاء المتأخر (< 24 ساعة) يبقى في المقام.",
    noShow: "عدم الحضور: موعد مضى وقته ولم يُلغَ ولم يُسجَّل حضوره. النسبة = عدم الحضور ÷ (المحجوزة − الإلغاءات المسبقة).",
    perChairDay: "صافي الإيراد ÷ (عدد الكراسي × أيام العمل). يوم العمل: تاريخ صدرت فيه فاتورة للفرع. «كل الفروع»: مجموع الإيراد ÷ مجموع (الكراسي × الأيام) لكل فرع.",
    perDay: "صافي الإيراد ÷ عدد أيام العمل (تواريخ فيها فواتير).",
    discountPct: "قيمة الخصومات ÷ الإيراد قبل الخصم، من إجمالي البسط والمقام في النطاق نفسه.",
  } as Record<KpiKey, string>,
  apptMissing: "بانتظار تقرير المواعيد من نظام العيادة",
  chairsMissing: "أدخل عدد الكراسي من «إعدادات التشغيل»",
  noData: "لا توجد فواتير مخزنة لهذا الشهر بعد.",
  patients: {
    groups: "الجدد والعائدون",
    group: "الفئة",
    newG: "جدد",
    retG: "عائدون",
    count: "المرضى",
    invoices: "الفواتير",
    revenue: "الإيراد",
    avg: "متوسط الفاتورة",
    definition: (year: string) => `المريض الجديد: أول فاتورة له في الفرع ضمن سجلات سنة ${year}؛ العائد: له فاتورة سابقة في الفرع خلال السنة نفسها.`,
    trend: "نسبة الجدد — أشهر السنة",
    byBranch: "نسبة الجدد حسب الفرع",
    cohort: "العودة خلال 90 يومًا",
    cohortHead: ["الشهر", "جدد", "عادوا خلال 90 يومًا", "النسبة", ""],
    incomplete: "لم تكتمل المتابعة",
    byDoctor: "حسب الطبيب",
    doctorHead: ["الطبيب", "جدد", "عائدون", "نسبة الجدد", "الإيراد", "متوسط الفاتورة"],
  },
  appt: {
    title: "الحضور والمواعيد",
    states: "الحالات",
    list: [
      "المحجوزة: كل المواعيد المجدولة في الفترة، بما فيها الملغاة التي يثبت التقرير أنها كانت محجوزة، دون تكرار.",
      "الإلغاء المسبق: قبل وقت الموعد بـ24 ساعة أو أكثر.",
      "الإلغاء المتأخر: قبل وقت الموعد بأقل من 24 ساعة.",
      "الحضور: موعد سُجّل له حضور.",
      "عدم الحضور: موعد مضى وقته ولم يُلغَ ولم يُسجَّل حضوره. المواعيد المستقبلية تبقى في المحجوز وتُستبعد من النسب.",
      "إذا غاب توقيت الإلغاء يظهر «تعذّر التصنيف» بدل الافتراض.",
    ],
    summary: "مواعيد الشهر",
    head: ["", "العدد"],
    rows: {
      booked: "المحجوزة",
      future: "لم يحن وقتها بعد",
      early: "إلغاء مسبق (≥ 24 ساعة)",
      late: "إلغاء متأخر (< 24 ساعة)",
      unknownCancel: "إلغاء — تعذّر التصنيف",
      attended: "الحضور",
      noShow: "عدم الحضور",
      base: "المقام (المحجوزة − المستقبلية − الإلغاءات المسبقة وغير المصنفة)",
    } as Record<string, string>,
    cancelNote: "تقرير المواعيد في نظام العيادة لا يحمل وقت الإلغاء، فتظهر الإلغاءات كلها في «تعذّر التصنيف» وتُستبعد من المقام حتى لا يُفترض توقيتها.",
    byBranch: "حسب الفرع",
    byShift: "حسب الفترة",
    shifts: { morning: "صباحية (قبل 3 م)", evening: "مسائية (من 3 م)" } as Record<string, string>,
    byDoctor: "حسب الطبيب",
    rateHead: (first: string) => [first, "المحجوزة", "الحضور", "عدم الحضور", "الإلغاءات", "نسبة الحضور", "نسبة عدم الحضور"],
    trend: "نسبة الحضور — أشهر السنة",
    statuses: "حالات نظام العيادة وتصنيفها",
    statusHead: ["الحالة في النظام", "التصنيف", "العدد"],
    stateNames: { attended: "حضور", noShow: "عدم حضور", cancelled: "إلغاء", open: "بلا حالة (يُعد عدم حضور إذا مضى وقته)" } as Record<string, string>,
    newOld: (n: number, o: number, c: number) => `حسب علامة الموعد في النظام: جدد ${n} — عائدون ${o}؛ المواعيد المؤكدة ${c}.`,
    noMonth: "لا توجد مواعيد مخزنة لهذا الشهر بعد.",
  },
  prod: {
    branches: "الفروع",
    head: ["الفرع", "صافي الإيراد", "أيام العمل", "لكل يوم عمل", "الكراسي", "لكل كرسي/يوم", "لكل يوم عمل — الشهر السابق"],
    trend: "الإيراد لكل يوم عمل — أشهر السنة",
    byDoctor: "الإيراد لكل طبيب في يوم العمل",
    doctorHead: ["الطبيب", "صافي الإيراد", "أيام العمل", "لكل يوم عمل"],
    occupancy: "نسبة إشغال الكراسي: غير متاحة — جدول العيادات (Clinics Schedule) غير ظاهر لحساب الروبوت في نظام العيادة.",
  },
  disc: {
    totals: "الخصومات",
    gross: "الإيراد قبل الخصم",
    discount: "الخصومات",
    pct: "النسبة",
    byBranch: "حسب الفرع",
    byGroup: "حسب مجموعة الخدمات",
    groups: { implant: "الزراعة", ortho: "التقويم وإنفزلاين", cosmetic: "التجميل", general: "العام" } as Record<string, string>,
    byDoctor: "حسب الطبيب",
    top: "أكبر 10 خصومات في الشهر",
    topHead: ["الفاتورة", "التاريخ", "الفرع", "الطبيب", "الخدمة", "الخصم", "النسبة"],
    trend: "نسبة الخصومات — أشهر السنة",
    tb: "المطابقة مع ميزان المراجعة",
    tbHead: ["الفرع", "الحساب", "نظام العيادة", "ميزان المراجعة", "الفرق"],
    tbMissing: "ميزان الشهر غير مخزن",
    over: (pct: string) => `تجاوز حد الخصم (${pct})`,
    offers: "حسب نوع العرض: بانتظار استيراد Offers Report.",
  },
};
// Every key written out (no «...AR»), so a text added in Arabic and missing here fails the build.
const EN: typeof AR = {
  sub: "Operating performance — from the clinic system (Abha and Khamis Mushait; lab excluded)",
  all: "All branches",
  branches: { abha: "Abha", khamis: "Khamis Mushait" },
  month: "Month",
  show: "Show",
  na: "Not available",
  noCompare: "Comparison not available",
  prev: "Last month",
  target: "Target",
  noTarget: "No target",
  tones: { good: "On target", warn: "Near target", bad: "Below target" },
  cards: {
    newPct: "New patients",
    attendance: "Attendance rate",
    noShow: "No-show rate",
    perChairDay: "Revenue per chair per day",
    perDay: "Revenue per working day",
    discountPct: "Discount rate",
  },
  defs: {
    newPct: "New patient: their first invoice in the branch this year. Returning: they already had an invoice in the branch. “All branches”: each person counts once, and as new if they were new in a branch they visited this month. Rate = new ÷ (new + returning).",
    attendance: "Appointments whose time has passed: attendance = attended ÷ (booked − cancellations made ≥ 24 hours ahead). Late cancellations (< 24 hours) stay in the base.",
    noShow: "No-show: an appointment whose time has passed, not cancelled and with no attendance recorded. Rate = no-shows ÷ (booked − early cancellations).",
    perChairDay: "Net revenue ÷ (chairs × working days). A working day is a date with at least one invoice in the branch. “All branches”: total revenue ÷ the sum of (chairs × days) of each branch.",
    perDay: "Net revenue ÷ working days (dates with invoices).",
    discountPct: "Discounts ÷ revenue before discount, both totals taken over the same scope.",
  },
  apptMissing: "Waiting for the clinic system's appointments report",
  chairsMissing: "Enter the number of chairs in “Operating settings”",
  noData: "No invoices stored for this month yet.",
  patients: {
    groups: "New and returning",
    group: "Group",
    newG: "New",
    retG: "Returning",
    count: "Patients",
    invoices: "Invoices",
    revenue: "Revenue",
    avg: "Average invoice",
    definition: (year: string) => `New patient: their first invoice in the branch within ${year}'s records; returning: an earlier invoice in the branch in the same year.`,
    trend: "New patients rate — months of the year",
    byBranch: "New patients rate by branch",
    cohort: "Returned within 90 days",
    cohortHead: ["Month", "New", "Returned within 90 days", "Rate", ""],
    incomplete: "Follow-up not complete",
    byDoctor: "By doctor",
    doctorHead: ["Doctor", "New", "Returning", "New rate", "Revenue", "Average invoice"],
  },
  appt: {
    title: "Attendance & appointments",
    states: "States",
    list: [
      "Booked: every appointment scheduled in the period, including cancelled ones the report shows were booked, counted once.",
      "Early cancellation: 24 hours or more before the appointment.",
      "Late cancellation: less than 24 hours before the appointment.",
      "Attended: an appointment with attendance recorded.",
      "No-show: an appointment whose time has passed, not cancelled and with no attendance recorded. Future appointments stay in booked and are left out of the rates.",
      "When the cancellation time is missing, it shows as “Can't be classified” rather than being assumed.",
    ],
    summary: "This month's appointments",
    head: ["", "Count"],
    rows: {
      booked: "Booked",
      future: "Not yet due",
      early: "Early cancellation (≥ 24 h)",
      late: "Late cancellation (< 24 h)",
      unknownCancel: "Cancellation — can't be classified",
      attended: "Attended",
      noShow: "No-show",
      base: "Base (booked − future − early and unclassified cancellations)",
    },
    cancelNote: "The clinic system's appointments report has no cancellation time, so every cancellation shows as “can't be classified” and is left out of the base rather than guessing when it happened.",
    byBranch: "By branch",
    byShift: "By shift",
    shifts: { morning: "Morning (before 3 pm)", evening: "Evening (from 3 pm)" },
    byDoctor: "By doctor",
    rateHead: (first: string) => [first, "Booked", "Attended", "No-show", "Cancellations", "Attendance rate", "No-show rate"],
    trend: "Attendance rate — months of the year",
    statuses: "Clinic system statuses and how they count",
    statusHead: ["Status in the system", "Counted as", "Count"],
    stateNames: { attended: "Attended", noShow: "No-show", cancelled: "Cancelled", open: "No status (a no-show once its time has passed)" },
    newOld: (n: number, o: number, c: number) => `As marked on the appointment in the system: new ${n} — returning ${o}; confirmed appointments ${c}.`,
    noMonth: "No appointments stored for this month yet.",
  },
  prod: {
    branches: "Branches",
    head: ["Branch", "Net revenue", "Working days", "Per working day", "Chairs", "Per chair per day", "Per working day — last month"],
    trend: "Revenue per working day — months of the year",
    byDoctor: "Revenue per doctor per working day",
    doctorHead: ["Doctor", "Net revenue", "Working days", "Per working day"],
    occupancy: "Chair occupancy: not available — the clinics schedule (Clinics Schedule) isn't visible to the robot's account in the clinic system.",
  },
  disc: {
    totals: "Discounts",
    gross: "Revenue before discount",
    discount: "Discounts",
    pct: "Rate",
    byBranch: "By branch",
    byGroup: "By service group",
    groups: { implant: "Implants", ortho: "Orthodontics & Invisalign", cosmetic: "Cosmetic", general: "General" },
    byDoctor: "By doctor",
    top: "Top 10 discounts this month",
    topHead: ["Invoice", "Date", "Branch", "Doctor", "Service", "Discount", "Rate"],
    trend: "Discount rate — months of the year",
    tb: "Check against the trial balance",
    tbHead: ["Branch", "Account", "Clinic system", "Trial balance", "Difference"],
    tbMissing: "This month's trial balance isn't stored",
    over: (pct: string) => `Above the discount limit (${pct})`,
    offers: "By offer type: waiting for the Offers Report import.",
  },
};

const nl = (locale: Locale) => (locale === "ar" ? "ar-SA-u-nu-latn" : "en-US");

export function OpsView({
  data,
  tab,
  locale,
  href,
  lastUpdate,
  controls,
}: {
  data: OpsData;
  tab: OpsTab;
  locale: Locale;
  /** A link to this view with other filters. */
  href: (q: { month?: string; branch?: BranchFilter }) => string;
  lastUpdate?: string;
  controls?: ReactNode;
}) {
  const t = locale === "ar" ? AR : EN;
  const n0 = (v: number) => {
    const s = Math.round(Math.abs(v)).toLocaleString(nl(locale));
    return v < 0 ? `(${s})` : s;
  };
  const pct = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${(v * 100).toLocaleString(nl(locale), { maximumFractionDigits: 1 })}%`);
  const monthName = (m: string) => new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-15T12:00:00Z`));
  const M = ({ v }: { v: number }) => (
    <span className="inline-flex items-baseline gap-1 tabular-nums">
      {n0(v)}
      <RiyalIcon className="h-[0.62em] w-auto self-center opacity-80" />
    </span>
  );
  const branchName = (b: string) => t.branches[b] ?? b;

  return (
    <div className="space-y-6">
      {/* Header: what, which month, which branch */}
      <section className="relative overflow-hidden rounded-[28px] border border-ink-100 bg-white shadow-card">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-l ltr:bg-gradient-to-r from-primary-500 via-primary-300 to-primary-900" aria-hidden="true" />
        <div className="relative flex flex-wrap items-end justify-between gap-4 p-6 sm:p-7">
          <div className="min-w-0">
            <p className="text-sm font-bold text-primary-700">{t.sub}</p>
            <h2 className="mt-1 text-2xl font-extrabold text-ink-950 sm:text-3xl">
              {OPS_TAB_NAMES[locale === "ar" ? "ar" : "en"][tab]} — {monthName(data.month)}
            </h2>
            <div className="mt-2 flex flex-wrap items-start gap-2">
              <LastUpdate at={lastUpdate} locale={locale} />
              {controls}
            </div>
          </div>
          <form method="get" className="flex w-full items-center gap-2 sm:w-auto">
            <input type="hidden" name="tab" value={tab} />
            {data.branch !== "all" && <input type="hidden" name="branch" value={data.branch} />}
            <label className="text-xs font-bold text-ink-600" htmlFor="ops-month">
              {t.month}
            </label>
            <select id="ops-month" name="month" defaultValue={data.month} className="input h-10 min-w-0 flex-1 py-1 text-sm sm:w-auto sm:flex-none">
              {[...data.months].reverse().map((m) => (
                <option key={m} value={m}>
                  {monthName(m)}
                </option>
              ))}
              {!data.months.includes(data.month) && <option value={data.month}>{monthName(data.month)}</option>}
            </select>
            <button type="submit" className="btn-outline h-10 shrink-0 px-4 text-sm">
              {t.show}
            </button>
          </form>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-ink-100 bg-sand-50/60 px-4 py-2 sm:px-6" aria-label={t.all}>
          {(["all", "abha", "khamis"] as const).map((b) => (
            <Link
              key={b}
              href={href({ branch: b })}
              scroll={false}
              aria-current={data.branch === b ? "page" : undefined}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-bold ${data.branch === b ? "bg-ink-900 text-white" : "text-ink-700 hover:bg-white"}`}
            >
              {b === "all" ? t.all : branchName(b)}
            </Link>
          ))}
        </nav>
      </section>

      {/* The 6 cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.cards.map((c) => (
          <KpiCard key={c.key} k={c} t={t} pct={pct} M={M} />
        ))}
      </div>

      {!data.hasData && <Note text={t.noData} />}

      {tab === "opsPatients" && <PatientsBody d={data} t={t} pct={pct} M={M} monthName={monthName} branchName={branchName} />}
      {tab === "opsAppointments" && data.appointments.has && <ApptBody d={data} t={t} pct={pct} monthName={monthName} branchName={branchName} />}
      {tab === "opsAppointments" && !data.appointments.has && (
        <Card title={t.appt.title} icon={CalendarCheck}>
          <Note text={t.apptMissing} />
          <h4 className="mt-4 text-sm font-extrabold text-ink-900">{t.appt.states}</h4>
          <ul className="mt-2 list-disc space-y-1.5 ps-5 text-sm text-ink-700">
            {t.appt.list.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </Card>
      )}
      {tab === "opsProductivity" && <ProductivityBody d={data} t={t} M={M} monthName={monthName} branchName={branchName} />}
      {tab === "opsDiscounts" && <DiscountsBody d={data} t={t} M={M} pct={pct} monthName={monthName} branchName={branchName} />}
    </div>
  );
}

type T = typeof AR;
type MFn = (p: { v: number }) => JSX.Element;

function KpiCard({ k, t, pct, M }: { k: Kpi; t: T; pct: (v: number | null) => string; M: MFn }) {
  const money = k.key === "perChairDay" || k.key === "perDay";
  const show = (v: number | null) => (v === null ? t.na : money ? <M v={v} /> : pct(v));
  const missing =
    k.value === null ? (k.key === "attendance" || k.key === "noShow" ? t.apptMissing : k.key === "perChairDay" ? t.chairsMissing : undefined) : undefined;
  const toneCls = { good: "bg-emerald-50 text-emerald-800 ring-emerald-200", warn: "bg-amber-50 text-amber-900 ring-amber-200", bad: "bg-red-50 text-red-800 ring-red-200" };
  const dot = { good: "bg-emerald-600", warn: "bg-amber-500", bad: "bg-red-600" };
  return (
    <section className="card relative min-w-0 p-5">
      <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l ltr:bg-gradient-to-r from-primary-500 to-primary-900 opacity-80" aria-hidden="true" />
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-ink-600">{t.cards[k.key]}</p>
        <details className="group relative">
          <summary className="flex h-6 w-6 cursor-pointer list-none items-center justify-center rounded-full text-ink-400 hover:bg-sand-50 hover:text-ink-700" aria-label={`ⓘ ${t.cards[k.key]}`}>
            <Info className="h-4 w-4" />
          </summary>
          <div className="absolute end-0 z-10 mt-1 w-72 rounded-xl bg-ink-950 p-3 text-xs leading-relaxed text-white shadow-lg">{t.defs[k.key]}</div>
        </details>
      </div>
      <p className={`mt-2 text-2xl font-extrabold tabular-nums ${k.value === null ? "text-ink-400" : "text-ink-950"}`}>{show(k.value)}</p>
      {missing && <p className="mt-1 text-xs text-ink-500">{missing}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-600">
        <span>
          {t.prev}: <span className="font-bold tabular-nums">{show(k.previous)}</span>
        </span>
        {k.change === null ? (
          <span className="text-ink-400">{t.noCompare}</span>
        ) : (
          <span className="inline-flex items-center gap-1 font-bold tabular-nums">
            {k.change >= 0 ? <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> : <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />}
            {pct(k.change)}
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-ink-500">
          {t.target}: <span className="font-bold tabular-nums text-ink-700">{k.target === null ? t.noTarget : show(k.target)}</span>
        </span>
        {k.tone && (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-bold ring-1 ${toneCls[k.tone]}`}>
            <span className={`h-2 w-2 rounded-full ${dot[k.tone]}`} aria-hidden="true" />
            {t.tones[k.tone]}
          </span>
        )}
      </div>
    </section>
  );
}

function PatientsBody({ d, t, pct, M, monthName, branchName }: { d: OpsData; t: T; pct: (v: number | null) => string; M: MFn; monthName: (m: string) => string; branchName: (b: string) => string }) {
  const p = d.patients.now;
  const row = (label: string, g: typeof p.newPatients) => (
    <tr>
      <Td>{label}</Td>
      <Td num>{g.patients.toLocaleString("en-US")}</Td>
      <Td num>{g.invoices.toLocaleString("en-US")}</Td>
      <Td num>
        <M v={g.revenue} />
      </Td>
      <Td num>{g.avg === null ? "—" : <M v={g.avg} />}</Td>
    </tr>
  );
  return (
    <>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title={t.patients.groups} icon={Users}>
          <Table head={[t.patients.group, t.patients.count, t.patients.invoices, t.patients.revenue, t.patients.avg]}>
            {row(t.patients.newG, p.newPatients)}
            {row(t.patients.retG, p.returning)}
          </Table>
          <p className="mt-3 text-xs text-ink-500">{t.patients.definition(d.year)}</p>
          <Columns title={t.patients.trend} points={d.patients.trend.map((x) => ({ label: monthName(x.month), value: x.newPct }))} fmt={pct} />
        </Card>
        <Card title={t.patients.byBranch} icon={Activity}>
          <Table head={[t.month, ...d.patients.trendByBranch.map((b) => branchName(b.branch))]}>
            {d.patients.trend.map((x, i) => (
              <tr key={x.month}>
                <Td>{monthName(x.month)}</Td>
                {d.patients.trendByBranch.map((b) => (
                  <Td key={b.branch} num>
                    {pct(b.points[i]?.newPct ?? null)}
                  </Td>
                ))}
              </tr>
            ))}
          </Table>
        </Card>
      </div>
      <Card title={t.patients.cohort} icon={CalendarDays}>
        <Table head={t.patients.cohortHead}>
          {d.patients.cohorts.map((c) => (
            <tr key={c.month}>
              <Td>{monthName(c.month)}</Td>
              <Td num>{c.cohort.toLocaleString("en-US")}</Td>
              <Td num>{c.returned.toLocaleString("en-US")}</Td>
              <Td num muted={!c.complete}>{pct(c.rate)}</Td>
              <Td>{!c.complete && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-900 ring-1 ring-amber-200">{t.patients.incomplete}</span>}</Td>
            </tr>
          ))}
        </Table>
      </Card>
      {d.patients.byDoctor && (
        <Card title={t.patients.byDoctor} icon={Stethoscope}>
          <div className="max-h-[480px] overflow-auto">
            <Table head={t.patients.doctorHead}>
              {d.patients.byDoctor.map((r) => (
                <tr key={r.doctor}>
                  <Td>{r.doctor}</Td>
                  <Td num>{r.newPatients}</Td>
                  <Td num>{r.returning}</Td>
                  <Td num>{pct(r.newPct)}</Td>
                  <Td num>
                    <M v={r.revenue} />
                  </Td>
                  <Td num>{r.avg === null ? "—" : <M v={r.avg} />}</Td>
                </tr>
              ))}
            </Table>
          </div>
        </Card>
      )}
    </>
  );
}

function ProductivityBody({ d, t, M, monthName, branchName }: { d: OpsData; t: T; M: MFn; monthName: (m: string) => string; branchName: (b: string) => string }) {
  const money = (v: number | null) => (v === null ? <span className="text-ink-400">{t.na}</span> : <M v={v} />);
  return (
    <>
      <Card title={t.prod.branches} icon={Wallet}>
        <div className="overflow-x-auto">
          <Table head={t.prod.head}>
            {d.productivity.byBranch.map((b) => (
              <tr key={b.branch}>
                <Td>{branchName(b.branch)}</Td>
                <Td num>
                  <M v={b.now.net} />
                </Td>
                <Td num>{b.now.workingDays}</Td>
                <Td num>{money(b.now.perDay)}</Td>
                <Td num>{d.settings.chairs[b.branch] ?? <span className="text-ink-400">{t.na}</span>}</Td>
                <Td num>{money(b.now.perChairDay)}</Td>
                <Td num>{money(b.prev?.perDay ?? null)}</Td>
              </tr>
            ))}
          </Table>
        </div>
        <p className="mt-3 text-xs text-ink-500">{t.prod.occupancy}</p>
        <Columns title={t.prod.trend} points={d.productivity.trend.map((x) => ({ label: monthName(x.month), value: x.perDay }))} fmt={(v) => (v === null ? "—" : Math.round(v).toLocaleString("en-US"))} />
      </Card>
      {d.productivity.byDoctor && (
        <Card title={t.prod.byDoctor} icon={Stethoscope}>
          <div className="max-h-[480px] overflow-auto">
            <Table head={t.prod.doctorHead}>
              {d.productivity.byDoctor.map((r) => (
                <tr key={r.doctor}>
                  <Td>{r.doctor}</Td>
                  <Td num>
                    <M v={r.net} />
                  </Td>
                  <Td num>{r.days}</Td>
                  <Td num>{money(r.perDay)}</Td>
                </tr>
              ))}
            </Table>
          </div>
        </Card>
      )}
    </>
  );
}

function ApptBody({ d, t, pct, monthName, branchName }: { d: OpsData; t: T; pct: (v: number | null) => string; monthName: (m: string) => string; branchName: (b: string) => string }) {
  const a = d.appointments;
  const rateRow = (name: string, r: (typeof a)["now"]) => (
    <tr key={name}>
      <Td>{name}</Td>
      <Td num>{r.booked}</Td>
      <Td num>{r.attended}</Td>
      <Td num>{r.noShow}</Td>
      <Td num>{r.early + r.late + r.unknownCancel}</Td>
      <Td num>{pct(r.attendance)}</Td>
      <Td num>{pct(r.noShowRate)}</Td>
    </tr>
  );
  if (!a.hasMonth)
    return (
      <Card title={t.appt.title} icon={CalendarCheck}>
        <Note text={t.appt.noMonth} />
      </Card>
    );
  return (
    <>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title={t.appt.summary} icon={CalendarCheck}>
          <Table head={t.appt.head}>
            {(["booked", "future", "early", "late", "unknownCancel", "attended", "noShow", "base"] as const).map((k) => (
              <tr key={k}>
                <Td wrap>{t.appt.rows[k]}</Td>
                <Td num>{a.now[k]}</Td>
              </tr>
            ))}
          </Table>
          {a.now.unknownCancel > 0 && <p className="mt-3 text-xs text-ink-500">{t.appt.cancelNote}</p>}
          <p className="mt-2 text-xs text-ink-500">{t.appt.newOld(a.newOld.new, a.newOld.old, a.confirmed)}</p>
        </Card>
        <Card title={t.appt.byBranch} icon={Users}>
          <div className="overflow-x-auto">
            <Table head={t.appt.rateHead(t.appt.byBranch)}>{a.byBranch.map((b) => rateRow(branchName(b.branch), b))}</Table>
          </div>
          <h4 className="mt-5 text-sm font-extrabold text-ink-900">{t.appt.byShift}</h4>
          <div className="overflow-x-auto">
            <Table head={t.appt.rateHead(t.appt.byShift)}>{a.byShift.map((b) => rateRow(t.appt.shifts[b.shift], b))}</Table>
          </div>
          <Columns
            title={t.appt.trend}
            points={a.trend.filter((x) => x.booked > 0).map((x) => ({ label: monthName(x.month), value: x.attendance === null ? null : x.attendance * 100 }))}
            fmt={(v) => (v === null ? "—" : `${v.toFixed(1)}%`)}
          />
        </Card>
      </div>
      {a.byDoctor && (
        <Card title={t.appt.byDoctor} icon={Stethoscope}>
          <div className="max-h-[480px] overflow-auto">
            <Table head={t.appt.rateHead(t.appt.byDoctor)}>{a.byDoctor.map((r) => rateRow(r.name, r))}</Table>
          </div>
        </Card>
      )}
      <Card title={t.appt.statuses} icon={Info}>
        <Table head={t.appt.statusHead}>
          {a.statusWords.map((w) => (
            <tr key={`${w.status}-${w.state}`}>
              <Td>{w.status}</Td>
              <Td wrap>{t.appt.stateNames[w.state]}</Td>
              <Td num>{w.count}</Td>
            </tr>
          ))}
        </Table>
        <h4 className="mt-4 text-sm font-extrabold text-ink-900">{t.appt.states}</h4>
        <ul className="mt-2 list-disc space-y-1.5 ps-5 text-sm text-ink-700">
          {t.appt.list.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </Card>
    </>
  );
}

function DiscountsBody({ d, t, M, pct, monthName, branchName }: { d: OpsData; t: T; M: MFn; pct: (v: number | null) => string; monthName: (m: string) => string; branchName: (b: string) => string }) {
  const x = d.discounts;
  const over = (p: number | null) => p !== null && p > d.settings.discountThreshold;
  const day = (iso: string) => iso.split("-").reverse().join("-");
  return (
    <>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title={t.disc.byBranch} icon={BadgePercent} aside={pct(x.total.pct)}>
          <div className="overflow-x-auto">
            <Table head={["", t.disc.gross, t.disc.discount, t.disc.pct]}>
              {x.byBranch.map((b) => (
                <tr key={b.key}>
                  <Td>{branchName(b.key)}</Td>
                  <Td num>
                    <M v={b.gross} />
                  </Td>
                  <Td num>
                    <M v={b.discount} />
                  </Td>
                  <Td num>
                    <span className={over(b.pct) ? "font-bold text-red-800" : ""}>{pct(b.pct)}</span>
                  </Td>
                </tr>
              ))}
            </Table>
          </div>
          {x.over.length > 0 && (
            <p className="mt-3 rounded-xl bg-red-50 p-2 text-xs font-bold text-red-800 ring-1 ring-red-200">
              {t.disc.over(pct(d.settings.discountThreshold))}: {x.over.map((o) => `${o.level === "branch" ? branchName(o.name) : o.name} ${pct(o.pct)}`).join(" · ")}
            </p>
          )}
          <Columns title={t.disc.trend} points={x.trend.map((p) => ({ label: monthName(p.month), value: p.pct }))} fmt={pct} />
        </Card>
        <Card title={t.disc.byGroup} icon={BadgePercent}>
          <div className="overflow-x-auto">
            <Table head={["", t.disc.gross, t.disc.discount, t.disc.pct]}>
              {Object.entries(x.byGroup).map(([g, v]) => (
                <tr key={g}>
                  <Td>{t.disc.groups[g] ?? g}</Td>
                  <Td num>
                    <M v={v!.gross} />
                  </Td>
                  <Td num>
                    <M v={v!.discount} />
                  </Td>
                  <Td num>{pct(v!.pct)}</Td>
                </tr>
              ))}
            </Table>
          </div>
          <p className="mt-3 text-xs text-ink-500">{t.disc.offers}</p>
          <h4 className="mt-5 text-sm font-extrabold text-ink-900">{t.disc.tb}</h4>
          <div className="overflow-x-auto">
            <Table head={t.disc.tbHead}>
              {x.tbCheck.map((c) => (
                <tr key={c.branch}>
                  <Td>{branchName(c.branch)}</Td>
                  <Td>
                    <span dir="ltr" className="font-mono text-xs">
                      {c.account}
                    </span>
                  </Td>
                  <Td num>
                    <M v={c.pms} />
                  </Td>
                  <Td num>{c.tb === null ? <span className="text-ink-400">{t.disc.tbMissing}</span> : <M v={c.tb} />}</Td>
                  <Td num>{c.diff === null ? "—" : <M v={c.diff} />}</Td>
                </tr>
              ))}
            </Table>
          </div>
        </Card>
      </div>
      {x.byDoctor && (
        <Card title={t.disc.byDoctor} icon={Stethoscope}>
          <div className="max-h-[480px] overflow-auto">
            <Table head={["", t.disc.gross, t.disc.discount, t.disc.pct]}>
              {x.byDoctor.map((r) => (
                <tr key={r.key}>
                  <Td>{r.key}</Td>
                  <Td num>
                    <M v={r.gross} />
                  </Td>
                  <Td num>
                    <M v={r.discount} />
                  </Td>
                  <Td num>
                    <span className={over(r.pct) ? "font-bold text-red-800" : ""}>{pct(r.pct)}</span>
                  </Td>
                </tr>
              ))}
            </Table>
          </div>
        </Card>
      )}
      {x.top && (
        <Card title={t.disc.top} icon={BadgePercent}>
          <div className="overflow-x-auto">
            <Table head={t.disc.topHead}>
              {x.top.map((r) => (
                <tr key={`${r.branch}-${r.inv}`}>
                  <Td>
                    <span dir="ltr" className="font-mono text-xs">
                      {r.inv}
                    </span>
                  </Td>
                  <Td>{day(r.date)}</Td>
                  <Td>{branchName(r.branch)}</Td>
                  <Td>{r.doctor}</Td>
                  <Td wrap>{r.service || "—"}</Td>
                  <Td num>
                    <M v={r.discount} />
                  </Td>
                  <Td num>{pct(r.pct)}</Td>
                </tr>
              ))}
            </Table>
          </div>
        </Card>
      )}
    </>
  );
}

/** Monthly columns (one series; the title names it). A muted column: incomplete history. */
function Columns({ title, points, fmt }: { title: string; points: { label: string; value: number | null; muted?: boolean }[]; fmt: (v: number | null) => string }) {
  const values = points.map((p) => p.value ?? 0);
  const max = Math.max(...values, 0) || 1;
  if (!points.length) return null;
  return (
    <figure className="mt-5">
      <figcaption className="mb-2 text-xs font-bold text-ink-600">{title}</figcaption>
      <div className="flex h-36 items-end gap-1.5" dir="ltr">
        {points.map((p) => (
          <div key={p.label} className="group relative flex h-full flex-1 flex-col justify-end">
            <div
              className={`rounded-t-[4px] ${p.muted ? "bg-primary-200" : "bg-[#0a9db0]"}`}
              style={{ height: `${Math.max(2, ((p.value ?? 0) / max) * 100)}%` }}
              title={`${p.label}: ${fmt(p.value)}`}
            />
            <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink-950 px-1.5 py-0.5 text-[10px] font-bold text-white group-hover:block">
              {fmt(p.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5 text-[10px] text-ink-500" dir="ltr">
        {points.map((p) => (
          <span key={p.label} className="flex-1 truncate text-center">
            {p.label.split(" ")[0]}
          </span>
        ))}
      </div>
    </figure>
  );
}

function Chip({ icon: I }: { icon: Icon }) {
  return (
    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-900 text-white shadow-sm">
      <I className="h-5 w-5" />
    </span>
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

function Note({ text }: { text: string }) {
  return <p className="rounded-xl bg-sand-50 p-3 text-sm text-ink-600 ring-1 ring-ink-100">{text}</p>;
}
