import Link from "next/link";
import { headers } from "next/headers";
import { CheckCircle2, Link2, Upload, XCircle } from "lucide-react";
import { isLocale, defaultLocale, type Locale, localePath } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { requireAdminPage } from "@/lib/adminSession";
import { FINANCE_BRANCHES, loadDashboard, readFinanceSettings, readFinanceStatus, type FinanceBranch } from "@/lib/finance";
import { addDays, buildDashboard, riyadhDate } from "@/lib/financeMetrics";
import { demoData } from "@/lib/financeDemo";
import { BRANCH_NAMES, financeText } from "@/lib/financeText";
import {
  createFinanceShareKeyAction,
  revokeFinanceShareKeyAction,
  saveFinanceSettingsAction,
  uploadFinanceReportsAction,
} from "@/lib/financeActions";
import { FinanceView } from "@/components/finance/FinanceView";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { LinkCard } from "@/components/admin/LinkCard";

export const dynamic = "force-dynamic";

/** Control Panel → الأداء المالي (the admin and the finance account). */
export default async function AdminFinancePage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: Record<string, string | undefined>;
}) {
  const user = await requireAdminPage(params.locale, "/finance");
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = getDictionary(locale);
  const t = financeText(locale);
  const tab = searchParams.tab === "settings" ? "settings" : "dashboard";
  const base = localePath(locale, "/admin/finance");

  return (
    <div className="container-x py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-950">{t.title}</h1>
          <p className="mt-1 max-w-3xl text-ink-500">{t.subtitle}</p>
        </div>
        <nav className="flex gap-1 rounded-xl bg-white p-1 shadow-card">
          {(["dashboard", "settings"] as const).map((k) => (
            <Link
              key={k}
              href={k === "dashboard" ? base : `${base}?tab=settings`}
              className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === k ? "bg-ink-900 text-white" : "text-ink-700 hover:bg-ink-50"}`}
            >
              {k === "dashboard" ? t.tabDashboard : t.tabSettings}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-6">
        {tab === "dashboard" ? (
          <DashboardTab locale={locale} searchParams={searchParams} base={base} />
        ) : (
          <SettingsTab locale={locale} searchParams={searchParams} isAdmin={user === "admin"} dict={dict} />
        )}
      </div>
    </div>
  );
}

const dateOr = (text: string | undefined, fallback: string) =>
  text && /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(Date.parse(text)) ? text : fallback;

async function DashboardTab({ locale, searchParams, base }: { locale: Locale; searchParams: Record<string, string | undefined>; base: string }) {
  const date = dateOr(searchParams.date, addDays(riyadhDate(), -1));
  const branch = FINANCE_BRANCHES.includes(searchParams.branch as FinanceBranch) ? (searchParams.branch as FinanceBranch) : "";
  const branches = branch ? [branch] : FINANCE_BRANCHES;
  const demo = searchParams.demo === "1";

  let view;
  if (demo) {
    const [settings, status] = await Promise.all([readFinanceSettings(), readFinanceStatus()]);
    const data = demoData(date);
    view = { dashboard: buildDashboard({ date, branches, settings, ...data }), status };
  } else {
    view = await loadDashboard(date, branches);
  }

  const q = (demoOn: boolean) => {
    const p = new URLSearchParams();
    if (searchParams.date) p.set("date", date);
    if (branch) p.set("branch", branch);
    if (demoOn) p.set("demo", "1");
    const s = p.toString();
    return s ? `${base}?${s}` : base;
  };

  return (
    <FinanceView
      dashboard={view.dashboard}
      status={view.status}
      locale={locale}
      branch={branch}
      demo={demo}
      formAction={base}
      demoLinks={{ on: q(true), off: q(false) }}
    />
  );
}

async function SettingsTab({
  locale,
  searchParams,
  isAdmin,
  dict,
}: {
  locale: Locale;
  searchParams: Record<string, string | undefined>;
  isAdmin: boolean;
  dict: ReturnType<typeof getDictionary>;
}) {
  const t = financeText(locale);
  const [settings, status] = await Promise.all([readFinanceSettings(), readFinanceStatus()]);
  const numberLocale = locale === "ar" ? "ar-SA-u-nu-latn" : "en-US";
  const when = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Riyadh",
  });
  const years = Object.keys(settings.yearTargets).sort();

  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const sharePath = settings.shareKey ? localePath(locale, `/finance/${settings.shareKey}`) : "";
  const shareLink = sharePath ? `${proto}://${host}${sharePath}` : "";

  const imported = searchParams.imported?.split(",").filter(Boolean) ?? [];
  const kindName = (k: string) => (k === "invoices" ? t.invoices : k === "payments" ? t.paymentsReport : k === "installments" ? t.installments : k);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <form action={saveFinanceSettingsAction} className="card space-y-5 p-6">
        <input type="hidden" name="locale" value={locale} />
        <div>
          <h2 className="font-bold text-ink-900">{t.targets}</h2>
          <p className="mt-1 text-sm text-ink-500">{t.targetsHint}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {years.map((y) => (
              <label key={y} className="flex flex-col gap-1 text-xs font-bold text-ink-600">
                {t.year} {y}
                <input
                  name={`year-${y}`}
                  inputMode="numeric"
                  dir="ltr"
                  defaultValue={Math.round(settings.yearTargets[y]).toLocaleString("en-US")}
                  className="input"
                />
              </label>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="font-bold text-ink-900">{t.monthOverrides}</span>
          <span className="mt-1 block text-sm text-ink-500">{t.monthOverridesHint}</span>
          <textarea
            name="monthTargets"
            rows={3}
            dir="ltr"
            defaultValue={Object.entries(settings.monthTargets)
              .map(([m, v]) => `${m} = ${v}`)
              .join("\n")}
            className="input mt-2 font-mono"
          />
        </label>
        <label className="block">
          <span className="font-bold text-ink-900">{t.partners}</span>
          <span className="mt-1 block text-sm text-ink-500">{t.partnersHint}</span>
          <textarea name="partners" rows={10} dir="auto" defaultValue={settings.partners.join("\n")} className="input mt-2" />
        </label>
        <label className="block">
          <span className="font-bold text-ink-900">{t.specialtyMap}</span>
          <span className="mt-1 block text-sm text-ink-500">{t.specialtyMapHint}</span>
          <textarea
            name="doctorSpecialty"
            rows={5}
            dir="ltr"
            defaultValue={Object.entries(settings.doctorSpecialty)
              .map(([d, s]) => `${d} = ${s}`)
              .join("\n")}
            className="input mt-2 font-mono"
          />
        </label>
        <div className="flex items-center gap-3">
          <SubmitButton label={t.save} savedLabel={t.saved} />
          {searchParams.saved && <span className="text-sm font-bold text-emerald-800">{t.saved}</span>}
        </div>
      </form>

      <div className="space-y-6">
        <form action={uploadFinanceReportsAction} className="card space-y-4 p-6">
          <input type="hidden" name="locale" value={locale} />
          <h2 className="flex items-center gap-2 font-bold text-ink-900">
            <Upload className="h-5 w-5 text-primary-600" />
            {t.upload}
          </h2>
          <p className="text-sm text-ink-500">{t.uploadHint}</p>
          <label className="flex flex-col gap-1 text-xs font-bold text-ink-600">
            {t.branchOfFile}
            <select name="branch" className="input">
              <option value="">{t.fromFile}</option>
              {FINANCE_BRANCHES.map((b) => (
                <option key={b} value={b}>
                  {BRANCH_NAMES[locale][b]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-ink-600">
            {t.files}
            <input type="file" name="files" multiple required accept=".xlsx,.xls,.csv" className="input" />
          </label>
          <SubmitButton label={t.uploadButton} savedLabel={t.uploaded} />
          {imported.length > 0 && (
            <ul className="space-y-1 text-sm">
              {imported.map((r, i) => {
                const [kind, rows] = r.split(":");
                const ok = Boolean(rows);
                return (
                  <li key={i} className={`flex items-center gap-1.5 ${ok ? "text-emerald-800" : "text-red-800"}`}>
                    {ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    {ok ? `${t.uploaded}: ${kindName(kind)} · ${Number(rows).toLocaleString(numberLocale)} ${t.rows}` : t.unknownFile}
                  </li>
                );
              })}
            </ul>
          )}
        </form>

        {isAdmin && (
          <div className="space-y-2">
            <LinkCard
              title={t.shareLink}
              hint={t.shareHint}
              icon={Link2}
              link={shareLink}
              path={sharePath}
              openLabel={t.tabDashboard}
              action={createFinanceShareKeyAction}
              dict={dict}
              noLinkText={t.noShareLink}
            />
            {shareLink && (
              <form action={revokeFinanceShareKeyAction} className="px-1">
                <ConfirmSubmit label={t.revoke} confirmText={t.revokeConfirm} className="btn-outline" />
              </form>
            )}
          </div>
        )}

        <section className="card p-6">
          <h2 className="font-bold text-ink-900">{t.runs}</h2>
          {status.runs.length ? (
            <ul className="mt-3 divide-y divide-ink-100 text-sm">
              {status.runs.slice(0, 20).map((r, i) => (
                <li key={i} className="flex items-center gap-2 py-2">
                  {r.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-800" /> : <XCircle className="h-4 w-4 text-red-800" />}
                  <span className="font-bold text-ink-900">{r.ok ? t.ok : t.failed}</span>
                  <span className="text-ink-500">{r.source === "robot" ? t.robot : t.manual}</span>
                  {r.note && (
                    <span className="truncate text-xs text-ink-400" dir="ltr">
                      {r.note}
                    </span>
                  )}
                  <span className="ms-auto whitespace-nowrap text-xs text-ink-500">{when.format(new Date(r.at))}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-500">{t.noRuns}</p>
          )}
        </section>
      </div>
    </div>
  );
}
