import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookUser, LayoutGrid, Lock } from "lucide-react";
import { isLocale, defaultLocale, type Locale, localePath } from "@/lib/i18n";
import { getBranches, getSettings, getStaffForms } from "@/lib/db";
import {
  ARCHIVE_BRANCHES,
  formsKeyRole,
  getArchiveFolders,
  listArchive,
  nextLetterNumbers,
} from "@/lib/archive";
import { driveHealth } from "@/lib/googleDrive";
import { formsText } from "@/lib/formsText";
import { supervisorText } from "@/lib/supervisorText";
import { documentsText } from "@/lib/documentsText";
import { FormsPortal, type PortalEntry } from "@/components/FormsPortal";
import { Logo } from "@/components/Logo";
import { RiyalIcon } from "@/components/RiyalIcon";
import { getDictionary } from "@/lib/dictionaries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dentera — النماذج والخطابات",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

/**
 * Staff forms and letters archive, reachable only through the private link
 * created in Control Panel → Forms & Archive. The supervisors' link is the
 * same page plus the letters register (view only). A wrong or revoked key
 * gets a plain 404, so the page's existence isn't revealed.
 */
export default async function StaffFormsPage({
  params,
}: {
  params: { locale: string; key: string };
}) {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const role = await formsKeyRole(params.key);
  if (!role) notFound();
  const supervisor = role === "supervisor";

  const t = formsText(locale);
  const ar = locale === "ar";
  const [branches, forms, settings, folders, drive, numbers] = await Promise.all([
    getBranches(),
    getStaffForms(),
    getSettings(),
    getArchiveFolders(),
    // Connected, and Google still accepts the connection (else the page says
    // the archive isn't ready, instead of failing when a letter is sent).
    driveHealth(),
    nextLetterNumbers(),
  ]);
  // The register goes to the supervisors' link only, and only what it shows.
  const entries: PortalEntry[] | undefined = supervisor
    ? (await listArchive()).map((e) => ({
        id: e.id,
        kind: e.kind,
        branch: e.branch,
        number: e.number,
        letterNo: e.letterNo,
        party: e.party,
        title: e.title,
        department: e.department,
        letterType: e.letterType,
        employeeNo: e.employeeNo,
        letterDate: e.letterDate,
        driveLink: e.driveLink,
      }))
    : undefined;
  const other = locale === "ar" ? "en" : "ar";
  // Shortcuts to the other staff pages (shown once their private links
  // exist; they open in a new tab so this page keeps its place).
  const dict = getDictionary(locale);
  const shortcuts = [
    settings.directoryKey && {
      href: localePath(locale, `/directory/${settings.directoryKey}`),
      label: dict.admin.directory,
      icon: BookUser,
    },
    settings.pricesKey && {
      href: localePath(locale, `/prices/${settings.pricesKey}`),
      label: dict.admin.prices,
      icon: RiyalIcon,
    },
  ].filter((s): s is { href: string; label: string; icon: typeof RiyalIcon } => !!s);

  const portalBranches = branches
    .filter((b) => b.active && ARCHIVE_BRANCHES[b.id])
    .map((b) => ({
      id: b.id,
      name: ar ? b.nameAr : b.nameEn,
      nextNumber: numbers[b.id] ?? "",
      ready: {
        outgoing: drive === "ok" && Boolean(folders[b.id]?.outgoing),
        incoming: drive === "ok" && Boolean(folders[b.id]?.incoming),
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
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-sand-200">
              <Lock className="h-3.5 w-3.5 flex-shrink-0" />
              {supervisor ? t.supervisorOnly : t.internalOnly}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={localePath(locale, supervisor ? `/supervisor/${params.key}` : `/systems/${params.key}`)}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ink-950 hover:bg-sand-100"
              >
                <LayoutGrid className="h-4 w-4 flex-shrink-0" />
                {supervisor ? supervisorText(locale).home : documentsText(locale).back}
              </Link>
              {shortcuts.map(({ href, label, icon: Icon }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {label}
                </a>
              ))}
            </div>
          </div>
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
          entries={entries}
          t={t}
        />
      </main>
    </div>
  );
}
