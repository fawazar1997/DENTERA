import { ArrowDown, ArrowUp, ExternalLink, Link2, Pencil, Plus } from "lucide-react";
import { isLocale, defaultLocale, type Locale, localePath } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getDocCategories, getSettings, getStaffDocuments } from "@/lib/db";
import { documentsText, type DocumentsText } from "@/lib/documentsText";
import { documentKind } from "@/lib/documents";
import {
  addDocumentLinkAction,
  createDocCategoryAction,
  deleteDocCategoryAction,
  deleteDocumentAction,
  moveDocCategoryAction,
  moveDocumentAction,
  updateDocCategoryAction,
  updateDocumentAction,
} from "@/lib/documentsActions";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { DocIcon } from "@/components/DocIcon";
import { requireAdminPage } from "@/lib/adminSession";
import type { DocCategory, StaffDocument } from "@/lib/types";

// Admin pages always need the current data, never a stale build-time or
// revalidation-cached snapshot, so render them fresh on every request.
export const dynamic = "force-dynamic";

function SectionFields({ category, locale, t }: { category?: DocCategory; locale: Locale; t: DocumentsText }) {
  return (
    <>
      <input type="hidden" name="locale" value={locale} />
      {category && <input type="hidden" name="id" value={category.id} />}
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="label">{t.nameAr}</span>
          <input name="nameAr" required dir="rtl" defaultValue={category?.nameAr} className="input" />
        </label>
        <label className="block">
          <span className="label">{t.nameEn}</span>
          <input name="nameEn" dir="ltr" defaultValue={category?.nameEn} className="input" />
        </label>
        <label className="block">
          <span className="label">{t.icon}</span>
          <select name="icon" defaultValue={category?.icon ?? "file"} className="input">
            <option value="policies">{t.iconPolicies}</option>
            <option value="guides">{t.iconGuides}</option>
            <option value="medical">{t.iconMedical}</option>
            <option value="file">{t.iconFile}</option>
          </select>
        </label>
      </div>
    </>
  );
}

