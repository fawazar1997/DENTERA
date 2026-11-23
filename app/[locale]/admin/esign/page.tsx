import Link from "next/link";
import { headers } from "next/headers";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  CircleDot,
  Copy,
  ExternalLink,
  FilePlus2,
  FileUp,
  Eye,
  FileText,
  FolderOpen,
  Stamp,
  MessageSquareText,
  Pencil,
  Plus,
  RotateCcw,
  UserPlus,
  XCircle,
} from "lucide-react";
import { isLocale, defaultLocale, type Locale, localePath } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { requireAdminPage } from "@/lib/adminSession";
import { esignText, type EsignText } from "@/lib/esignText";
import {
  STAMP_PATH,
  contactSignaturePath,
  isDocumentTemplate,
  readEsign,
  templateContentPath,
  type EsignContact,
  type EsignDocument,
  type EsignPackage,
  type EsignTemplate,
} from "@/lib/esign";
import { EMPTY_DOC, sanitizeDocContent } from "@/lib/esignDoc";
import { driveHealth } from "@/lib/googleDrive";
import { readPrivateFile } from "@/lib/privateBlob";
import { whatsappHref } from "@/lib/phone";
import {
  addEsignContactAction,
  cancelCopyAction,
  cancelPackageAction,
  deleteEsignContactAction,
  deletePackageAction,
  deleteTemplateAction,
  retrySaveAction,
  setEsignFolderAction,
  uploadStampAction,
  deleteStampAction,
  deleteContactSignatureAction,
  setMessageTemplateAction,
  setPackageMessageAction,
  createDocumentTemplateAction,
  duplicateTemplateAction,
  updateEsignContactAction,
  uploadContactSignatureAction,
  setLetterheadFooterAction,
} from "@/lib/esignActions";
import { DocumentEditor } from "@/components/admin/esign/DocumentEditor";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { LinkActions } from "@/components/admin/esign/LinkActions";
import { TemplateUpload } from "@/components/admin/esign/TemplateUpload";
import { TemplateEditor } from "@/components/admin/esign/TemplateEditor";
import { DEFAULT_LETTERHEAD_FOOTER, STEP_COLORS, fillSignMessage, templateReady } from "@/lib/esignTypes";
import { MessageEditor } from "@/components/admin/esign/MessageEditor";
import { NewPackage } from "@/components/admin/esign/NewPackage";

export const dynamic = "force-dynamic";

type Tab = "packages" | "templates" | "settings";

const isReady = templateReady;

function formatTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", {
    timeZone: "Asia/Riyadh",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

