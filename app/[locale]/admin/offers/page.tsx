import Image from "next/image";
import { Plus, Pencil, ExternalLink, CalendarClock } from "lucide-react";
import { isLocale, defaultLocale, type Locale, localePath } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getBranches, getDepartments, getOffers, isOfferExpired } from "@/lib/db";
import { createOfferAction, deleteOfferAction, updateOfferAction } from "@/lib/actions";
import { formatOfferDate } from "@/lib/offerFormat";
import { AdminNav } from "@/components/admin/AdminNav";
import { OfferForm } from "@/components/admin/OfferForm";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { BlobConfigNotice } from "@/components/admin/BlobConfigNotice";

// Admin pages always need the current data, never a stale build-time or
// revalidation-cached snapshot, so render them fresh on every request.
export const dynamic = "force-dynamic";

export default async function AdminOffersPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const dict = getDictionary(locale);
  const [offers, departments, branches] = await Promise.all([
    getOffers(),
    getDepartments(),
    getBranches(),
  ]);
  const ar = locale === "ar";

  return (
    <>
      <AdminNav locale={locale} dict={dict} />
      <div className="container-x py-10">
        <h1 className="text-2xl font-extrabold text-ink-950">{dict.admin.offers}</h1>
        <p className="mt-1 max-w-3xl text-ink-500">{dict.admin.offersSubtitle}</p>

        <div className="mt-6">
          <BlobConfigNotice text={dict.admin.blobNotEnabled} />
        </div>

        <details className="card p-6 open:pb-7">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-primary-700">
            <Plus className="h-4 w-4" />
            {dict.admin.addOffer}
          </summary>
          <div className="mt-6 max-w-3xl">
            <OfferForm
              action={createOfferAction}
              locale={locale}
              dict={dict}
              departments={departments}
              branches={branches}
            />
          </div>
        </details>

        <div className="mt-8 space-y-4">
          {offers.length === 0 && <p className="text-ink-500">{dict.admin.noOffers}</p>}
          {offers.map((offer) => {
            const expired = isOfferExpired(offer);
            const live = offer.active && !expired;
            return (
              <div key={offer.id} className="card p-5">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="h-14 w-32 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-ink-900 to-primary-800">
                    {offer.imageUrl && (
                      <Image
                        src={offer.imageUrl}
                        alt=""
                        width={256}
                        height={112}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink-900">
                      {ar ? offer.titleAr : offer.titleEn}
                    </p>
                    {offer.endsAt && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {formatOfferDate(offer.endsAt, locale)}
                      </p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      live
                        ? "bg-primary-100 text-primary-700"
                        : expired
                          ? "bg-accent-100 text-ink-800"
                          : "bg-ink-100 text-ink-500"
                    }`}
                  >
                    {live
                      ? dict.admin.offerLive
                      : expired
                        ? dict.admin.offerEnded
                        : dict.admin.statusHidden}
                  </span>
                  {offer.active && (
                    <a
                      href={localePath(locale, `/offers/${offer.id}`)}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {dict.admin.viewOffer}
                    </a>
                  )}
                  <DeleteButton
                    action={deleteOfferAction}
                    id={offer.id}
                    locale={locale}
                    label={dict.admin.delete}
                    confirmText={dict.admin.confirmDelete}
                  />
                </div>
                <details className="mt-3">
                  <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-primary-700">
                    <Pencil className="h-3.5 w-3.5" />
                    {dict.admin.edit}
                  </summary>
                  <div className="mt-5 max-w-3xl border-t border-ink-100 pt-5">
                    <OfferForm
                      action={updateOfferAction}
                      locale={locale}
                      dict={dict}
                      departments={departments}
                      branches={branches}
                      offer={offer}
                    />
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