function DocumentFields({
  doc,
  categories,
  locale,
  t,
  ar,
  defaultCategory,
}: {
  doc?: StaffDocument;
  categories: DocCategory[];
  locale: Locale;
  t: DocumentsText;
  ar: boolean;
  defaultCategory?: string;
}) {
  return (
    <>
      <input type="hidden" name="locale" value={locale} />
      {doc && <input type="hidden" name="id" value={doc.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">{t.section}</span>
          <select name="category" required defaultValue={doc?.category ?? defaultCategory} className="input">
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {ar ? c.nameAr : c.nameEn || c.nameAr}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">{t.titleAr}</span>
          <input name="titleAr" required defaultValue={doc?.titleAr} className="input" />
        </label>
        <label className="block sm:col-span-2">
          <span className="label">{t.link}</span>
          <input
            name="link"
            required
            type="url"
            dir="ltr"
            defaultValue={doc?.link}
            placeholder="https://drive.google.com/…"
            className="input"
          />
        </label>
        <label className="block">
          <span className="label">{t.titleEn}</span>
          <input name="titleEn" dir="ltr" defaultValue={doc?.titleEn} className="input" />
        </label>
        <label className="block">
          <span className="label">{t.note}</span>
          <input name="note" defaultValue={doc?.note} className="input" />
        </label>
      </div>
    </>
  );
}

export default async function AdminDocumentsPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: Record<string, string | undefined>;
}) {
  await requireAdminPage(params.locale);
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const ar = locale === "ar";
  const dict = getDictionary(locale);
  const t = documentsText(locale);
  const [categories, documents, settings] = await Promise.all([getDocCategories(), getStaffDocuments(), getSettings()]);

  const notice = (() => {
    if (searchParams.saved === "section") return { ok: true, text: t.savedSection };
    if (searchParams.saved === "document") return { ok: true, text: t.savedDocument };
    if (searchParams.saved === "deleted") return { ok: true, text: t.savedDeleted };
    if (searchParams.error === "section") return { ok: false, text: t.errorSection };
    if (searchParams.error === "not-empty") return { ok: false, text: t.errorNotEmpty };
    if (searchParams.error === "document") return { ok: false, text: t.errorDocument };
    return null;
  })();
  const name = (c: DocCategory) => (ar ? c.nameAr : c.nameEn || c.nameAr);

  return (
    <div className="container-x py-10">
      <h1 className="text-2xl font-extrabold text-ink-950">{dict.admin.documents}</h1>
      <p className="mt-1 max-w-3xl text-ink-500">{t.adminSubtitle}</p>

      {notice && (
        <p
          role={notice.ok ? "status" : "alert"}
          className={`mt-5 max-w-3xl rounded-lg px-4 py-2 text-sm font-bold text-ink-900 ${notice.ok ? "bg-primary-100" : "bg-accent-100"}`}
        >
          {notice.text}
        </p>
      )}

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <section className="card p-6">
          <h2 className="flex items-center gap-2 font-bold text-ink-900">
            <Plus className="h-5 w-5 text-primary-600" />
            {t.addTitle}
          </h2>
          <p className="mt-1 text-sm text-ink-500">{t.addHint}</p>
          {categories.length > 0 && (
            <form action={addDocumentLinkAction} className="mt-4 space-y-3">
              <DocumentFields categories={categories} locale={locale} t={t} ar={ar} defaultCategory={searchParams.section} />
              <SubmitButton label={t.add} savedLabel={t.saved} />
            </form>
          )}
        </section>

        <section className="card p-6">
          <h2 className="font-bold text-ink-900">{t.sectionsTitle}</h2>
          <p className="mt-1 text-sm text-ink-500">{t.sectionsHint}</p>
          <ul className="mt-4 divide-y divide-ink-100">
            {categories.map((c, i) => {
              const count = documents.filter((d) => d.category === c.id).length;
              return (
                <li key={c.id} className="py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-ink-950 text-white">
                      <DocIcon icon={c.icon} className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-ink-900">{c.nameAr}</p>
                      <p className="text-xs text-ink-500">
                        {c.nameEn} · {count} {t.documentsCount}
                      </p>
                    </div>
                    {(["up", "down"] as const).map((dir) => (
                      <form key={dir} action={moveDocCategoryAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="dir" value={dir} />
                        <button
                          type="submit"
                          disabled={dir === "up" ? i === 0 : i === categories.length - 1}
                          aria-label={dir === "up" ? t.moveUp : t.moveDown}
                          className="rounded-full p-1.5 text-ink-500 hover:bg-ink-50 disabled:opacity-30"
                        >
                          {dir === "up" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                        </button>
                      </form>
                    ))}
                    {count === 0 && (
                      <DeleteButton action={deleteDocCategoryAction} id={c.id} locale={locale} label={t.delete} confirmText={t.confirmDeleteSection} />
                    )}
                  </div>
                  <details className="mt-2">
                    <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-primary-700">
                      <Pencil className="h-3.5 w-3.5" />
                      {t.edit}
                    </summary>
                    <form action={updateDocCategoryAction} className="mt-3 space-y-3">
                      <SectionFields category={c} locale={locale} t={t} />
                      <SubmitButton label={t.save} savedLabel={t.saved} />
                    </form>
                  </details>
                </li>
              );
            })}
          </ul>
          <details className="mt-3 rounded-xl2 border border-dashed border-ink-200 p-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-primary-700">
              <Plus className="h-4 w-4" />
              {t.addSection}
            </summary>
            <form action={createDocCategoryAction} className="mt-4 space-y-3">
              <SectionFields locale={locale} t={t} />
              <SubmitButton label={t.addSection} savedLabel={t.saved} />
            </form>
          </details>
        </section>
      </div>

      {settings.formsKey && (
        <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-ink-500">
          <Link2 className="h-4 w-4 text-primary-600" />
          {t.staffLinkHint}
          <a
            href={localePath(locale, `/systems/${settings.formsKey}`)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-primary-700 hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            {t.openStaff}
          </a>
        </p>
      )}

      {categories.map((c) => {
        const docs = documents.filter((d) => d.category === c.id);
        return (
          <section key={c.id} className="card mt-6 p-6" id={`section-${c.id}`}>
            <h2 className="flex items-center gap-2 font-bold text-ink-900">
              <DocIcon icon={c.icon} className="h-5 w-5 text-primary-600" />
              {name(c)}
              <span className="rounded-full bg-ink-50 px-2 py-0.5 text-xs font-bold text-ink-500">{docs.length}</span>
            </h2>
            {docs.length === 0 ? (
              <p className="mt-3 rounded-xl bg-ink-50 px-4 py-4 text-center text-sm text-ink-500">
                {t.empty} — {t.comingSoon}
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-ink-100">
                {docs.map((d, i) => {
                  const kind = documentKind(d.link);
                  return (
                    <li key={d.id} className="py-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-ink-900">
                            {d.titleAr}
                            {kind && (
                              <span className="ms-2 rounded-full bg-ink-50 px-2 py-0.5 text-[11px] font-bold text-ink-500" dir="ltr">
                                {kind}
                              </span>
                            )}
                          </p>
                          {(d.titleEn || d.note) && (
                            <p className="text-xs text-ink-500">{[d.titleEn, d.note].filter(Boolean).join(" · ")}</p>
                          )}
                        </div>
                        <a
                          href={d.link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {t.openDocument}
                        </a>
                        {(["up", "down"] as const).map((dir) => (
                          <form key={dir} action={moveDocumentAction}>
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="id" value={d.id} />
                            <input type="hidden" name="dir" value={dir} />
                            <button
                              type="submit"
                              disabled={dir === "up" ? i === 0 : i === docs.length - 1}
                              aria-label={dir === "up" ? t.moveUp : t.moveDown}
                              className="rounded-full p-1.5 text-ink-500 hover:bg-ink-50 disabled:opacity-30"
                            >
                              {dir === "up" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                            </button>
                          </form>
                        ))}
                        <DeleteButton action={deleteDocumentAction} id={d.id} locale={locale} label={t.delete} confirmText={t.confirmDeleteDocument} />
                      </div>
                      <details className="mt-2">
                        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-primary-700">
                          <Pencil className="h-3.5 w-3.5" />
                          {t.edit}
                        </summary>
                        <form action={updateDocumentAction} className="mt-3 max-w-3xl space-y-3">
                          <DocumentFields doc={d} categories={categories} locale={locale} t={t} ar={ar} />
                          <SubmitButton label={t.save} savedLabel={t.saved} />
                        </form>
                      </details>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
