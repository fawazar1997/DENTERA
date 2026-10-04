import Image from "next/image";
import { Upload, Trash2 } from "lucide-react";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getSettings } from "@/lib/db";
import { removeBannerAction, updateBannerAction } from "@/lib/actions";
import { PAGE_KEYS, type PageKey } from "@/lib/types";
import { AdminNav } from "@/components/admin/AdminNav";
import { BlobConfigNotice } from "@/components/admin/BlobConfigNotice";

// Admin pages always need the current data, never a stale build-time or
// revalidation-cached snapshot, so render them fresh on every request.
export const dynamic = "force-dynamic";

export default async function AdminBannersPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const dict = getDictionary(locale);
  const settings = await getSettings();

  const pageLabels: Record<PageKey, string> = {
    home: dict.admin.pageHome,
    about: dict.admin.pageAbout,
    departments: dict.admin.pageDepartments,
    doctors: dict.admin.pageDoctors,
    contact: dict.admin.pageContact,
  };

  return (
    <>
      <AdminNav locale={locale} dict={dict} />
      <div className="container-x py-10">
        <h1 className="text-2xl font-extrabold text-ink-950">
          {dict.admin.banners}
        </h1>
        <p className="mt-1 max-w-2xl text-ink-500">
          {dict.admin.bannersSubtitle}
        </p>

        <div className="mt-6 max-w-3xl">
          <BlobConfigNotice text={dict.admin.blobNotEnabled} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {PAGE_KEYS.map((page) => {
            const url = settings.banners?.[page];
            return (
              <div key={page} className="card p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-bold text-ink-900">{pageLabels[page]}</h2>
                  <a
                    href={`/${locale}${page === "home" ? "" : `/${page}`}`}
                    target="_blank"
                    className="text-xs font-semibold text-primary-700 hover:underline"
                  >
                    {dict.admin.viewSite}
                  </a>
                </div>

                <div className="mt-4 overflow-hidden rounded-xl2 border border-ink-100 bg-ink-50">
                  {url ? (
                    <Image
                      src={url}
                      alt=""
                      width={800}
                      height={300}
                      className="h-40 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center px-6 text-center text-sm text-ink-400">
                      {dict.admin.noBanner}
                    </div>
                  )}
                </div>

                <form
                  action={updateBannerAction}
                  encType="multipart/form-data"
                  className="mt-4 flex flex-wrap items-center gap-3"
                >
                  <input type="hidden" name="page" value={page} />
                  <input
                    name="banner"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    required
                    className="input min-w-0 flex-1"
                  />
                  <button type="submit" className="btn-primary">
                    <Upload className="h-4 w-4" />
                    {dict.admin.uploadBanner}
                  </button>
                </form>

                {url && (
                  <form action={removeBannerAction} className="mt-3">
                    <input type="hidden" name="page" value={page} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-accent-800 transition hover:bg-accent-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {dict.admin.removeBanner}
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
