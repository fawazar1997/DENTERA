import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { isLocale, defaultLocale, type Locale, localePath } from "@/lib/i18n";
import { FINANCE_BRANCHES, SHARE_TABS, loadDashboard, readFinanceSettings, readFinanceStatus, sameKey, type FinanceBranch, type ShareCopy } from "@/lib/finance";
import { addDays, riyadhDate } from "@/lib/financeMetrics";
import { financeText } from "@/lib/financeText";
import Link from "next/link";
import { FinanceView } from "@/components/finance/FinanceView";
import { IncomeStatementView } from "@/components/finance/IncomeStatementView";
import { AcctView } from "@/components/finance/AcctView";
import { loadPnl } from "@/lib/acctPnl";
import { ACCT_TABS, ACCT_TAB_NAMES, loadAcctTab } from "@/lib/acctLoad";
import type { AcctBasis, AcctBranch } from "@/lib/acct";
import { Logo } from "@/components/Logo";
import { OpsView } from "@/components/finance/OpsView";
import { OPS_TABS, OPS_TAB_NAMES, loadOps, readOpsSettings, type OpsTab } from "@/lib/opsData";
import type { BranchFilter } from "@/lib/opsMetrics";

const isOpsTab = (k: string): k is OpsTab => (OPS_TABS as readonly string[]).includes(k);

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dentera — الأداء المالي",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

/**
 * The financial dashboard through its private view link (created in Control
 * Panel → الأداء المالي → الإعدادات): read-only, no settings, patients' file
 * numbers hidden. A wrong or revoked key gets a plain 404.
 */
export default async function FinanceSharePage({
  params,
  searchParams,
}: {
  params: { locale: string; key: string };
  searchParams: Record<string, string | undefined>;
}) {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const settings = await readFinanceSettings();
  // Two copies: management's, and Al-Maghrabi management's (no doctors' commission rates).
  const copy: ShareCopy | null = sameKey(settings.shareKey, params.key) ? "management" : sameKey(settings.maghrabiKey, params.key) ? "maghrabi" : null;
  if (!copy) notFound();
  const hidden = new Set<string>(settings.hiddenTabs[copy] ?? []);

  const t = financeText(locale);
  const base = localePath(locale, `/finance/${params.key}`);
  // The same tabs as Control Panel → الأداء المالي, read-only (no settings), less the ones this copy hides.
  const ALL_TABS = ["dashboard", "income", ...ACCT_TABS, ...OPS_TABS] as const satisfies readonly (typeof SHARE_TABS)[number][];
  const TABS = ALL_TABS.filter((k) => !hidden.has(k));
  if (!TABS.length) notFound();
  const tab = TABS.find((k) => k === searchParams.tab) ?? TABS[0];
  const tabName = (k: (typeof ALL_TABS)[number]) =>
    k === "dashboard"
      ? t.tabDashboard
      : k === "income"
        ? locale === "ar"
          ? "قائمة الدخل"
          : "Income statement"
        : isOpsTab(k)
          ? OPS_TAB_NAMES[locale === "ar" ? "ar" : "en"][k]
          : ACCT_TAB_NAMES[locale === "ar" ? "ar" : "en"][k];
  const upTo = addDays(riyadhDate(), -1);
  const acctBranch: AcctBranch = searchParams.branch === "abha" || searchParams.branch === "khamis" ? searchParams.branch : "all";
  const href = (defaultBasis: AcctBasis) => (q: { branch?: AcctBranch; basis?: AcctBasis }) => {
    const p = new URLSearchParams({ tab });
    const b = q.branch ?? acctBranch;
    const s = q.basis ?? ((searchParams.basis as AcctBasis) || defaultBasis);
    if (b !== "all") p.set("branch", b);
    if (s !== defaultBasis) p.set("basis", s);
    return `${base}?${p.toString()}`;
  };

  // «آخر تحديث» only: the update button is the Control Panel's, never a share link's.
  const lastUpdate = (await readFinanceStatus()).lastSuccessAt;
  let body;
  if (isOpsTab(tab)) {
    // The operating tabs: doctor level in the management copy, and in Al-Maghrabi's only when allowed (built on the server).
    const ops = await readOpsSettings();
    const doctorLevel = copy === "management" || ops.maghrabiDoctorLevel;
    const month = /^\d{4}-\d{2}$/.test(searchParams.month ?? "") ? searchParams.month! : upTo.slice(0, 7);
    const opsBranch: BranchFilter = searchParams.branch === "abha" || searchParams.branch === "khamis" ? searchParams.branch : "all";
    const opsHref = (q: { month?: string; branch?: BranchFilter }) => {
      const p = new URLSearchParams({ tab });
      const m = q.month ?? month;
      const b = q.branch ?? opsBranch;
      if (m !== upTo.slice(0, 7)) p.set("month", m);
      if (b !== "all") p.set("branch", b);
      return `${base}?${p.toString()}`;
    };
    body = <OpsView data={await loadOps({ month, branch: opsBranch, doctorLevel, locale, upTo })} tab={tab} locale={locale} href={opsHref} lastUpdate={lastUpdate} />;
  } else if (tab === "income") {
    const basis: AcctBasis = searchParams.basis === "posted" ? "posted" : "all";
    body = <IncomeStatementView pnl={await loadPnl(upTo.slice(0, 4), acctBranch, basis, upTo)} locale={locale} href={href("all")} showRates={copy === "management"} lastUpdate={lastUpdate} />;
  } else if (tab !== "dashboard") {
    const basis: AcctBasis = searchParams.basis === "posted" ? "posted" : "all";
    body = <AcctView view={await loadAcctTab(tab, acctBranch, basis, upTo)} locale={locale} branch={acctBranch} basis={basis} href={href("all")} lastUpdate={lastUpdate} />;
  } else {
    const text = searchParams.date;
    const date = text && /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(Date.parse(text)) ? text : upTo;
    const branch = FINANCE_BRANCHES.includes(searchParams.branch as FinanceBranch) ? (searchParams.branch as FinanceBranch) : "";
    const { dashboard, status } = await loadDashboard(date, branch ? [branch] : FINANCE_BRANCHES, locale);
    body = <FinanceView dashboard={dashboard} status={status} locale={locale} branch={branch} demo={false} formAction={base} shared />;
  }

  return (
    <main className="container-x py-8">
      <header className="mb-6 flex flex-wrap items-center gap-4">
        <Logo className="h-9 w-auto" />
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold text-ink-950">{t.title}</h1>
          <p className="text-sm text-ink-500">{t.subtitle}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ink-700 shadow-card">
          <Eye className="h-4 w-4" />
          {t.readOnly}
        </span>
      </header>
      <nav className="mb-6 flex max-w-full gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-card">
        {TABS.map((k) => (
          <Link
            key={k}
            href={k === TABS[0] ? base : `${base}?tab=${k}`}
            aria-current={tab === k ? "page" : undefined}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold ${tab === k ? "bg-ink-900 text-white" : "text-ink-700 hover:bg-ink-50"}`}
          >
            {tabName(k)}
          </Link>
        ))}
      </nav>
      {body}
    </main>
  );
}
