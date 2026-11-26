import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  Crown,
  Layers,
  Minus,
  Percent,
  Receipt,
  Star,
  Stethoscope,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import type { Locale } from "@/lib/i18n";
import type { Dashboard, DoctorRow } from "@/lib/financeMetrics";
import type { FinanceBranch, FinanceStatus, PayMethod } from "@/lib/financeTypes";
import { BRANCH_NAMES, METHOD_NAMES, SPECIALTY_NAMES, financeText, forDay, type FinanceText } from "@/lib/financeText";
import { addDays, riyadhDate } from "@/lib/financeMetrics";
import { RiyalIcon } from "@/components/RiyalIcon";
import { TrendChart, REVENUE_COLOR } from "./TrendChart";
import { AutoSubmitForm } from "./AutoSubmitForm";

// The financial dashboard itself, in Dentera's light identity (Bone page,
// white cards, Teal for revenue, Dark Blue text): used by Control Panel →
// الأداء المالي and by the private view link. Server-rendered; only the
// daily chart's hover runs in the browser.

type Icon = ComponentType<{ className?: string }>;

export type FinanceViewProps = {
  dashboard: Dashboard;
  locale: Locale;
  branch: FinanceBranch | "";
  status: FinanceStatus;
  demo: boolean;
  /** The page the filters submit to (GET). */
  formAction: string;
  /** Links to turn the demo on / off (when offered). */
  demoLinks?: { on: string; off: string } | null;
  /** The view link (read-only). */
  shared?: boolean;
  /** Control Panel only: «تحديث الآن». */
  controls?: ReactNode;
};

type Fmt = {
  n0: (v: number) => string;
  pct: (v: number, digits?: number) => string;
  locale: string;
};

