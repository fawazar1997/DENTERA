import Link from "next/link";
import {
  AlertTriangle,
  Ban,
  Banknote,
  CalendarDays,
  Clock,
  Layers,
  Minus,
  Percent,
  Receipt,
  Star,
  Stethoscope,
  Target,
  TrendingDown,
  TrendingUp,
  UserX,
  Users,
  Wallet,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import type { Locale } from "@/lib/i18n";
import type { Dashboard, DoctorRow } from "@/lib/financeMetrics";
import type { FinanceBranch, FinanceStatus, FlagRef, PayMethod } from "@/lib/financeTypes";
import { BRANCH_NAMES, METHOD_NAMES, SPECIALTY_NAMES, financeText, forDay } from "@/lib/financeText";
import { addDays, riyadhDate } from "@/lib/financeMetrics";
import { TrendChart, REVENUE_COLOR } from "./TrendChart";
import { AutoSubmitForm } from "./AutoSubmitForm";

// The financial dashboard itself (light theme): used by Control Panel →
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
  /** The view link: patients' file numbers hidden. */
  shared?: boolean;
};

export function FinanceView({ dashboard: d, locale, branch, status, demo, formAction, demoLinks, shared }: FinanceViewProps) {
  const todayDate = riyadhDate();
  const t = forDay(financeText(locale), locale, d.date, todayDate, addDays(todayDate, -1));
  const numberLocale = locale === "ar" ? "ar-SA-u-nu-latn" : "en-US";
  const n0 = (v: number) => Math.round(v).toLocaleString(numberLocale);
  const money = (v: number) => `${n0(v)} ${t.sar}`;
  const pct = (v: number, digits = 1) => `${(v * 100).toLocaleString(numberLocale, { maximumFractionDigits: digits })}%`;
  const branchNames = BRANCH_NAMES[locale];

  const lastOk = status.lastSuccessAt ? new Date(status.lastSuccessAt) : null;
  const when = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Riyadh",
  });
  // The robot runs once a day at 1 am (Riyadh): more than a day and a half
  // without a successful run means a night was missed.
  const stale = !demo && d.hasData && (!lastOk || Date.now() - lastOk.getTime() > 36 * 3600_000);

  return (
    <div className="space-y-6">
      {/* Filters and freshness */}
      <AutoSubmitForm action={formAction} className="card flex flex-wrap items-end gap-3 p-4">
        <label className="flex flex-col gap-1 text-xs font-bold text-ink-600">
          {t.date}
          <input type="date" name="date" defaultValue={d.date} className="input w-auto" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-ink-600">
          {t.branch}
          <select name="branch" defaultValue={branch} className="input w-auto">
            <option value="">{t.allBranches}</option>
            {(Object.keys(branchNames) as FinanceBranch[]).map((b) => (
              <option key={b} value={b}>
                {branchNames[b]}
              </option>
            ))}
          </select>
        </label>
        {demo && <input type="hidden" name="demo" value="1" />}
        <noscript>
          <button type="submit" className="btn-primary">
            {t.show}
          </button>
        </noscript>
        <p className="ms-auto flex items-center gap-1.5 text-sm text-ink-500">
          <Clock className="h-4 w-4" />
          {t.lastUpdate}: {lastOk ? when.format(lastOk) : t.never}
        </p>
      </AutoSubmitForm>

      {stale && (
        <p role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          {t.stale}
        </p>
      )}
      {demo && (
        <p className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-primary-500 bg-primary-50 px-4 py-3 text-sm font-bold text-ink-900">
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
            <Kpi icon={Wallet} title={t.todayRevenue} value={money(d.today.net)} hint={t.afterDiscount}>
              <Change value={d.today.change} label={t.vsLastWeek} locale={numberLocale} none={t.noChange} />
              <Triple t={t} expected={d.today.expected} actual={d.today.net} money={n0} />
            </Kpi>
            <Kpi icon={CalendarDays} title={t.mtd} value={money(d.mtd.net)}>
              <Change value={d.mtd.lastMonthChange} label={t.vsLastMonth} locale={numberLocale} none={t.noChange} />
              <Change value={d.mtd.lastYearChange} label={t.vsLastYear} locale={numberLocale} none={t.noChange} />
              <Triple t={t} expected={d.target.expectedMtd} actual={d.mtd.net} money={n0} />
            </Kpi>
            <Kpi icon={Target} title={t.target} value="">
              <div className="flex items-center gap-4">
                <GaugeArc value={d.target.monthPct} label={pct(d.target.monthPct)} />
                <div className="min-w-0 text-sm">
                  <p className="text-ink-500">{t.ofMonth}</p>
                  <p className="font-bold text-ink-900">{money(d.target.month)}</p>
                </div>
              </div>
              <Meter value={d.target.yearPct} label={`${pct(d.target.yearPct)} ${t.ofYear} (${money(d.target.year)})`} />
              <p className="mt-3 text-sm text-ink-600">
                {t.requiredPerDay}: <b className="text-ink-900">{money(d.target.requiredPerDay)}</b>
                <span className="text-ink-500"> · {n0(d.target.remainingDays)} {t.remainingDays}</span>
              </p>
            </Kpi>
            <Kpi icon={Receipt} title={t.invoices} value={n0(d.counts.invoices)}>
              <dl className="mt-1 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-ink-500">{t.patients}</dt>
                  <dd className="text-lg font-extrabold text-ink-900">{n0(d.counts.patients)}</dd>
                </div>
                <div>
                  <dt className="text-ink-500">{t.avgInvoice}</dt>
                  <dd className="text-lg font-extrabold text-ink-900">{money(d.counts.avg)}</dd>
                </div>
              </dl>
            </Kpi>
          </div>

          {/* Collections + daily trend */}
          <div className="grid gap-4 xl:grid-cols-3">
            <Card title={t.collections} icon={Banknote} className="xl:col-span-1">
              <p className="text-2xl font-extrabold text-ink-950">{money(d.collections.total)}</p>
              <Bars
                rows={(["cash", "card", "transfer", "tabby", "tamara", "other"] as PayMethod[])
                  .filter((m) => m !== "other" || d.collections.other > 0)
                  .map((m) => ({ label: METHOD_NAMES[locale][m], value: d.collections[m], share: d.collections.total ? d.collections[m] / d.collections.total : 0 }))}
                money={money}
                pct={pct}
              />
            </Card>
            <Card title={t.trend} icon={TrendingUp} className="xl:col-span-2">
              <TrendChart
                points={d.trend}
                numberLocale={numberLocale}
                labels={{ revenue: t.dailyRevenue, target: t.dailyTarget, variance: t.variance, sar: t.sar }}
              />
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-ink-500">{t.dailyRevenue} — {t.total}</summary>
                <div className="mt-2 max-h-64 overflow-auto">
                  <Table head={[t.date, t.actual, t.dailyTarget, t.variance]}>
                    {[...d.trend].reverse().map((p) => (
                      <tr key={p.date}>
                        <Td>{p.date.split("-").reverse().join("-")}</Td>
                        <Td num>{n0(p.net)}</Td>
                        <Td num>{n0(p.target)}</Td>
                        <Td num>
                          <Signed value={p.net - p.target} text={n0(p.net - p.target)} />
                        </Td>
                      </tr>
                    ))}
                  </Table>
                </div>
              </details>
            </Card>
          </div>

          {/* 2. Revenue splits */}
          <Section title={t.revenue}>
            <div className="grid gap-4 lg:grid-cols-3">
              <Card title={t.byBranch} icon={Layers}>
                <Bars rows={d.branches.map((b) => ({ label: branchNames[b.branch], value: b.net, share: b.share }))} money={money} pct={pct} />
              </Card>
              <Card title={t.bySpecialty} icon={Stethoscope}>
                <Bars
                  rows={d.specialties.map((s) => ({ label: SPECIALTY_NAMES[locale][s.specialty], value: s.net, share: s.share }))}
                  money={money}
                  pct={pct}
                />
              </Card>
              <Card title={t.discounts} icon={Percent}>
                <p className="text-2xl font-extrabold text-ink-950">{money(d.discounts.total)}</p>
                <p className="text-sm text-ink-500">
                  {pct(d.discounts.pct)} {t.ofRevenue}
                </p>
                <Bars
                  rows={d.discounts.byBranch.map((b) => ({ label: branchNames[b.branch], value: b.total, share: b.pct }))}
                  money={money}
                  pct={pct}
                />
              </Card>
            </div>
          </Section>

          {/* 3. Invoices */}
          <Section title={t.invoicesSection}>
            <div className="grid gap-4 lg:grid-cols-3">
              <Card title={t.newToday} icon={Receipt}>
                <p className="text-2xl font-extrabold text-ink-950">{n0(d.invoices.new)}</p>
                <ul className="mt-3 divide-y divide-ink-100 text-sm">
                  <Row label={t.credit} count={d.invoices.credit.count} amount={money(d.invoices.credit.amount)} n0={n0} />
                  <Row label={t.returns} count={d.invoices.returns.count} amount={money(d.invoices.returns.amount)} n0={n0} />
                  <Row label={t.creditNotes} count={d.invoices.creditNotes.count} amount={money(d.invoices.creditNotes.amount)} n0={n0} />
                </ul>
              </Card>
              <Card title={t.installments} icon={CalendarDays}>
                {d.installments ? (
                  <ul className="divide-y divide-ink-100 text-sm">
                    <Row label={t.dueToday} count={d.installments.dueToday.count} amount={money(d.installments.dueToday.amount)} n0={n0} />
                    <Row
                      label={`${t.overdue} (${n0(d.installments.overdue.patients)} ${t.patientsCount})`}
                      count={d.installments.overdue.count}
                      amount={money(d.installments.overdue.amount)}
                      n0={n0}
                      warn={d.installments.overdue.count > 0}
                    />
                    <li className="flex items-center justify-between gap-3 py-2.5">
                      <span className="text-ink-600">
                        {t.remaining} ({n0(d.installments.remaining.patients)} {t.patientsCount})
                      </span>
                      <b className="text-ink-900">{money(d.installments.remaining.amount)}</b>
                    </li>
                  </ul>
                ) : (
                  <p className="text-sm text-ink-500">{t.noInstallments}</p>
                )}
              </Card>
              <Card title={t.quality} icon={AlertTriangle}>
                <div className="space-y-2">
                  <Flags icon={Percent} label={t.highDiscount} list={d.quality.today.highDiscount} month={d.quality.mtd.highDiscount} t={t} n0={n0} shared={shared} />
                  <Flags icon={UserX} label={t.noId} list={d.quality.today.noId} month={d.quality.mtd.noId} t={t} n0={n0} shared={shared} />
                  <Flags icon={Ban} label={t.cancelled} list={d.quality.today.cancelled} month={d.quality.mtd.cancelled} t={t} n0={n0} shared={shared} />
                </div>
              </Card>
            </div>
          </Section>

          {/* 4. Doctors */}
          <Section title={t.doctors}>
            <div className="grid gap-4 xl:grid-cols-2">
              <Card title={t.doctorsToday} icon={Users} className="xl:col-span-2">
                {d.doctorsToday.rows.length ? (
                  <div className="overflow-x-auto">
                    <Table head={[t.doctor, t.net, t.patients, t.avgInvoice, `${t.previousDay}${d.doctorsToday.previousDate ? ` (${d.doctorsToday.previousDate.split("-").reverse().join("-")})` : ""}`, t.change]}>
                      {d.doctorsToday.rows.map((r) => (
                        <tr key={r.doctor}>
                          <Td strong>{r.doctor}</Td>
                          <Td num>{n0(r.net)}</Td>
                          <Td num>{n0(r.patients)}</Td>
                          <Td num>{n0(r.avg)}</Td>
                          <Td num>{n0(r.before)}</Td>
                          <Td num>
                            <ChangeText value={r.change} locale={numberLocale} />
                          </Td>
                        </tr>
                      ))}
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-ink-500">{t.noDoctors}</p>
                )}
              </Card>

              <Card title={t.top10} icon={TrendingUp} className="xl:col-span-2">
                <DoctorTable rows={d.top10} t={t} n0={n0} locale={numberLocale} beforeLabel={t.lastMonth} rank />
              </Card>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <Card title={t.partners} icon={Star}>
                <ul className="divide-y divide-ink-100 text-sm">
                  {d.partners.map((p) => (
                    <li key={p.doctor} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                      <span className="font-bold text-ink-900">{p.doctor}</span>
                      <span className="flex items-center gap-3">
                        <b className="text-ink-900">{money(p.net)}</b>
                        <span className="text-ink-500">{pct(p.share)}</span>
                        <ChangeText value={p.change} locale={numberLocale} />
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card title={t.top5} icon={Layers}>
                <div className="flex items-center gap-4">
                  <GaugeArc value={d.top5Share} label={pct(d.top5Share)} />
                  <p className="text-sm text-ink-500">{t.top5Hint}</p>
                </div>
              </Card>
              <Card title={t.falling} icon={TrendingDown}>
                {d.falling.length ? (
                  <div className="overflow-x-auto">
                    <Table head={[t.doctor, t.net, t.average, t.change]}>
                      {d.falling.map((r) => (
                        <tr key={r.doctor}>
                          <Td strong>{r.doctor}</Td>
                          <Td num>{n0(r.net)}</Td>
                          <Td num>{n0(r.average)}</Td>
                          <Td num>
                            <ChangeText value={r.change} locale={numberLocale} />
                          </Td>
                        </tr>
                      ))}
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-ink-500">{t.noneFalling}</p>
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-extrabold text-ink-950">{title}</h2>
      {children}
    </section>
  );
}

function Chip({ icon: I }: { icon: Icon }) {
  return (
    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
      <I className="h-5 w-5" />
    </span>
  );
}

function Kpi({ icon, title, value, hint, children }: { icon: Icon; title: string; value: string; hint?: string; children?: ReactNode }) {
  return (
    <section className="card min-w-0 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink-600">{title}</p>
          {value && <p className="mt-1 text-2xl font-extrabold text-ink-950">{value}</p>}
          {hint && <p className="text-xs text-ink-500">{hint}</p>}
        </div>
        <Chip icon={icon} />
      </div>
      <div className="mt-3 space-y-1.5">{children}</div>
    </section>
  );
}

function Card({ title, icon, className = "", children }: { title: string; icon: Icon; className?: string; children: ReactNode }) {
  return (
    <section className={`card min-w-0 p-5 ${className}`}>
      <h3 className="mb-4 flex items-center gap-2 font-bold text-ink-900">
        <Chip icon={icon} />
        {title}
      </h3>
      {children}
    </section>
  );
}

/** A change as a badge: arrow + signed percent (never colour alone). */
function Change({ value, label, locale, none }: { value: number | null; label: string; locale: string; none: string }) {
  return (
    <p className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
      <ChangeText value={value} locale={locale} badge fallback={none} />
      {label}
    </p>
  );
}

function ChangeText({ value, locale, badge, fallback = "—" }: { value: number | null; locale: string; badge?: boolean; fallback?: string }) {
  if (value === null || !Number.isFinite(value)) return <span className="text-ink-400">{fallback}</span>;
  const up = value > 0.0005;
  const down = value < -0.0005;
  const I = up ? TrendingUp : down ? TrendingDown : Minus;
  const text = `${up ? "+" : ""}${(value * 100).toLocaleString(locale, { maximumFractionDigits: 1 })}%`;
  const tone = up ? "text-emerald-800 bg-emerald-50" : down ? "text-red-800 bg-red-50" : "text-ink-600 bg-ink-50";
  return (
    <span dir="ltr" className={`inline-flex items-center gap-1 font-bold ${badge ? `rounded-full px-2 py-0.5 ${tone}` : tone.split(" ")[0]}`}>
      <I className="h-3.5 w-3.5" />
      {text}
    </span>
  );
}

function Signed({ value, text }: { value: number; text: string }) {
  return <span className={value >= 0 ? "text-emerald-800" : "text-red-800"} dir="ltr">{value > 0 ? `+${text}` : text}</span>;
}

/** Expected · actual · variance. */
function Triple({ t, expected, actual, money }: { t: ReturnType<typeof financeText>; expected: number; actual: number; money: (v: number) => string }) {
  const v = actual - expected;
  return (
    <dl className="mt-2 grid grid-cols-3 gap-2 border-t border-ink-100 pt-2 text-xs">
      <div>
        <dt className="text-ink-500">{t.expected}</dt>
        <dd className="font-bold text-ink-900">{money(expected)}</dd>
      </div>
      <div>
        <dt className="text-ink-500">{t.actual}</dt>
        <dd className="font-bold text-ink-900">{money(actual)}</dd>
      </div>
      <div>
        <dt className="text-ink-500">{t.variance}</dt>
        <dd className="font-bold">
          <Signed value={v} text={money(v)} />
        </dd>
      </div>
    </dl>
  );
}

/** A half-circle gauge (0–100%, more clipped at the end). */
function GaugeArc({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(1, value || 0));
  const r = 44;
  const len = Math.PI * r;
  return (
    <svg viewBox="0 0 110 64" className="h-16 w-28 flex-shrink-0" role="img" aria-label={label}>
      <path d={`M11,58 A${r},${r} 0 0 1 99,58`} fill="none" stroke="#efebe6" strokeWidth={10} strokeLinecap="round" />
      <path
        d={`M11,58 A${r},${r} 0 0 1 99,58`}
        fill="none"
        stroke={REVENUE_COLOR}
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={`${len * v} ${len}`}
      />
      <text x={55} y={54} textAnchor="middle" fontSize={15} fontWeight={800} fill="#141480">
        {label}
      </text>
    </svg>
  );
}

function Meter({ value, label }: { value: number; label: string }) {
  return (
    <div className="mt-3">
      <div className="h-2 overflow-hidden rounded-full bg-ink-50">
        <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: REVENUE_COLOR }} />
      </div>
      <p className="mt-1 text-xs text-ink-500">{label}</p>
    </div>
  );
}

/** Horizontal bars, one hue (magnitude), the value and share written out. */
function Bars({ rows, money, pct }: { rows: { label: string; value: number; share: number }[]; money: (v: number) => string; pct: (v: number) => string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="mt-3 space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="text-ink-700">{r.label}</span>
            <span className="text-ink-900">
              <b>{money(r.value)}</b> <span className="text-xs text-ink-500">{pct(r.share)}</span>
            </span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-ink-50">
            <div className="h-full rounded-full" style={{ width: `${Math.max(0, r.value / max) * 100}%`, background: REVENUE_COLOR }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Row({ label, count, amount, n0, warn }: { label: string; count: number; amount: string; n0: (v: number) => string; warn?: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <span className={`flex items-center gap-1.5 ${warn ? "font-bold text-red-800" : "text-ink-600"}`}>
        {warn && <AlertTriangle className="h-4 w-4" />}
        {label}
      </span>
      <span>
        <b className="text-ink-900">{n0(count)}</b> <span className="text-xs text-ink-500">· {amount}</span>
      </span>
    </li>
  );
}

function Flags({
  icon: I,
  label,
  list,
  month,
  t,
  n0,
  shared,
}: {
  icon: Icon;
  label: string;
  list: FlagRef[];
  month: number;
  t: ReturnType<typeof financeText>;
  n0: (v: number) => string;
  shared?: boolean;
}) {
  return (
    <details className="rounded-lg border border-ink-100">
      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm">
        <I className={`h-4 w-4 ${list.length ? "text-red-800" : "text-ink-400"}`} />
        <span className="flex-1 text-ink-700">{label}</span>
        <span className="text-xs text-ink-500">
          {t.todayCount} <b className={list.length ? "text-red-800" : "text-ink-900"}>{n0(list.length)}</b> · {t.mtdCount} <b className="text-ink-900">{n0(month)}</b>
        </span>
      </summary>
      <div className="max-h-60 overflow-auto border-t border-ink-100 px-1 pb-1">
        {list.length ? (
          <Table head={[t.inv, t.doctor, ...(shared ? [] : [t.patientFile]), t.net, t.discountPct]}>
            {list.slice(0, 100).map((f) => (
              <tr key={f.inv}>
                <Td>{f.inv.replace(/^(abha|khamis|lab)-/, "")}</Td>
                <Td>{f.doctor}</Td>
                {!shared && <Td>{f.patient}</Td>}
                <Td num>{n0(f.net)}</Td>
                <Td num>{n0(f.discountPct)}%</Td>
              </tr>
            ))}
          </Table>
        ) : (
          <p className="px-3 py-2 text-xs text-ink-500">{t.noneToday}</p>
        )}
      </div>
    </details>
  );
}

function DoctorTable({ rows, t, n0, locale, beforeLabel, rank }: { rows: DoctorRow[]; t: ReturnType<typeof financeText>; n0: (v: number) => string; locale: string; beforeLabel: string; rank?: boolean }) {
  if (!rows.length) return <p className="text-sm text-ink-500">{t.noDoctors}</p>;
  return (
    <div className="overflow-x-auto">
      <Table head={[...(rank ? ["#"] : []), t.doctor, t.net, t.patients, t.avgInvoice, beforeLabel, t.change]}>
        {rows.map((r, i) => (
          <tr key={r.doctor}>
            {rank && <Td num>{i + 1}</Td>}
            <Td strong>{r.doctor}</Td>
            <Td num>{n0(r.net)}</Td>
            <Td num>{n0(r.patients)}</Td>
            <Td num>{n0(r.avg)}</Td>
            <Td num>{n0(r.before)}</Td>
            <Td num>
              <ChangeText value={r.change} locale={locale} />
            </Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-ink-100 text-start text-xs text-ink-500">
          {head.map((h) => (
            <th key={h} className="whitespace-nowrap px-2 py-2 text-start font-bold">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-ink-100">{children}</tbody>
    </table>
  );
}

function Td({ children, num, strong }: { children: ReactNode; num?: boolean; strong?: boolean }) {
  return <td className={`px-2 py-2 ${num ? "whitespace-nowrap tabular-nums text-ink-900" : strong ? "font-bold text-ink-900" : "text-ink-700"}`}>{children}</td>;
}
