import Link from "next/link";
import { AlertTriangle, BarChart3, CalendarDays, Landmark, Percent, Scale, TrendingDown, TrendingUp } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import type { Locale } from "@/lib/i18n";
import type { AcctBasis, AcctBranch } from "@/lib/acct";
import { PNL_ROWS, rowValue, type Pnl } from "@/lib/acctPnl";
import { RiyalIcon } from "@/components/RiyalIcon";

// قائمة الدخل: the income statement from Microchips Accounting's trial
// balances, month by month, against the financial model (2026F budget and
// 2025H), both spread evenly over the same period and labelled as such.
// Actual figures only: an unfinished month is badged, a month without data
// says so, nothing is estimated or adjusted.

type Icon = ComponentType<{ className?: string }>;

const TEXT = {
  ar: {
    title: "قائمة الدخل",
    sub: "من النظام المحاسبي (ميزان المراجعة) — فعلي فقط، دون تقديرات",
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
    missing: "لم يُسجَّل بعد",
    revenue: "الإيرادات",
    ebitda: "EBITDA",
    net: "صافي الربح",
    vsBudget: "من الموازنة",
    vsLastYear: "مقارنة بـ 2025",
    margin: "هامش",
    imported: "آخر استيراد",
    noData: "لم تصل بيانات ميزان المراجعة بعد. يستوردها الروبوت يوميًا الساعة 1:00 صباحًا.",
    unmapped: "حسابات لها حركة ولم تُربط ببند",
    unmappedHint: "اربطها من الإعدادات ← ربط الحسابات، فلا يُستبعد شيء.",
    unbalanced: "المدين لا يساوي الدائن في ميزان شهر",
    unbalancedHint: "يُعرض الفرق كما هو دون أي قيد تسوية.",
    modelNote: "الموازنة من النموذج المالي موزعة بالتساوي على الأشهر؛ 2025 من ميزان المراجعة الفعلي للفترة نفسها، ومن النموذج للأشهر غير المتوفرة.",
    lines: {
      revenue: "الإيرادات",
      commissions: "عمولات الأطباء والموظفين",
      materials: "المواد",
      labs: "المعامل",
      otherOperating: "مصاريف تشغيلية أخرى",
      grossMargin: "مجمل الربح",
      personnel: "مصاريف الموظفين",
      ga: "مصاريف عمومية وإدارية",
      otherIncome: "إيرادات أخرى",
      impairments: "الانخفاض في القيمة",
      ebitda: "EBITDA",
      depreciation: "الاستهلاك",
      ebit: "الربح التشغيلي (EBIT)",
      financial: "مصاريف تمويلية",
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
    missing: "Not recorded yet",
    revenue: "Revenue",
    ebitda: "EBITDA",
    net: "Net income",
    vsBudget: "of budget",
    vsLastYear: "vs 2025",
    margin: "Margin",
    imported: "Last import",
    noData: "No trial balance has arrived yet. The robot imports it daily at 1:00 am.",
    unmapped: "Accounts with movement not on any line",
    unmappedHint: "Map them in Settings → Account mapping so nothing is left out.",
    unbalanced: "Debits do not equal credits in the trial balance of",
    unbalancedHint: "The difference is shown as it is, never adjusted.",
    modelNote: "Budget from the financial model, spread evenly over the months; 2025 from the actual trial balance for the same period, the model where a month is missing.",
    lines: {
      revenue: "Revenue",
      commissions: "Doctors & staff commissions",
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

export function IncomeStatementView({ pnl, locale, href }: { pnl: Pnl; locale: Locale; href: (q: { branch?: AcctBranch; basis?: AcctBasis }) => string }) {
  const t = TEXT[locale === "ar" ? "ar" : "en"];
  const nl = locale === "ar" ? "ar-SA-u-nu-latn" : "en-US";
  const n0 = (v: number) => (Math.round(v) || 0).toLocaleString(nl);
  const pct = (v: number) => `${(v * 100).toLocaleString(nl, { maximumFractionDigits: 1 })}%`;
  const monthName = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", { month: "short", timeZone: "UTC" });
  const when = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh" });

  const present = pnl.months.filter((m) => !m.missing);
  const sub = (key: string, values = pnl.ytd) => rowValue(values, PNL_ROWS.find((r) => r.key === key)!);
  const revenue = sub("revenue");
  const ebitda = sub("ebitda");
  const net = sub("netIncome");
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
            <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-sand-50 px-3 py-1 text-xs font-bold text-ink-600 ring-1 ring-ink-100">
              <span className={`h-2 w-2 rounded-full ${pnl.importedAt ? "bg-emerald-600" : "bg-ink-300"}`} aria-hidden="true" />
              {t.imported}: {pnl.importedAt ? when.format(new Date(pnl.importedAt)) : "—"}
            </p>
          </div>
          <div className="flex gap-1 rounded-full bg-sand-50 p-1 ring-1 ring-ink-100" role="group">
            {(["posted", "all"] as const).map((b) => (
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
            </Kpi>
            <Kpi icon={Landmark} title={t.net} value={<Money v={net} n0={n0} big />}>
              <Line label={t.margin} value={ratio(net, revenue)} pct={pct} plain />
              <Line label={t.vsBudget} value={ratio(net, sub("netIncome", pnl.budget))} pct={pct} plain />
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
              <p className="text-xs text-ink-500">{t.modelNote}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="text-xs text-ink-500">
                    <th className="sticky start-0 z-[1] whitespace-nowrap border-b border-ink-100 bg-white px-3 py-2.5 text-start font-bold">{t.line}</th>
                    <th className="whitespace-nowrap border-b border-ink-100 bg-primary-50/60 px-2 py-2.5 text-end font-extrabold text-ink-900">{t.ytd}</th>
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
                        </th>
                        <td className="whitespace-nowrap bg-primary-50/40 px-2 py-2.5 text-end font-extrabold tabular-nums text-ink-950">{n0(ytd)}</td>
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
                            {m.missing ? <span className="text-ink-300">—</span> : n0(rowValue(m.values, row))}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

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