export function FinanceView({ dashboard: d, locale, branch, status, demo, formAction, demoLinks, controls }: FinanceViewProps) {
  const todayDate = riyadhDate();
  const t = forDay(financeText(locale), locale, d.date, todayDate, addDays(todayDate, -1));
  const numberLocale = locale === "ar" ? "ar-SA-u-nu-latn" : "en-US";
  const fmt: Fmt = {
    n0: (v) => Math.round(v).toLocaleString(numberLocale),
    pct: (v, digits = 1) => `${(v * 100).toLocaleString(numberLocale, { maximumFractionDigits: digits })}%`,
    locale: numberLocale,
  };
  const branchNames = BRANCH_NAMES[locale];

  const lastOk = status.lastSuccessAt ? new Date(status.lastSuccessAt) : null;
  const when = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Riyadh",
  });
  const dayTitle = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${d.date}T12:00:00Z`));
  // The robot runs once a day at 1 am (Riyadh): more than a day and a half
  // without a successful run means a night was missed.
  const stale = !demo && d.hasData && (!lastOk || Date.now() - lastOk.getTime() > 36 * 3600_000);

  const tabHref = (b: FinanceBranch | "") => {
    const q = new URLSearchParams({ date: d.date });
    if (b) q.set("branch", b);
    if (demo) q.set("demo", "1");
    return `${formAction}?${q.toString()}`;
  };
  const spark = d.trend.slice(-14).map((p) => p.net);
  let running = 0;
  const monthSpark = d.trend.filter((p) => p.date.slice(0, 7) === d.date.slice(0, 7)).map((p) => (running += p.net));
  const hasCollections = demo || d.collections.total > 0;

  return (
    <div className="space-y-6">
      {/* Header: the day, freshness, filters */}
      <section className="relative overflow-hidden rounded-[28px] border border-ink-100 bg-white shadow-card">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-l from-primary-500 via-primary-300 to-primary-900" aria-hidden="true" />
        <div className="pointer-events-none absolute -top-24 end-[-6rem] h-72 w-72 rounded-full bg-primary-100/70 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-28 start-[-4rem] h-64 w-64 rounded-full bg-accent-100/80 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-wrap items-end justify-between gap-5 p-6 sm:p-7">
          <div className="min-w-0">
            <p className="text-sm font-bold text-primary-700">{t.viewing}</p>
            <h2 className="mt-1 text-2xl font-extrabold text-ink-950 sm:text-3xl">{dayTitle}</h2>
            <div className="mt-2 flex flex-wrap items-start gap-2">
              <p className="inline-flex items-center gap-2 rounded-full bg-sand-50 px-3 py-1 text-xs font-bold text-ink-600 ring-1 ring-ink-100">
                <span className={`h-2 w-2 rounded-full ${stale ? "bg-red-600" : lastOk ? "bg-emerald-600" : "bg-ink-300"}`} aria-hidden="true" />
                {t.lastUpdate}: {lastOk ? when.format(lastOk) : t.never}
              </p>
              {controls}
            </div>
          </div>
          <AutoSubmitForm action={formAction} className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="finance-date">
              {t.date}
            </label>
            <input
              id="finance-date"
              type="date"
              name="date"
              defaultValue={d.date}
              className="h-11 rounded-full border border-ink-200 bg-white px-4 text-sm font-bold text-ink-900 shadow-sm outline-none transition focus:border-primary-500 focus:shadow-focus"
            />
            {branch && <input type="hidden" name="branch" value={branch} />}
            {demo && <input type="hidden" name="demo" value="1" />}
            <noscript>
              <button type="submit" className="btn-primary">
                {t.show}
              </button>
            </noscript>
          </AutoSubmitForm>
        </div>
        <nav className="relative flex gap-1 overflow-x-auto border-t border-ink-100 bg-sand-50/60 px-4 py-2 sm:px-6" aria-label={t.branch}>
          {(["", "abha", "khamis", "lab"] as const).map((b) => (
            <Link
              key={b || "all"}
              href={tabHref(b)}
              scroll={false}
              aria-current={branch === b ? "page" : undefined}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition ${
                branch === b ? "bg-ink-900 text-white shadow-sm" : "text-ink-600 hover:bg-white hover:text-ink-900"
              }`}
            >
              {b ? branchNames[b] : t.allBranches}
            </Link>
          ))}
        </nav>
      </section>

      {stale && (
        <p role="alert" className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800 ring-1 ring-red-100">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          {t.stale}
        </p>
      )}
      {demo && (
        <p className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-primary-500 bg-primary-50 px-4 py-3 text-sm font-bold text-ink-900">
          <Layers className="h-5 w-5 flex-shrink-0 text-primary-700" />
          {t.demo}
          {demoLinks && (
            <Link href={demoLinks.off} className="ms-auto text-primary-700 underline">
              {t.hideDemo}
            </Link>
          )}
        </p>
      )}
      {!demo && !d.hasData && (
        <div className="card flex flex-wrap items-center gap-3 p-6 text-ink-600">
          <p className="flex-1">{t.noData}</p>
          {demoLinks && (
            <Link href={demoLinks.on} className="btn-outline">
              {t.showDemo}
            </Link>
          )}
        </div>
      )}

      {(demo || d.hasData) && (
        <>
          {/* 1. Key figures */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi icon={Wallet} title={t.todayRevenue} value={<Money v={d.today.net} fmt={fmt} big />} hint={t.afterDiscount} spark={spark}>
              <Change value={d.today.change} label={t.vsLastWeek} fmt={fmt} none={t.noChange} />
              <Progress t={t} expected={d.today.expected} actual={d.today.net} fmt={fmt} />
            </Kpi>
            <Kpi icon={CalendarDays} title={t.mtd} value={<Money v={d.mtd.net} fmt={fmt} big />} spark={monthSpark}>
              <Change value={d.mtd.lastMonthChange} label={t.vsLastMonth} fmt={fmt} none={t.noChange} />
              <Change value={d.mtd.lastYearChange} label={t.vsLastYear} fmt={fmt} none={t.noChange} />
              <Progress t={t} expected={d.target.expectedMtd} actual={d.mtd.net} fmt={fmt} />
            </Kpi>
            <section className="card relative min-w-0 overflow-hidden p-5">
              <Accent />
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-bold text-ink-600">{t.target}</p>
                <Chip icon={Target} />
              </div>
              <div className="mt-2 flex items-center gap-4">
                <Ring value={d.target.monthPct} label={fmt.pct(d.target.monthPct)} />
                <div className="min-w-0 space-y-1 text-sm">
                  <p className="text-ink-500">{t.ofMonth}</p>
                  <p className="font-extrabold text-ink-950">
                    <Money v={d.target.month} fmt={fmt} />
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-ink-500">{t.ofYear}</span>
                  <b className="text-ink-900">{fmt.pct(d.target.yearPct)}</b>
                </div>
                <Bar value={d.target.yearPct} />
              </div>
              <div className="mt-4 flex items-center justify-between gap-2 rounded-2xl bg-sand-50 px-3 py-2 text-xs ring-1 ring-ink-100">
                <span className="text-ink-600">{t.requiredPerDay}</span>
                <b className="text-ink-950">
                  <Money v={d.target.requiredPerDay} fmt={fmt} />
                </b>
                <span className="text-ink-500">
                  {fmt.n0(d.target.remainingDays)} {t.remainingDays}
                </span>
              </div>
            </section>
            <Kpi
              icon={Receipt}
              title={
                <>
                  {t.invoices}
                  <span className="ms-2 rounded-full bg-sand-50 px-2 py-0.5 text-[10px] font-bold text-ink-500 ring-1 ring-ink-100">
                    {locale === "ar" ? "العيادات فقط" : "Clinics only"}
                  </span>
                </>
              }
              value={<span className="text-3xl font-extrabold text-ink-950 tabular-nums">{fmt.n0(d.counts.invoices)}</span>}
            >
              <div className="mt-1 grid grid-cols-2 gap-2">
                <Stat label={t.patients} value={fmt.n0(d.counts.patients)} />
                <Stat label={t.avgInvoice} value={<Money v={d.counts.avg} fmt={fmt} />} />
              </div>
            </Kpi>
          </div>

          {/* Daily trend (+ collections when the reports carry them) */}
          <div className={`grid gap-4 ${hasCollections ? "xl:grid-cols-3" : ""}`}>
            <Card title={t.trend} icon={TrendingUp} className={hasCollections ? "xl:col-span-2" : ""}>
              <TrendStats trend={d.trend} fmt={fmt} t={t} />
              <TrendChart
                points={d.trend}
                numberLocale={numberLocale}
                labels={{ revenue: t.dailyRevenue, target: t.dailyTarget, variance: t.variance, sar: t.sar }}
              />
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-ink-500 hover:text-ink-900">
                  {t.dailyRevenue} — {t.total}
                </summary>
                <div className="mt-2 max-h-64 overflow-auto rounded-xl ring-1 ring-ink-100">
                  <Table head={[t.date, t.actual, t.dailyTarget, t.variance]}>
                    {[...d.trend].reverse().map((p) => (
                      <tr key={p.date} className="hover:bg-sand-50/70">
                        <Td>{p.date.split("-").reverse().join("-")}</Td>
                        <Td num>{fmt.n0(p.net)}</Td>
                        <Td num>{fmt.n0(p.target)}</Td>
                        <Td num>
                          <Signed value={p.net - p.target} text={fmt.n0(p.net - p.target)} />
                        </Td>
                      </tr>
                    ))}
                  </Table>
                </div>
              </details>
            </Card>
            {hasCollections && (
              <Card title={t.collections} icon={Banknote}>
                <p className="text-2xl font-extrabold text-ink-950">
                  <Money v={d.collections.total} fmt={fmt} />
                </p>
                <Bars
                  rows={(["cash", "card", "transfer", "tabby", "tamara", "other"] as PayMethod[])
                    .filter((m) => m !== "other" || d.collections.other > 0)
                    .map((m) => ({ label: METHOD_NAMES[locale][m], value: d.collections[m], share: d.collections.total ? d.collections[m] / d.collections.total : 0 }))}
                  fmt={fmt}
                />
              </Card>
            )}
          </div>

          {/* 2. Revenue splits */}
          <Section title={t.revenue} icon={Layers}>
            <div className="grid gap-4 lg:grid-cols-3">
              <Card title={t.byBranch} icon={Layers}>
                <Bars rows={d.branches.map((b) => ({ label: branchNames[b.branch], value: b.net, share: b.share }))} fmt={fmt} />
              </Card>
              <Card title={t.bySpecialty} icon={Stethoscope}>
                <Bars rows={d.specialties.map((s) => ({ label: s.specialty === "lab" ? branchNames.lab : SPECIALTY_NAMES[locale][s.specialty], value: s.net, share: s.share }))} fmt={fmt} />
              </Card>
              <Card title={t.discounts} icon={Percent}>
                <div className="flex items-end justify-between gap-3">
                  <p className="text-2xl font-extrabold text-ink-950">
                    <Money v={d.discounts.total} fmt={fmt} />
                  </p>
                  <span className="rounded-full bg-accent-50 px-2.5 py-1 text-xs font-bold text-ink-900 ring-1 ring-accent-200">
                    {fmt.pct(d.discounts.pct)} {t.ofRevenue}
                  </span>
                </div>
                <Bars rows={d.discounts.byBranch.map((b) => ({ label: branchNames[b.branch], value: b.total, share: b.pct }))} fmt={fmt} />
              </Card>
            </div>
            {d.labFromAccounting && (
              <p className="text-xs text-ink-500 mt-3">
                {locale === "ar"
                  ? `إيراد المعمل من الحسابات (4103 − 4106 − 4109، شامل غير المرحّل) حتى ${d.labFromAccounting.to.split("-").reverse().join("-")}، داخل في الإيراد والمستهدف والتوزيع. القيد اليومي يُحتسب بتاريخه، والقيد المجمّع (الشهري) يدخل في أرقام الشهر والسنة فقط. الفواتير وعدد المرضى ومتوسط الفاتورة للعيادات فقط.`
                  : `Lab revenue is from accounting (4103 − 4106 − 4109, incl. unposted) up to ${d.labFromAccounting.to.split("-").reverse().join("-")}, included in revenue, target and splits. Daily entries count on their date; lumped (monthly) entries count in month and year figures only. Invoices, patients and the average invoice are the clinics' only.`}
              </p>
            )}
          </Section>

          {/* 3. Doctors */}
          <Section title={t.doctors} icon={Users}>
            <div className="grid gap-4">
              <Card
                title={t.doctorsToday}
                icon={Users}
                aside={
                  d.doctorsToday.previousDate ? (
                    <span className="rounded-full bg-sand-50 px-3 py-1 text-xs font-bold text-ink-600 ring-1 ring-ink-100">
                      {t.previousDay}: {d.doctorsToday.previousDate.split("-").reverse().join("-")}
                    </span>
                  ) : null
                }
              >
                <DoctorTable rows={d.doctorsToday.rows} t={t} fmt={fmt} beforeLabel={t.previousDay} />
              </Card>
              <Card title={t.top10} icon={Crown}>
                <DoctorTable rows={d.top10} t={t} fmt={fmt} beforeLabel={t.lastMonth} rank />
              </Card>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <Card title={t.partners} icon={Star}>
                <ul className="space-y-2">
                  {d.partners.map((p) => (
                    <li key={p.doctor} className="flex items-center gap-3 rounded-2xl bg-sand-50 p-3 ring-1 ring-ink-100">
                      <Avatar name={p.doctor} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink-900">{p.doctor}</p>
                        {p.found ? (
                          <p className="text-xs text-ink-500">
                            {t.share} {fmt.pct(p.share)}
                          </p>
                        ) : (
                          <p className="flex items-center gap-1 text-xs font-bold text-red-800">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {t.partnerNotFound}
                          </p>
                        )}
                      </div>
                      <div className="text-end">
                        <p className="text-sm font-extrabold text-ink-950">
                          <Money v={p.net} fmt={fmt} />
                        </p>
                        <ChangeText value={p.change} fmt={fmt} />
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card title={t.top5} icon={Layers}>
                <div className="flex items-center gap-4">
                  <Ring value={d.top5Share} label={fmt.pct(d.top5Share)} />
                  <p className="text-sm text-ink-500">{t.top5Hint}</p>
                </div>
              </Card>
              <Card title={t.falling} icon={TrendingDown}>
                {d.falling.length ? (
                  <ul className="space-y-2">
                    {d.falling.map((r) => (
                      <li key={r.doctor} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-sand-50">
                        <Avatar name={r.doctor} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-ink-900">{r.doctor}</p>
                          <p className="text-xs text-ink-500">
                            {t.average}: {fmt.n0(r.average)}
                          </p>
                        </div>
                        <ChangeText value={r.change} fmt={fmt} badge />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">{t.noneFalling}</p>
                )}
              </Card>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

// --- Pieces ---

/** An amount with the Saudi Riyal sign. */
function Money({ v, fmt, big }: { v: number; fmt: Fmt; big?: boolean }) {
  return (
    <span className={`inline-flex items-baseline gap-1 tabular-nums ${big ? "text-3xl font-extrabold text-ink-950" : ""}`}>
      {fmt.n0(v)}
      <RiyalIcon className={`${big ? "h-[0.62em]" : "h-[0.72em]"} w-auto self-center opacity-80`} />
    </span>
  );
}

function Accent() {
  return <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-primary-500 to-primary-900 opacity-80" aria-hidden="true" />;
}

function Section({ title, icon: I, children }: { title: string; icon: Icon; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-ink-950">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink-900 text-white">
          <I className="h-4 w-4" />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Chip({ icon: I }: { icon: Icon }) {
  return (
    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-900 text-white shadow-sm">
      <I className="h-5 w-5" />
    </span>
  );
}

function Kpi({
  icon,
  title,
  value,
  hint,
  spark,
  children,
}: {
  icon: Icon;
  title: ReactNode;
  value: ReactNode;
  hint?: string;
  spark?: number[];
  children?: ReactNode;
}) {
  return (
    <section className="card relative min-w-0 overflow-hidden p-5">
      <Accent />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink-600">{title}</p>
          <div className="mt-2">{value}</div>
          {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
        </div>
        <Chip icon={icon} />
      </div>
      {spark && spark.length > 1 && <Sparkline values={spark} />}
      <div className="mt-3 space-y-1.5">{children}</div>
    </section>
  );
}

/** A small area line of recent values (shape only; the numbers are in the chart below). */
function Sparkline({ values }: { values: number[] }) {
  const w = 220;
  const h = 40;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const x = (i: number) => (i / (values.length - 1)) * w;
  const y = (v: number) => h - 3 - ((v - min) / (max - min || 1)) * (h - 8);
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-10 w-full" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={REVENUE_COLOR} stopOpacity="0.22" />
          <stop offset="100%" stopColor={REVENUE_COLOR} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill="url(#spark-fill)" />
      <path d={line} fill="none" stroke={REVENUE_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r={3} fill="#fff" stroke={REVENUE_COLOR} strokeWidth={2} />
    </svg>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl bg-sand-50 px-3 py-2 ring-1 ring-ink-100">
      <p className="text-xs text-ink-500">{label}</p>
      <p className="text-lg font-extrabold text-ink-950">{value}</p>
    </div>
  );
}

/** A change as a badge: arrow + signed percent (never colour alone). */
function Change({ value, label, fmt, none }: { value: number | null; label: string; fmt: Fmt; none: string }) {
  return (
    <p className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
      <ChangeText value={value} fmt={fmt} badge fallback={none} />
      {label}
    </p>
  );
}

function ChangeText({ value, fmt, badge, fallback = "—" }: { value: number | null; fmt: Fmt; badge?: boolean; fallback?: string }) {
  if (value === null || !Number.isFinite(value)) return <span className="text-xs text-ink-400">{fallback}</span>;
  const up = value > 0.0005;
  const down = value < -0.0005;
  const I = up ? TrendingUp : down ? TrendingDown : Minus;
  const text = `${up ? "+" : ""}${(value * 100).toLocaleString(fmt.locale, { maximumFractionDigits: 1 })}%`;
  const tone = up ? "text-emerald-800 bg-emerald-50 ring-emerald-100" : down ? "text-red-800 bg-red-50 ring-red-100" : "text-ink-600 bg-ink-50 ring-ink-100";
  return (
    <span dir="ltr" className={`inline-flex items-center gap-1 text-xs font-bold ${badge ? `rounded-full px-2 py-0.5 ring-1 ${tone}` : tone.split(" ")[0]}`}>
      <I className="h-3.5 w-3.5" />
      {text}
    </span>
  );
}

function Signed({ value, text }: { value: number; text: string }) {
  return (
    <span className={value >= 0 ? "text-emerald-800" : "text-red-800"} dir="ltr">
      {value > 0 ? `+${text}` : text}
    </span>
  );
}

/** Actual against expected, as a bar with the expected mark, and the variance. */
function Progress({ t, expected, actual, fmt }: { t: FinanceText; expected: number; actual: number; fmt: Fmt }) {
  const v = actual - expected;
  const scale = Math.max(expected, actual, 1);
  return (
    <div className="mt-3 border-t border-ink-100 pt-3">
      <div className="relative h-2.5 rounded-full bg-ink-50">
        <div className="h-full rounded-full" style={{ width: `${(Math.max(0, actual) / scale) * 100}%`, background: REVENUE_COLOR }} />
        <span className="absolute -top-1 h-4.5 w-0.5 rounded bg-ink-900" style={{ insetInlineStart: `calc(${(expected / scale) * 100}% - 1px)`, height: 18 }} aria-hidden="true" />
      </div>
      <dl className="mt-2 grid grid-cols-3 gap-1 text-[11px]">
        <div>
          <dt className="text-ink-500">{t.expected}</dt>
          <dd className="font-bold text-ink-900 tabular-nums">{fmt.n0(expected)}</dd>
        </div>
        <div>
          <dt className="text-ink-500">{t.actual}</dt>
          <dd className="font-bold text-ink-900 tabular-nums">{fmt.n0(actual)}</dd>
        </div>
        <div>
          <dt className="text-ink-500">{t.variance}</dt>
          <dd className="font-bold tabular-nums">
            <Signed value={v} text={fmt.n0(v)} />
          </dd>
        </div>
      </dl>
    </div>
  );
}

/** A full ring (0–100%, more clipped at the end) with the percent inside. */
function Ring({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(1, value || 0));
  const r = 40;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 100 100" className="h-24 w-24 flex-shrink-0 -rotate-90" role="img" aria-label={label}>
      <circle cx={50} cy={50} r={r} fill="none" stroke="#efebe6" strokeWidth={10} />
      <circle cx={50} cy={50} r={r} fill="none" stroke={REVENUE_COLOR} strokeWidth={10} strokeLinecap="round" strokeDasharray={`${c * v} ${c}`} />
      <text x={50} y={56} textAnchor="middle" fontSize={17} fontWeight={800} fill="#141480" transform="rotate(90 50 50)">
        {label}
      </text>
    </svg>
  );
}

function Bar({ value }: { value: number }) {
  return (
    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-ink-50">
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: REVENUE_COLOR }} />
    </div>
  );
}

/** Horizontal bars, one hue (magnitude), the value and share written out. */
function Bars({ rows, fmt }: { rows: { label: string; value: number; share: number }[]; fmt: Fmt }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="mt-4 space-y-3.5">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="font-bold text-ink-700">{r.label}</span>
            <span className="flex items-baseline gap-2 text-ink-900">
              <b>
                <Money v={r.value} fmt={fmt} />
              </b>
              <span className="rounded-full bg-sand-50 px-1.5 text-[11px] font-bold text-ink-600 ring-1 ring-ink-100">{fmt.pct(r.share)}</span>
            </span>
          </div>
          <Bar value={Math.max(0, r.value) / max} />
        </li>
      ))}
    </ul>
  );
}

/** The 30 days in three numbers: total, daily average, best day. */
function TrendStats({ trend, fmt, t }: { trend: Dashboard["trend"]; fmt: Fmt; t: FinanceText }) {
  const days = trend.filter((p) => p.net > 0);
  const total = trend.reduce((s, p) => s + p.net, 0);
  const best = days.reduce((b, p) => (p.net > (b?.net ?? -Infinity) ? p : b), undefined as Dashboard["trend"][number] | undefined);
  const target = trend.reduce((s, p) => s + p.target, 0);
  return (
    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Stat label={t.total} value={<Money v={total} fmt={fmt} />} />
      <Stat label={t.dailyTarget} value={<Money v={target / Math.max(1, trend.filter((p) => p.target > 0).length)} fmt={fmt} />} />
      <Stat label={t.avgPerDay} value={<Money v={days.length ? total / days.length : 0} fmt={fmt} />} />
      <Stat label={best ? `${t.bestDay} ${best.date.slice(8, 10)}-${best.date.slice(5, 7)}` : t.bestDay} value={<Money v={best?.net ?? 0} fmt={fmt} />} />
    </div>
  );
}

const initials = (name: string) =>
  name
    .replace(/^(prof|dr)\.?\s*/i, "")
    .replace(/^\s*(أ\.?\s?د\.?|د\.)\s*/, "")
    .replace(/(^|\s)(ال|آل)\s+/g, " ")
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.replace(/^ال(?=..)/, "")[0]?.toUpperCase())
    .join("");

function Avatar({ name, rank }: { name: string; rank?: number }) {
  const medal = rank === 1 ? "bg-[#C8BEB0] text-ink-950" : rank === 2 ? "bg-sand-200 text-ink-900" : rank === 3 ? "bg-accent-200 text-ink-900" : "";
  return (
    <span className="relative flex-shrink-0">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-xs font-extrabold text-primary-700 ring-1 ring-primary-200" dir="ltr">
        {initials(name)}
      </span>
      {rank && rank <= 3 && (
        <span className={`absolute -bottom-1 -end-1 flex h-4.5 w-4.5 items-center justify-center rounded-full text-[10px] font-extrabold ring-2 ring-white ${medal}`} style={{ width: 18, height: 18 }}>
          {rank}
        </span>
      )}
    </span>
  );
}

function DoctorTable({ rows, t, fmt, beforeLabel, rank }: { rows: DoctorRow[]; t: FinanceText; fmt: Fmt; beforeLabel: string; rank?: boolean }) {
  if (!rows.length) return <p className="text-sm text-ink-500">{t.noDoctors}</p>;
  const max = Math.max(...rows.map((r) => r.net), 1);
  return (
    <div className="-mx-2 overflow-x-auto">
      <Table head={[...(rank ? ["#"] : []), t.doctor, t.net, t.patients, t.avgInvoice, beforeLabel, t.change]}>
        {rows.map((r, i) => (
          <tr key={r.doctor} className="transition hover:bg-sand-50/70">
            {rank && (
              <Td num>
                <span className="text-xs font-bold text-ink-400">{i + 1}</span>
              </Td>
            )}
            <td className="px-2 py-2.5">
              <div className="flex min-w-[14rem] items-center gap-3">
                <Avatar name={r.doctor} rank={rank ? i + 1 : undefined} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink-900">{r.doctor}</p>
                  <div className="mt-1 h-1.5 rounded-full bg-ink-50">
                    <div className="h-full rounded-full" style={{ width: `${(Math.max(0, r.net) / max) * 100}%`, background: REVENUE_COLOR }} />
                  </div>
                </div>
              </div>
            </td>
            <Td num>
              <b>{fmt.n0(r.net)}</b>
            </Td>
            <Td num>{fmt.n0(r.patients)}</Td>
            <Td num>{fmt.n0(r.avg)}</Td>
            <Td num>
              <span className="text-ink-500">{fmt.n0(r.before)}</span>
            </Td>
            <Td num>
              <ChangeText value={r.change} fmt={fmt} badge />
            </Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

function Card({ title, icon, className = "", aside, children }: { title: string; icon: Icon; className?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className={`card relative min-w-0 p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-3 font-extrabold text-ink-950">
          <Chip icon={icon} />
          {title}
        </h3>
        {aside}
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
          {head.map((h) => (
            <th key={h} className="whitespace-nowrap border-b border-ink-100 px-2 py-2.5 text-start font-bold">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-ink-100/70">{children}</tbody>
    </table>
  );
}

function Td({ children, num }: { children: ReactNode; num?: boolean }) {
  return <td className={`px-2 py-2.5 ${num ? "whitespace-nowrap tabular-nums text-ink-900" : "text-ink-700"}`}>{children}</td>;
}
