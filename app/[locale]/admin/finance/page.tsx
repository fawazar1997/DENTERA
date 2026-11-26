import Link from "next/link";
import { headers } from "next/headers";
import { CheckCircle2, Link2, Upload, XCircle } from "lucide-react";
import { isLocale, defaultLocale, type Locale, localePath } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { requireAdminPage } from "@/lib/adminSession";
import { FINANCE_BRANCHES, OPS_SHARE_TABS, SHARE_COPIES, SHARE_TABS, loadDashboard, officialView, readFinanceSettings, readFinanceStatus, type FinanceBranch, type ShareCopy, type ShareTab } from "@/lib/finance";
import { getDoctors } from "@/lib/db";
import { addDays, buildDashboard, riyadhDate } from "@/lib/financeMetrics";
import { demoData } from "@/lib/financeDemo";
import { BRANCH_NAMES, financeText } from "@/lib/financeText";
import {
  createFinanceShareKeyAction,
  createMaghrabiShareKeyAction,
  revokeFinanceShareKeyAction,
  revokeMaghrabiShareKeyAction,
  saveShareTabsAction,
  saveFinanceSettingsAction,
  uploadFinanceReportsAction,
} from "@/lib/financeActions";
import { FinanceView } from "@/components/finance/FinanceView";
import { IncomeStatementView } from "@/components/finance/IncomeStatementView";
import { AcctView } from "@/components/finance/AcctView";
import { AcctSettings } from "@/components/finance/AcctSettings";
import { ACCT_TABS, ACCT_TAB_NAMES, loadAcctTab, type AcctTab } from "@/lib/acctLoad";
import { loadPnl } from "@/lib/acctPnl";
import type { AcctBasis, AcctBranch } from "@/lib/acct";
import { PartnerPicker } from "@/components/finance/PartnerPicker";
import { partnerDoctors } from "@/lib/financeNames";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { LinkCard } from "@/components/admin/LinkCard";
import { OPS_TAB_NAMES, type OpsTab } from "@/lib/opsData";
import { RefreshButton } from "@/components/finance/RefreshButton";
import { refreshState } from "@/lib/financeRefresh";
import { BY_TEXT, reasonText } from "@/lib/financeRefreshText";

export const dynamic = "force-dynamic";

/** Control Panel → الأداء المالي (the admin and the finance account). */
export default async function AdminFinancePage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: Record<string, string | undefined>;
}) {
  await requireAdminPage(params.locale, "/finance");
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = getDictionary(locale);
  const t = financeText(locale);
  const TABS = ["dashboard", "income", ...ACCT_TABS, "settings"] as const;
  const tab = (TABS as readonly string[]).includes(searchParams.tab ?? "") ? (searchParams.tab as (typeof TABS)[number]) : "dashboard";
  const tabName = (k: (typeof TABS)[number]) =>
    k === "dashboard" ? t.tabDashboard : k === "settings" ? t.tabSettings : k === "income" ? (locale === "ar" ? "قائمة الدخل" : "Income statement") : ACCT_TAB_NAMES[locale === "ar" ? "ar" : "en"][k];
  const base = localePath(locale, "/admin/finance");

  return (
    <div className="container-x py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-950">{t.title}</h1>
          <p className="mt-1 max-w-3xl text-ink-500">{t.subtitle}</p>
        </div>
        <nav className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-card">
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
      </div>
      <div className="mt-6">
        {tab === "dashboard" ? (
          <DashboardTab locale={locale} searchParams={searchParams} base={base} />
        ) : tab === "income" ? (
          <IncomeTab locale={locale} searchParams={searchParams} base={base} />
        ) : tab !== "settings" ? (
          <AcctTabView tab={tab} locale={locale} searchParams={searchParams} base={base} />
        ) : (
          <div className="space-y-6">
            <SettingsTab locale={locale} searchParams={searchParams} dict={dict} />
            <AcctSettings locale={locale} saved={searchParams.acctSaved === "1"} />
          </div>
        )}
      </div>
    </div>
  );
}

/** «تحديث الآن» (Control Panel only) and the robot's last successful run, for a tab's header. */
async function freshness(locale: Locale) {
  const state = await refreshState();
  return { lastUpdate: state.lastSuccessAt, controls: <RefreshButton locale={locale} initial={state} /> };
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
    const official = officialView(data.aggs, settings, await getDoctors().catch(() => []), locale);
    view = { dashboard: buildDashboard({ date, branches, ...data, aggs: official.aggs, settings: official.settings }), status };
  } else {
    view = await loadDashboard(date, branches, locale);
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
      controls={demo ? undefined : (await freshness(locale)).controls}
    />
  );
}

