import { CheckCircle2, ListTree } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { readAcctSettings, readChart, readMapping, readTbYear } from "@/lib/acct";
import { suggestLine, type Mapping } from "@/lib/acctMapping";
import { latestTb } from "@/lib/acctViews";
import { MODEL_BS, MODEL_PNL } from "@/lib/financeModel";
import { saveAcctSettingsAction } from "@/lib/acctActions";
import { SubmitButton } from "@/components/admin/SubmitButton";

// Settings → the accounting part: which model line each account is on (a
// dropdown per account, suggested from its code and names), the financing
// maturity schedule and the reconciliation threshold.

const NAMES: Record<"ar" | "en", Record<string, string>> = {
  ar: {
    revenue: "الإيرادات",
    commissions: "عمولات الأطباء والموظفين",
    materials: "المواد",
    labs: "المعامل",
    otherOperating: "مصاريف تشغيلية أخرى",
    personnel: "مصاريف الموظفين",
    ga: "مصاريف عمومية وإدارية",
    otherIncome: "إيرادات أخرى",
    impairments: "الانخفاض في القيمة",
    depreciation: "الاستهلاك",
    financial: "مصاريف تمويلية",
    zakat: "الزكاة",
    fixedAssets: "الأصول الثابتة",
    inventory: "المخزون",
    receivables: "الذمم المدينة",
    prepaid: "مدفوعة مقدمًا وأخرى",
    cash: "النقد وما في حكمه",
    shareCapital: "رأس المال",
    statutoryReserves: "الاحتياطي النظامي",
    retainedEarnings: "الأرباح المبقاة",
    relatedParties: "أطراف ذات علاقة",
    murabaha: "المرابحة والقروض",
    severance: "مخصص نهاية الخدمة",
    payables: "الذمم الدائنة",
    accrued: "مستحقات وأخرى",
    fixedAssetSuppliers: "موردو الأصول الثابتة",
    zakatProvision: "مخصص الزكاة",
    none: "— خارج البنود —",
  },
  en: {
    revenue: "Revenue",
    commissions: "Commissions",
    materials: "Materials",
    labs: "Dental labs",
    otherOperating: "Other operating",
    personnel: "Personnel",
    ga: "G&A",
    otherIncome: "Other income",
    impairments: "Impairments",
    depreciation: "Depreciation",
    financial: "Financial expenses",
    zakat: "Zakat",
    fixedAssets: "Fixed assets",
    inventory: "Inventory",
    receivables: "Receivables",
    prepaid: "Prepaid & other",
    cash: "Cash",
    shareCapital: "Share capital",
    statutoryReserves: "Statutory reserves",
    retainedEarnings: "Retained earnings",
    relatedParties: "Related parties",
    murabaha: "Murabaha & loans",
    severance: "End of service",
    payables: "Payables",
    accrued: "Accrued & other",
    fixedAssetSuppliers: "Fixed asset suppliers",
    zakatProvision: "Zakat provision",
    none: "— Not on a line —",
  },
};

