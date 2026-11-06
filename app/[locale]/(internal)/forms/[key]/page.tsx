import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { isLocale, defaultLocale, type Locale, localePath } from "@/lib/i18n";
import { getBranches, getSettings, getStaffForms } from "@/lib/db";
import {
  ARCHIVE_BRANCHES,
  getArchiveFolders,
  isValidFormsKey,
  nextLetterNumbers,
} from "@/lib/archive";
import { getDriveConnection } from "@/lib/googleDrive";
import { formsText } from "@/lib/formsText";
import { FormsPortal } from "@/components/FormsPortal";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dentera — النماذج والخطابات",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

/**
 * Staff forms and letters archive, reachable only through the private link
 * created in Control Panel → Forms & Archive. A wrong or revoked key gets a
 * plain 404, so the page's existence isn't revealed.
 */
export default async function StaffFormsPage({
  params,
}: {
  params: { locale: string; key: string };
}) {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  if (!(await isValidFormsKey(params.key))) notFound();

  const t = formsText(locale);
  const ar = locale === "ar";
  const [branches, forms, settings, folders, connection, numbers] = await Promise.all([
    getBranches(),
    getStaffForms(),
    getSettings(),
    getArchiveFolders(),
    getDriveConnection(),
    nextLetterNumbers(),
  ]);
  const other = locale === "ar" ? "en" : "ar";

  const portalBranches = branches
    .filter((b) => b.active && ARCHIVE_BRANCHES[b.id])
    .map((b) => ({
      id: b.id,
      name: ar ? b.nameAr : b.nameEn,
      nextNumber: numbers[b.id] ?? "",
      ready: {
        outgoing: Boolean(connection && folders[b.id]?.outgoing),
        incoming: Boolean(connection && folders[b.id]?.incoming),
      },
    }));
  return (
    <div className="min-h-screen">
      <header className="bg-ink-950">
        <div className="container-x py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Logo className="h-8 w-auto flex-shrink-0 sm:h-9" />
              <span className="truncate text-base font-bold text-white sm:text-lg">{t.title}</span>
            </div>
            <Link
              href={localePath(other, `/forms/${params.key}`)}
              className="flex-shrink-0 rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-ink-100 hover:border-primary-400 hover:text-white"
            >
              {other === "ar" ? "العربية" : "English"}
            </Link>
          </div>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-sand-200">
            <Lock className="h-3.5 w-3.5 flex-shrink-0" />
            {t.internalOnly}
          </span>
        </div>
      </header>
      <main className="container-x min-w-0 py-5 sm:py-6">
        <FormsPortal
          accessKey={params.key}
          locale={locale}
          branches={portalBranches}
          forms={forms
            .filter((f) => f.active)
            .map(({ id, branch, nameAr, nameEn, docId }) => ({ id, branch, nameAr, nameEn, docId }))}
          departmentsOut={settings.archiveDepartmentsOut ?? []}
          departmentsIn={settings.archiveDepartmentsIn ?? []}
          t={t}
        />
      </main>
    </div>
  );
}
