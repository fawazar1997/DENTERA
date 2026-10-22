import Image from "next/image";
import { Upload, Trash2, Monitor, Smartphone } from "lucide-react";
import { isLocale, defaultLocale, type Locale, localePath } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getSettings } from "@/lib/db";
import {
  removeBannerAction,
  removeHeroImageAction,
  setHomeBannerVisibilityAction,
  updateBannerAction,
  updateHeroImageAction,
} from "@/lib/actions";
import { PAGE_KEYS, type PageKey } from "@/lib/types";
import { BlobConfigNotice } from "@/components/admin/BlobConfigNotice";
import { ToggleSwitch } from "@/components/admin/ToggleSwitch";
import { PhotoQualityBadge } from "@/components/admin/PhotoQualityBadge";

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
    offers: dict.admin.pageOffers,
    contact: dict.admin.pageContact,
  };

  return (
    <>
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

        <div className="card mb-6 p-6">
          <h2 className="font-bold text-ink-900">{dict.admin.heroImage}</h2>
          <p className="mt-1 max-w-3xl text-sm text-ink-500">
            {dict.admin.heroImageHint}
          </p>
          <div className="mt-4 flex flex-wrap items-start gap-6">
            <div className="flex h-48 w-40 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl2 border border-ink-100 bg-ink-50">
              {settings.heroImageUrl ? (
                <Image
                  src={settings.heroImageUrl}
                  alt=""
                  width={320}
                  height={400}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="px-4 text-center text-xs text-ink-400">
                  {dict.admin.noHeroImage}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <form
                action={updateHeroImageAction}
                encType="multipart/form-data"
                className="flex flex-wrap items-center gap-3"
              >
                <input
                  name="image"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  required
                  className="input min-w-0 flex-1"
                />
                <button type="submit" className="btn-primary">
                  <Upload className="h-4 w-4" />
                  {dict.admin.uploadBanner}
                </button>
              </form>
              <p className="mt-2 text-xs text-ink-400">{dict.admin.photoQualityHint}</p>
              {settings.heroImageUrl && (
                <div className="mt-2">
                  <PhotoQualityBadge src={settings.heroImageUrl} label={dict.admin.lowResPhoto} />
                </div>
              )}
              {settings.heroImageUrl && (
                <form action={removeHeroImageAction} className="mt-3">
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
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {PAGE_KEYS.map((page) => {
            const url = settings.banners?.[page];
            return (
              <div key={page} className="card p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-bold text-ink-900">{pageLabels[page]}</h2>
                  <a
                    href={localePath(locale, page === "home" ? "" : `/${page}`)}
                    target="_blank"
                    className="text-xs font-semibold text-primary-700 hover:underline"
                  >
                    {dict.admin.viewSite}
                  </a>
                </div>

                {page === "home" && (
                  <div className="mt-4 rounded-xl2 bg-primary-50 px-4 py-3">
                    <ToggleSwitch
                      action={setHomeBannerVisibilityAction}
                      name="visible"
                      defaultChecked={settings.showHomeBanner !== false}
                      label={dict.admin.showHomeBanner}
                      onLabel={dict.admin.bannerVisible}
                      offLabel={dict.admin.bannerHidden}
                    />
                  </div>
                )}

                <BannerSlot
                  page={page}
                  variant="desktop"
                  url={url}
                  title={dict.admin.bannerDesktop}
                  hint={page === "home" ? dict.admin.bannerSizeHome : dict.admin.bannerSizePage}
                  emptyText={dict.admin.noBanner}
                  uploadLabel={dict.admin.uploadBanner}
                  removeLabel={dict.admin.removeBanner}
                />
                <BannerSlot
                  page={page}
                  variant="mobile"
                  url={settings.mobileBanners?.[page]}
                  title={dict.admin.bannerMobile}
                  hint={`${page === "home" ? dict.admin.bannerSizeMobileHome : dict.admin.bannerSizeMobilePage} — ${dict.admin.bannerMobileHint}`}
                  emptyText={dict.admin.noMobileBanner}
                  uploadLabel={dict.admin.uploadBanner}
                  removeLabel={dict.admin.removeBanner}
                />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

/** One version of a page banner (wide or phone): preview, upload, remove. */
function BannerSlot({
  page,
  variant,
  url,
  title,
  hint,
  emptyText,
  uploadLabel,
  removeLabel,
}: {
  page: PageKey;
  variant: "desktop" | "mobile";
  url?: string;
  title: string;
  hint: string;
  emptyText: string;
  uploadLabel: string;
  removeLabel: string;
}) {
  const mobile = variant === "mobile";
  return (
    <div className={`mt-5 ${mobile ? "border-t border-ink-100 pt-5" : ""}`}>
      <p className="flex items-center gap-1.5 text-sm font-bold text-ink-800">
        {mobile ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
        {title}
      </p>
      <p className="mt-0.5 text-xs text-ink-400">{hint}</p>
      <div
        className={`mt-3 overflow-hidden rounded-xl2 border border-ink-100 bg-ink-50 ${
          mobile ? "mx-auto w-40" : ""
        }`}
      >
        {url ? (
          <Image
            src={url}
            alt=""
            width={mobile ? 320 : 800}
            height={mobile ? 400 : 300}
            className={mobile ? "aspect-[4/5] w-full object-cover" : "h-40 w-full object-cover"}
          />
        ) : (
          <div
            className={`flex items-center justify-center px-4 text-center text-xs text-ink-400 ${
              mobile ? "aspect-[4/5]" : "h-40"
            }`}
          >
            {emptyText}
          </div>
        )}
      </div>
      <form
        action={updateBannerAction}
        encType="multipart/form-data"
        className="mt-3 flex flex-wrap items-center gap-3"
      >
        <input type="hidden" name="page" value={page} />
        <input type="hidden" name="variant" value={variant} />
        <input
          name="banner"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          required
          className="input min-w-0 flex-1"
        />
        <button type="submit" className="btn-primary">
          <Upload className="h-4 w-4" />
          {uploadLabel}
        </button>
      </form>
      {url && (
        <form action={removeBannerAction} className="mt-2">
          <input type="hidden" name="page" value={page} />
          <input type="hidden" name="variant" value={variant} />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-accent-800 transition hover:bg-accent-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {removeLabel}
          </button>
        </form>
      )}
    </div>
  );
}