/** The site's own address as the browser sees it (for the signer links). */
function siteOrigin(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "dentera.com.sa";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function AdminEsignPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: Record<string, string | undefined>;
}) {
  await requireAdminPage(params.locale, "/esign");
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const ar = locale === "ar";
  const dict = getDictionary(locale);
  const t = esignText(locale);
  const [store, health] = await Promise.all([readEsign(), driveHealth()]);
  /** A private image as a data URL, for a small preview (undefined when missing). */
  const preview = async (path: string) => {
    const bytes = await readPrivateFile(path).catch(() => null);
    return bytes ? `data:image/png;base64,${Buffer.from(bytes).toString("base64")}` : undefined;
  };
  const tab: Tab = searchParams.tab === "templates" || searchParams.tab === "settings" ? searchParams.tab : "packages";

  const notice = (() => {
    if (searchParams.saved === "folder") return { ok: true, text: `${t.folderLinked}: ${store.folders.parentName ?? ""}` };
    if (searchParams.saved === "contact") return { ok: true, text: t.saved };
    if (searchParams.saved === "message") return { ok: true, text: t.messageSaved };
    if (searchParams.saved === "stamp") return { ok: true, text: t.stampSaved };
    if (searchParams.saved === "signature") return { ok: true, text: t.sigSaved };
    if (searchParams.saved === "footer") return { ok: true, text: t.footerSaved };
    if (searchParams.error === "signature") return { ok: false, text: t.sigError };
    if (searchParams.error === "stamp") return { ok: false, text: t.stampError };
    if (searchParams.error === "folder") return { ok: false, text: ar ? "تعذّر الوصول إلى هذا المجلد. تأكد من الرابط ومن أن حساب Google المربوط يملك صلاحية عليه." : "Couldn't reach that folder. Check the link and that the connected Google account can edit it." };
    if (searchParams.error === "drive") return { ok: false, text: t.driveDown };
    if (searchParams.error === "in-use") return { ok: false, text: t.templateInUse };
    if (searchParams.error === "contact") return { ok: false, text: t.contactName };
    return null;
  })();

  const template = searchParams.template ? store.templates.find((x) => x.id === searchParams.template) : undefined;
  const stampUrl = store.stampSavedAt && (template || tab === "settings") ? await preview(STAMP_PATH) : undefined;
  const signatureUrls: Record<string, string> = {};
  if (tab === "settings" && !template) {
    for (const c of store.contacts.filter((c) => c.signatureSavedAt)) {
      const url = await preview(contactSignaturePath(c.id));
      if (url) signatureUrls[c.id] = url;
    }
  }
  const pkg = searchParams.package ? store.packages.find((p) => p.id === searchParams.package) : undefined;
  const footer = store.letterheadFooter || DEFAULT_LETTERHEAD_FOOTER;
  // A document template's content, for its editor.
  let content = EMPTY_DOC;
  if (template && isDocumentTemplate(template) && !searchParams.new) {
    const bytes = await readPrivateFile(templateContentPath(template.id)).catch(() => null);
    try {
      content = (bytes && sanitizeDocContent(JSON.parse(Buffer.from(bytes).toString("utf-8")))) || EMPTY_DOC;
    } catch {
      content = EMPTY_DOC;
    }
  }

  return (
    <div className="container-x py-10">
      <h1 className="text-2xl font-extrabold text-ink-950">{dict.admin.esign}</h1>
      <p className="mt-1 max-w-3xl text-ink-500">{t.subtitle}</p>

      {health !== "ok" && (
        <p role="alert" className="mt-5 flex max-w-3xl items-start gap-2 rounded-lg bg-accent-100 px-4 py-2 text-sm font-bold text-ink-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {t.driveDown}
        </p>
      )}
      {health === "ok" && !store.folders.signed && tab !== "settings" && (
        <p role="alert" className="mt-5 flex max-w-3xl items-start gap-2 rounded-lg bg-accent-100 px-4 py-2 text-sm font-bold text-ink-900">
          <FolderOpen className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <Link href={localePath(locale, "/admin/esign?tab=settings")} className="underline">
            {t.folderMissing}
          </Link>
        </p>
      )}
      {notice && (
        <p
          role={notice.ok ? "status" : "alert"}
          className={`mt-5 max-w-3xl rounded-lg px-4 py-2 text-sm font-bold text-ink-900 ${notice.ok ? "bg-primary-100" : "bg-accent-100"}`}
        >
          {notice.text}
        </p>
      )}

      {template && !searchParams.new ? (
        isDocumentTemplate(template) ? (
          <DocumentEditor template={template} content={content} contacts={store.contacts} locale={locale} footer={footer} />
        ) : (
          <TemplateEditor template={template} contacts={store.contacts} locale={locale} stampUrl={stampUrl} />
        )
      ) : searchParams.new ? (
        <NewPackage
          templates={store.templates.filter(isReady)}
          contacts={store.contacts}
          locale={locale}
          initialTemplateId={searchParams.template ?? searchParams.from}
          defaultMessage={store.messageTemplate}
          footer={footer}
          stampReady={Boolean(store.stampSavedAt)}
        />
      ) : pkg ? (
        <PackageView
          pkg={pkg}
          template={store.templates.find((x) => x.id === pkg.templateId)}
          locale={locale}
          t={t}
          origin={siteOrigin()}
          defaultMessage={store.messageTemplate}
        />
      ) : (
        <>
          <nav className="mt-6 flex gap-1 border-b border-ink-100" aria-label={dict.admin.esign}>
            {(["packages", "templates", "settings"] as const).map((key) => (
              <Link
                key={key}
                href={localePath(locale, `/admin/esign${key === "packages" ? "" : `?tab=${key}`}`)}
                aria-current={tab === key ? "page" : undefined}
                className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-bold transition ${
                  tab === key ? "border-primary-500 text-ink-950" : "border-transparent text-ink-500 hover:text-ink-900"
                }`}
              >
                {key === "packages" ? t.tabPackages : key === "templates" ? t.tabTemplates : t.tabSettings}
              </Link>
            ))}
          </nav>
          {tab === "packages" && (
            <PackagesList packages={store.packages} templates={store.templates} locale={locale} t={t} status={searchParams.status} />
          )}
          {tab === "templates" && (
            <TemplatesTab templates={store.templates} packages={store.packages} locale={locale} t={t} canUpload={Boolean(store.folders.templates) && health === "ok"} />
          )}
          {tab === "settings" && <SettingsTab
              footer={store.letterheadFooter}
              folders={store.folders}
              contacts={store.contacts}
              message={store.messageTemplate}
              stampUrl={stampUrl}
              signatureUrls={signatureUrls}
              locale={locale}
              t={t}
            />}
        </>
      )}
    </div>
  );
}

function StatusChip({ status, t, request = false }: { status: EsignPackage["status"] | EsignDocument["status"]; t: EsignText; request?: boolean }) {
  const map: Record<string, [string, string]> = {
    preparing: [t.statusPreparing, "bg-ink-100 text-ink-600"],
    active: [t.statusActive, "bg-primary-100 text-primary-800"],
    completed: [request ? t.requestCompleted : t.statusCompleted, "bg-primary-500 text-white"],
    cancelled: [request ? t.requestCancelled : t.statusCancelled, "bg-ink-100 text-ink-500"],
    declined: [t.statusDeclined, "bg-accent-100 text-accent-800"],
  };
  const [label, style] = map[status] ?? map.active;
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${style}`}>{label}</span>;
}

function PackagesList({
  packages,
  templates,
  locale,
  t,
  status,
}: {
  packages: EsignPackage[];
  templates: EsignTemplate[];
  locale: Locale;
  t: EsignText;
  status?: string;
}) {
  const filters = ["", "active", "completed", "cancelled"] as const;
  const shown = packages.filter((p) => p.status !== "preparing" && (!status || p.status === status));
  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <Link
              key={f || "all"}
              href={localePath(locale, `/admin/esign${f ? `?status=${f}` : ""}`)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${(status ?? "") === f ? "bg-ink-900 text-white" : "bg-ink-50 text-ink-600 hover:bg-ink-100"}`}
            >
              {f === "" ? t.filterAll : f === "active" ? t.statusActive : f === "completed" ? t.requestCompleted : t.requestCancelled}
            </Link>
          ))}
        </div>
        <Link href={localePath(locale, "/admin/esign?new=1")} className="btn-primary">
          <Plus className="h-4 w-4" /> {t.newPackage}
        </Link>
      </div>
      {shown.length === 0 ? (
        <p className="card mt-4 p-6 text-ink-500">{t.noPackages}</p>
      ) : (
        <ul className="mt-4 grid gap-3 lg:grid-cols-2">
          {shown.map((p) => {
            const done = p.documents.filter((d) => d.status === "completed").length;
            const total = p.documents.filter((d) => d.status !== "cancelled").length;
            return (
              <li key={p.id}>
                <Link href={localePath(locale, `/admin/esign?package=${p.id}`)} className="card block p-5 hover:border-primary-300">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink-400" dir="ltr">{p.ref}</p>
                      <p className="mt-0.5 truncate font-bold text-ink-950">{p.title}</p>
                      <p className="mt-1 text-xs text-ink-500">
                        {templates.find((x) => x.id === p.templateId)?.name} · {formatTime(p.createdAt, locale)}
                      </p>
                    </div>
                    <StatusChip status={p.status} t={t} request />
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                      <div className="h-full rounded-full bg-primary-500" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
                    </div>
                    <span className="whitespace-nowrap text-xs font-bold text-ink-600">
                      {done} {t.of} {total} {t.copiesDone}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function PackageView({
  pkg,
  template,
  locale,
  t,
  origin,
  defaultMessage,
}: {
  pkg: EsignPackage;
  template?: EsignTemplate;
  locale: Locale;
  t: EsignText;
  origin: string;
  defaultMessage?: string;
}) {
  const ar = locale === "ar";
  const Back = ar ? ArrowRight : ArrowLeft;
  const roleOf = (stepId: string) => template?.steps.find((s) => s.id === stepId)?.role ?? "";
  const colorOf = (stepId: string) =>
    STEP_COLORS[Math.max(0, template?.steps.findIndex((s) => s.id === stepId) ?? 0) % STEP_COLORS.length];
  const linkLabels = { copy: t.copyLink, copied: t.copied, whatsapp: t.whatsapp, open: t.openLink };
  const messageTemplate = pkg.message ?? defaultMessage;
  const firstDoc = pkg.documents[0];
  const firstSigner = firstDoc?.signers[0];

  return (
    <div className="mt-4">
      <Link href={localePath(locale, "/admin/esign")} className="inline-flex items-center gap-1.5 text-sm font-bold text-primary-700">
        <Back className="h-4 w-4" /> {t.backToPackages}
      </Link>
      <section className="card mt-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-ink-400" dir="ltr">{pkg.ref}</p>
            <h2 className="mt-0.5 text-xl font-extrabold text-ink-950">{pkg.title}</h2>
            <p className="mt-1 text-sm text-ink-500">
              {template?.name} · {t.createdOn} {formatTime(pkg.createdAt, locale)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip status={pkg.status} t={t} request />
            {pkg.status === "active" && (
              <DeleteButton action={cancelPackageAction} id={pkg.id} locale={locale} label={t.cancelPackage} confirmText={t.confirmCancel} />
            )}
            {pkg.status !== "active" && (
              <DeleteButton action={deletePackageAction} id={pkg.id} locale={locale} label={t.deletePackage} confirmText={`${t.deletePackage}?`} />
            )}
          </div>
        </div>
        {pkg.status === "active" && (
          <details className="mt-4 border-t border-ink-100 pt-3">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-sm font-bold text-primary-700">
              <MessageSquareText className="h-4 w-4" /> {t.editMessage}
            </summary>
            <form action={setPackageMessageAction} className="mt-4 space-y-3">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="id" value={pkg.id} />
              <MessageEditor
                locale={locale}
                initial={messageTemplate}
                sample={{
                  name: firstSigner?.name,
                  role: firstSigner ? roleOf(firstSigner.stepId) : undefined,
                  title: pkg.title,
                  copy: firstDoc?.label,
                  ref: pkg.ref,
                }}
              />
              <SubmitButton label={t.saveMessage} savedLabel={t.saved} />
            </form>
          </details>
        )}
      </section>

      <ul className="mt-4 space-y-3">
        {pkg.documents.map((doc) => (
          <li key={doc.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary-600" />
                <span className="font-bold text-ink-950">{doc.label}</span>
                <StatusChip status={doc.status} t={t} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a href={`/api/admin/esign/doc/${doc.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-ink-50 px-3 py-1.5 text-xs font-bold text-ink-700 hover:bg-ink-100">
                  <Eye className="h-3.5 w-3.5" /> {t.viewPdf}
                </a>
                {doc.signedLink && (
                  <a href={doc.signedLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-800 hover:bg-primary-100">
                    <ExternalLink className="h-3.5 w-3.5" /> {t.openInDrive}
                  </a>
                )}
                {doc.saveError && (
                  <form action={retrySaveAction} className="inline-flex items-center gap-2">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={pkg.id} />
                    <input type="hidden" name="doc" value={doc.id} />
                    <span className="text-xs font-bold text-accent-800">{t.saveFailed}</span>
                    <button type="submit" className="inline-flex items-center gap-1 rounded-full bg-ink-900 px-3 py-1.5 text-xs font-bold text-white">
                      <RotateCcw className="h-3.5 w-3.5" /> {t.retrySave}
                    </button>
                  </form>
                )}
                {doc.status === "active" && (
                  <CancelCopyButton pkgId={pkg.id} docId={doc.id} locale={locale} label={t.cancelCopy} />
                )}
              </div>
            </div>
            <ol className="mt-4 grid gap-2">
              {doc.signers.map((signer, i) => {
                const url = `${origin}/sign/${signer.token}`;
                const state = signer.signedAt ? "signed" : doc.status === "active" && i === doc.currentStep ? "current" : doc.declinedStep === signer.stepId ? "declined" : "later";
                const Icon = state === "signed" ? CheckCircle2 : state === "current" ? CircleDot : state === "declined" ? XCircle : Circle;
                const message = fillSignMessage(messageTemplate, {
                  name: signer.name,
                  role: roleOf(signer.stepId),
                  title: pkg.title,
                  copy: doc.label,
                  ref: pkg.ref,
                  link: url,
                });
                return (
                  <li
                    key={signer.stepId}
                    className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl px-3 py-2.5 ${state === "current" ? "bg-primary-50 ring-1 ring-primary-200" : "bg-ink-50/60"}`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" style={{ color: colorOf(signer.stepId) }} />
                    <span className="text-sm">
                      <span className="font-bold text-ink-900">{roleOf(signer.stepId)}</span>
                      <span className="text-ink-600"> — {signer.name}</span>
                    </span>
                    <span className="text-xs font-bold text-ink-500">
                      {state === "signed"
                        ? `${t.signed} · ${formatTime(signer.signedAt!, locale)}`
                        : state === "current"
                          ? t.waiting
                          : state === "declined"
                            ? `${t.declined}${doc.declinedNote ? ` — ${t.reason}: ${doc.declinedNote}` : ""}`
                            : t.next}
                    </span>
                    {!signer.signedAt && (doc.status === "active" || doc.status === "preparing") && (
                      <span className="ms-auto">
                        <LinkActions
                          url={url}
                          whatsappUrl={signer.phone ? whatsappHref(signer.phone, message) : `https://wa.me/?text=${encodeURIComponent(message)}`}
                          labels={linkLabels}
                          highlight={state === "current"}
                        />
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CancelCopyButton({ pkgId, docId, locale, label }: { pkgId: string; docId: string; locale: Locale; label: string }) {
  return (
    <form action={cancelCopyAction}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={pkgId} />
      <input type="hidden" name="doc" value={docId} />
      <button type="submit" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-accent-800 hover:bg-accent-50">
        <XCircle className="h-3.5 w-3.5" /> {label}
      </button>
    </form>
  );
}

function TemplatesTab({
  templates,
  packages,
  locale,
  t,
  canUpload,
}: {
  templates: EsignTemplate[];
  packages: EsignPackage[];
  locale: Locale;
  t: EsignText;
  canUpload: boolean;
}) {
  return (
    <div className="mt-6 space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card border-2 border-primary-200 p-6">
          <h2 className="flex flex-wrap items-center gap-2 font-bold text-ink-900">
            <FilePlus2 className="h-5 w-5 text-primary-600" /> {t.newDocument}
            <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs text-primary-800">{t.recommended}</span>
          </h2>
          <p className="mt-1 text-sm text-ink-500">{t.newDocumentHint}</p>
          <form action={createDocumentTemplateAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <input type="hidden" name="locale" value={locale} />
            <label className="block flex-1">
              <span className="label">{t.templateName}</span>
              <input name="name" required maxLength={120} placeholder={t.documentNamePh} className="input" />
            </label>
            <SubmitButton label={t.createDocument} savedLabel={t.saved} />
          </form>
        </section>
        <section className="card p-6">
          <h2 className="flex items-center gap-2 font-bold text-ink-900">
            <FileUp className="h-5 w-5 text-primary-600" /> {t.uploadPdfOption}
          </h2>
          <p className="mt-1 text-sm text-ink-500">{t.uploadPdfHint}</p>
          <div className="mt-4">
            <TemplateUpload locale={locale} disabled={!canUpload} />
          </div>
        </section>
      </div>
      {templates.length === 0 ? (
        <p className="card p-6 text-ink-500">{t.noTemplates}</p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {templates.map((tpl) => {
            const ready = isReady(tpl);
            const used = packages.some((p) => p.templateId === tpl.id);
            return (
              <li key={tpl.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-bold text-ink-950">
                      <span className="truncate">{tpl.name}</span>
                      <span className="flex-shrink-0 rounded bg-ink-100 px-1.5 py-0.5 text-[0.65rem] font-bold text-ink-600">
                        {isDocumentTemplate(tpl) ? t.typeDocument : t.typePdf}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-ink-500">
                      {isDocumentTemplate(tpl)
                        ? `${tpl.steps.length} ${t.stepsCount} · ${(tpl.variables ?? []).length} ${t.varsCount}`
                        : `${tpl.pages.length} ${t.pagesCount} · ${tpl.steps.length} ${t.stepsCount} · ${tpl.fields.length} ${t.boxesCount}`}
                    </p>
                    {tpl.steps.length > 0 && (
                      <p className="mt-2 flex flex-wrap items-center gap-1 text-xs font-bold">
                        {tpl.steps.map((s, i) => (
                          <span key={s.id} className="rounded-full px-2 py-0.5 text-white" style={{ background: STEP_COLORS[i % STEP_COLORS.length] }}>
                            {i + 1}. {s.role}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                  {!ready && <span className="rounded-full bg-accent-100 px-2.5 py-1 text-xs font-bold text-accent-800">{t.notReady}</span>}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link href={localePath(locale, `/admin/esign?template=${tpl.id}`)} className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-3 py-1.5 text-xs font-bold text-white">
                    <Pencil className="h-3.5 w-3.5" /> {t.edit}
                  </Link>
                  {ready && (
                    <Link href={localePath(locale, `/admin/esign?new=1&from=${tpl.id}`)} className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-800">
                      <Plus className="h-3.5 w-3.5" /> {t.newPackage}
                    </Link>
                  )}
                  <form action={duplicateTemplateAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={tpl.id} />
                    <button type="submit" className="inline-flex items-center gap-1.5 rounded-full bg-ink-50 px-3 py-1.5 text-xs font-bold text-ink-700 hover:bg-ink-100">
                      <Copy className="h-3.5 w-3.5" /> {t.duplicate}
                    </button>
                  </form>
                  {!used && <DeleteButton action={deleteTemplateAction} id={tpl.id} locale={locale} label={t.deleteTemplate} confirmText={`${t.deleteTemplate}?`} />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SettingsTab({
  footer,
  folders,
  contacts,
  message,
  stampUrl,
  signatureUrls,
  locale,
  t,
}: {
  footer?: string;
  folders: { parent?: string; parentName?: string };
  contacts: EsignContact[];
  message?: string;
  stampUrl?: string;
  signatureUrls: Record<string, string>;
  locale: Locale;
  t: EsignText;
}) {
  return (
    <div className="mt-6 grid gap-4 xl:grid-cols-2">
      <section className="card p-6 xl:col-span-2">
        <h2 className="flex items-center gap-2 font-bold text-ink-900">
          <MessageSquareText className="h-5 w-5 text-primary-600" /> {t.messageDefaultTitle}
        </h2>
        <p className="mt-1 text-sm text-ink-500">
          {t.messageDefaultHint} {t.messageHint}
        </p>
        <form action={setMessageTemplateAction} className="mt-4 space-y-3">
          <input type="hidden" name="locale" value={locale} />
          <MessageEditor locale={locale} initial={message} />
          <SubmitButton label={t.saveMessage} savedLabel={t.saved} />
        </form>
      </section>
      <section className="card p-6">
        <h2 className="flex items-center gap-2 font-bold text-ink-900">
          <FolderOpen className="h-5 w-5 text-primary-600" /> {t.folderTitle}
        </h2>
        <p className="mt-1 text-sm text-ink-500">{t.folderHint}</p>
        {folders.parent && (
          <p className="mt-3 rounded-lg bg-primary-50 px-3 py-2 text-sm">
            <span className="font-bold text-ink-900">{t.folderLinked}:</span>{" "}
            <a href={`https://drive.google.com/drive/folders/${folders.parent}`} target="_blank" rel="noopener noreferrer" className="font-bold text-primary-700 underline">
              {folders.parentName || folders.parent}
            </a>
          </p>
        )}
        <form action={setEsignFolderAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="locale" value={locale} />
          <label className="block flex-1">
            <span className="label">{t.folderLink}</span>
            <input name="folder" required dir="ltr" placeholder="https://drive.google.com/drive/folders/…" className="input" />
          </label>
          <SubmitButton label={t.saveFolder} savedLabel={t.saved} />
        </form>
      </section>

      <section className="card p-6">
        <h2 className="flex items-center gap-2 font-bold text-ink-900">
          <FileText className="h-5 w-5 text-primary-600" /> {t.footerTitle}
        </h2>
        <p className="mt-1 text-sm text-ink-500">{t.footerHint}</p>
        <form action={setLetterheadFooterAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="locale" value={locale} />
          <input name="footer" defaultValue={footer || DEFAULT_LETTERHEAD_FOOTER} maxLength={200} aria-label={t.footerTitle} className="input flex-1" />
          <SubmitButton label={t.saveContact} savedLabel={t.saved} />
        </form>
      </section>

      <section className="card p-6">
        <h2 className="flex items-center gap-2 font-bold text-ink-900">
          <Stamp className="h-5 w-5 text-primary-600" /> {t.stampTitle}
        </h2>
        <p className="mt-1 text-sm text-ink-500">{t.stampHint}</p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {stampUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={stampUrl} alt={t.stampTitle} className="h-28 w-28 rounded-xl border border-ink-100 bg-[repeating-conic-gradient(#f1f5f9_0_25%,#fff_0_50%)] bg-[length:16px_16px] object-contain p-2" />
          ) : (
            <p className="text-sm text-ink-400">{t.noStamp}</p>
          )}
          <form action={uploadStampAction} encType="multipart/form-data" className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="locale" value={locale} />
            <input
              type="file"
              name="stamp"
              required
              accept="image/png,image/jpeg,image/webp"
              aria-label={t.uploadStamp}
              className="max-w-[16rem] text-sm file:me-3 file:rounded-full file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-primary-700"
            />
            <SubmitButton label={stampUrl ? t.replaceStamp : t.uploadStamp} savedLabel={t.saved} />
          </form>
          {stampUrl && <DeleteButton action={deleteStampAction} id="stamp" locale={locale} label={t.deleteStamp} confirmText={`${t.deleteStamp}?`} />}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="flex items-center gap-2 font-bold text-ink-900">
          <UserPlus className="h-5 w-5 text-primary-600" /> {t.contactsTitle}
        </h2>
        <p className="mt-1 text-sm text-ink-500">
          {t.contactsHint} {t.savedSignatureHint}
        </p>
        {contacts.length === 0 ? (
          <p className="mt-3 text-sm text-ink-400">{t.noContacts}</p>
        ) : (
          <ul className="mt-3 divide-y divide-ink-100">
            {contacts.map((c) => (
              <li key={c.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm">
                    <span className="font-bold text-ink-900">{c.name}</span>
                    {c.title && <span className="text-ink-500"> — {c.title}</span>}
                    {c.phone && (
                      <>
                        <span className="text-ink-300"> · </span>
                        <span className="text-ink-400" dir="ltr">
                          {c.phone}
                        </span>
                      </>
                    )}
                  </span>
                  <DeleteButton action={deleteEsignContactAction} id={c.id} locale={locale} label="" confirmText={`${c.name}?`} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {c.signatureSavedAt ? (
                    <span className="inline-flex items-center gap-2 rounded-xl bg-primary-50 py-1 pe-1 ps-2 text-xs font-bold text-primary-800">
                      {signatureUrls[c.id] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={signatureUrls[c.id]}
                          alt={t.savedSignature}
                          className="h-10 w-auto max-w-[8rem] rounded bg-[repeating-conic-gradient(#f1f5f9_0_25%,#fff_0_50%)] bg-[length:10px_10px] object-contain px-1"
                        />
                      )}
                      <span>
                        {t.savedSignature}
                        <span className="block font-normal text-primary-700">{c.signatureSource === "panel" ? t.sigByPanel : t.sigBySelf}</span>
                      </span>
                      <DeleteButton action={deleteContactSignatureAction} id={c.id} locale={locale} label="" confirmText={`${t.deleteSavedSignature}: ${c.name}?`} />
                    </span>
                  ) : null}
                  <details className="group">
                    <summary className="cursor-pointer list-none rounded-full bg-ink-50 px-3 py-1.5 text-xs font-bold text-ink-700 hover:bg-ink-100">
                      {c.signatureSavedAt ? t.sigReplace : t.sigUpload}
                    </summary>
                    <form action={uploadContactSignatureAction} className="mt-2 space-y-2 rounded-xl border border-ink-100 p-3">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={c.id} />
                      <p className="text-xs text-ink-500">{t.sigUploadHint}</p>
                      <input
                        type="file"
                        name="signature"
                        required
                        accept="image/png,image/jpeg,image/webp"
                        aria-label={`${t.sigUpload}: ${c.name}`}
                        className="max-w-full text-sm file:me-3 file:rounded-full file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-primary-700"
                      />
                      <SubmitButton label={t.sigUpload} savedLabel={t.saved} />
                    </form>
                  </details>
                  <details>
                    <summary className="cursor-pointer list-none rounded-full bg-ink-50 px-3 py-1.5 text-xs font-bold text-ink-700 hover:bg-ink-100">
                      {t.editContact}
                    </summary>
                    <form action={updateEsignContactAction} className="mt-2 grid gap-2 rounded-xl border border-ink-100 p-3 sm:grid-cols-3">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={c.id} />
                      <input name="name" required defaultValue={c.name} aria-label={t.contactName} className="input" />
                      <input name="title" defaultValue={c.title ?? ""} placeholder={t.contactTitle} aria-label={t.contactTitle} className="input" />
                      <input name="phone" defaultValue={c.phone ?? ""} placeholder={t.contactPhone} aria-label={t.contactPhone} dir="ltr" inputMode="tel" className="input" />
                      <div className="sm:col-span-3">
                        <SubmitButton label={t.saveContact} savedLabel={t.saved} />
                      </div>
                    </form>
                  </details>
                </div>
              </li>
            ))}
          </ul>
        )}
        <form action={addEsignContactAction} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="locale" value={locale} />
          <input name="name" required placeholder={t.contactName} aria-label={t.contactName} className="input" />
          <input name="title" placeholder={t.contactTitle} aria-label={t.contactTitle} className="input" />
          <input name="phone" placeholder={t.contactPhone} aria-label={t.contactPhone} dir="ltr" inputMode="tel" className="input" />
          <label className="block sm:col-span-3">
            <span className="label">{t.optionalSignature}</span>
            <input
              type="file"
              name="signature"
              accept="image/png,image/jpeg,image/webp"
              className="max-w-full text-sm file:me-3 file:rounded-full file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-primary-700"
            />
          </label>
          <div className="sm:col-span-3">
            <SubmitButton label={t.addContact} savedLabel={t.saved} />
          </div>
        </form>
      </section>
    </div>
  );
}