async function IncomeTab({ locale, searchParams, base }: { locale: Locale; searchParams: Record<string, string | undefined>; base: string }) {
  const upTo = addDays(riyadhDate(), -1);
  const branch: AcctBranch = searchParams.branch === "abha" || searchParams.branch === "khamis" ? searchParams.branch : "all";
  const basis: AcctBasis = searchParams.basis === "posted" ? "posted" : "all";
  const year = /^\d{4}$/.test(searchParams.year ?? "") ? searchParams.year! : upTo.slice(0, 4);
  const pnl = await loadPnl(year, branch, basis, upTo);
  const href = (q: { branch?: AcctBranch; basis?: AcctBasis }) => {
    const p = new URLSearchParams({ tab: "income" });
    const b = q.branch ?? branch;
    const s = q.basis ?? basis;
    if (b !== "all") p.set("branch", b);
    if (s !== "all") p.set("basis", s);
    if (searchParams.year) p.set("year", year);
    return `${base}?${p.toString()}`;
  };
  return <IncomeStatementView pnl={pnl} locale={locale} href={href} showRates {...await freshness(locale)} />;
}

async function AcctTabView({ tab, locale, searchParams, base }: { tab: AcctTab; locale: Locale; searchParams: Record<string, string | undefined>; base: string }) {
  const upTo = addDays(riyadhDate(), -1);
  const branch: AcctBranch = searchParams.branch === "abha" || searchParams.branch === "khamis" ? searchParams.branch : "all";
  const basis: AcctBasis = searchParams.basis === "posted" ? "posted" : "all";
  const view = await loadAcctTab(tab, branch, basis, upTo);
  const href = (q: { branch?: AcctBranch; basis?: AcctBasis }) => {
    const p = new URLSearchParams({ tab });
    const b = q.branch ?? branch;
    const s = q.basis ?? basis;
    if (b !== "all") p.set("branch", b);
    if (s !== "all") p.set("basis", s);
    return `${base}?${p.toString()}`;
  };
  return <AcctView view={view} locale={locale} branch={branch} basis={basis} href={href} {...await freshness(locale)} />;
}

