import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { isLocale, defaultLocale, type Locale, localePath } from "@/lib/i18n";
import { FINANCE_BRANCHES, loadDashboard, readFinanceSettings, sameKey, type FinanceBranch } from "@/lib/finance";
import { riyadhDate } from "@/lib/financeMetrics";
import { financeText } from "@/lib/financeText";
import { FinanceView } from "@/components/finance/FinanceView";
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
  const text = searchParams.date;
  const date = text && /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(Date.parse(text)) ? text : riyadhDate();
  const branch = FINANCE_BRANCHES.includes(searchParams.branch as FinanceBranch) ? (searchParams.branch as FinanceBranch) : "";
  const { dashboard, status } = await loadDashboard(date, branch ? [branch] : FINANCE_BRANCHES);

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
      <FinanceView
        dashboard={dashboard}
        status={status}
        locale={locale}
        branch={branch}
        demo={false}
        formAction={localePath(locale, `/finance/${params.key}`)}
        shared
      />
    </main>
  );
}
