import Link from "next/link";
import { AlertTriangle, BarChart3, CalendarDays, Landmark, Percent, Scale, TrendingDown, TrendingUp } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import type { Locale } from "@/lib/i18n";
import type { AcctBasis, AcctBranch } from "@/lib/acct";
import { PNL_ROWS, rowValue, type Pnl } from "@/lib/acctPnl";
import { MODEL_PNL, PNL_SUBTOTALS, subtotal } from "@/lib/financeModel";
import { RiyalIcon } from "@/components/RiyalIcon";
import { LastUpdate } from "./LastUpdate";

// قائمة الدخل: the income statement from Microchips Accounting's trial
// balances, month by month, against the financial model (2026F budget and
// 2025H), both spread evenly over the same period and labelled as such.
// Actual figures only: an unfinished month is badged, a month without data
// says so, nothing is estimated or adjusted.

type Icon = ComponentType<{ className?: string }>;

const TEXT = {
  ar: {
    title: "قائمة الدخل",
    sub: "من النظام المحاسبي (ميزان المراجعة) — التقديرات في عمود منفصل",
    all: "الكل",
    abha: "أبها",
    khamis: "خميس مشيط",
    posted: "المرحّل فقط",
    withUnposted: "شامل غير المرحّل",
    line: "البند",
    ytd: "منذ بداية السنة",
    budget: "الموازنة 2026",
    variance: "الفرق عن الموازنة",
    lastYear: "2025",
    fromModel: "من النموذج المالي",
    actual2025: "فعلي (ميزان 2025)",
    mixed2025: "فعلي + النموذج المالي",
    partial: "شهر غير مكتمل",
    unclosed: "غير مقفول",
    estimate: "تقديري",
    actualPlusEstimate: "فعلي + تقديري",
    estimateNote: "التقديري للأشهر غير المقفولة فقط: العمولات والمواد والمعامل بنسبتها من الإيراد في الأشهر المقفولة، والاستهلاك والموظفون والعمومية بمتوسطها الشهري. لا يُضاف إلى الفعلي.",
    depNote: "الاستهلاك المسجّل مرة واحدة عن عدة أشهر موزّع على تلك الأشهر في عرض الأشهر فقط.",
    ofTarget: "من المستهدف",
    withEstimate: "مع التقديري",
    chartRevenue: "الإيرادات الشهرية مقابل المستهدف",
    chartEbitda: "EBITDA الشهري مقابل المستهدف",
    actualLegend: "الفعلي",
    targetLegend: "المستهدف",
    missing: "لم يُسجَّل بعد",
    revenue: "الإيرادات",
    ebitda: "EBITDA",
    net: "صافي الربح",
    vsBudget: "من الموازنة",
    vsLastYear: "مقارنة بـ 2025",
    margin: "هامش",
    commissionRate: "نسبة العمولات من الإيرادات",
    imported: "آخر استيراد",
    asOf: "كما في",
    noData: "لم تصل بيانات ميزان المراجعة بعد. يستوردها الروبوت يوميًا الساعة 1:00 صباحًا.",
    unmapped: "حسابات لها حركة ولم تُربط ببند",
    unmappedHint: "اربطها من الإعدادات ← ربط الحسابات، فلا يُستبعد شيء.",
    unbalanced: "المدين لا يساوي الدائن في ميزان شهر",
    unbalancedHint: "يُعرض الفرق كما هو دون أي قيد تسوية.",
    modelNote: "الموازنة من النموذج المالي موزعة بالتساوي على الأشهر؛ 2025 من ميزان المراجعة الفعلي للفترة نفسها، ومن النموذج للأشهر غير المتوفرة.",
    lines: {
      revenue: "الإيرادات",
      commissions: "عمولات الأطباء والفنيين",
      materials: "المواد والمستهلكات",
      labs: "مصروفات المعامل",
      otherOperating: "مصروفات تشغيلية أخرى",
      grossMargin: "مجمل الربح",
      personnel: "تكاليف الموظفين",
      ga: "مصروفات عمومية وإدارية",
      otherIncome: "إيرادات أخرى",
      impairments: "الانخفاض في القيمة",
      ebitda: "EBITDA",
      depreciation: "الاستهلاك",
      ebit: "الربح التشغيلي (EBIT)",
      financial: "مصروفات تمويلية",
      ebt: "الربح قبل الزكاة",
      zakat: "الزكاة",
      netIncome: "صافي الربح",
    } as Record<string, string>,
  },
  en: {
    title: "Income statement",
    sub: "From the accounting system (trial balance) — actual only, no estimates",
    all: "All",
    abha: "Abha",
    khamis: "Khamis Mushait",
    posted: "Posted only",
    withUnposted: "Incl. not posted",
    line: "Line",
    ytd: "Year to date",
    budget: "Budget 2026",
    variance: "Vs budget",
    lastYear: "2025",
    fromModel: "From the financial model",
    actual2025: "Actual (2025 trial balance)",
    mixed2025: "Actual + financial model",
    partial: "Month not complete",
    unclosed: "Not closed",
    estimate: "Estimated",
    actualPlusEstimate: "Actual + estimated",
    estimateNote: "Estimated for months not closed only: commissions, materials and labs at their share of revenue in closed months; depreciation, staff and G&A at their monthly average. Never added to actual.",
    depNote: "Depreciation booked once for several months is spread over those months in the monthly view only.",
    ofTarget: "of target",
    withEstimate: "with estimated",
    chartRevenue: "Monthly revenue vs target",
    chartEbitda: "Monthly EBITDA vs target",
    actualLegend: "Actual",
    targetLegend: "Target",
    missing: "Not recorded yet",
    revenue: "Revenue",
    ebitda: "EBITDA",
    net: "Net income",
    vsBudget: "of budget",
    vsLastYear: "vs 2025",
    margin: "Margin",
    commissionRate: "Commissions as a share of revenue",
    imported: "Last import",
    asOf: "As of",
    noData: "No trial balance has arrived yet. The robot imports it daily at 1:00 am.",
    unmapped: "Accounts with movement not on any line",
    unmappedHint: "Map them in Settings → Account mapping so nothing is left out.",
    unbalanced: "Debits do not equal credits in the trial balance of",
    unbalancedHint: "The difference is shown as it is, never adjusted.",
    modelNote: "Budget from the financial model, spread evenly over the months; 2025 from the actual trial balance for the same period, the model where a month is missing.",
    lines: {
      revenue: "Revenue",
      commissions: "Doctors' & technicians' commissions",
      materials: "Materials",
      labs: "Dental labs",
      otherOperating: "Other operating",
      grossMargin: "Gross margin",
      personnel: "Personnel",
      ga: "General & administrative",
      otherIncome: "Other income",
      impairments: "Impairments",
      ebitda: "EBITDA",
      depreciation: "Depreciation",
      ebit: "Operating profit (EBIT)",
      financial: "Financial expenses",
      ebt: "Profit before zakat",
      zakat: "Zakat",
      netIncome: "Net income",
    } as Record<string, string>,
  },
};