async function SettingsTab({
  locale,
  searchParams,
  dict,
}: {
  locale: Locale;
  searchParams: Record<string, string | undefined>;
  dict: ReturnType<typeof getDictionary>;
}) {
  const t = financeText(locale);
  const [settings, status, doctors] = await Promise.all([readFinanceSettings(), readFinanceStatus(), getDoctors().catch(() => [])]);
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
  const maghrabiPath = settings.maghrabiKey ? localePath(locale, `/finance/${settings.maghrabiKey}`) : "";
  const maghrabiLink = maghrabiPath ? `${proto}://${host}${maghrabiPath}` : "";
  const ar = locale === "ar";
  const copyName: Record<ShareCopy, string> = ar ? { management: "نسخة الإدارة", maghrabi: "نسخة إدارة المغربي" } : { management: "Management copy", maghrabi: "Al-Maghrabi copy" };
  const shareTabName = (k: ShareTab) =>
    k === "dashboard"
      ? t.tabDashboard
      : k === "income"
        ? ar
          ? "قائمة الدخل"
          : "Income statement"
        : (OPS_SHARE_TABS as readonly string[]).includes(k)
          ? `${ar ? "تشغيلي" : "Operating"} — ${OPS_TAB_NAMES[ar ? "ar" : "en"][k as OpsTab]}`
          : ACCT_TAB_NAMES[ar ? "ar" : "en"][k as AcctTab];

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
        <div>
          <span className="font-bold text-ink-900">{t.partners}</span>
          <span className="mt-1 block text-sm text-ink-500">{t.partnersHint}</span>
          <PartnerPicker
            doctors={doctors
              .map((d) => ({ id: d.id, name: locale === "ar" ? d.nameAr : d.nameEn, other: locale === "ar" ? d.nameEn : d.nameAr }))
              .sort((a, b) => a.name.localeCompare(b.name, locale))}
            initial={partnerDoctors(settings.partners, doctors).map(({ entry, doctor }) => doctor?.id ?? entry)}
            labels={{ choose: t.choosePartners, search: t.searchDoctors, none: t.noDoctorMatch, notFound: t.notOfficial, moveUp: t.moveUp, remove: t.remove }}
          />
        </div>
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

        <div className="space-y-2">
          <LinkCard
            title={`${t.shareLink} — ${copyName.management}`}
            hint={ar ? "للإدارة: كل الأقسام المسموح بها، مع نسبة عمولات الأطباء." : "For management: every allowed tab, with the doctors' commission rate."}
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

        <div className="space-y-2">
          <LinkCard
            title={`${t.shareLink} — ${copyName.maghrabi}`}
            hint={ar ? "لإدارة المغربي: رابط مستقل يمكن إلغاؤه وحده، ولا يعرض نسب عمولات الأطباء أبدًا." : "For Al-Maghrabi management: its own link, revocable on its own, never showing doctors' commission rates."}
            icon={Link2}
            link={maghrabiLink}
            path={maghrabiPath}
            openLabel={t.tabDashboard}
            action={createMaghrabiShareKeyAction}
            dict={dict}
            noLinkText={t.noShareLink}
          />
          {maghrabiLink && (
            <form action={revokeMaghrabiShareKeyAction} className="px-1">
              <ConfirmSubmit label={t.revoke} confirmText={t.revokeConfirm} className="btn-outline" />
            </form>
          )}
        </div>

        <form id="share-tabs" action={saveShareTabsAction} className="card space-y-4 p-6">
          <input type="hidden" name="locale" value={locale} />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-ink-900">{ar ? "الأقسام الظاهرة في كل رابط" : "Tabs shown in each link"}</h2>
              <p className="mt-1 text-sm text-ink-500">{ar ? "أزل العلامة لإخفاء القسم من تلك النسخة. لوحة التحكم تعرض كل الأقسام دائمًا." : "Untick to hide a tab from that copy. The Control Panel always shows every tab."}</p>
            </div>
            {searchParams.tabsSaved && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-800 ring-1 ring-emerald-200">
                <CheckCircle2 className="h-4 w-4" /> {ar ? "تم الحفظ" : "Saved"}
              </span>
            )}
          </div>
          <div className="overflow-x-auto rounded-xl ring-1 ring-ink-100">
            <table className="w-full text-sm">
              <thead className="bg-sand-50 text-xs text-ink-500">
                <tr>
                  <th className="px-3 py-2 text-start font-bold">{ar ? "القسم" : "Tab"}</th>
                  {SHARE_COPIES.map((c) => (
                    <th key={c} className="px-3 py-2 text-center font-bold">
                      {copyName[c]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100/70">
                {SHARE_TABS.map((k) => (
                  <tr key={k}>
                    <td className="px-3 py-2 font-bold text-ink-800">{shareTabName(k)}</td>
                    {SHARE_COPIES.map((c) => (
                      <td key={c} className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          name={`show-${c}-${k}`}
                          defaultChecked={!(settings.hiddenTabs[c] ?? []).includes(k)}
                          aria-label={`${shareTabName(k)} — ${copyName[c]}`}
                          className="h-4 w-4 accent-primary-600"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <SubmitButton label={ar ? "حفظ الأقسام" : "Save tabs"} savedLabel={ar ? "تم الحفظ" : "Saved"} />
        </form>

        <section className="card p-6">
          <div className="mb-4 border-b border-ink-100 pb-4">
            <RefreshButton locale={locale} initial={await refreshState()} block />
          </div>
          <h2 className="font-bold text-ink-900">{t.runs}</h2>
          {status.runs.length ? (
            <ul className="mt-3 divide-y divide-ink-100 text-sm">
              {status.runs.slice(0, 20).map((r, i) => (
                <li key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-2">
                  {r.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-800" /> : <XCircle className="h-4 w-4 text-red-800" />}
                  <span className="font-bold text-ink-900">{r.ok ? t.ok : t.failed}</span>
                  <span className="text-ink-500">
                    {r.source === "robot" ? t.robot : r.source === "manual" ? `${ar ? "يدوي" : "Manual"} — ${BY_TEXT[ar ? "ar" : "en"][r.by ?? "admin"]}` : t.manual}
                  </span>
                  {typeof r.rows === "number" && (
                    <span className="text-xs text-ink-500">
                      {r.rows.toLocaleString(numberLocale)} {ar ? "سجل" : "records"}
                    </span>
                  )}
                  {!r.ok && r.reason ? (
                    <span className="text-xs font-bold text-red-800">{reasonText(r.reason, locale)}</span>
                  ) : (
                    r.note && (
                      <span className="truncate text-xs text-ink-400" dir="ltr">
                        {r.note}
                      </span>
                    )
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
