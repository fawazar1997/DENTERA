import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { formsKeyRole } from "@/lib/archive";
import { getDocCategories, getStaffDocuments } from "@/lib/db";
import { documentsText } from "@/lib/documentsText";
import { documentDate, documentKind, isNewDocument } from "@/lib/documents";
import { DocIcon } from "@/components/DocIcon";
import { DocumentList } from "@/components/DocumentList";
import { SystemsHeader } from "@/components/SystemsHeader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dentera — الأنظمة الإدارية",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

/** One documents section (policies, guides…) on the staff link. */
export default async function SystemsSectionPage({
  params,
}: {
  params: { locale: string; key: string; section: string };
}) {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  if (!(await formsKeyRole(params.key))) notFound();
  const [categories, documents] = await Promise.all([getDocCategories(), getStaffDocuments()]);
  const category = categories.find((c) => c.id === params.section);
  if (!category) notFound();

  const ar = locale === "ar";
  const t = documentsText(locale);
  const title = ar ? category.nameAr : category.nameEn || category.nameAr;
  const listed = documents
    .filter((d) => d.category === category.id)
    .map((d) => ({
      id: d.id,
      title: ar ? d.titleAr : d.titleEn || d.titleAr,
      // The name in the other language (when there is one), then the note.
      subtitle: [ar ? d.titleEn : d.titleEn && d.titleAr, d.note].filter(Boolean).join(" · ") || undefined,
      kind: documentKind(d.link),
      link: d.link,
      isNew: isNewDocument(d.createdAt),
      added: `${t.addedOn} ${documentDate(d.createdAt, locale)}`,
    }))
    // New documents first; otherwise the order set in the control panel.
    .sort((a, b) => Number(b.isNew) - Number(a.isNew));

  return (
    <div className="min-h-screen">
      <SystemsHeader
        locale={locale}
        title={t.hubTitle}
        badge={t.internal}
        switchPath={`/systems/${params.key}/${category.id}`}
        home={{ href: `/systems/${params.key}`, label: t.back }}
      />
      <main className="container-x py-6 sm:py-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="flex items-center gap-3 text-2xl font-extrabold text-ink-950">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink-950 text-white">
              <DocIcon icon={category.icon} className="h-5 w-5" />
            </span>
            {title}
          </h1>
          <DocumentList
            documents={listed}
            labels={{ search: t.search, empty: t.noDocuments, noMatch: t.noMatch, open: t.openDocument, newBadge: t.newBadge }}
          />
        </div>
      </main>
    </div>
  );
}
