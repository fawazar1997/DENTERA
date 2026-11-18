import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Ban,
  CheckCircle2,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  History,
  MessageCircle,
  Phone,
  Plus,
  Star,
  XCircle,
} from "lucide-react";
import { isLocale, defaultLocale, type Locale, localePath } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { requireAdminPage } from "@/lib/adminSession";
import { careersText, type CareersText } from "@/lib/careersText";
import {
  CAREER_STAGES,
  QUALIFICATIONS,
  SCFHS_STATUSES,
  experienceBand,
  matchApplication,
  readCareers,
  type CareerField,
  type CareersFile,
} from "@/lib/careers";
import { applicantRows, filterApplicants, queryString, readQuery, type ApplicantRow, type CareersQuery } from "@/lib/careersQuery";
import { driveHealth } from "@/lib/googleDrive";
import { whatsappHref, telHref } from "@/lib/phone";
import {
  addExclusionAction,
  addNoteAction,
  addTagAction,
  deleteApplicationAction,
  deleteCareerFieldAction,
  excludeAction,
  moveCareerFieldAction,
  removeExclusionAction,
  removeTagAction,
  saveCareerFieldAction,
  setCareersFolderAction,
  setCareersSettingsAction,
  setRatingAction,
  setStageAction,
  unexcludeAction,
} from "@/lib/careersAdminActions";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { ApplicantsTable } from "@/components/admin/careers/ApplicantsTable";
import { scoreStyle } from "@/components/admin/careers/scoreStyle";
import { FilePreview } from "@/components/admin/careers/FilePreview";
import { BarList, WeekColumns } from "@/components/admin/careers/BarList";

export const dynamic = "force-dynamic";

type Tab = "applicants" | "analytics" | "exclusions" | "settings";

function formatTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", {
    timeZone: "Asia/Riyadh",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default async function AdminCareersPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: Record<string, string | undefined>;
}) {
  await requireAdminPage(params.locale, "/careers");
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = getDictionary(locale);
  const t = careersText(locale);
  const [store, health] = await Promise.all([readCareers(), driveHealth()]);
  const tabs: Tab[] = ["applicants", "analytics", "exclusions", "settings"];
  const tab: Tab = tabs.includes(searchParams.tab as Tab) ? (searchParams.tab as Tab) : "applicants";
  const rows = applicantRows(store);
  const applicant = searchParams.applicant ? rows.find((r) => r.id === searchParams.applicant) : undefined;

  const notice = searchParams.saved
    ? { ok: true, text: t.saved }
    : searchParams.error === "folder"
      ? { ok: false, text: ar(locale) ? "تعذّر الوصول إلى هذا المجلد. تأكد من الرابط ومن ربط Google Drive." : "Couldn't reach that folder. Check the link and the Google Drive connection." }
      : searchParams.error === "in-use"
        ? { ok: false, text: t.fieldInUse }
        : searchParams.error
          ? { ok: false, text: t.errors.server }
          : null;

  return (
    <div className="container-x py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-950">{dict.admin.careers}</h1>
          <p className="mt-1 max-w-3xl text-ink-500">{t.adminSubtitle}</p>
        </div>
        {store.settings.visible && (
          <a href={localePath(locale, "/careers")} target="_blank" rel="noopener noreferrer" className="btn-outline px-4 py-2">
            <ExternalLink className="h-4 w-4" /> {t.openPage}
          </a>
        )}
      </div>

      {health !== "ok" && <Alert text={t.driveDown} />}
      {health === "ok" && !store.folders.parent && tab !== "settings" && <Alert text={t.folderMissing} href={localePath(locale, "/admin/careers?tab=settings")} />}
      {!store.settings.visible && tab !== "settings" && <Alert text={t.hiddenNotice} href={localePath(locale, "/admin/careers?tab=settings")} soft />}
      {notice && (
        <p role={notice.ok ? "status" : "alert"} className={`mt-5 max-w-3xl rounded-lg px-4 py-2 text-sm font-bold text-ink-900 ${notice.ok ? "bg-primary-100" : "bg-accent-100"}`}>
          {notice.text}
        </p>
      )}

      {applicant ? (
        <ApplicantView app={applicant} field={store.fields.find((f) => f.id === applicant.fieldId)} locale={locale} t={t} />
      ) : (
        <>
          <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-ink-100" aria-label={dict.admin.careers}>
            {tabs.map((key) => (
              <Link
                key={key}
                href={localePath(locale, `/admin/careers${key === "applicants" ? "" : `?tab=${key}`}`)}
                aria-current={tab === key ? "page" : undefined}
                className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-bold transition ${
                  tab === key ? "border-primary-500 text-ink-950" : "border-transparent text-ink-500 hover:text-ink-900"
                }`}
              >
                {key === "applicants" ? t.tabApplicants : key === "analytics" ? t.tabAnalytics : key === "exclusions" ? t.tabExclusions : t.tabSettings}
                {key === "exclusions" && store.exclusions.length > 0 && <span className="ms-1.5 text-xs text-ink-400">({store.exclusions.length})</span>}
              </Link>
            ))}
          </nav>
          {tab === "applicants" && <ApplicantsTab rows={rows} store={store} query={readQuery(searchParams)} locale={locale} t={t} />}
          {tab === "analytics" && <AnalyticsTab rows={rows} store={store} locale={locale} t={t} />}
          {tab === "exclusions" && <ExclusionsTab store={store} locale={locale} t={t} />}
          {tab === "settings" && <SettingsTab store={store} locale={locale} t={t} />}
        </>
      )}
    </div>
  );
}

const ar = (locale: Locale) => locale === "ar";

function Alert({ text, href, soft = false }: { text: string; href?: string; soft?: boolean }) {
  const body = (
    <>
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      {text}
    </>
  );
  const cls = `mt-5 flex max-w-3xl items-start gap-2 rounded-lg px-4 py-2 text-sm font-bold text-ink-900 ${soft ? "bg-sand-100" : "bg-accent-100"}`;
  return href ? (
    <Link href={href} className={`${cls} hover:underline`}>
      {body}
    </Link>
  ) : (
    <p role="alert" className={cls}>
      {body}
    </p>
  );
}

// --- Applicants list ---

function ApplicantsTab({ rows, store, query, locale, t }: { rows: ApplicantRow[]; store: CareersFile; query: CareersQuery; locale: Locale; t: CareersText }) {
  const shown = filterApplicants(rows, query);
  const nationalities = [...new Set(rows.map((r) => r.nationality))].sort();
  const tags = [...new Set(rows.flatMap((r) => r.tags))].sort();
  const qs = queryString(query);
  const name = (f: CareerField) => (ar(locale) ? f.nameAr : f.nameEn);
  const select = (key: keyof CareersQuery, all: string, options: [string, string][]) => (
    <select name={key} defaultValue={query[key] ?? ""} aria-label={all} className="input w-auto min-w-0 flex-1 py-2">
      <option value="">{all}</option>
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );

  return (
    <div className="mt-6 space-y-4">
      <form method="get" className="card space-y-3 p-4">
        <div className="flex flex-wrap gap-2">
          <input name="q" defaultValue={query.q} placeholder={t.search} aria-label={t.search} className="input min-w-[14rem] flex-[2] py-2" />
          {select("field", t.allFields, store.fields.map((f) => [f.id, name(f)]))}
          {select("stage", t.allStages, CAREER_STAGES.map((s) => [s, t.stages[s]]))}
          {select("sort", t.sortNewest, [
            ["score", t.sortScore],
            ["years", t.sortYears],
            ["rating", t.sortRating],
          ])}
        </div>
        <details open={Object.keys(query).some((k) => !["q", "field", "stage", "sort"].includes(k))}>
          <summary className="cursor-pointer text-xs font-bold text-primary-700">+ {ar(locale) ? "فلاتر أكثر" : "More filters"}</summary>
          <div className="mt-3 flex flex-wrap gap-2">
            <input name="city" defaultValue={query.city} placeholder={t.city} aria-label={t.city} className="input w-36 py-2" />
            {select("nationality", t.allNationalities, nationalities.map((n) => [n, n]))}
            {select("gender", t.allGenders, [
              ["male", t.male],
              ["female", t.female],
            ])}
            {select("qualification", t.allQualifications, QUALIFICATIONS.map((q) => [q, t.qualifications[q]]))}
            {select("scfhs", t.allScfhs, SCFHS_STATUSES.map((s) => [s, t.scfhsStatuses[s]]))}
            {select("match", t.allMatch, [
              ["ok", t.matchOk],
              ["fail", t.matchFail],
            ])}
            <input name="minYears" type="number" min={0} defaultValue={query.minYears} placeholder={t.minYears} aria-label={t.minYears} className="input w-28 py-2" />
            <input name="maxYears" type="number" min={0} defaultValue={query.maxYears} placeholder={t.maxYears} aria-label={t.maxYears} className="input w-24 py-2" />
            {select("minRating", t.minRating, [1, 2, 3, 4, 5].map((n) => [String(n), `${t.minRating} ${n}★`]))}
            {select("tag", t.tag, tags.map((g) => [g, g]))}
            <label className="flex items-center gap-1.5 text-xs text-ink-500">
              {t.from}
              <input name="from" type="date" defaultValue={query.from} className="input w-auto py-2" />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-ink-500">
              {t.to}
              <input name="to" type="date" defaultValue={query.to} className="input w-auto py-2" />
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input type="checkbox" name="excluded" value="1" defaultChecked={Boolean(query.excluded)} className="h-4 w-4 accent-primary-600" />
              {t.showExcluded}
            </label>
          </div>
        </details>
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" className="btn-primary px-5 py-2">
            {t.apply_}
          </button>
          {qs && (
            <Link href={localePath(locale, "/admin/careers")} className="text-sm font-bold text-ink-500 hover:text-ink-900">
              {t.reset}
            </Link>
          )}
          <span className="ms-auto text-sm font-bold text-ink-600">
            {shown.length} {t.results}
          </span>
          <a href={`/api/admin/careers/export${qs ? `?${qs}` : ""}`} className="inline-flex items-center gap-1.5 rounded-full bg-ink-50 px-3 py-1.5 text-xs font-bold text-ink-700 hover:bg-ink-100">
            <FileSpreadsheet className="h-4 w-4" /> {t.exportCsv}
          </a>
        </div>
      </form>

      {shown.length === 0 ? (
        <p className="card p-6 text-ink-500">{t.noApplicants}</p>
      ) : (
        <ApplicantsTable
          locale={locale}
          returnTo={qs ? `?${qs}` : ""}
          rows={shown.map((r) => ({
            id: r.id,
            ref: r.ref,
            name: r.name,
            field: ar(locale) ? r.fieldName.ar : r.fieldName.en,
            city: r.city,
            years: r.years,
            score: r.score,
            fails: r.fails.length,
            stage: r.stage,
            rating: r.rating,
            tags: r.tags,
            repeat: r.repeat,
            excluded: Boolean(r.excluded),
            autoExcluded: Boolean(r.excluded?.auto),
            createdAt: r.createdAt,
          }))}
        />
      )}
    </div>
  );
}

// --- One applicant ---

function ApplicantView({ app, field, locale, t }: { app: ApplicantRow; field?: CareerField; locale: Locale; t: CareersText }) {
  const Back = ar(locale) ? ArrowRight : ArrowLeft;
  const match = matchApplication(app, field);
  const hidden = (
    <>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={app.id} />
    </>
  );
  const items = [...match.items].sort((a, b) => Number(Boolean(b.required && !b.ok)) - Number(Boolean(a.required && !a.ok)));
  const rows = (pairs: [string, React.ReactNode][]) => (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      {pairs
        .filter(([, v]) => v !== undefined && v !== "" && v !== null)
        .map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs font-bold text-ink-400">{k}</dt>
            <dd className="mt-0.5 font-semibold text-ink-900" dir="auto">
              {v}
            </dd>
          </div>
        ))}
    </dl>
  );

  return (
    <div className="mt-4">
      <Link href={localePath(locale, "/admin/careers")} className="inline-flex items-center gap-1.5 text-sm font-bold text-primary-700">
        <Back className="h-4 w-4" /> {t.backToList}
      </Link>

      <section className="card mt-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-ink-400" dir="ltr">
              {app.ref}
            </p>
            <h2 className="mt-0.5 text-2xl font-extrabold text-ink-950">{app.name}</h2>
            <p className="mt-1 text-sm text-ink-500">
              {ar(locale) ? app.fieldName.ar : app.fieldName.en}
              {app.specialty ? ` — ${app.specialty}` : ""} · {t.appliedOn} {formatTime(app.createdAt, locale)}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {app.excluded && (
                <span className="inline-flex items-center gap-1 rounded-full bg-ink-900 px-2.5 py-1 text-xs font-bold text-white">
                  <Ban className="h-3.5 w-3.5" /> {app.excluded.auto ? t.autoExcluded : t.excludedBadge}: {app.excluded.reason}
                </span>
              )}
              {app.repeat && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sand-100 px-2.5 py-1 text-xs font-bold text-ink-700">
                  <History className="h-3.5 w-3.5" /> {t.repeat}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-2xl px-4 py-2 text-2xl font-extrabold ring-1 ${scoreStyle(match.score, match.fails.length)}`}>
              {match.score}%
              <span className="text-xs font-bold">{match.fails.length ? t.matchFail : t.matchOk}</span>
            </span>
            <a href={whatsappHref(app.mobile)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-3 py-2 text-xs font-bold text-white">
              <MessageCircle className="h-4 w-4" /> {t.whatsapp}
            </a>
            <a href={telHref(app.mobile)} className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-3 py-2 text-xs font-bold text-white">
              <Phone className="h-4 w-4" /> {t.call}
            </a>
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="card p-6">
            <h3 className="mb-4 font-bold text-ink-900">{t.personal}</h3>
            {rows([
              [t.gender, app.gender === "male" ? t.male : t.female],
              [t.nationality, app.nationality],
              [t.mobile, <span key="m" dir="ltr">{app.mobile}</span>],
              [t.email, app.email ? <a key="e" href={`mailto:${app.email}`} className="text-primary-700 underline" dir="ltr">{app.email}</a> : undefined],
              [t.city, app.city],
              [t.birthDate, app.birthDate],
            ])}
          </section>
          <section className="card p-6">
            <h3 className="mb-4 font-bold text-ink-900">{t.experience}</h3>
            {rows([
              [t.years, String(app.years)],
              [t.qualification, t.qualifications[app.qualification]],
              [t.university, app.university],
              [t.gradYear, app.gradYear ? String(app.gradYear) : undefined],
              [t.scfhs, app.scfhs !== "na" ? t.scfhsStatuses[app.scfhs] : undefined],
              [t.licenseNo, app.licenseNo],
              [t.languages, app.languages.join("، ")],
              [t.transfer, app.transfer ? (app.transfer === "yes" ? t.yes : t.no) : undefined],
              [t.linkedin, app.linkedin ? <a key="l" href={app.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary-700 underline" dir="ltr">LinkedIn</a> : undefined],
            ])}
            {app.note && <p className="mt-4 whitespace-pre-line rounded-xl bg-ink-50 p-4 text-sm leading-relaxed text-ink-700">{app.note}</p>}
          </section>
          <section className="card p-6">
            <h3 className="mb-4 font-bold text-ink-900">{t.attachments}</h3>
            <ul className="space-y-4">
              {(["cv", "certificates"] as const).map((kind) => {
                const file = app.files[kind];
                return (
                  <li key={kind} className="rounded-xl border border-ink-100 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-sm font-bold text-ink-900">
                        <FileText className="h-5 w-5 text-primary-600" />
                        {kind === "cv" ? t.cv : t.certificates}
                        {file && <span className="text-xs font-normal text-ink-400">{file.name}</span>}
                      </span>
                      {file?.driveFileId ? (
                        <span className="flex gap-2">
                          <a href={`/api/admin/careers/file/${app.id}/${kind}?download=1`} className="inline-flex items-center gap-1 rounded-full bg-ink-50 px-3 py-1.5 text-xs font-bold text-ink-700 hover:bg-ink-100">
                            <Download className="h-3.5 w-3.5" /> {t.download}
                          </a>
                          {file.link && (
                            <a href={file.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-800 hover:bg-primary-100">
                              <ExternalLink className="h-3.5 w-3.5" /> {t.openInDrive}
                            </a>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-ink-400">{t.noFile}</span>
                      )}
                    </div>
                    {file?.driveFileId && (
                      <FilePreview
                        url={`/api/admin/careers/file/${app.id}/${kind}`}
                        mimeType={file.mimeType}
                        startOpen={kind === "cv"}
                        labels={{ show: t.showFile, hide: t.hideFile, loading: t.loading, failed: t.loadFailed, page: t.page }}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <div className="space-y-4">
          <section className="card p-5">
            <h3 className="font-bold text-ink-900">{t.match}</h3>
            <ul className="mt-3 space-y-2">
              {items.map((item) => (
                <li key={item.key} className="flex items-center justify-between gap-2 text-sm">
                  <span className="inline-flex items-center gap-1.5">
                    {item.ok ? <CheckCircle2 className="h-4 w-4 text-primary-600" /> : <XCircle className="h-4 w-4 text-accent-700" />}
                    <span className="font-semibold text-ink-800">{t.matchItems[item.key]}</span>
                    {item.required && <span className="rounded bg-ink-100 px-1.5 text-[0.6rem] font-bold text-ink-500">{t.mustHave}</span>}
                  </span>
                  {item.max > 0 && (
                    <span className="text-xs tabular-nums text-ink-500">
                      {Math.round(item.points)}/{Math.round(item.max)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="card space-y-4 p-5">
            <form action={setStageAction} className="space-y-2">
              {hidden}
              <label className="block">
                <span className="label">{t.stage}</span>
                <select name="stage" defaultValue={app.stage} className="input">
                  {CAREER_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {t.stages[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label">{t.interviewAt}</span>
                <input type="datetime-local" name="interviewAt" defaultValue={app.interviewAt} className="input" />
              </label>
              <SubmitButton label={t.saveStage} savedLabel={t.saved} className="btn-primary w-full" />
            </form>

            <div>
              <span className="label">{t.rating}</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <form key={n} action={setRatingAction}>
                    {hidden}
                    <input type="hidden" name="rating" value={app.rating === n ? 0 : n} />
                    <button type="submit" aria-label={`${n}/5`} className="p-0.5">
                      <Star className={`h-6 w-6 ${n <= (app.rating ?? 0) ? "fill-accent-400 text-accent-400" : "text-ink-200 hover:text-accent-300"}`} />
                    </button>
                  </form>
                ))}
              </div>
            </div>

            <div>
              <span className="label">{t.tags}</span>
              <div className="flex flex-wrap gap-1.5">
                {app.tags.map((tag) => (
                  <form key={tag} action={removeTagAction}>
                    {hidden}
                    <input type="hidden" name="tag" value={tag} />
                    <button type="submit" className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-bold text-ink-700 hover:bg-accent-100" title="×">
                      {tag} ×
                    </button>
                  </form>
                ))}
              </div>
              <form action={addTagAction} className="mt-2 flex gap-2">
                {hidden}
                <input name="tag" required maxLength={30} placeholder={t.addTag} aria-label={t.addTag} className="input py-1.5" />
                <button type="submit" className="rounded-lg bg-ink-900 px-3 text-white" aria-label={t.addTag}>
                  <Plus className="h-4 w-4" />
                </button>
              </form>
            </div>
          </section>

          <section className="card p-5">
            <h3 className="font-bold text-ink-900">{t.notes}</h3>
            <ul className="mt-3 space-y-2">
              {app.notes.map((n, i) => (
                <li key={i} className="rounded-lg bg-ink-50 p-3 text-sm">
                  <p className="whitespace-pre-line text-ink-800">{n.text}</p>
                  <p className="mt-1 text-[0.7rem] text-ink-400">
                    {n.by} · {formatTime(n.at, locale)}
                  </p>
                </li>
              ))}
            </ul>
            <form action={addNoteAction} className="mt-3 space-y-2">
              {hidden}
              <textarea name="text" required rows={3} maxLength={2000} placeholder={t.notePh} aria-label={t.addNote} className="input" />
              <SubmitButton label={t.addNote} savedLabel={t.saved} className="btn-outline w-full" />
            </form>
          </section>

          <section className="card p-5">
            <h3 className="font-bold text-ink-900">{t.timeline}</h3>
            <ol className="mt-3 space-y-1.5 text-xs text-ink-600">
              <li>
                {t.stages.new} · {formatTime(app.createdAt, locale)}
              </li>
              {app.history.map((h, i) => (
                <li key={i}>
                  {t.stages[h.stage]} · {h.by} · {formatTime(h.at, locale)}
                </li>
              ))}
            </ol>
          </section>

          <section className="card space-y-3 p-5">
            {app.excluded ? (
              <form action={unexcludeAction}>
                {hidden}
                <SubmitButton label={t.unexclude} savedLabel={t.saved} className="btn-outline w-full" />
              </form>
            ) : (
              <details>
                <summary className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-bold text-accent-800">
                  <Ban className="h-4 w-4" /> {t.exclude}
                </summary>
                <form action={excludeAction} className="mt-3 space-y-2">
                  {hidden}
                  <p className="text-xs text-ink-500">{t.excludeHint}</p>
                  <input name="reason" required maxLength={300} placeholder={t.excludeReason} aria-label={t.excludeReason} className="input" />
                  <SubmitButton label={t.exclude} savedLabel={t.saved} className="w-full rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-bold text-white" />
                </form>
              </details>
            )}
            <DeleteButton action={deleteApplicationAction} id={app.id} locale={locale} label={t.deleteApplication} confirmText={t.confirmDelete} />
          </section>
        </div>
      </div>
    </div>
  );
}

// --- Analytics ---

function AnalyticsTab({ rows, store, locale, t }: { rows: ApplicantRow[]; store: CareersFile; locale: Locale; t: CareersText }) {
  const active = rows.filter((r) => !r.excluded);
  const listHref = (q: Record<string, string>) => localePath(locale, `/admin/careers?${new URLSearchParams(q)}`);
  const count = <K extends string>(items: ApplicantRow[], key: (r: ApplicantRow) => K) => {
    const m = new Map<K, number>();
    for (const r of items) m.set(key(r), (m.get(key(r)) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const weekAgo = Date.now() - 7 * 864e5;
  const avg = active.length ? Math.round(active.reduce((a, r) => a + r.score, 0) / active.length) : 0;
  const tiles: [string, string | number][] = [
    [t.total, rows.length],
    [t.newThisWeek, rows.filter((r) => Date.parse(r.createdAt) > weekAgo).length],
    [t.shortlisted, active.filter((r) => r.stage === "shortlist").length],
    [t.hired, active.filter((r) => r.stage === "hired").length],
    [t.excludedCount, rows.length - active.length],
    [t.avgScore, `${avg}%`],
  ];
  // The last 12 weeks, oldest first (week = 7 days back from today, Riyadh).
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const end = Date.now() - (11 - i) * 7 * 864e5;
    const start = end - 7 * 864e5;
    const label = new Date(start).toLocaleDateString("en-GB", { timeZone: "Asia/Riyadh", day: "numeric", month: "short" });
    return { label, value: rows.filter((r) => Date.parse(r.createdAt) > start && Date.parse(r.createdAt) <= end).length };
  });
  const fieldName = new Map(store.fields.map((f) => [f.id, ar(locale) ? f.nameAr : f.nameEn]));
  const bandOrder = ["0", "1–2", "3–5", "6–10", "11+"];
  const bandRange: Record<string, [string, string]> = { "0": ["0", "0"], "1–2": ["1", "2"], "3–5": ["3", "5"], "6–10": ["6", "10"], "11+": ["11", ""] };

  return (
    <div className="mt-6 space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {tiles.map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-xs font-bold text-ink-500">{label}</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-ink-950">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <BarList
          title={t.funnel}
          empty={t.noData}
          bars={CAREER_STAGES.map((s) => ({ label: t.stages[s], value: active.filter((r) => r.stage === s).length, href: listHref({ stage: s }) }))}
        />
        <WeekColumns title={t.perWeek} weeks={weeks} empty={t.noData} />
        <BarList
          title={t.byField}
          empty={t.noData}
          bars={count(active, (r) => r.fieldId).map(([id, n]) => ({ label: fieldName.get(id) ?? id, value: n, href: listHref({ field: id }) }))}
        />
        <BarList
          title={t.avgByField}
          empty={t.noData}
          max={100}
          bars={count(active, (r) => r.fieldId).map(([id]) => {
            const list = active.filter((r) => r.fieldId === id);
            const v = Math.round(list.reduce((a, r) => a + r.score, 0) / list.length);
            return { label: fieldName.get(id) ?? id, value: v, display: `${v}%`, href: listHref({ field: id, sort: "score" }) };
          })}
        />
        <BarList
          title={t.byCity}
          empty={t.noData}
          bars={count(active, (r) => r.city).slice(0, 10).map(([city, n]) => ({ label: city, value: n, href: listHref({ city }) }))}
        />
        <BarList
          title={t.byExperience}
          empty={t.noData}
          bars={bandOrder
            .map((b) => ({ b, n: active.filter((r) => experienceBand(r.years) === b).length }))
            .filter((x) => x.n)
            .map(({ b, n }) => ({
              // Numbers read left to right even in Arabic (1–2, not 2–1).
              label: `\u2066${b}\u2069`,
              value: n,
              href: listHref(Object.fromEntries(Object.entries({ minYears: bandRange[b][0], maxYears: bandRange[b][1] }).filter(([, v]) => v))),
            }))}
        />
        <BarList
          title={t.byQualification}
          empty={t.noData}
          bars={QUALIFICATIONS.map((q) => ({ label: t.qualifications[q], value: active.filter((r) => r.qualification === q).length, href: listHref({ qualification: q }) })).filter((b) => b.value)}
        />
        <BarList
          title={t.byNationality}
          empty={t.noData}
          bars={count(active, (r) => r.nationality).slice(0, 10).map(([n, v]) => ({ label: n, value: v, href: listHref({ nationality: n }) }))}
        />
        <BarList
          title={t.byScfhs}
          empty={t.noData}
          bars={SCFHS_STATUSES.filter((s) => s !== "na")
            .map((s) => ({ label: t.scfhsStatuses[s], value: active.filter((r) => r.scfhs === s).length, href: listHref({ scfhs: s }) }))
            .filter((b) => b.value)}
        />
      </div>
    </div>
  );
}

// --- Exclusion list ---

function ExclusionsTab({ store, locale, t }: { store: CareersFile; locale: Locale; t: CareersText }) {
  return (
    <div className="mt-6 grid gap-4 xl:grid-cols-3">
      <section className="card p-6 xl:col-span-2">
        <p className="text-sm text-ink-500">{t.exclusionsHint}</p>
        {store.exclusions.length === 0 ? (
          <p className="mt-4 text-sm text-ink-400">{t.noExclusions}</p>
        ) : (
          <ul className="mt-4 divide-y divide-ink-100">
            {[...store.exclusions].reverse().map((e) => (
              <li key={e.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="text-sm">
                  <p className="font-bold text-ink-950">{e.name}</p>
                  <p className="mt-0.5 text-xs text-ink-500" dir="ltr">
                    {[e.mobile, e.email].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-1 text-ink-700">{e.reason}</p>
                  <p className="mt-0.5 text-[0.7rem] text-ink-400">
                    {e.by} · {formatTime(e.at, locale)}
                  </p>
                </div>
                <DeleteButton action={removeExclusionAction} id={e.id} locale={locale} label={t.removeExclusion} confirmText={`${t.removeExclusion}: ${e.name}?`} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="card p-6">
        <h3 className="font-bold text-ink-900">{t.addExclusion}</h3>
        <form action={addExclusionAction} className="mt-4 space-y-3">
          <input type="hidden" name="locale" value={locale} />
          <input name="name" placeholder={t.name} aria-label={t.name} className="input" />
          <input name="mobile" placeholder={t.mobile} aria-label={t.mobile} dir="ltr" inputMode="tel" className="input" />
          <input name="email" placeholder={t.email} aria-label={t.email} dir="ltr" type="email" className="input" />
          <input name="reason" required placeholder={t.excludeReason} aria-label={t.excludeReason} className="input" />
          <SubmitButton label={t.addExclusion} savedLabel={t.saved} />
        </form>
      </section>
    </div>
  );
}

// --- Settings ---

function SettingsTab({ store, locale, t }: { store: CareersFile; locale: Locale; t: CareersText }) {
  const hidden = <input type="hidden" name="locale" value={locale} />;
  return (
    <div className="mt-6 space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="card p-6">
          <h2 className="font-bold text-ink-900">{t.pageTitle}</h2>
          <form action={setCareersSettingsAction} className="mt-4 space-y-3">
            {hidden}
            <label className="flex items-start gap-2.5 text-sm font-bold text-ink-800">
              <input type="checkbox" name="visible" defaultChecked={store.settings.visible} className="mt-0.5 h-4 w-4 accent-primary-600" />
              <span>
                {t.visible}
                <span className="block text-xs font-normal text-ink-500">{t.visibleHint}</span>
              </span>
            </label>
            <label className="flex items-center gap-2.5 text-sm font-bold text-ink-800">
              <input type="checkbox" name="open" defaultChecked={store.settings.open} className="h-4 w-4 accent-primary-600" />
              {t.open}
            </label>
            <label className="block">
              <span className="label">{t.intro}</span>
              <textarea name="intro" rows={3} maxLength={600} defaultValue={store.settings.intro} className="input" />
            </label>
            <SubmitButton label={t.save} savedLabel={t.saved} />
          </form>
        </section>
        <section className="card p-6">
          <h2 className="flex items-center gap-2 font-bold text-ink-900">
            <FolderOpen className="h-5 w-5 text-primary-600" /> {t.folderTitle}
          </h2>
          <p className="mt-1 text-sm text-ink-500">{t.folderHint}</p>
          {store.folders.parent && (
            <p className="mt-3 rounded-lg bg-primary-50 px-3 py-2 text-sm">
              <span className="font-bold text-ink-900">{t.folderLinked}:</span>{" "}
              <a href={`https://drive.google.com/drive/folders/${store.folders.parent}`} target="_blank" rel="noopener noreferrer" className="font-bold text-primary-700 underline">
                {store.folders.parentName || store.folders.parent}
              </a>
            </p>
          )}
          <form action={setCareersFolderAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            {hidden}
            <label className="block flex-1">
              <span className="label">{t.folderLink}</span>
              <input name="folder" required dir="ltr" placeholder="https://drive.google.com/drive/folders/…" className="input" />
            </label>
            <SubmitButton label={t.saveFolder} savedLabel={t.saved} />
          </form>
        </section>
      </div>

      <section className="card p-6">
        <h2 className="font-bold text-ink-900">{t.fieldsTitle}</h2>
        <p className="mt-1 max-w-3xl text-sm text-ink-500">{t.fieldsHint}</p>
        <ul className="mt-4 space-y-2">
          {store.fields.map((f, i) => (
            <li key={f.id} id={`field-${f.id}`} className="rounded-xl border border-ink-100">
              <details>
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 px-4 py-3">
                  <span className="font-bold text-ink-950">{locale === "ar" ? f.nameAr : f.nameEn}</span>
                  {f.clinical && <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[0.65rem] font-bold text-primary-800">{t.clinical.split(" (")[0]}</span>}
                  {f.hidden && <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[0.65rem] font-bold text-ink-500">{t.hidden}</span>}
                  <span className="text-xs text-ink-400">
                    {[
                      f.criteria.required.minYears !== undefined ? `${t.reqMinYears}: ${f.criteria.required.minYears}` : "",
                      f.criteria.required.scfhs ? t.reqScfhs : "",
                      f.criteria.required.saudiOnly ? t.reqSaudi : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <span className="ms-auto flex gap-1">
                    {(["up", "down"] as const).map((dir) => (
                      <form key={dir} action={moveCareerFieldAction}>
                        {hidden}
                        <input type="hidden" name="id" value={f.id} />
                        <input type="hidden" name="dir" value={dir} />
                        <button
                          type="submit"
                          disabled={dir === "up" ? i === 0 : i === store.fields.length - 1}
                          className="rounded p-1 text-ink-400 hover:bg-ink-50 disabled:opacity-30"
                          aria-label={dir}
                        >
                          {dir === "up" ? "↑" : "↓"}
                        </button>
                      </form>
                    ))}
                  </span>
                </summary>
                <FieldForm field={f} locale={locale} t={t} />
              </details>
            </li>
          ))}
        </ul>
        <details className="mt-3 rounded-xl border border-dashed border-ink-200">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-bold text-primary-700">
            <Plus className="h-4 w-4" /> {t.addField}
          </summary>
          <FieldForm locale={locale} t={t} />
        </details>
      </section>
    </div>
  );
}

function FieldForm({ field, locale, t }: { field?: CareerField; locale: Locale; t: CareersText }) {
  const c = field?.criteria;
  const num = (name: string, label: string, value?: number) => (
    <label className="block">
      <span className="label text-xs">{label}</span>
      <input name={name} type="number" min={0} max={100} defaultValue={value} className="input py-2" />
    </label>
  );
  return (
    <div className="border-t border-ink-100 p-4">
      <form action={saveCareerFieldAction} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        {field && <input type="hidden" name="id" value={field.id} />}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">{t.nameAr}</span>
            <input name="nameAr" required defaultValue={field?.nameAr} className="input" />
          </label>
          <label className="block">
            <span className="label">{t.nameEn}</span>
            <input name="nameEn" dir="ltr" defaultValue={field?.nameEn} className="input" />
          </label>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-ink-700">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="clinical" defaultChecked={field?.clinical} className="h-4 w-4 accent-primary-600" /> {t.clinical}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="specialty" defaultChecked={field?.specialty} className="h-4 w-4 accent-primary-600" /> {t.hasSpecialty}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="hidden" defaultChecked={field?.hidden} className="h-4 w-4 accent-primary-600" /> {t.hidden}
          </label>
        </div>
        <fieldset className="rounded-xl bg-ink-50 p-4">
          <legend className="px-1 text-sm font-bold text-ink-900">{t.requiredTitle}</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {num("minYears", t.reqMinYears, c?.required.minYears)}
            <label className="block">
              <span className="label text-xs">{t.reqMinQualification}</span>
              <select name="minQualification" defaultValue={c?.required.minQualification ?? ""} className="input py-2">
                <option value="">{t.none}</option>
                {QUALIFICATIONS.map((q) => (
                  <option key={q} value={q}>
                    {t.qualifications[q]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label text-xs">{t.reqCities}</span>
              <input name="cities" defaultValue={c?.required.cities?.join("، ")} className="input py-2" />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-ink-700">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="reqScfhs" defaultChecked={c?.required.scfhs} className="h-4 w-4 accent-primary-600" /> {t.reqScfhs}
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="saudiOnly" defaultChecked={c?.required.saudiOnly} className="h-4 w-4 accent-primary-600" /> {t.reqSaudi}
            </label>
          </div>
        </fieldset>
        <fieldset className="rounded-xl bg-ink-50 p-4">
          <legend className="px-1 text-sm font-bold text-ink-900">{t.weightsTitle}</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {num("wExperience", t.wExperience, c?.weights.experience)}
            {num("wQualification", t.wQualification, c?.weights.qualification)}
            {num("wScfhs", t.wScfhs, c?.weights.scfhs)}
            {num("wCity", t.wCity, c?.weights.city)}
            {num("wLanguages", t.wLanguages, c?.weights.languages)}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {num("experienceCap", t.experienceCap, c?.experienceCap)}
            <label className="block">
              <span className="label text-xs">{t.preferredCities}</span>
              <input name="preferredCities" defaultValue={(c?.preferredCities ?? ["أبها", "خميس مشيط"]).join("، ")} className="input py-2" />
            </label>
            <label className="block">
              <span className="label text-xs">{t.preferredLanguages}</span>
              <input name="preferredLanguages" defaultValue={(c?.preferredLanguages ?? ["الإنجليزية"]).join("، ")} className="input py-2" />
            </label>
          </div>
        </fieldset>
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton label={field ? t.saveField : t.addField} savedLabel={t.saved} />
          {field && <DeleteButton action={deleteCareerFieldAction} id={field.id} locale={locale} label={t.deleteField} confirmText={`${t.deleteField}?`} />}
        </div>
      </form>
    </div>
  );
}
