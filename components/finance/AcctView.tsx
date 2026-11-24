import Link from "next/link";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Banknote, BellRing, CheckCircle2, Clock, Landmark, Scale, Users, Wallet } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import type { Locale } from "@/lib/i18n";
import type { AcctBasis, AcctBranch } from "@/lib/acct";
import type { AcctTab, AcctTabData } from "@/lib/acctLoad";
import type { Aging } from "@/lib/acctViews";
import { RiyalIcon } from "@/components/RiyalIcon";

// The accounting tabs (المركز المالي، النقدية والبنوك، الذمم، التمويل،
// التنبيهات والمطابقة), server-rendered in the dashboard's light identity.
// Actual figures only; missing data says so; differences are shown as they
// are, never adjusted.

type Icon = ComponentType<{ className?: string }>;

const AR = {
  tabs: { balance: "المركز المالي", cash: "النقدية والبنوك", arap: "الذمم", financing: "التمويل", alerts: "التنبيهات والمطابقة" } as Record<AcctTab, string>,
  sub: "من النظام المحاسبي — فعلي فقط، دون تقديرات",
  asOf: "كما في",
  all: "الكل",
  abha: "أبها",
  khamis: "خميس مشيط",
  posted: "المرحّل فقط",
  withUnposted: "شامل غير المرحّل",
  noData: "لم تصل البيانات بعد. يستوردها الروبوت يوميًا الساعة 1:00 صباحًا.",
  fromModel: "من النموذج المالي",
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
    unmapped: "حسابات لها رصيد ولم تُربط ببند",
    lines: {
      fixedAssets: "الأصول الثابتة",
      inventory: "المخزون",
      receivables: "الذمم المدينة",
      prepaid: "مصروفات مدفوعة مقدمًا وأخرى",
      cash: "النقد وما في حكمه",
      murabaha: "المرابحة والقروض",
      severance: "مخصص نهاية الخدمة",
      payables: "الذمم الدائنة",
      accrued: "مصروفات مستحقة وأخرى",
      fixedAssetSuppliers: "موردو الأصول الثابتة",
      zakatProvision: "مخصص الزكاة",
      relatedParties: "أطراف ذات علاقة",
      shareCapital: "رأس المال",
      statutoryReserves: "الاحتياطي النظامي",
      retainedEarnings: "الأرباح المبقاة",
    } as Record<string, string>,
  },
  cash: {
    total: "إجمالي الأرصدة البنكية",
    in: "المقبوضات هذا الشهر",
    out: "المدفوعات هذا الشهر",
    banks: "الحسابات البنكية",
    bank: "الحساب",
    balance: "الرصيد",
    fromTb: "من ميزان المراجعة",
    daily: "الرصيد اليومي (آخر 60 يومًا)",
    topMonth: "أكبر 10 مدفوعات — هذا الشهر",
    topYear: "أكبر 10 مدفوعات — منذ بداية السنة",
    date: "التاريخ",
    desc: "البيان",
    amount: "المبلغ",
    noStatements: "لم تصل كشوف الحسابات البنكية بعد؛ الأرصدة من ميزان المراجعة.",
  },
  arap: {
    receivables: "الذمم المدينة",
    payables: "الذمم الدائنة",
    dso: "متوسط أيام التحصيل (DSO)",
    dpo: "متوسط أيام السداد (DPO)",
    days: "يوم",
    basisDso: "على أساس المبيعات الآجلة لآخر 90 يومًا",
    basisDpo: "على أساس المشتريات الآجلة لآخر 90 يومًا",
    account: "الحساب",
    balance: "الرصيد",
    aging: "الأعمار",
    b0: "0–30",
    b31: "31–60",
    b61: "61–90",
    b91: "+90",
    noAging: "بانتظار كشف الحساب",
    noBasis: "بانتظار كشوف الحسابات",
  },
  fin: {
    balance: "رصيد التمويل (2201)",
    opening: "الرصيد الافتتاحي",
    drawn: "مسحوبات خلال السنة",
    repaid: "سداد خلال السنة",
    cost: "مصاريف التمويل منذ بداية السنة",
    current: "متداول (خلال 12 شهرًا)",
    nonCurrent: "غير متداول",
    ratio: "نسبة الدين إلى EBITDA",
    ttm: "EBITDA لآخر 12 شهرًا",
    ttmHint: (n: number) => `${n} شهر فعلي من 2026 + بقية الأشهر من 2025 (من النموذج المالي)`,
    schedule: "جدول الاستحقاقات",
    noSchedule: "أضف جدول استحقاقات المرابحة من الإعدادات لتصنيف المتداول وغير المتداول.",
    date: "تاريخ الاستحقاق",
    amount: "القسط",
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
    recon: "مطابقة الإيرادات: النظام المحاسبي مقابل PMS",
    month: "الشهر",
    pms: "PMS (تقرير المبيعات)",
    acct: "النظام المحاسبي",
    diff: "الفرق",
    pct: "النسبة",
    flagged: "يتجاوز حد المطابقة",
    threshold: (p: string) => `حد المطابقة ${p} — يُعدّل من الإعدادات. الإيرادات المحاسبية شاملة غير المرحّل.`,
    noUnposted: "لم تصل قائمة القيود غير المرحّلة بعد.",
  },
};
const EN: typeof AR = {
  ...AR,
  tabs: { balance: "Balance sheet", cash: "Cash & banks", arap: "Receivables & payables", financing: "Financing", alerts: "Alerts & reconciliation" },
  sub: "From the accounting system — actual only, no estimates",
  asOf: "As of",
  all: "All",
  abha: "Abha",
  khamis: "Khamis Mushait",
  posted: "Posted only",
  withUnposted: "Incl. not posted",
  noData: "No data has arrived yet. The robot imports it daily at 1:00 am.",
  fromModel: "From the financial model",
};

