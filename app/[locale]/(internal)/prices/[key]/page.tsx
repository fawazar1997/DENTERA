import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { isLocale, defaultLocale, type Locale, localePath } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getPriceList, isValidPricesKey, priceListLabels } from "@/lib/prices";
import { PriceListView } from "@/components/PriceListView";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dentera — قائمة الأسعار",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

/**
 * Staff price list, reachable only through the private link created in
 * Control Panel → Price List. A wrong or revoked key gets a plain 404, so
 * the page's existence isn't revealed.
 */
export default async function StaffPricesPage({
  params,
}: {
  params: { locale: string; key: string };
}) {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  if (!(await isValidPricesKey(params.key))) notFound();

  const dict = getDictionary(locale);
  const list = await getPriceList();
  const other = locale === "ar" ? "en" : "ar";

  return (
    <div className="min-h-screen">
      <header className="bg-ink-950">
        <div className="container-x py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Logo className="h-8 w-auto flex-shrink-0 sm:h-9" />
              <span className="truncate text-base font-bold text-white sm:text-lg">
                {dict.admin.prices}
              </span>
            </div>
            <Link
              href={localePath(other, `/prices/${params.key}`)}
              className="flex-shrink-0 rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-ink-100 hover:border-primary-400 hover:text-white"
            >
              {other === "ar" ? "العربية" : "English"}
            </Link>
          </div>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-sand-200">
            <Lock className="h-3.5 w-3.5 flex-shrink-0" />
            {dict.admin.internalOnly}
          </span>
        </div>
      </header>
      <main className="container-x min-w-0 py-5 sm:py-6">
        {list ? (
          <PriceListView list={list} locale={locale} labels={priceListLabels(dict, locale, list)} autoFocus />
        ) : (
          <p className="rounded-xl bg-ink-50 px-4 py-6 text-center text-ink-500">{dict.admin.pricesEmpty}</p>
        )}
      </main>
    </div>
  );
}
