import { headers } from "next/headers";
import Link from "next/link";
import { Archive, ArrowDown, ArrowUp, ExternalLink, FolderOpen, Hash, Link2, Pencil, Plus, ShieldCheck } from "lucide-react";
import { isLocale, defaultLocale, type Locale, localePath } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getBranches, getSettings, getStaffForms } from "@/lib/db";
import { ARCHIVE_BRANCHES, getArchiveFolders, listArchive, nextLetterNumbers } from "@/lib/archive";
import { checkDriveFolder, getDriveConnection, isDriveAppConfigured } from "@/lib/googleDrive";
import { formsAdminText } from "@/lib/formsText";
import {
  createStaffFormAction,
  deleteStaffFormAction,
  disconnectDriveAction,
  generateFormsKeyAction,
  moveStaffFormAction,
  saveArchiveSettingsAction,
  setNextLetterNumberAction,
  updateStaffFormAction,
} from "@/lib/formsAdminActions";
import { CopyField } from "@/components/admin/CopyField";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { requireAdminPage } from "@/lib/adminSession";
import type { StaffForm } from "@/lib/types";

// Admin pages always need the current data, never a stale build-time or
// revalidation-cached snapshot, so render them fresh on every request.
export const dynamic = "force-dynamic";

function FormFields({
  form,
  locale,
  branches,
  t,
}: {
  form?: StaffForm;
  locale: Locale;
  branches: { id: string; name: string }[];
  t: ReturnType<typeof formsAdminText>;
}) {
  return (
    <>
      <input type="hidden" name="locale" value={locale} />
      {form && <input type="hidden" name="id" value={form.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">{t.nameAr}</span>
          <input name="nameAr" required dir="rtl" defaultValue={form?.nameAr} className="input" />
        </label>
        <label className="block">
          <span className="label">{t.nameEn}</span>
          <input name="nameEn" dir="ltr" defaultValue={form?.nameEn} className="input" />
        </label>
        <label className="block sm:col-span-2">
          <span className="label">{t.docLink}</span>
          <input
            name="link"
            required
            dir="ltr"
            defaultValue={form ? `https://docs.google.com/document/d/${form.docId}/copy` : ""}
            placeholder="https://docs.google.com/document/d/…"
            className="input"
          />
        </label>
        <label className="block">
          <span className="label">{t.branch}</span>
          <select name="branch" defaultValue={form?.branch ?? "both"} className="input">
            <option value="both">{t.both}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 self-end pb-3 text-sm font-medium text-ink-700">
          <input type="checkbox" name="active" defaultChecked={form?.active ?? true} className="h-4 w-4 rounded border-ink-300" />
          {t.active}
        </label>
      </div>
    </>
  );
}

export default async function AdminFormsPage({
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

  const [settings, forms, allBranches, folders, connection, numbers, entries] = await Promise.all([
    getSettings(),
    getStaffForms(),
    getBranches(),
    getArchiveFolders(),
    getDriveConnection(),
    nextLetterNumbers(),
    listArchive(),
  ]);
  const count = entries.length;
  const branches = allBranches
    .filter((b) => ARCHIVE_BRANCHES[b.id])
    .map((b) => ({ id: b.id, name: ar ? b.nameAr : b.nameEn }));
  const branchName = new Map(branches.map((b) => [b.id, b.name]));

  // Each folder's reachability with the connected account.
  const folderStatus: Record<string, string | null | undefined> = {};
  if (connection) {
    await Promise.all(
      branches.flatMap((b) =>
        (["outgoing", "incoming"] as const).map(async (kind) => {
          const id = folders[b.id]?.[kind];
          folderStatus[`${b.id}_${kind}`] = id ? await checkDriveFolder(id) : undefined;
        })
      )
    );
  }

  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const key = settings.formsKey;
  const path = key ? localePath(locale, `/forms/${key}`) : "";
  const link = key ? `${proto}://${host}${path}` : "";
  const redirectUri = `${proto}://${host}/api/admin/google/callback`;

  const notice = (() => {
    const g = searchParams.google;
    if (g === "connected") return { ok: true, text: t.googleConnected };
    if (g === "denied") return { ok: false, text: t.googleDenied };
    if (g === "failed") return { ok: false, text: t.googleFailed };
    if (g === "not-configured") return { ok: false, text: t.googleNotConfigured };
    if (g === "disconnected") return { ok: true, text: t.googleDisconnected };
    if (searchParams.saved === "settings") return { ok: true, text: t.savedSettings };
    if (searchParams.saved === "number") return { ok: true, text: t.savedNumber };
    if (searchParams.numberError === "too-low") return { ok: false, text: t.numberTooLow };
    if (searchParams.numberError) return { ok: false, text: t.numberInvalid };
    if (searchParams.formError) return { ok: false, text: t.formError };
    return null;
  })();

  return (
    <div className="container-x py-10">
      <h1 className="text-2xl font-extrabold text-ink-950">{dict.admin.formsArchive}</h1>
      <p className="mt-1 max-w-3xl text-ink-500">{t.subtitle}</p>

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
            <Link2 className="h-5 w-5 text-primary-600" />
            {t.linkTitle}
          </h2>
          <p className="mt-1 text-sm text-ink-500">{t.linkHint}</p>
          <div className="mt-4">
            {key ? (
              <CopyField value={link} copyLabel={dict.admin.copyLink} copiedLabel={dict.admin.copied} />
            ) : (
              <p className="rounded-lg bg-ink-50 px-4 py-3 text-sm text-ink-500">{dict.admin.noLink}</p>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <form action={generateFormsKeyAction}>
              <input type="hidden" name="locale" value={locale} />
              <ConfirmSubmit
                label={key ? dict.admin.regenerateLink : dict.admin.createLink}
                confirmText={key ? dict.admin.regenerateConfirm : undefined}
                className={key ? "btn-outline" : "btn-primary"}
              />
            </form>
            {key && (
              <a href={path} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:underline">
                <ExternalLink className="h-4 w-4" />
                {t.openPage}
              </a>
            )}
          </div>
          <div className="mt-6 border-t border-ink-100 pt-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
              <ShieldCheck className="h-4 w-4 text-primary-600" />
              {t.supervisorTitle}
            </h3>
            <p className="mt-1 text-sm text-ink-500">{t.supervisorHint}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {settings.bookingsSupervisorKey && (
                <a
                  href={localePath(locale, `/forms/${settings.bookingsSupervisorKey}`)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t.openPage}
                </a>
              )}
              <Link href={localePath(locale, "/admin/bookings")} className="text-sm font-semibold text-ink-600 hover:text-primary-700 hover:underline">
                {t.supervisorManage}
              </Link>
            </div>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="flex items-center gap-2 font-bold text-ink-900">
            <FolderOpen className="h-5 w-5 text-primary-600" />
            {t.driveTitle}
          </h2>
          {!isDriveAppConfigured() ? (
            <p className="mt-2 rounded-lg bg-accent-50 px-4 py-3 text-sm text-ink-800">{t.driveAppMissing}</p>
          ) : connection ? (
            <p className="mt-2 text-sm text-ink-700">
              {t.driveConnectedAs} <b dir="ltr">{connection.email ?? "—"}</b>
            </p>
          ) : (
            <p className="mt-2 text-sm text-ink-500">{t.driveNotConnected}</p>
          )}
          <p className="mt-3 text-xs text-ink-400">
            {t.redirectHint} <span dir="ltr" className="select-all font-mono text-ink-600">{redirectUri}</span>
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {isDriveAppConfigured() && (
              <a href={`/api/admin/google/connect?locale=${locale}`} className={connection ? "btn-outline" : "btn-primary"}>
                {connection ? t.driveReconnect : t.driveConnect}
              </a>
            )}
            {connection && (
              <form action={disconnectDriveAction}>
                <input type="hidden" name="locale" value={locale} />
                <ConfirmSubmit label={t.driveDisconnect} confirmText={t.driveDisconnectConfirm} className="btn-outline" />
              </form>
            )}
          </div>
        </section>
      </div>

      <section className="card mt-6 p-6">
        <h2 className="flex items-center gap-2 font-bold text-ink-900">
          <FolderOpen className="h-5 w-5 text-primary-600" />
          {t.foldersTitle}
        </h2>
        <p className="mt-1 text-sm text-ink-500">{t.foldersHint}</p>
        <form action={saveArchiveSettingsAction} className="mt-4 space-y-4">
          <input type="hidden" name="locale" value={locale} />
          <div className="grid gap-4 md:grid-cols-2">
            {branches.flatMap((b) =>
              (["outgoing", "incoming"] as const).map((kind) => {
                const status = folderStatus[`${b.id}_${kind}`];
                const id = folders[b.id]?.[kind];
                return (
                  <label key={`${b.id}_${kind}`} className="block">
                    <span className="label flex items-center justify-between gap-2">
                      <span>
                        {b.name} — {kind === "outgoing" ? t.outgoing : t.incoming}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          !id ? "bg-ink-50 text-ink-500" : !connection ? "bg-ink-50 text-ink-500" : status != null ? "bg-primary-100 text-primary-800" : "bg-accent-100 text-accent-800"
                        }`}
                      >
                        {!id ? t.folderMissing : !connection ? "—" : status != null ? `${t.folderOk}${status ? `: ${status}` : ""}` : t.folderUnreachable}
                      </span>
                    </span>
                    <input
                      name={`folder_${b.id}_${kind}`}
                      dir="ltr"
                      defaultValue={id ? `https://drive.google.com/drive/folders/${id}` : ""}
                      placeholder="https://drive.google.com/drive/folders/…"
                      className="input"
                    />
                  </label>
                );
              })
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="label">{t.departmentsOut}</span>
              <textarea name="departmentsOut" rows={5} dir="rtl" defaultValue={(settings.archiveDepartmentsOut ?? []).join("\n")} className="input" />
            </label>
            <label className="block">
              <span className="label">{t.departmentsIn}</span>
              <textarea name="departmentsIn" rows={5} dir="rtl" defaultValue={(settings.archiveDepartmentsIn ?? []).join("\n")} className="input" />
            </label>
          </div>
          <SubmitButton label={t.saveSettings} savedLabel={t.saved} />
        </form>
      </section>

      <section className="card mt-6 p-6">
        <h2 className="flex items-center gap-2 font-bold text-ink-900">
          <Hash className="h-5 w-5 text-primary-600" />
          {t.numbersTitle}
        </h2>
        <p className="mt-1 text-sm text-ink-500">{t.numbersHint}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {branches.map((b) => (
            <form key={b.id} action={setNextLetterNumberAction} className="flex flex-wrap items-end gap-3 rounded-xl2 border border-ink-100 p-4">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="branch" value={b.id} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink-900">{b.name}</p>
                <p className="mt-1 text-xs text-ink-500">
                  {t.nextIs}: <b dir="ltr" className="text-base text-primary-700">{numbers[b.id]}</b>
                </p>
              </div>
              <input
                name="next"
                type="number"
                min={1}
                max={99999}
                required
                defaultValue={Number(numbers[b.id]?.split("-").pop() ?? 1)}
                dir="ltr"
                className="input w-28"
              />
              <ConfirmSubmit label={t.setNumber} className="btn-outline" />
            </form>
          ))}
        </div>
      </section>

      <section className="card mt-6 p-6">
        <h2 className="flex items-center gap-2 font-bold text-ink-900">
          <FolderOpen className="h-5 w-5 text-primary-600" />
          {t.formsTitle}
        </h2>
        <p className="mt-1 text-sm text-ink-500">{t.formsHint}</p>

        <details className="mt-4 rounded-xl2 border border-dashed border-ink-200 p-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-primary-700">
            <Plus className="h-4 w-4" />
            {t.addForm}
          </summary>
          <form action={createStaffFormAction} className="mt-4 space-y-3">
            <FormFields locale={locale} branches={branches} t={t} />
            <SubmitButton label={t.addForm} savedLabel={t.saved} />
          </form>
        </details>

        <ul className="mt-4 divide-y divide-ink-100">
          {forms.map((f, i) => (
            <li key={f.id} className="py-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink-900">
                    {f.nameAr}
                    {!f.active && <span className="ms-2 rounded-full bg-ink-50 px-2 py-0.5 text-[11px] text-ink-500">{t.hidden}</span>}
                  </p>
                  <p className="text-xs text-ink-500">
                    {f.nameEn} · {f.branch === "both" ? t.both : branchName.get(f.branch) ?? f.branch}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {(["up", "down"] as const).map((dir) => (
                    <form key={dir} action={moveStaffFormAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={f.id} />
                      <input type="hidden" name="dir" value={dir} />
                      <button
                        type="submit"
                        disabled={dir === "up" ? i === 0 : i === forms.length - 1}
                        aria-label={dir === "up" ? t.moveUp : t.moveDown}
                        className="rounded-full p-1.5 text-ink-500 hover:bg-ink-50 disabled:opacity-30"
                      >
                        {dir === "up" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                      </button>
                    </form>
                  ))}
                  <DeleteButton action={deleteStaffFormAction} id={f.id} locale={locale} label={t.delete} confirmText={t.confirmDeleteForm} />
                </div>
              </div>
              <details className="mt-2">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-primary-700">
                  <Pencil className="h-3.5 w-3.5" />
                  {t.edit}
                </summary>
                <form action={updateStaffFormAction} className="mt-3 max-w-2xl space-y-3">
                  <FormFields form={f} locale={locale} branches={branches} t={t} />
                  <SubmitButton label={t.save} savedLabel={t.saved} />
                </form>
              </details>
            </li>
          ))}
        </ul>
      </section>

      <section className="card mt-6 flex flex-wrap items-center justify-between gap-3 p-6">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-ink-900">
            <Archive className="h-5 w-5 text-primary-600" />
            {dict.admin.lettersLog}
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            {t.lettersLinkHint} {count > 0 && <b className="text-ink-800">({count} {t.shown})</b>}
          </p>
        </div>
        <Link href={localePath(locale, "/admin/letters")} className="btn-outline">
          {t.openLetters}
        </Link>
      </section>
    </div>
  );
}
