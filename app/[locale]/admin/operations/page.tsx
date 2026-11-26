import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { isLocale, defaultLocale, type Locale, localePath } from "@/lib/i18n";
import { requireAdminPage } from "@/lib/adminSession";
import { addDays, riyadhDate } from "@/lib/financeMetrics";
import { OpsView } from "@/components/finance/OpsView";
import { RefreshButton } from "@/components/finance/RefreshButton";
import { refreshState } from "@/lib/financeRefresh";
import { OPS_TABS, OPS_TAB_NAMES, loadOps, readOpsSettings, type OpsTab } from "@/lib/opsData";
import { KPI_KEYS, type BranchFilter, type KpiKey } from "@/lib/opsMetrics";
import { saveOpsSettingsAction } from "@/lib/opsActions";
import { SubmitButton } from "@/components/admin/SubmitButton";

export const dynamic = "force-dynamic";

/** Control Panel → الأداء التشغيلي: the clinics' operating indicators (admin + finance account). */
export default async function OperationsPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: Record<string, string | undefined>;
}) {
  await requireAdminPage(params.locale, "/operations");
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const ar = locale === "ar";
  const TABS = [...OPS_TABS, "opsSettings"] as const;
  const tab = (TABS as readonly string[]).includes(searchParams.tab ?? "") ? (searchParams.tab as (typeof TABS)[number]) : "opsPatients";
  const tabName = (k: (typeof TABS)[number]) => (k === "opsSettings" ? (ar ? "إعدادات التشغيل" : "Operating settings") : OPS_TAB_NAMES[ar ? "ar" : "en"][k]);
  const base = localePath(locale, "/admin/operations");

  return (
    <div className="container-x py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-950">{ar ? "الأداء التشغيلي" : "Operating performance"}</h1>
          <p className="mt-1 max-w-3xl text-ink-500">
            {ar
              ? "المرضى الجدد والعائدون، والحضور، والإنتاجية لكل كرسي ولكل يوم عمل، والخصومات — للعيادات فقط (المعمل مستبعد)."
              : "New and returning patients, attendance, productivity per chair and per working day, and discounts — clinics only (lab excluded)."}
          </p>
        </div>
        <nav className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-card">
          {TABS.map((k) => (
            <Link
              key={k}
              href={`${base}?tab=${k}`}
              aria-current={tab === k ? "page" : undefined}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold ${tab === k ? "bg-ink-900 text-white" : "text-ink-700 hover:bg-ink-50"}`}
            >
              {tabName(k)}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-6">{tab === "opsSettings" ? <Settings locale={locale} saved={searchParams.saved === "1"} /> : <OpsTabView tab={tab} locale={locale} searchParams={searchParams} base={base} />}</div>
    </div>
  );
}

async function OpsTabView({ tab, locale, searchParams, base }: { tab: OpsTab; locale: Locale; searchParams: Record<string, string | undefined>; base: string }) {
  const upTo = addDays(riyadhDate(), -1);
  const month = /^\d{4}-\d{2}$/.test(searchParams.month ?? "") ? searchParams.month! : upTo.slice(0, 7);
  const branch: BranchFilter = searchParams.branch === "abha" || searchParams.branch === "khamis" ? searchParams.branch : "all";
  const [data, state] = await Promise.all([loadOps({ month, branch, doctorLevel: true, locale, upTo }), refreshState()]);
  const href = (q: { month?: string; branch?: BranchFilter }) => {
    const p = new URLSearchParams({ tab });
    const m = q.month ?? month;
    const b = q.branch ?? branch;
    if (m !== upTo.slice(0, 7)) p.set("month", m);
    if (b !== "all") p.set("branch", b);
    return `${base}?${p.toString()}`;
  };
  return <OpsView data={data} tab={tab} locale={locale} href={href} lastUpdate={state.lastSuccessAt} controls={<RefreshButton locale={locale} initial={state} />} />;
}

async function Settings({ locale, saved }: { locale: Locale; saved: boolean }) {
  const ar = locale === "ar";
  const s = await readOpsSettings();
  const PERCENT: KpiKey[] = ["newPct", "attendance", "noShow", "discountPct"];
  const names: Record<KpiKey, string> = ar
    ? { newPct: "نسبة المرضى الجدد (%)", attendance: "نسبة الحضور (%)", noShow: "نسبة عدم الحضور (%) — الأقل أفضل", perChairDay: "الإيراد لكل كرسي في اليوم (ريال)", perDay: "الإيراد لكل يوم عمل (ريال)", discountPct: "نسبة الخصومات (%) — الأقل أفضل" }
    : { newPct: "New patients (%)", attendance: "Attendance (%)", noShow: "No-show (%) — lower is better", perChairDay: "Revenue per chair-day (SAR)", perDay: "Revenue per working day (SAR)", discountPct: "Discounts (%) — lower is better" };
  const shown = (k: KpiKey) => {
    const v = s.targets[k];
    return v === undefined ? "" : PERCENT.includes(k) ? String(Math.round(v * 1000) / 10) : String(v);
  };
  return (
    <form action={saveOpsSettingsAction} className="card max-w-3xl space-y-6 p-6">
      <input type="hidden" name="locale" value={locale} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-bold text-ink-900">{ar ? "إعدادات التشغيل" : "Operating settings"}</h2>
        {saved && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-800 ring-1 ring-emerald-200">
            <CheckCircle2 className="h-4 w-4" /> {ar ? "تم الحفظ" : "Saved"}
          </span>
        )}
      </div>
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 font-bold text-ink-900">{ar ? "عدد الكراسي لكل فرع" : "Chairs per branch"}</legend>
        {(["abha", "khamis"] as const).map((b) => (
          <label key={b} className="flex flex-col gap-1 text-xs font-bold text-ink-600">
            {b === "abha" ? (ar ? "أبها" : "Abha") : ar ? "خميس مشيط" : "Khamis Mushait"}
            <input name={`chairs-${b}`} inputMode="numeric" dir="ltr" defaultValue={s.chairs[b] ?? ""} className="input" placeholder={ar ? "غير محدد" : "Not set"} />
          </label>
        ))}
      </fieldset>
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 font-bold text-ink-900">{ar ? "هدف كل مؤشر" : "A target per indicator"}</legend>
        {KPI_KEYS.map((k) => (
          <label key={k} className="flex flex-col gap-1 text-xs font-bold text-ink-600">
            {names[k]}
            <input name={`target-${k}`} inputMode="decimal" dir="ltr" defaultValue={shown(k)} className="input" />
          </label>
        ))}
      </fieldset>
      <label className="flex flex-col gap-1 text-xs font-bold text-ink-600">
        {ar ? "حد تنبيه الخصومات (%) لفرع أو طبيب" : "Discount alert threshold (%) for a branch or doctor"}
        <input name="discountThreshold" inputMode="decimal" dir="ltr" defaultValue={String(Math.round(s.discountThreshold * 1000) / 10)} className="input max-w-[10rem]" />
      </label>
      <fieldset>
        <legend className="font-bold text-ink-900">{ar ? "إظهار المؤشرات على مستوى الطبيب في نسخة المغربي" : "Doctor-level indicators in the Al-Maghrabi copy"}</legend>
        <p className="mt-1 text-sm text-ink-500">
          {ar
            ? "عند «لا» تعرض نسخة المغربي مؤشرات الفروع فقط، وتُحجب منها جداول الأطباء وأكبر الخصومات والتنبيهات المرتبطة بهم (من الخادم نفسه)."
            : "With «No», the Al-Maghrabi copy shows branch indicators only; doctors' tables, the top discounts and their alerts are left out by the server."}
        </p>
        <div className="mt-2 flex gap-4 text-sm">
          {(["yes", "no"] as const).map((v) => (
            <label key={v} className="flex items-center gap-2">
              <input type="radio" name="maghrabiDoctorLevel" value={v} defaultChecked={(v === "yes") === s.maghrabiDoctorLevel} className="accent-primary-600" />
              {v === "yes" ? (ar ? "نعم" : "Yes") : ar ? "لا" : "No"}
            </label>
          ))}
        </div>
      </fieldset>
      <SubmitButton label={ar ? "حفظ" : "Save"} savedLabel={ar ? "تم الحفظ" : "Saved"} />
    </form>
  );
}
