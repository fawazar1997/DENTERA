import Image from "next/image";
import { Upload, Trash2 } from "lucide-react";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getInquiries, getSettings } from "@/lib/db";
import { removeBannerAction, updateBannerAction } from "@/lib/actions";
import { AdminNav } from "@/components/admin/AdminNav";
import { BlobConfigNotice } from "@/components/admin/BlobConfigNotice";

// Admin pages always need the current data, never a stale build-time or
// revalidation-cached snapshot, so render them fresh on every request.
export const dynamic = "force-dynamic";

export default function AdminSettingsPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const dict = getDictionary(locale);
  const settings = getSettings();
  const newInquiries = getInquiries().filter((i) => i.status === "new").length;

  return (
    <>
      <AdminNav locale={locale} dict={dict} newInquiries={newInquiries} />
      <div className="container-x py-10">
        <h1 className="text-2xl font-extrabold text-ink-950">
          {dict.admin.siteSettings}
        </h1>

        <div className="mt-6 max-w-2xl">
          <BlobConfigNotice text={dict.admin.blobNotEnabled} />
        </div>

        <div className="card max-w-2xl p-7">
          <h2 className="font-bold text-ink-900">{dict.admin.bannerImage}</h2>
          <p className="mt-1 text-sm text-ink-500">{dict.admin.bannerHint}</p>

          <div className="mt-5 overflow-hidden rounded-xl2 border border-ink-100 bg-ink-50">
            {settings.bannerUrl ? (
              <Image
                src={settings.bannerUrl}
                alt=""
                width={1200}
                height={400}
                className="h-48 w-full object-cover"
              />
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-ink-400">
                {dict.admin.noBanner}
              </div>
            )}
          </div>

          <form
            action={updateBannerAction}
            encType="multipart/form-data"
            className="mt-5 flex flex-wrap items-center gap-3"
          >
            <input type="hidden" name="locale" value={locale} />
            <input
              name="banner"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              required
              className="input max-w-xs"
            />
            <button type="submit" className="btn-primary">
              <Upload className="h-4 w-4" />
              {dict.admin.uploadBanner}
            </button>
          </form>

          {settings.bannerUrl && (
            <form action={removeBannerAction} className="mt-3">
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {dict.admin.removeBanner}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
