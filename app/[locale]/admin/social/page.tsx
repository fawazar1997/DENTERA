import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getSettings } from "@/lib/db";
import { saveSocialAction } from "@/lib/actions";
import { SOCIAL_PLATFORMS } from "@/lib/social";
import { AdminNav } from "@/components/admin/AdminNav";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { SocialLinks } from "@/components/SocialLinks";

// Admin pages always need the current data, never a stale build-time or
// revalidation-cached snapshot, so render them fresh on every request.
export const dynamic = "force-dynamic";

export default async function AdminSocialPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const dict = getDictionary(locale);
  const settings = await getSettings();
  const social = settings.social ?? {};

  return (
    <>
      <AdminNav locale={locale} dict={dict} />
      <div className="container-x py-10">
        <h1 className="text-2xl font-extrabold text-ink-950">
          {dict.admin.social}
        </h1>
        <p className="mt-1 max-w-3xl text-ink-500">{dict.admin.socialSubtitle}</p>

        <div className="mt-6 max-w-3xl">
          <SocialLinks links={social} locale={locale} variant="light" />
        </div>

        <form action={saveSocialAction} className="card mt-6 max-w-3xl p-6 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            {SOCIAL_PLATFORMS.map((platform) => (
              <div key={platform.key}>
                <label className="label" htmlFor={`social-${platform.key}`}>
                  {locale === "ar" ? platform.ar : platform.en}
                </label>
                <input
                  id={`social-${platform.key}`}
                  name={platform.key}
                  type="url"
                  dir="ltr"
                  placeholder={platform.placeholder}
                  defaultValue={social[platform.key] ?? ""}
                  className="input"
                />
              </div>
            ))}
          </div>
          <div className="mt-6">
            <SubmitButton label={dict.admin.save} savedLabel={dict.admin.saved} />
          </div>
        </form>
      </div>
    </>
  );
}