export function AcctView({
  view,
  locale,
  branch,
  basis,
  href,
}: {
  view: AcctTabData;
  locale: Locale;
  branch: AcctBranch;
  basis: AcctBasis;
  href: (q: { branch?: AcctBranch; basis?: AcctBasis }) => string;
}) {
  const t = locale === "ar" ? AR : EN;
  const nl = locale === "ar" ? "ar-SA-u-nu-latn" : "en-US";
  const n0 = (v: number) => (Math.round(v) || 0).toLocaleString(nl);
  const pct = (v: number) => `${(v * 100).toLocaleString(nl, { maximumFractionDigits: 1 })}%`;
  const day = (iso?: string) =>
    iso ? new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`)) : "—";
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
            <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-sand-50 px-3 py-1 text-xs font-bold text-ink-600 ring-1 ring-ink-100">
              <span className={`h-2 w-2 rounded-full ${asOf ? "bg-emerald-600" : "bg-ink-300"}`} aria-hidden="true" />
              {t.asOf}: {day(asOf)}
            </p>
          </div>
          <div className="flex gap-1 rounded-full bg-sand-50 p-1 ring-1 ring-ink-100" role="group">
            {(["posted", "all"] as const).map((b) => (
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

      {view.tab === "balance" && <BalanceBody d={view.data} t={t} M={M} pct={pct} n0={n0} />}
      {view.tab === "cash" && <CashBody d={view.data} t={t} M={M} n0={n0} day={day} />}
      {view.tab === "arap" && <ArApBody d={view.data} t={t} M={M} n0={n0} />}
      {view.tab === "financing" && <FinancingBody d={view.data} t={t} M={M} day={day} nl={nl} />}
      {view.tab === "alerts" && <AlertsBody d={view.data} threshold={view.threshold} t={t} M={M} n0={n0} pct={pct} day={day} />}
    </div>
  );
}

type T = typeof AR;
type MFn = (p: { v: number; big?: boolean }) => JSX.Element;

function BalanceBody({ d, t, M, pct, n0 }: { d: Extract<AcctTabData, { tab: "balance" }>["data"]; t: T; M: MFn; pct: (v: number) => string; n0: (v: number) => string }) {
  if (!d.asOf) return <Empty text={t.noData} />;
  const ok = Math.abs(d.difference) < 1;
  const block = (title: string, rows: typeof d.assets, extra?: ReactNode, total?: number) => (
    <Card title={title} icon={Scale} aside={<span className="text-[11px] font-medium text-ink-400">{t.fromModel}: {t.bs.y2025} · {t.bs.y2026}</span>}>
      <div className="overflow-x-auto">
      <Table head={["", t.bs.actual, t.bs.y2025, t.bs.y2026]}>
        {rows.map((r) => (
          <tr key={r.line}>
            <Td>{t.bs.lines[r.line]}</Td>
            <Td num>
              <M v={r.amount} />
            </Td>
            <Td num muted>
              {n0(r.y2025)}
            </Td>
            <Td num muted>
              {n0(r.y2026)}
            </Td>
          </tr>
        ))}
        {extra}
        <tr className="bg-sand-50/70 font-extrabold">
          <Td>{t.bs.total}</Td>
          <Td num>
            <M v={total ?? rows.reduce((s, r) => s + r.amount, 0)} />
          </Td>
          <Td num muted>
            {n0(rows.reduce((s, r) => s + r.y2025, 0))}
          </Td>
          <Td num muted>
            {n0(rows.reduce((s, r) => s + r.y2026, 0))}
          </Td>
        </tr>
      </Table>
      </div>
    </Card>
  );
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi icon={Landmark} title={t.bs.assets} value={<M v={d.totals.assets} big />} />
        <Kpi icon={Wallet} title={t.bs.liabilities} value={<M v={d.totals.liabilities} big />} hint={d.totals.assets ? pct(d.totals.liabilities / d.totals.assets) : undefined} />
        <Kpi icon={Users} title={t.bs.equity} value={<M v={d.totals.equity} big />} />
      </div>
      <div
        className={`flex items-start gap-3 rounded-2xl p-4 ring-1 ${ok ? "bg-emerald-50 text-emerald-900 ring-emerald-200" : "bg-amber-50 text-amber-900 ring-amber-200"}`}
        role="status"
      >
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
        {block(t.bs.assets, d.assets)}
        <div className="space-y-6">
          {block(t.bs.liabilities, d.liabilities)}
          {block(
            t.bs.equity,
            d.equity,
            <tr>
              <Td>{t.bs.yearProfit}</Td>
              <Td num>
                <M v={d.yearProfit} />
              </Td>
              <Td num muted>
                —
              </Td>
              <Td num muted>
                —
              </Td>
            </tr>,
            d.totals.equity,
          )}
        </div>
      </div>
      {d.unmapped.length > 0 && <Unmapped title={t.bs.unmapped} rows={d.unmapped} n0={n0} />}
    </>
  );
}

function CashBody({ d, t, M, n0, day }: { d: Extract<AcctTabData, { tab: "cash" }>["data"]; t: T; M: MFn; n0: (v: number) => string; day: (iso?: string) => string }) {
  if (!d.banks.length) return <Empty text={t.noData} />;
  const inM = d.banks.reduce((s, b) => s + b.inMonth, 0);
  const outM = d.banks.reduce((s, b) => s + b.outMonth, 0);
  const fromStatements = d.banks.some((b) => b.source === "statement");
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
        {[
          { title: t.cash.topMonth, rows: d.topPayments.month },
          { title: t.cash.topYear, rows: d.topPayments.year },
        ].map(({ title, rows }) => (
          <Card key={title} title={title} icon={ArrowUpRight}>
            {rows.length ? (
              <Table head={[t.cash.date, t.cash.desc, t.cash.amount]}>
                {rows.map((p, i) => (
                  <tr key={i}>
                    <Td>
                      <span className="whitespace-nowrap">{day(p.date)}</span>
                    </Td>
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
            )}
          </Card>
        ))}
      </div>
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
    <div>
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-ink-50">
        {AGING_KEYS.map((k, i) =>
          aging[k] > 0 ? <span key={k} title={`${t.arap[k]}: ${n0(aging[k])}`} style={{ width: `${(aging[k] / total) * 100}%`, background: AGING_COLORS[i] }} className="h-full first:rounded-s-full last:rounded-e-full" /> : null,
        )}
      </div>
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
  const side = (title: string, rows: typeof d.receivables, total: number, aging: Aging) => (
    <Card title={title} icon={Users} aside={<M v={total} />}>
      <AgingBar aging={aging} t={t} n0={n0} />
      <AgingLegend aging={aging} t={t} n0={n0} />
      <div className="mt-4 max-h-[420px] overflow-auto">
        <Table head={[t.arap.account, t.arap.balance, t.arap.aging]}>
          {rows.map((r) => (
            <tr key={r.code}>
              <Td>
                <span className="block font-bold text-ink-900">{r.name || r.code}</span>
                <span dir="ltr" className="font-mono text-[11px] text-ink-400">
                  {r.code}
                </span>
              </Td>
              <Td num>
                <M v={r.balance} />
              </Td>
              <Td>{r.aging ? <AgingBar aging={r.aging} t={t} n0={n0} /> : <span className="text-[11px] text-ink-400">{t.arap.noAging}</span>}</Td>
            </tr>
          ))}
        </Table>
      </div>
    </Card>
  );
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={ArrowDownRight} title={t.arap.receivables} value={<M v={d.totals.receivables} big />} />
        <Kpi icon={ArrowUpRight} title={t.arap.payables} value={<M v={d.totals.payables} big />} />
        <Kpi icon={Clock} title={t.arap.dso} value={<Big text={d.dso === null ? "—" : `${d.dso} ${t.arap.days}`} />} hint={d.dso === null ? t.arap.noBasis : t.arap.basisDso} />
        <Kpi icon={Clock} title={t.arap.dpo} value={<Big text={d.dpo === null ? "—" : `${d.dpo} ${t.arap.days}`} />} hint={d.dpo === null ? t.arap.noBasis : t.arap.basisDpo} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {side(t.arap.receivables, d.receivables, d.totals.receivables, d.totals.arAging)}
        {side(t.arap.payables, d.payables, d.totals.payables, d.totals.apAging)}
      </div>
    </>
  );
}

function FinancingBody({ d, t, M, day, nl }: { d: Extract<AcctTabData, { tab: "financing" }>["data"]; t: T; M: MFn; day: (iso?: string) => string; nl: string }) {
  if (!d.asOf && !d.hasStatement) return <Empty text={t.noData} />;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Landmark} title={t.fin.balance} value={<M v={d.balance} big />} />
        <Kpi icon={Scale} title={t.fin.ratio} value={<Big text={d.debtToEbitda === null ? "—" : `${d.debtToEbitda.toLocaleString(nl, { maximumFractionDigits: 2 })}×`} />} hint={t.fin.ttmHint(d.ttmActualMonths)} />
        <Kpi icon={Wallet} title={t.fin.current} value={<M v={d.current} big />} hint={`${t.fin.nonCurrent}: ${Math.round(d.nonCurrent).toLocaleString(nl)}`} />
        <Kpi icon={Banknote} title={t.fin.cost} value={<M v={d.financeCostYtd} big />} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title={t.fin.balance} icon={Landmark}>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[
              [t.fin.opening, d.opening],
              [t.fin.drawn, d.drawn],
              [t.fin.repaid, d.repaid],
              [t.fin.ttm, d.ebitdaTtm],
            ].map(([label, v]) => (
              <div key={label as string} className="rounded-xl bg-sand-50 p-3 ring-1 ring-ink-100">
                <dt className="text-xs text-ink-500">{label}</dt>
                <dd className="mt-1 font-extrabold text-ink-950">
                  <M v={v as number} />
                </dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card title={t.fin.schedule} icon={Clock}>
          {d.maturities.length ? (
            <Table head={[t.fin.date, t.fin.amount]}>
              {d.maturities.map((m) => (
                <tr key={m.date}>
                  <Td>{day(m.date)}</Td>
                  <Td num>
                    <M v={m.amount} />
                  </Td>
                </tr>
              ))}
            </Table>
          ) : (
            <Note text={t.fin.noSchedule} />
          )}
        </Card>
      </div>
    </>
  );
}

function AlertsBody({
  d,
  threshold,
  t,
  M,
  n0,
  pct,
  day,
}: {
  d: Extract<AcctTabData, { tab: "alerts" }>["data"];
  threshold: number;
  t: T;
  M: MFn;
  n0: (v: number) => string;
  pct: (v: number) => string;
  day: (iso?: string) => string;
}) {
  const monthName = (m: string) => day(`${m}-01`).replace(/^\d+\s*/, "");
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={BellRing} title={t.alerts.unposted} value={<Big text={d.asOf ? String(d.unposted.length) : "—"} />} />
        <Kpi icon={AlertTriangle} title={t.alerts.overdue} value={<Big text={d.asOf ? String(d.overdue.length) : "—"} tone={d.overdue.length ? "warn" : undefined} />} />
        <Kpi icon={ArrowDownRight} title={t.alerts.impactRev} value={<M v={d.unpostedImpact.revenue} big />} />
        <Kpi icon={ArrowUpRight} title={t.alerts.impactExp} value={<M v={d.unpostedImpact.expenses} big />} />
      </div>
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
            <Table head={[t.alerts.month, t.alerts.pms, t.alerts.acct, t.alerts.diff, t.alerts.pct]}>
              {d.recon.map((r) => (
                <tr key={r.month} className={r.flagged ? "bg-amber-50/70" : ""}>
                  <Td>{monthName(r.month)}</Td>
                  <Td num>{r.pms === null ? "—" : n0(r.pms)}</Td>
                  <Td num>{r.accounting === null ? "—" : n0(r.accounting)}</Td>
                  <Td num>{r.diff === null ? "—" : <span className={r.flagged ? "font-extrabold text-amber-800" : ""}>{n0(r.diff)}</span>}</Td>
                  <Td num>
                    {r.pct === null ? "—" : (
                      <span className={`inline-flex items-center gap-1 ${r.flagged ? "font-extrabold text-amber-800" : "text-ink-500"}`} title={r.flagged ? t.alerts.flagged : undefined}>
                        {r.flagged && <AlertTriangle className="h-3.5 w-3.5" aria-label={t.alerts.flagged} />}
                        {pct(r.pct)}
                      </span>
                    )}
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

function Unmapped({ title, rows, n0 }: { title: string; rows: { code: string; name: string; amount: number }[]; n0: (v: number) => string }) {
  return (
    <section className="card border-amber-200 bg-amber-50/60 p-5">
      <p className="flex items-center gap-2 font-extrabold text-amber-900">
        <AlertTriangle className="h-5 w-5" /> {title} ({rows.length})
      </p>
      <ul className="mt-2 space-y-1 text-sm">
        {rows.slice(0, 12).map((u) => (
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
    </section>
  );
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