export async function AcctSettings({ locale, saved }: { locale: Locale; saved: boolean }) {
  const ar = locale === "ar";
  const names = NAMES[ar ? "ar" : "en"];
  const upTo = new Date(Date.now() + 3 * 3600_000 - 86400_000).toISOString().slice(0, 10);
  const [chartFile, mapping, settings, tb] = await Promise.all([readChart(), readMapping(), readAcctSettings(), readTbYear(upTo.slice(0, 4))]);
  const chart = new Map((chartFile?.accounts ?? []).map((a) => [a.code, a]));
  // The accounts that matter: those of the latest trial balance (detail accounts), else the chart's detail accounts.
  const file = latestTb(tb, "all", "all");
  const accounts = (file?.rows.map((r) => ({ code: r.code, name: chart.get(r.code)?.[ar ? "ar" : "en"] || r.name })) ??
    [...chart.values()].filter((a) => !/group/i.test(a.type)).map((a) => ({ code: a.code, name: (ar ? a.ar : a.en) || a.en }))).sort((a, b) => a.code.localeCompare(b.code));
  const pnl = MODEL_PNL.map((m) => m.line);
  const bs = MODEL_BS.map((m) => m.line);
  const changed = Object.keys(mapping).length;

  return (
    <form id="accounting" action={saveAcctSettingsAction} className="card space-y-6 p-6">
      <input type="hidden" name="locale" value={locale} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-ink-900">
            <ListTree className="h-5 w-5 text-primary-600" />
            {ar ? "النظام المحاسبي — ربط الحسابات ببنود النموذج المالي" : "Accounting — account mapping to the financial model"}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-ink-500">
            {ar
              ? "كل حساب مربوط تلقائيًا ببند حسب رقمه واسمه؛ غيّر ما يلزم. التعديل هنا فقط ولا يُرسل أي شيء إلى النظام المحاسبي."
              : "Each account is suggested a line from its code and name; change what's needed. Only this site changes; nothing is sent to the accounting system."}
          </p>
        </div>
        {saved && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-800 ring-1 ring-emerald-200">
            <CheckCircle2 className="h-4 w-4" /> {ar ? "تم الحفظ" : "Saved"}
          </span>
        )}
      </div>

      {accounts.length ? (
        <div className="max-h-[560px] overflow-auto rounded-xl ring-1 ring-ink-100">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-[1] bg-white text-xs text-ink-500">
              <tr>
                <th className="border-b border-ink-100 px-3 py-2 text-start font-bold">{ar ? "الحساب" : "Account"}</th>
                <th className="border-b border-ink-100 px-3 py-2 text-start font-bold">{ar ? "البند" : "Line"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100/70">
              {accounts.map((a) => {
                const suggested = suggestLine(a.code, chart.get(a.code) ?? { en: a.name, ar: a.name, path: "" });
                const current = (mapping as Mapping)[a.code] ?? suggested ?? "none";
                const own = a.code in mapping;
                const options = /^[45]/.test(a.code) ? pnl : bs;
                return (
                  <tr key={a.code} className={own ? "bg-primary-50/40" : ""}>
                    <td className="px-3 py-2">
                      <span dir="ltr" className="me-2 font-mono text-xs text-ink-400">
                        {a.code}
                      </span>
                      <span className="text-ink-800">{a.name}</span>
                    </td>
                    <td className="px-3 py-1.5">
                      <input type="hidden" name={`sug-${a.code}`} value={suggested ?? "none"} />
                      <select name={`map-${a.code}`} defaultValue={current} className="input h-9 py-1 text-sm">
                        {options.map((l) => (
                          <option key={l} value={l}>
                            {names[l]}
                            {l === suggested ? (ar ? " (مقترح)" : " (suggested)") : ""}
                          </option>
                        ))}
                        <option value="none">{names.none}</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-xl bg-sand-50 p-3 text-sm text-ink-600 ring-1 ring-ink-100">
          {ar ? "يظهر الجدول بعد وصول ميزان المراجعة ودليل الحسابات." : "The table appears once the trial balance and chart of accounts arrive."}
        </p>
      )}
      {changed > 0 && <p className="text-xs text-ink-500">{ar ? `${changed} حساب بتعديل يدوي (مظلل).` : `${changed} accounts changed by hand (shaded).`}</p>}

      <div className="grid gap-5 lg:grid-cols-2">
        <label className="block">
          <span className="font-bold text-ink-900">{ar ? "جدول استحقاقات المرابحة (2201)" : "Murabaha (2201) maturity schedule"}</span>
          <span className="mt-1 block text-sm text-ink-500">
            {ar ? "سطر لكل قسط: التاريخ = المبلغ، مثل 2027-03-15 = 400000. يُصنّف به المتداول وغير المتداول." : "One installment per line: date = amount, e.g. 2027-03-15 = 400000. Splits current and non-current."}
          </span>
          <textarea
            name="maturities"
            rows={6}
            dir="ltr"
            defaultValue={settings.maturities.map((m) => `${m.date} = ${m.amount}`).join("\n")}
            className="input mt-2 font-mono"
          />
        </label>
        <label className="block">
          <span className="font-bold text-ink-900">{ar ? "حد مطابقة الإيرادات (PMS مقابل المحاسبة)" : "Revenue reconciliation threshold (PMS vs accounting)"}</span>
          <span className="mt-1 block text-sm text-ink-500">{ar ? "تُبرز الأشهر التي يتجاوز فرقها هذه النسبة." : "Months whose difference exceeds this share are flagged."}</span>
          <div className="mt-2 flex items-center gap-2">
            <input name="reconThreshold" inputMode="decimal" dir="ltr" defaultValue={String(Math.round(settings.reconThreshold * 1000) / 10)} className="input w-28" />
            <span className="font-bold text-ink-600">%</span>
          </div>
        </label>
      </div>
      <SubmitButton label={ar ? "حفظ إعدادات المحاسبة" : "Save accounting settings"} savedLabel={ar ? "تم الحفظ" : "Saved"} />
    </form>
  );
}
