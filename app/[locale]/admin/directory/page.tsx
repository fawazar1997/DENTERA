import { headers } from "next/headers";
import { ExternalLink, Link2 } from "lucide-react";
import { isLocale, defaultLocale, type Locale, localePath } from "@/lib/i18n";
import { getSettings } from "@/lib/db";
import { getDirectoryData } from "@/lib/directory";
import { generateDirectoryKeyAction } from "@/lib/actions";
import { CopyField } from "@/components/admin/CopyField";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { DoctorDirectory } from "@/components/DoctorDirectory";

// Admin pages always need the current data, never a stale build-time or
// revalidation-cached snapshot, so render them fresh on every request.
export const dynamic = "force-dynamic";

export default async function AdminDirectoryPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const data = await getDirectoryData(locale, { includeExcluded: true });
  const { dict } = data;
  const key = (await getSettings()).directoryKey;

  // Absolute link for sharing, based on the address this page was opened on.
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const path = key ? localePath(locale, `/directory/${key}`) : "";
  const link = key ? `${proto}://${host}${path}` : "";

  return (
    <>
      <div className="container-x py-10">
        <h1 className="text-2xl font-extrabold text-ink-950">{dict.admin.directory}</h1>
        <p className="mt-1 max-w-3xl text-ink-500">{dict.admin.directorySubtitle}</p>

        <section className="card mt-6 max-w-3xl p-6">
          <h2 className="flex items-center gap-2 font-bold text-ink-900">
            <Link2 className="h-5 w-5 text-primary-600" />
            {dict.admin.directoryLink}
          </h2>
          <p className="mt-1 text-sm text-ink-500">{dict.admin.directoryLinkHint}</p>
          <div className="mt-4">
            {key ? (
              <CopyField
                value={link}
                copyLabel={dict.admin.copyLink}
                copiedLabel={dict.admin.copied}
              />
            ) : (
              <p className="rounded-lg bg-ink-50 px-4 py-3 text-sm text-ink-500">
                {dict.admin.noLink}
              </p>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <form action={generateDirectoryKeyAction}>
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
                {dict.admin.openDirectory}
              </a>
            )}
          </div>
        </section>

        <div className="mt-8">
          <DoctorDirectory
            doctors={data.doctors}
            departments={data.departments}
            branches={data.branches}
            locale={locale}
            labels={data.labels}
          />
        </div>
      </div>
    </>
  );
}
