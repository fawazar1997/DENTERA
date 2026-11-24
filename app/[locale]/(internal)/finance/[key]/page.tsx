import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { isLocale, defaultLocale, type Locale, localePath } from "@/lib/i18n";
import { FINANCE_BRANCHES, loadDashboard, readFinanceSettings, sameKey, type FinanceBranch } from "@/lib/finance";
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
  if (!sameKey(settings.shareKey, params.key)) notFound();

  const t = financeText(locale);
  const base = localePath(locale, `/finance/${params.key}`);
  // The same tabs as Control Panel → الأداء المالي, read-only (no settings).
  const TABS = ["dashboard", "income", ...ACCT_TABS] as const;
  const tab = (TABS as readonly string[]).includes(searchParams.tab ?? "") ? (searchParams.tab as (typeof TABS)[number]) : "dashboard";
  const tabName = (k: (typeof TABS)[number]) =>
    k === "dashboard" ? t.tabDashboard : k === "income" ? (locale === "ar" ? "قائمة الدخل" : "Income statement") : ACCT_TAB_NAMES[locale === "ar" ? "ar" : "en"][k];
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

  let body;
  if (tab === "income") {
    const basis: AcctBasis = searchParams.basis === "all" ? "all" : "posted";
    body = <IncomeStatementView pnl={await loadPnl(upTo.slice(0, 4), acctBranch, basis, upTo)} locale={locale} href={href("posted")} />;
  } else if (tab !== "dashboard") {
    const basis: AcctBasis = searchParams.basis === "posted" ? "posted" : "all";
    body = <AcctView view={await loadAcctTab(tab, acctBranch, basis, upTo)} locale={locale} branch={acctBranch} basis={basis} href={href("all")} />;
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
            href={k === "dashboard" ? base : `${base}?tab=${k}`}
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
