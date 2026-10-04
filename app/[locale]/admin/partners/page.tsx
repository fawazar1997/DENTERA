import Image from "next/image";
import { Plus, Pencil } from "lucide-react";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getPartners } from "@/lib/db";
import {
  createPartnerAction,
  deletePartnerAction,
  updatePartnerAction,
} from "@/lib/actions";
import { AdminNav } from "@/components/admin/AdminNav";
import { PartnerForm } from "@/components/admin/PartnerForm";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { BlobConfigNotice } from "@/components/admin/BlobConfigNotice";

// Admin pages always need the current data, never a stale build-time or
// revalidation-cached snapshot, so render them fresh on every request.
export const dynamic = "force-dynamic";

export default async function AdminPartnersPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const dict = getDictionary(locale);
  const partners = await getPartners();

  return (
    <>
      <AdminNav locale={locale} dict={dict} />
      <div className="container-x py-10">
        <h1 className="text-2xl font-extrabold text-ink-950">
          {dict.admin.partners}
        </h1>
        <p className="mt-1 text-ink-500">{dict.admin.partnersSubtitle}</p>

        <div className="mt-6">
          <BlobConfigNotice text={dict.admin.blobNotEnabled} />
        </div>

        <details className="card p-6 open:pb-7">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-primary-700">
            <Plus className="h-4 w-4" />
            {dict.admin.addPartner}
          </summary>
          <div className="mt-6 max-w-2xl">
            <PartnerForm action={createPartnerAction} dict={dict} />
          </div>
        </details>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {partners.length === 0 && (
            <p className="text-ink-500">{dict.admin.noPartners}</p>
          )}
          {partners.map((partner) => (
            <div key={partner.id} className="card p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-24 flex-shrink-0 items-center justify-center rounded-lg border border-ink-100 bg-white p-2">
                  {partner.logoUrl ? (
                    <Image
                      src={partner.logoUrl}
                      alt=""
                      width={200}
                      height={100}
                      className="max-h-10 w-auto object-contain"
                    />
                  ) : (
                    <span className="text-xs text-ink-300">—</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink-900">
                    {locale === "ar" ? partner.nameAr : partner.nameEn}
                  </p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      partner.active
                        ? "bg-primary-100 text-primary-700"
                        : "bg-ink-100 text-ink-500"
                    }`}
                  >
                    {partner.active ? dict.admin.statusActive : dict.admin.statusHidden}
                  </span>
                </div>
                <DeleteButton
                  action={deletePartnerAction}
                  id={partner.id}
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
                <div className="mt-5 border-t border-ink-100 pt-5">
                  <PartnerForm
                    action={updatePartnerAction}
                    dict={dict}
                    partner={partner}
                  />
                </div>
              </details>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
