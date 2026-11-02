import { headers } from "next/headers";
import { ExternalLink, FileSpreadsheet, Link2 } from "lucide-react";
import { isLocale, defaultLocale, type Locale, localePath } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getSettings } from "@/lib/db";
import { getPriceList, priceListLabels } from "@/lib/prices";
import { generatePricesKeyAction, uploadPricesAction } from "@/lib/actions";
import { CopyField } from "@/components/admin/CopyField";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { PriceListView } from "@/components/PriceListView";
import { requireAdminPage } from "@/lib/adminSession";

// Admin pages always need the current data, never a stale build-time or
// revalidation-cached snapshot, so render them fresh on every request.
export const dynamic = "force-dynamic";

export default async function AdminPricesPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { imported?: string; error?: string };
}) {
  await requireAdminPage(params.locale);
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const dict = getDictionary(locale);
  const [list, settings] = await Promise.all([getPriceList(), getSettings()]);
  const key = settings.pricesKey;

  // Absolute link for sharing, based on the address this page was opened on.
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const path = key ? localePath(locale, `/prices/${key}`) : "";
  const link = key ? `${proto}://${host}${path}` : "";
  const { imported, error } = searchParams;

  return (
    <div className="container-x py-10">
      <h1 className="text-2xl font-extrabold text-ink-950">{dict.admin.prices}</h1>
      <p className="mt-1 max-w-3xl text-ink-500">{dict.admin.pricesSubtitle}</p>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <section className="card p-6">
          <h2 className="flex items-center gap-2 font-bold text-ink-900">
            <Link2 className="h-5 w-5 text-primary-600" />
            {dict.admin.directoryLink}
          </h2>
          <p className="mt-1 text-sm text-ink-500">{dict.admin.pricesLinkHint}</p>
          <div className="mt-4">
            {key ? (
              <CopyField value={link} copyLabel={dict.admin.copyLink} copiedLabel={dict.admin.copied} />
            ) : (
              <p className="rounded-lg bg-ink-50 px-4 py-3 text-sm text-ink-500">{dict.admin.noLink}</p>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <form action={generatePricesKeyAction}>
              <ConfirmSubmit
                label={key ? dict.admin.regenerateLink : dict.admin.createLink}
                confirmText={key ? dict.admin.regenerateConfirm : undefined}
                className={key ? "btn-outline" : "btn-primary"}
              />
            </form>
            {key && (
              <a
                href={path}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                {dict.admin.openPrices}
              </a>
            )}
          </div>
        </section>

        <section className="card p-6">
          <h2 className="flex items-center gap-2 font-bold text-ink-900">
            <FileSpreadsheet className="h-5 w-5 text-primary-600" />
            {dict.admin.pricesUpload}
          </h2>
          <p className="mt-1 text-sm text-ink-500">{dict.admin.pricesUploadHint}</p>
          {imported !== undefined && (
            <p role="status" className="mt-3 rounded-lg bg-primary-100 px-4 py-2 text-sm font-bold text-ink-900">
              {dict.admin.pricesImported} {Number(imported) || 0}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-3 rounded-lg bg-accent-100 px-4 py-2 text-sm font-bold text-ink-900">
              {error === "file" ? dict.admin.pricesErrorFile : dict.admin.pricesErrorFormat}
            </p>
          )}
          <form action={uploadPricesAction} className="mt-4 flex flex-wrap items-center gap-3">
            <input type="hidden" name="locale" value={locale} />
            <input
              type="file"
              name="file"
              required
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="input max-w-xs"
            />
            <ConfirmSubmit
              label={dict.admin.pricesUploadButton}
              confirmText={list ? dict.admin.pricesUploadConfirm : undefined}
              className="btn-primary"
            />
          </form>
        </section>
      </div>

      <div className="mt-8">
        {list ? (
          <PriceListView list={list} locale={locale} labels={priceListLabels(dict, locale, list)} />
        ) : (
          <p className="rounded-xl bg-ink-50 px-4 py-6 text-center text-ink-500">{dict.admin.pricesEmpty}</p>
        )}
      </div>
    </div>
  );
}
