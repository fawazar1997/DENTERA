import Link from "next/link";
import { Download, ExternalLink, FileUp, Plus, Search } from "lucide-react";
import { isLocale, defaultLocale, type Locale, localePath } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getBranches, getSettings } from "@/lib/db";
import { ARCHIVE_BRANCHES, listArchive, listImportBatches, searchArchive, type ArchiveKind } from "@/lib/archive";
import { formsAdminText } from "@/lib/formsText";
import {
  addPastLetterAction,
  deleteArchiveEntryAction,
  importPastLettersAction,
  undoImportAction,
} from "@/lib/formsAdminActions";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { requireAdminPage } from "@/lib/adminSession";

// Admin pages always need the current data, never a stale build-time or
// revalidation-cached snapshot, so render them fresh on every request.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export default async function AdminLettersPage({
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
  const t = formsAdminText(locale);

  const branchFilter = ARCHIVE_BRANCHES[searchParams.branch ?? ""] ? searchParams.branch : undefined;
  const kindFilter: ArchiveKind | undefined =
    searchParams.kind === "outgoing" || searchParams.kind === "incoming" ? searchParams.kind : undefined;
  const query = (searchParams.q ?? "").slice(0, 100);

  const [settings, allBranches, all, batches] = await Promise.all([
    getSettings(),
    getBranches(),
    listArchive({ branch: branchFilter, kind: kindFilter, all: true }),
    listImportBatches(),
  ]);
  const branches = allBranches
    .filter((b) => ARCHIVE_BRANCHES[b.id])
    .map((b) => ({ id: b.id, name: ar ? b.nameAr : b.nameEn }));
  const branchName = new Map(branches.map((b) => [b.id, b.name]));

  const entries = searchArchive(all, query);
  const pages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(searchParams.page) || 1));
  const shown = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const filterQuery = new URLSearchParams();
  if (branchFilter) filterQuery.set("branch", branchFilter);
  if (kindFilter) filterQuery.set("kind", kindFilter);
  if (query) filterQuery.set("q", query);
  const pageHref = (p: number) => {
    const q = new URLSearchParams(filterQuery);
    if (p > 1) q.set("page", String(p));
    const text = q.toString();
    return localePath(locale, `/admin/letters${text ? `?${text}` : ""}`);
  };
  const filtered = filterQuery.toString() !== "";

  const fill = (text: string, values: Record<string, string | number>) =>
    text.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? ""));

  const notice = (() => {
    if (searchParams.imported !== undefined) {
      const parts = [fill(t.importDone, { added: Number(searchParams.imported) || 0 })];
      if (Number(searchParams.duplicates)) parts.push(fill(t.importDuplicates, { n: Number(searchParams.duplicates) }));
      if (Number(searchParams.incomplete)) parts.push(fill(t.importIncomplete, { n: Number(searchParams.incomplete) }));
      return { ok: true, text: parts.join(" ") };
    }
    if (searchParams.undone !== undefined) return { ok: true, text: fill(t.undone, { n: Number(searchParams.undone) || 0 }) };
    if (searchParams.saved === "deleted") return { ok: true, text: t.savedDeleted };
    if (searchParams.saved === "added") return { ok: true, text: t.savedAdded };
    const importError = {
      file: t.importErrorFile,
      size: t.importErrorSize,
      read: t.importErrorRead,
      empty: t.importErrorEmpty,
      branch: t.importErrorBranch,
    }[searchParams.importError ?? ""];
    if (importError) return { ok: false, text: importError };
    if (searchParams.addError === "duplicate") return { ok: false, text: t.addDuplicate };
    if (searchParams.addError) return { ok: false, text: t.addError };
    return null;
  })();

  const statusLabel = { done: t.statusDone, pending: t.statusPending, cancelled: t.statusCancelled };
  const dateTime = new Intl.DateTimeFormat(ar ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Riyadh",
  });

  const branchSelect = (name: string, required = false) => (
    <select name={name} required={required} defaultValue={branches[0]?.id} className="input">
      {branches.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
    </select>
  );

  return (
    <div className="container-x py-10">
      <h1 className="text-2xl font-extrabold text-ink-950">{dict.admin.lettersLog}</h1>
      <p className="mt-1 max-w-3xl text-ink-500">{t.lettersSubtitle}</p>

      {notice && (
        <p
          role={notice.ok ? "status" : "alert"}
          className={`mt-5 max-w-3xl rounded-lg px-4 py-2 text-sm font-bold text-ink-900 ${notice.ok ? "bg-primary-100" : "bg-accent-100"}`}
        >
          {notice.text}
        </p>
      )}

      <section className="card mt-6 p-4 sm:p-5">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="block min-w-[14rem] flex-[2]">
            <span className="sr-only">{t.search}</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input type="search" name="q" defaultValue={query} placeholder={t.search} className="input ps-9" />
            </span>
          </label>
          <select name="branch" defaultValue={branchFilter ?? ""} aria-label={t.branch} className="input w-auto flex-1">
            <option value="">{t.allBranches}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select name="kind" defaultValue={kindFilter ?? ""} aria-label={t.colKind} className="input w-auto flex-1">
            <option value="">{t.allKinds}</option>
            <option value="outgoing">{t.outgoing}</option>
            <option value="incoming">{t.incoming}</option>
          </select>
          <button type="submit" className="btn-primary">
            {t.apply}
          </button>
          {filtered && (
            <Link href={localePath(locale, "/admin/letters")} className="btn-outline">
              {t.clear}
            </Link>
          )}
          <a href={`/api/admin/archive${filtered ? `?${filterQuery}` : ""}`} className="btn-outline ms-auto">
            <Download className="h-4 w-4" />
            {t.downloadCsv}
          </a>
        </form>
      </section>

      <details className="card mt-6 p-6" open={all.length === 0 && !filtered}>
        <summary className="flex cursor-pointer list-none items-center gap-2 font-bold text-ink-900">
          <FileUp className="h-5 w-5 text-primary-600" />
          {t.importTitle}
        </summary>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-600">{t.importHint}</p>

        <form action={importPastLettersAction} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <input type="hidden" name="locale" value={locale} />
          <label className="block lg:col-span-2">
            <span className="label">{t.importFile}</span>
            <input
              type="file"
              name="file"
              required
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              className="input"
            />
          </label>
          <label className="block">
            <span className="label">{t.importKind}</span>
            <select name="kind" className="input">
              <option value="outgoing">{t.outgoing}</option>
              <option value="incoming">{t.incoming}</option>
            </select>
          </label>
          <label className="block">
            <span className="label">{t.importBranch}</span>
            {branchSelect("branch", true)}
          </label>
          <p className="text-xs text-ink-500 sm:col-span-2 lg:col-span-3">{t.importBranchHint}</p>
          <SubmitButton label={t.importButton} savedLabel={t.saved} />
        </form>

        {batches.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-bold text-ink-800">{t.importsTitle}</h3>
            <ul className="mt-2 divide-y divide-ink-100 rounded-xl2 border border-ink-100">
              {batches.slice(0, 10).map((b) => (
                <li key={b.batch} className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm">
                  <span className="font-semibold text-ink-900">{b.kind === "outgoing" ? t.outgoing : t.incoming}</span>
                  <span className="text-ink-600">{fill(t.importsCount, { n: b.count })}</span>
                  <span className="text-xs text-ink-400">{dateTime.format(new Date(b.at))}</span>
                  <form action={undoImportAction} className="ms-auto">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="batch" value={b.batch} />
                    <ConfirmSubmit label={t.undoImport} confirmText={t.undoConfirm} className="btn-outline px-3 py-1 text-xs" />
                  </form>
                </li>
              ))}
            </ul>
          </div>
        )}

        <details className="mt-6 rounded-xl2 border border-dashed border-ink-200 p-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-primary-700">
            <Plus className="h-4 w-4" />
            {t.addOneTitle}
          </summary>
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            {(["outgoing", "incoming"] as const).map((kind) => (
              <form key={kind} action={addPastLetterAction} className="space-y-3 rounded-xl2 bg-ink-50/50 p-4">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="kind" value={kind} />
                <p className="font-bold text-ink-900">{kind === "outgoing" ? t.outgoing : t.incoming}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="label">{t.branch}</span>
                    {branchSelect("branch", true)}
                  </label>
                  {kind === "incoming" && (
                    <label className="block">
                      <span className="label">{t.fieldParty}</span>
                      <input name="party" required className="input" />
                    </label>
                  )}
                  <label className="block">
                    <span className="label">{t.fieldNumber}</span>
                    <input
                      name="number"
                      required={kind === "outgoing"}
                      dir="ltr"
                      placeholder={kind === "outgoing" ? "ABH-2026-0001" : ""}
                      className="input"
                    />
                  </label>
                  <label className="block">
                    <span className="label">{t.fieldDate}</span>
                    <input name="letterDate" type="date" required dir="ltr" className="input" />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="label">{t.fieldTitle}</span>
                    <input name="title" required className="input" />
                  </label>
                  <label className="block">
                    <span className="label">{t.fieldDepartment}</span>
                    <select name="department" className="input">
                      {((kind === "outgoing" ? settings.archiveDepartmentsOut : settings.archiveDepartmentsIn) ?? []).map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </select>
                  </label>
                  {kind === "outgoing" && (
                    <>
                      <label className="block">
                        <span className="label">{t.fieldType}</span>
                        <input name="letterType" className="input" />
                      </label>
                      <label className="block">
                        <span className="label">{t.fieldEmployee}</span>
                        <input name="employeeNo" inputMode="numeric" dir="ltr" className="input" />
                      </label>
                    </>
                  )}
                  <label className="block sm:col-span-2">
                    <span className="label">{t.fieldLink}</span>
                    <input name="link" dir="ltr" placeholder="https://drive.google.com/…" className="input" />
                  </label>
                </div>
                <SubmitButton label={kind === "outgoing" ? t.addOutgoing : t.addIncoming} savedLabel={t.saved} />
              </form>
            ))}
          </div>
        </details>
      </details>

      <section className="card mt-6 p-6">
        <p className="text-sm text-ink-500">
          <b className="text-ink-900">{entries.length}</b> {t.shown}
          {pages > 1 && (
            <span>
              {" "}
              · {t.page} {page} / {pages}
            </span>
          )}
        </p>
        {shown.length === 0 ? (
          <p className="mt-4 rounded-xl bg-ink-50 px-4 py-6 text-center text-ink-500">{t.noEntries}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-start text-xs text-ink-500">
                  <th className="px-2 py-2 text-start">{t.colKind}</th>
                  <th className="px-2 py-2 text-start">{t.colNumber}</th>
                  <th className="px-2 py-2 text-start">{t.colDetails}</th>
                  <th className="px-2 py-2 text-start">{t.colDate}</th>
                  <th className="px-2 py-2 text-start">{t.colStatus}</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {shown.map((e) => (
                  <tr key={e.id} className="align-top">
                    <td className="px-2 py-2">
                      {e.kind === "outgoing" ? t.outgoing : t.incoming}
                      <span className="block text-xs text-ink-400">{branchName.get(e.branch) ?? e.branch}</span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 font-bold text-primary-700" dir="ltr">
                      {e.number ?? e.letterNo ?? "—"}
                    </td>
                    <td className="px-2 py-2">
                      <span className="font-semibold text-ink-900">{e.title}</span>
                      <span className="block text-xs text-ink-500">
                        {[e.party, e.department, e.letterType, e.employeeNo].filter(Boolean).join(" · ")}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-ink-600" dir="ltr">
                      {e.letterDate}
                    </td>
                    <td className="px-2 py-2">
                      <span className="flex flex-wrap gap-1">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            e.status === "done" ? "bg-primary-100 text-primary-800" : "bg-accent-100 text-accent-800"
                          }`}
                        >
                          {statusLabel[e.status]}
                        </span>
                        {e.imported && (
                          <span className="rounded-full bg-ink-50 px-2 py-0.5 text-[11px] font-bold text-ink-500">
                            {t.importedBadge}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {e.driveLink ? (
                          <a href={e.driveLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:underline">
                            <ExternalLink className="h-3.5 w-3.5" />
                            Drive
                          </a>
                        ) : (
                          e.imported &&
                          e.fileName && (
                            <span title={e.fileName} className="text-[11px] text-ink-400">
                              {t.fileNameOnly}
                            </span>
                          )
                        )}
                        <DeleteButton action={deleteArchiveEntryAction} id={e.id} locale={locale} label={t.delete} confirmText={t.confirmDeleteEntry} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <nav className="mt-4 flex items-center justify-center gap-3 text-sm">
            {page > 1 && (
              <Link href={pageHref(page - 1)} className="btn-outline px-4 py-1.5">
                {t.prev}
              </Link>
            )}
            <span className="text-ink-500">
              {page} / {pages}
            </span>
            {page < pages && (
              <Link href={pageHref(page + 1)} className="btn-outline px-4 py-1.5">
                {t.next}
              </Link>
            )}
          </nav>
        )}
      </section>
    </div>
  );
}
