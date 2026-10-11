import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getDirectoryData, isValidDirectoryKey } from "@/lib/directory";
import { DoctorDirectory } from "@/components/DoctorDirectory";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dentera — دليل التنسيق",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

/**
 * Staff coordination directory, reachable only through the private link
 * created in Control Panel → Coordination Directory. A wrong or revoked
 * key gets a plain 404, so the page's existence isn't revealed.
 */
export default async function StaffDirectoryPage({
  params,
}: {
  params: { locale: string; key: string };
}) {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  if (!(await isValidDirectoryKey(params.key))) notFound();

  const data = await getDirectoryData(locale);
  const other = locale === "ar" ? "en" : "ar";

  return (
    <div className="min-h-screen">
      <header className="bg-ink-950">
        <div className="container-x flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3">
            <Logo className="h-9 w-auto" />
            <span className="text-lg font-bold text-white">
              {data.dict.admin.directory}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-sand-200">
              <Lock className="h-3.5 w-3.5" />
              {data.dict.admin.internalOnly}
            </span>
            <Link
              href={`/${other}/directory/${params.key}`}
              className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-ink-100 hover:border-primary-400 hover:text-white"
            >
              {other === "ar" ? "العربية" : "English"}
            </Link>
          </div>
        </div>
      </header>
      <main className="container-x py-6">
        <DoctorDirectory
          doctors={data.doctors}
          departments={data.departments}
          branches={data.branches}
          locale={locale}
          labels={data.labels}
          autoFocus
        />
      </main>
    </div>
  );
}