export function IncomeStatementView({
  pnl,
  locale,
  href,
  showRates = false,
  lastUpdate,
  controls,
}: {
  pnl: Pnl;
  locale: Locale;
  href: (q: { branch?: AcctBranch; basis?: AcctBasis }) => string;
  /** Doctors' and technicians' commission rate (of revenue): Control Panel and the management copy only. */
  showRates?: boolean;
  /** The robot's last successful run. */
  lastUpdate?: string;
  /** Control Panel only: «تحديث الآن». */
  controls?: ReactNode;
}) {
  const t = TEXT[locale === "ar" ? "ar" : "en"];
  const nl = locale === "ar" ? "ar-SA-u-nu-latn" : "en-US";
  // Whole riyals, negatives in brackets.
  const n0 = (v: number) => {
    const r = Math.round(v) || 0;
    return r < 0 ? `(${Math.abs(r).toLocaleString(nl)})` : r.toLocaleString(nl);
  };
  const pct = (v: number) => {
    const s = `${Math.abs(v * 100).toLocaleString(nl, { maximumFractionDigits: 1 })}%`;
    return v < 0 ? `(${s})` : s;
  };
  const monthName = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", { month: "short", timeZone: "UTC" });
  const day = (iso: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));

  const present = pnl.months.filter((m) => !m.missing);
  const sub = (key: string, values = pnl.ytd) => rowValue(values, PNL_ROWS.find((r) => r.key === key)!);
  const revenue = sub("revenue");
  const ebitda = sub("ebitda");
  const net = sub("netIncome");
  // Actual + estimated (months not closed).
  const withEst = Object.fromEntries(
    [...new Set([...Object.keys(pnl.ytd), ...Object.keys(pnl.ytdEstimate)])].map((k) => [k, (pnl.ytd[k as keyof typeof pnl.ytd] ?? 0) + (pnl.ytdEstimate[k as keyof typeof pnl.ytdEstimate] ?? 0)]),
  ) as typeof pnl.ytd;
  const hasEstimate = Object.values(pnl.ytdEstimate).some((v) => v);
  const ebitdaEst = sub("ebitda", withEst);
  const netEst = sub("netIncome", withEst);
  const budgetRevenue = sub("revenue", pnl.budget);
  const lastRevenue = sub("revenue", pnl.lastYear);
  const ratio = (a: number, b: number) => (b ? a / b : null);
  const unbalanced = present.filter((m) => !m.balanced);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-ink-100 bg-white shadow-card">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-l from-primary-500 via-primary-300 to-primary-900" aria-hidden="true" />
        <div className="relative flex flex-wrap items-end justify-between gap-4 p-6 sm:p-7">
          <div className="min-w-0">
            <p className="text-sm font-bold text-primary-700">{t.sub}</p>
            <h2 className="mt-1 text-2xl font-extrabold text-ink-950 sm:text-3xl">
              {t.title} — {pnl.year}
            </h2>
            <div className="mt-2 flex flex-wrap items-start gap-2">
              <p className="inline-flex items-center gap-2 rounded-full bg-sand-50 px-3 py-1 text-xs font-bold text-ink-600 ring-1 ring-ink-100">
                <span className={`h-2 w-2 rounded-full ${pnl.asOf ? "bg-emerald-600" : "bg-ink-300"}`} aria-hidden="true" />
                {t.asOf}: {pnl.asOf ? day(pnl.asOf) : "—"}
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
                aria-current={pnl.basis === b ? "page" : undefined}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${pnl.basis === b ? "bg-primary-700 text-white shadow-sm" : "text-ink-600 hover:bg-white"}`}
              >
                {b === "posted" ? t.posted : t.withUnposted}
              </Link>
            ))}
          </div>
        </div>
        <nav className="relative flex gap-1 overflow-x-auto border-t border-ink-100 bg-sand-50/60 px-4 py-2 sm:px-6">
          {(["all", "abha", "khamis"] as const).map((b) => (
            <Link
              key={b}
              href={href({ branch: b })}
              scroll={false}
              aria-current={pnl.branch === b ? "page" : undefined}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition ${pnl.branch === b ? "bg-ink-900 text-white shadow-sm" : "text-ink-600 hover:bg-white hover:text-ink-900"}`}
            >
              {t[b]}
            </Link>
          ))}
        </nav>
      </section>

      {!present.length ? (
        <div className="card flex items-center gap-3 p-6 text-ink-600">
          <CalendarDays className="h-5 w-5 text-primary-700" />
          {t.noData}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi icon={BarChart3} title={`${t.revenue} — ${t.ytd}`} value={<Money v={revenue} n0={n0} big />}>
              <Line label={t.vsBudget} value={ratio(revenue, budgetRevenue)} pct={pct} plain />
              <Line label={t.vsLastYear} value={lastRevenue ? revenue / lastRevenue - 1 : null} pct={pct} />
            </Kpi>
            <Kpi icon={TrendingUp} title={t.ebitda} value={<Money v={ebitda} n0={n0} big />}>
              <Line label={t.margin} value={ratio(ebitda, revenue)} pct={pct} plain />
              <Line label={t.vsBudget} value={ratio(ebitda, sub("ebitda", pnl.budget))} pct={pct} plain />
              {hasEstimate && (
                <>
                  <p className="mt-1 flex items-center justify-between gap-2 border-t border-ink-100 pt-1.5 text-xs">
                    <span className="text-ink-500">{t.withEstimate}</span>
                    <span className="font-bold tabular-nums text-ink-900">{n0(ebitdaEst)}</span>
                  </p>
                  <Line label={`${t.vsBudget} (${t.withEstimate})`} value={ratio(ebitdaEst, sub("ebitda", pnl.budget))} pct={pct} plain />
                </>
              )}
            </Kpi>
            <Kpi icon={Landmark} title={t.net} value={<Money v={net} n0={n0} big />}>
              <Line label={t.margin} value={ratio(net, revenue)} pct={pct} plain />
              <Line label={t.vsBudget} value={ratio(net, sub("netIncome", pnl.budget))} pct={pct} plain />
              {hasEstimate && (
                <p className="mt-1 flex items-center justify-between gap-2 border-t border-ink-100 pt-1.5 text-xs">
                  <span className="text-ink-500">{t.withEstimate}</span>
                  <span className="font-bold tabular-nums text-ink-900">{n0(netEst)}</span>
                </p>
              )}
            </Kpi>
            <Kpi icon={Percent} title={t.lines.grossMargin} value={<Money v={sub("grossMargin")} n0={n0} big />}>
              <Line label={t.margin} value={ratio(sub("grossMargin"), revenue)} pct={pct} plain />
            </Kpi>
          </div>

          <section className="card relative min-w-0 p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 p-5 pb-3">
              <h3 className="flex items-center gap-3 font-extrabold text-ink-950">
                <Chip icon={Scale} />
                {t.title}
              </h3>
              <div className="max-w-3xl space-y-0.5 text-xs text-ink-500">
                <p>{t.modelNote}</p>
                {hasEstimate && <p>{t.estimateNote}</p>}
                <p>{t.depNote}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="text-xs text-ink-500">
                    <th className="sticky start-0 z-[1] whitespace-nowrap border-b border-ink-100 bg-white px-3 py-2.5 text-start font-bold">{t.line}</th>
                    <th className="whitespace-nowrap border-b border-ink-100 bg-primary-50/60 px-2 py-2.5 text-end font-extrabold text-ink-900">{t.ytd}</th>
                    {hasEstimate && (
                      <>
                        <th className="whitespace-nowrap border-b border-ink-100 bg-amber-50/70 px-2 py-2.5 text-end font-bold text-amber-900">{t.estimate}</th>
                        <th className="whitespace-nowrap border-b border-ink-100 px-2 py-2.5 text-end font-bold">{t.actualPlusEstimate}</th>
                      </>
                    )}
                    <th className="whitespace-nowrap border-b border-ink-100 px-2 py-2.5 text-end font-bold">
                      {t.budget}
                      <span className="block text-[10px] font-medium text-ink-400">{t.fromModel}</span>
                    </th>
                    <th className="whitespace-nowrap border-b border-ink-100 px-2 py-2.5 text-end font-bold">{t.variance}</th>
                    <th className="whitespace-nowrap border-b border-ink-100 border-e px-2 py-2.5 text-end font-bold">
                      {t.lastYear}
                      <span className="block text-[10px] font-medium text-ink-400">
                        {pnl.lastYearSource === "actual" ? t.actual2025 : pnl.lastYearSource === "mixed" ? t.mixed2025 : t.fromModel}
                      </span>
                    </th>
                    {pnl.months.map((m) => (
                      <th key={m.month} className="whitespace-nowrap border-b border-ink-100 px-2 py-2.5 text-end font-bold">
                        {monthName.format(new Date(`${m.month}-15T00:00:00Z`))}
                        {m.partial && <span className="mt-0.5 block rounded-full bg-amber-50 px-1.5 text-[10px] font-bold text-amber-800 ring-1 ring-amber-200">{t.partial}</span>}
                        {m.missing && <span className="mt-0.5 block text-[10px] font-bold text-ink-400">{t.missing}</span>}
                        {!m.missing && !m.closed && <span className="mt-0.5 block rounded-full bg-red-50 px-1.5 text-[10px] font-bold text-red-800 ring-1 ring-red-200">{t.unclosed}</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100/70">
                  {PNL_ROWS.map((row) => {
                    const isSub = row.kind === "sub";
                    const ytd = rowValue(pnl.ytd, row);
                    const budget = rowValue(pnl.budget, row);
                    const diff = ytd - budget;
                    const cls = isSub ? "bg-sand-50/70 font-extrabold text-ink-950" : "text-ink-800";
                    return (
                      <tr key={row.key} className={cls}>
                        <th scope="row" className={`sticky start-0 z-[1] whitespace-nowrap px-3 py-2.5 text-start ${isSub ? "bg-sand-50 font-extrabold" : "bg-white font-bold text-ink-700"}`}>
                          {t.lines[row.key] ?? row.key}
                          {isSub && revenue !== 0 && <span className="ms-2 text-[11px] font-bold text-primary-700">{pct(ytd / revenue)}</span>}
                          {showRates && row.key === "commissions" && revenue !== 0 && (
                            <span className="ms-2 text-[11px] font-bold text-primary-700" title={t.commissionRate}>
                              {pct(Math.abs(ytd) / revenue)}
                            </span>
                          )}
                        </th>
                        <td className="whitespace-nowrap bg-primary-50/40 px-2 py-2.5 text-end font-extrabold tabular-nums text-ink-950">{n0(ytd)}</td>
                        {hasEstimate && (
                          <>
                            <td className="whitespace-nowrap bg-amber-50/50 px-2 py-2.5 text-end tabular-nums text-amber-900">{rowValue(pnl.ytdEstimate, row) ? n0(rowValue(pnl.ytdEstimate, row)) : "—"}</td>
                            <td className="whitespace-nowrap px-2 py-2.5 text-end tabular-nums">{n0(rowValue(withEst, row))}</td>
                          </>
                        )}
                        <td className="whitespace-nowrap px-2 py-2.5 text-end tabular-nums text-ink-500">{n0(budget)}</td>
                        <td className={`whitespace-nowrap px-2 py-2.5 text-end font-bold tabular-nums ${diff >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                          <span className="inline-flex items-center gap-1">
                            {diff >= 0 ? <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> : <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />}
                            {n0(diff)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap border-e border-ink-100 px-2 py-2.5 text-end tabular-nums text-ink-500">{n0(rowValue(pnl.lastYear, row))}</td>
                        {pnl.months.map((m) => (
                          <td key={m.month} className="whitespace-nowrap px-2 py-2.5 text-end tabular-nums">
                            {m.missing ? <span className="text-ink-300">—</span> : n0(rowValue(m.display, row))}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            {(["revenue", "ebitda"] as const).map((k) => {
              const target = (m: (typeof pnl.months)[number]) => {
                const yearly = k === "revenue" ? MODEL_PNL.find((x) => x.line === "revenue")!.y2026 : subtotal(Object.fromEntries(MODEL_PNL.map((x) => [x.line, x.y2026])), PNL_SUBTOTALS.find((x) => x.key === "ebitda")!);
                return (yearly / 12) * (m.missing ? 1 : m.coverage);
              };
              const points = pnl.months.map((m) => ({
                label: monthName.format(new Date(`${m.month}-15T00:00:00Z`)),
                actual: m.missing ? null : sub(k, m.display),
                target: target(m),
              }));
              return (
                <section key={k} className="card relative min-w-0 p-5">
                  <h3 className="mb-3 flex items-center gap-3 font-extrabold text-ink-950">
                    <Chip icon={BarChart3} />
                    {k === "revenue" ? t.chartRevenue : t.chartEbitda}
                  </h3>
                  <MonthBars points={points} n0={n0} actualLabel={t.actualLegend} targetLabel={t.targetLegend} />
                </section>
              );
            })}
          </div>

          {(pnl.unmapped.length > 0 || unbalanced.length > 0) && (
            <div className="grid gap-4 lg:grid-cols-2">
              {pnl.unmapped.length > 0 && (
                <Alert title={`${t.unmapped} (${pnl.unmapped.length})`} hint={t.unmappedHint}>
                  <ul className="mt-2 space-y-1 text-sm">
                    {pnl.unmapped.slice(0, 12).map((u) => (
                      <li key={u.code} className="flex justify-between gap-3">
                        <span className="min-w-0 truncate">
                          <span dir="ltr" className="font-mono text-xs text-ink-500">
                            {u.code}
                          </span>{" "}
                          {u.name}
                        </span>
                        <span className="tabular-nums">{n0(u.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </Alert>
              )}
              {unbalanced.length > 0 && (
                <Alert title={`${t.unbalanced}: ${unbalanced.map((m) => monthName.format(new Date(`${m.month}-15T00:00:00Z`))).join("، ")}`} hint={t.unbalancedHint} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Money({ v, n0, big }: { v: number; n0: (v: number) => string; big?: boolean }) {
  return (
    <span className={`inline-flex items-baseline gap-1 tabular-nums ${big ? "text-2xl font-extrabold text-ink-950" : ""}`}>
      {n0(v)}
      <RiyalIcon className="h-[0.62em] w-auto self-center opacity-80" />
    </span>
  );
}

function Chip({ icon: I }: { icon: Icon }) {
  return (
    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-900 text-white shadow-sm">
      <I className="h-5 w-5" />
    </span>
  );
}

function Kpi({ icon, title, value, children }: { icon: Icon; title: string; value: ReactNode; children?: ReactNode }) {
  return (
    <section className="card relative min-w-0 overflow-hidden p-5">
      <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-primary-500 to-primary-900 opacity-80" aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink-600">{title}</p>
          <div className="mt-2">{value}</div>
        </div>
        <Chip icon={icon} />
      </div>
      <div className="mt-3 space-y-1.5">{children}</div>
    </section>
  );
}

/** A ratio (plain: as a share, e.g. 92% of budget) or a change (signed, coloured, with an arrow). */
function Line({ label, value, pct, plain }: { label: string; value: number | null; pct: (v: number) => string; plain?: boolean }) {
  return (
    <p className="flex items-center justify-between gap-2 text-xs">
      <span className="text-ink-500">{label}</span>
      {value === null ? (
        <span className="text-ink-400">—</span>
      ) : plain ? (
        <span className="font-bold tabular-nums text-ink-900">{pct(value)}</span>
      ) : (
        <span className={`inline-flex items-center gap-1 font-bold tabular-nums ${value >= 0 ? "text-emerald-700" : "text-red-700"}`}>
          {value >= 0 ? <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> : <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />}
          {pct(value)}
        </span>
      )}
    </p>
  );
}

function Alert({ title, hint, children }: { title: string; hint: string; children?: ReactNode }) {
  return (
    <section className="card border-amber-200 bg-amber-50/60 p-5">
      <p className="flex items-center gap-2 font-extrabold text-amber-900">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        {title}
      </p>
      <p className="mt-1 text-xs text-amber-800">{hint}</p>
      {children}
    </section>
  );
}

/**
 * Monthly bars (actual, teal) with the target as an indigo step line; a
 * month without data has no bar. Hover a month for its figures.
 */
function MonthBars({ points, n0, actualLabel, targetLabel }: { points: { label: string; actual: number | null; target: number }[]; n0: (v: number) => string; actualLabel: string; targetLabel: string }) {
  const w = 640;
  const h = 220;
  const pad = 6;
  const values = points.flatMap((p) => [p.actual ?? 0, p.target]);
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const y = (v: number) => pad + ((max - v) / (max - min)) * (h - pad * 2);
  const slot = (w - pad * 2) / points.length;
  const bar = Math.max(6, slot * 0.56);
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-56 w-full" role="img" aria-label={`${actualLabel} / ${targetLabel}`}>
        <line x1={pad} x2={w - pad} y1={y(0)} y2={y(0)} stroke="#d9d3ca" />
        {points.map((p, i) => {
          const cx = pad + slot * i + slot / 2;
          const top = p.actual === null ? null : Math.min(y(p.actual), y(0));
          const height = p.actual === null ? 0 : Math.abs(y(p.actual) - y(0));
          return (
            <g key={i}>
              <title>{`${p.label}: ${actualLabel} ${p.actual === null ? "—" : n0(p.actual)} · ${targetLabel} ${n0(p.target)}`}</title>
              <rect x={cx - slot / 2} y={0} width={slot} height={h} fill="transparent" />
              {top !== null && <rect x={cx - bar / 2} y={top} width={bar} height={Math.max(1, height)} rx={4} fill={p.actual! >= 0 ? "#0a9db0" : "#b4233a"} />}
              <line x1={cx - slot * 0.42} x2={cx + slot * 0.42} y1={y(p.target)} y2={y(p.target)} stroke="#4b4bc4" strokeWidth={2.5} strokeLinecap="round" />
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between gap-1 text-[10px] text-ink-500" dir="ltr">
        {points.map((p, i) => (
          <span key={i} className="flex-1 truncate text-center">
            {p.label}
          </span>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-4 text-xs text-ink-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#0a9db0]" aria-hidden="true" /> {actualLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-[#4b4bc4]" aria-hidden="true" /> {targetLabel}
        </span>
      </div>
    </div>
  );
}
