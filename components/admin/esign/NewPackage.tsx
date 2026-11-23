"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Eye, FileUp, Loader2, Plus, Send, Trash2, Wand2 } from "lucide-react";
import { esignText } from "@/lib/esignText";
import { localePath, type Locale } from "@/lib/i18n";
import { readSpreadsheet } from "@/lib/spreadsheet";
import { foldArabic } from "@/lib/arabicSearch";
import {
  activatePackageAction,
  createPackageAction,
  finishCopyPagesAction,
  uploadCopyImagesAction,
  uploadCopyPageAction,
  type NewPackageInput,
} from "@/lib/esignActions";
import { MessageEditor } from "./MessageEditor";
import {
  DEFAULT_DOC_SETTINGS,
  DEFAULT_SIGN_MESSAGE,
  STEP_COLORS,
  isDocumentTemplate,
  templateVariables,
  textFieldsOf,
  type EsignContact,
  type EsignField,
  type EsignTemplate,
  type EsignVariable,
} from "@/lib/esignTypes";
import { sanitizeDocContent, type DocNode } from "@/lib/esignDoc";
import { autoVarName, detectOrder, displayValue, normalizeValue, riyadhToday } from "@/lib/esignValues";
import { PdfPages, boxStyle } from "@/components/esign/PdfPages";
import { renderTextPng } from "@/components/esign/renderTextPng";
import { TextBox } from "@/components/esign/TextBox";
import { DocPages } from "@/components/esign/document/DocPages";
import { documentBodyHtml, langOf, pageHtml, type DocStep } from "@/components/esign/document/renderDocument";
import { LOGO_PATH, PAGE_COUNT_LIMIT, measureDocument, renderPagePng, toDataUrl } from "@/components/esign/document/layout";

type StepChoice = { stepId: string; mode: "same" | "perCopy"; contactId: string; name: string; phone: string };
type Signer = { name: string; phone: string; contactId?: string };
type Row = { label: string; signers: Record<string, Signer>; values: Record<string, string> };

/** A new copy, with the template's default values filled in. */
const emptyRow = (vars: EsignVariable[] = []): Row => ({
  label: "",
  signers: {},
  values: Object.fromEntries(vars.filter((v) => !v.fixed && v.default).map((v) => [v.name, v.default!])),
});

export function NewPackage({
  templates,
  contacts,
  locale,
  initialTemplateId,
  defaultMessage,
  footer,
}: {
  templates: EsignTemplate[];
  contacts: EsignContact[];
  locale: Locale;
  initialTemplateId?: string;
  /** The saved default message (Settings). */
  defaultMessage?: string;
  /** The letterhead footer line (document templates). */
  footer: string;
  stampReady?: boolean;
}) {
  const t = esignText(locale);
  const ar = locale === "ar";
  const router = useRouter();
  const Back = ar ? ArrowRight : ArrowLeft;
  const [templateId, setTemplateId] = useState(initialTemplateId && templates.some((x) => x.id === initialTemplateId) ? initialTemplateId : templates[0]?.id ?? "");
  const template = templates.find((x) => x.id === templateId);
  const [title, setTitle] = useState("");
  const [choices, setChoices] = useState<StepChoice[]>(() => choicesFor(template));
  const [rows, setRows] = useState<Row[]>(() => [emptyRow(template ? templateVariables(template) : [])]);
  const [previewRow, setPreviewRow] = useState(0);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // Boxes whose value had to be made smaller (or was cut off) in the preview.
  const [tight, setTight] = useState<Record<string, "small" | "overflow">>({});
  // The request keeps its own copy of the message it was sent with.
  const [message, setMessage] = useState(defaultMessage?.trim() || DEFAULT_SIGN_MESSAGE);

  function choicesFor(tpl?: EsignTemplate): StepChoice[] {
    return (tpl?.steps ?? []).map((s) => {
      const contact = contacts.find((c) => c.id === s.defaultContactId);
      return {
        stepId: s.id,
        mode: s.defaultMode ?? "same",
        contactId: contact?.id ?? "",
        name: contact?.name ?? "",
        phone: contact?.phone ?? "",
      };
    });
  }

  const isDoc = Boolean(template && isDocumentTemplate(template));
  const variables = useMemo(() => (template ? templateVariables(template) : []), [template]);
  const fixedVars = variables.filter((v) => v.fixed);
  const labels = useMemo(() => variables.filter((v) => !v.fixed).map((v) => v.name), [variables]);
  const variableOf = (name: string) => variables.find((v) => v.name === name);
  const docSettings = { ...DEFAULT_DOC_SETTINGS, ...template?.settings };
  const lang = isDoc ? langOf(docSettings) : "ar";
  const contactByName = (name: string) => contacts.find((c) => c.name === name.trim());

  // A document template's content (loaded when it is chosen).
  const [content, setContent] = useState<DocNode | null>(null);
  const [contentError, setContentError] = useState(false);
  useEffect(() => {
    setContent(null);
    setContentError(false);
    if (!template || !isDocumentTemplate(template)) return;
    let alive = true;
    fetch(`/api/admin/esign/template/${template.id}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json) => {
        const doc = sanitizeDocContent(json);
        if (!alive) return;
        if (doc) setContent(doc);
        else setContentError(true);
      })
      .catch(() => alive && setContentError(true));
    return () => {
      alive = false;
    };
  }, [template]);

  /** A value's check: its stored form, and whether it could be read (dates, numbers). */
  function checkValue(name: string, raw: string) {
    return normalizeValue(raw, variableOf(name)?.type ?? "text");
  }
  const perCopySteps = choices.filter((c) => c.mode === "perCopy");
  const roleOf = (stepId: string) => template?.steps.find((s) => s.id === stepId)?.role ?? "";
  const colorOf = (stepId?: string) =>
    STEP_COLORS[Math.max(0, template?.steps.findIndex((s) => s.id === stepId) ?? 0) % STEP_COLORS.length];

  function setChoice(stepId: string, patch: Partial<StepChoice>) {
    setChoices((list) => list.map((c) => (c.stepId === stepId ? { ...c, ...patch } : c)));
  }

  function setRow(index: number, change: (row: Row) => Row) {
    setRows((list) => list.map((r, i) => (i === index ? change(r) : r)));
  }

  function signerOf(row: Row, stepId: string): Signer {
    const choice = choices.find((c) => c.stepId === stepId);
    if (!choice) return { name: "", phone: "" };
    return choice.mode === "same" ? { name: choice.name, phone: choice.phone } : row.signers[stepId] ?? { name: "", phone: "" };
  }

  function rowComplete(row: Row) {
    return labels.every((l) => row.values[l]?.trim() && checkValue(l, row.values[l]).ok) && choices.every((c) => signerOf(row, c.stepId).name.trim());
  }

  const invalidCount = rows.reduce((n, r) => n + labels.filter((l) => r.values[l]?.trim() && !checkValue(l, r.values[l]).ok).length, 0);

  async function importSheet(file: File) {
    setError("");
    setNotice("");
    try {
      const table = readSpreadsheet(new Uint8Array(await file.arrayBuffer()), file.name);
      const [head, ...body] = table;
      if (!head?.length) throw new Error();
      const col = (names: string[]) => head.findIndex((h) => names.some((n) => foldArabic(h) === foldArabic(n)));
      const first = perCopySteps[0];
      const nameCol = col(["الاسم", "اسم", "name", first ? roleOf(first.stepId) : "-"]);
      const phoneCol = col(["الجوال", "جوال", "رقم الجوال", "mobile", "phone"]);
      const varCols = labels.map((l) => [l, col([l])] as const);
      const lines = body.filter((cells) => cells.some((c) => String(c ?? "").trim()));
      // Dates: day/month or month/day, as the column's own dates show.
      const orders = Object.fromEntries(varCols.map(([l, c]) => [l, detectOrder(c >= 0 ? lines.map((cells) => String(cells[c] ?? "")) : [])]));
      const imported: Row[] = lines.map((cells) => {
        const row = emptyRow(variables);
        if (first && nameCol >= 0) {
          const name = String(cells[nameCol] ?? "").trim();
          row.signers[first.stepId] = { name, phone: phoneCol >= 0 ? String(cells[phoneCol] ?? "").trim() : "", contactId: contactByName(name)?.id };
        }
        for (const [label, c] of varCols) {
          const raw = c >= 0 ? String(cells[c] ?? "").trim() : "";
          if (!raw) continue;
          const normal = normalizeValue(raw, variableOf(label)?.type ?? "text", orders[label]);
          row.values[label] = normal.value;
        }
        return row;
      });
      if (!imported.length) throw new Error();
      setRows((list) => [...list.filter((r) => rowHasData(r)), ...imported]);
      setNotice(`${t.imported} ${imported.length} ${t.rows}`);
    } catch {
      setError(t.failed);
    }
  }

  const rowHasData = (r: Row) => Object.values(r.values).some((v) => v.trim()) || Object.values(r.signers).some((s) => s.name.trim());

  async function approve() {
    setError("");
    if (!template) return;
    if (!title.trim() || !rows.length || !rows.every(rowComplete) || choices.some((c) => c.mode === "same" && !c.name.trim())) {
      setError(t.incomplete);
      return;
    }
    setBusy(t.approving);
    try {
      const input: NewPackageInput = {
        templateId: template.id,
        title,
        message,
        steps: choices.map((c) => ({ stepId: c.stepId, mode: c.mode, name: c.name, phone: c.phone, contactId: c.contactId || undefined })),
        copies: rows.map((r) => ({ label: r.label, signers: r.signers, values: rowValues(r) })),
      };
      const created = await createPackageAction(input);
      if (!created.ok) throw new Error(created.error === "drive" ? t.driveDown : created.error === "folder" ? t.folderMissing : t.incomplete);
      const auto = { today: riyadhToday(new Date(created.createdAt)), ref: created.ref, title: title.trim() };
      if (isDoc) {
        if (!content) throw new Error(t.loadFailed);
        let logo: string;
        try {
          logo = await toDataUrl(LOGO_PATH);
        } catch {
          throw new Error(t.renderFailed);
        }
        for (const [i, docId] of created.documents.entries()) {
          setBusy(`${t.preparingPages} ${i + 1} / ${created.documents.length}`);
          const body = documentBodyHtml(content, { mode: "final", settings: docSettings, variables, values: rowValues(rows[i]), auto, steps: docSteps(rows[i]) });
          const layout = await measureDocument(body, docSettings);
          if (layout.pages.length > PAGE_COUNT_LIMIT) throw new Error(t.tooManyPages);
          for (const [p, slice] of layout.pages.entries()) {
            let png: Blob;
            try {
              png = await renderPagePng(
                pageHtml({ body, slice, index: p, count: layout.pages.length, settings: docSettings, footer, logoUrl: logo, pageLabel: { page: t.page, of: t.pageOf } })
              );
            } catch {
              throw new Error(t.renderFailed);
            }
            const form = new FormData();
            form.set("packageId", created.id);
            form.set("documentId", docId);
            form.set("index", String(p));
            form.set("page", png, `page-${p}.png`);
            const sent = await uploadCopyPageAction(form);
            if (!sent.ok) throw new Error(t.failed);
          }
          const finished = await finishCopyPagesAction({ packageId: created.id, documentId: docId, pageCount: layout.pages.length, fields: layout.fields as EsignField[] });
          if (!finished.ok) throw new Error(t.failed);
        }
      } else {
        const textFields = textFieldsOf(template);
        for (const [i, docId] of created.documents.entries()) {
          setBusy(`${t.preparingImages} ${i + 1} / ${created.documents.length}`);
          const row = rows[i];
          const images: Record<string, string> = {};
          for (const field of textFields) images[field.id] = await fieldImage(field, row, auto);
          const uploaded = await uploadCopyImagesAction({ packageId: created.id, documentId: docId, images });
          if (!uploaded.ok) throw new Error(t.failed);
        }
      }
      const activated = await activatePackageAction({ packageId: created.id });
      if (!activated.ok) throw new Error(t.failed);
      router.push(localePath(locale, `/admin/esign?package=${created.id}`));
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t.failed);
      setBusy("");
    }
  }

  /** A copy's values in their stored form (fixed ones from the template). */
  function rowValues(row: Row): Record<string, string> {
    const out: Record<string, string> = {};
    for (const v of variables) {
      const raw = v.fixed ? v.default ?? "" : row.values[v.name]?.trim() || v.default || "";
      out[v.name] = normalizeValue(raw, v.type).value;
    }
    return out;
  }

  /** The procedure with this copy's signers (document templates). */
  function docSteps(row: Row): DocStep[] {
    return (template?.steps ?? []).map((s, i) => ({ id: s.id, role: s.role, color: STEP_COLORS[i % STEP_COLORS.length], signer: signerOf(row, s.id).name.trim() }));
  }

  function fieldText(field: EsignField, row: Row, auto?: { today?: string; ref?: string; title?: string }): string {
    if (field.kind === "signerName") return signerOf(row, field.stepId ?? "").name.trim();
    if (field.auto) {
      const value = field.auto === "today" ? auto?.today ?? riyadhToday() : field.auto === "title" ? auto?.title ?? title.trim() : auto?.ref;
      return value || `[${autoVarName(field.auto)}]`;
    }
    const v = variableOf(field.label ?? "");
    const raw = v?.fixed ? v.default ?? "" : row.values[field.label ?? ""]?.trim() || v?.default || "";
    return displayValue(normalizeValue(raw, v?.type ?? field.varType ?? "text").value, v ?? field.varType, "ar");
  }

  function fieldImage(field: EsignField, row: Row, auto: { today: string; ref: string; title: string }): Promise<string> {
    const page = template!.pages[field.page];
    return renderTextPng({
      text: fieldText(field, row, auto),
      boxW: field.w * page.w,
      boxH: field.h * page.h,
      fontSize: field.fontSize,
      align: field.align,
      bold: field.kind === "signerName",
      font: field.font,
    }).then((r) => r.url);
  }

  if (!templates.length) {
    return <p className="card mt-6 p-6 text-ink-600">{t.notReadyHint}</p>;
  }

  const current = rows[Math.min(previewRow, rows.length - 1)] ?? emptyRow();

  return (
    <div className="mt-4 space-y-6">
      <Link href={localePath(locale, "/admin/esign")} className="inline-flex items-center gap-1.5 text-sm font-bold text-primary-700">
        <Back className="h-4 w-4" /> {t.backToPackages}
      </Link>

      <section className="card grid gap-4 p-6 sm:grid-cols-2">
        <label className="block">
          <span className="label">{t.chooseTemplate}</span>
          <select
            value={templateId}
            onChange={(e) => {
              const next = templates.find((x) => x.id === e.target.value);
              setTemplateId(e.target.value);
              setChoices(choicesFor(next));
              setRows([emptyRow(next ? templateVariables(next) : [])]);
              setPreviewRow(0);
            }}
            className="input"
          >
            {templates.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">{t.packageTitle}</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.packageTitlePh} maxLength={120} className="input" />
        </label>
      </section>

      {template && (
        <section className="card p-6">
          <h2 className="font-bold text-ink-900">{t.stepsTitle}</h2>
          <ol className="mt-4 space-y-3">
            {template.steps.map((step, i) => {
              const choice = choices.find((c) => c.stepId === step.id)!;
              return (
                <li key={step.id} className="rounded-xl border border-ink-100 p-4" style={{ borderInlineStartWidth: 4, borderInlineStartColor: colorOf(step.id) }}>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: colorOf(step.id) }}>
                      {i + 1}
                    </span>
                    <span className="font-bold text-ink-900">{step.role}</span>
                    <div className="ms-auto inline-flex rounded-full bg-ink-50 p-1 text-xs font-bold">
                      {(["perCopy", "same"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setChoice(step.id, { mode })}
                          className={`rounded-full px-3 py-1.5 transition ${choice.mode === mode ? "bg-white text-ink-900 shadow" : "text-ink-500"}`}
                        >
                          {mode === "same" ? t.modeSame : t.modePerCopy}
                        </button>
                      ))}
                    </div>
                  </div>
                  {choice.mode === "same" && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      {contacts.length > 0 && (
                        <select
                          value={choice.contactId}
                          onChange={(e) => {
                            const c = contacts.find((x) => x.id === e.target.value);
                            setChoice(step.id, { contactId: e.target.value, name: c?.name ?? "", phone: c?.phone ?? "" });
                          }}
                          aria-label={t.pickContact}
                          className="input"
                        >
                          <option value="">{t.pickContact}</option>
                          {contacts.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                              {c.title ? ` — ${c.title}` : ""}
                            </option>
                          ))}
                        </select>
                      )}
                      <input
                        value={choice.name}
                        onChange={(e) => setChoice(step.id, { name: e.target.value, contactId: "" })}
                        placeholder={t.signerName}
                        aria-label={`${step.role} — ${t.signerName}`}
                        className="input"
                      />
                      <input
                        value={choice.phone}
                        onChange={(e) => setChoice(step.id, { phone: e.target.value, contactId: "" })}
                        placeholder={t.signerPhone}
                        aria-label={`${step.role} — ${t.signerPhone}`}
                        inputMode="tel"
                        dir="ltr"
                        className="input"
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {template && (
        <section className="card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-ink-900">{t.copiesTitle}</h2>
              <p className="mt-1 text-sm text-ink-500">{t.copiesHint}</p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-ink-50 px-3 py-2 text-xs font-bold text-ink-700 hover:bg-ink-100" title={t.importHint}>
              <FileUp className="h-4 w-4" />
              {t.importSheet}
              <input
                type="file"
                accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importSheet(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {notice && <p className="mt-3 rounded-lg bg-primary-100 px-3 py-2 text-sm font-bold text-ink-900">{notice}</p>}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[36rem] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-start text-xs text-ink-500">
                  <th className="px-2 pb-2 text-start font-bold">#</th>
                  {perCopySteps.map((c) => (
                    <th key={c.stepId} colSpan={2} className="px-2 pb-2 text-start font-bold" style={{ color: colorOf(c.stepId) }}>
                      {roleOf(c.stepId)} — {t.signerName} / {t.signerPhone}
                    </th>
                  ))}
                  {labels.map((label) => (
                    <th key={label} className="px-2 pb-2 text-start font-bold">
                      <span className="inline-flex items-center gap-1">
                        {label}
                        <button
                          type="button"
                          title={t.fillAll}
                          aria-label={`${t.fillAll}: ${label}`}
                          onClick={() => {
                            const value = window.prompt(`${t.fillAllPrompt} ${label}`, rows[0]?.values[label] ?? "");
                            if (value !== null) setRows((list) => list.map((r) => ({ ...r, values: { ...r.values, [label]: value } })));
                          }}
                          className="rounded p-0.5 text-primary-700 hover:bg-primary-50"
                        >
                          <Wand2 className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    </th>
                  ))}
                  {perCopySteps.length === 0 && <th className="px-2 pb-2 text-start font-bold">{t.copyLabel}</th>}
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className={i === previewRow ? "bg-primary-50/60" : ""}>
                    <td className="px-2 py-1.5 text-xs font-bold text-ink-400">{i + 1}</td>
                    {perCopySteps.map((c) => (
                      <PerCopyCells
                        key={c.stepId}
                        contactLabel={t.contactLinked}
                        linked={Boolean(row.signers[c.stepId]?.contactId)}
                        value={row.signers[c.stepId] ?? { name: "", phone: "" }}
                        labels={{ name: `${roleOf(c.stepId)} ${i + 1} — ${t.signerName}`, phone: `${roleOf(c.stepId)} ${i + 1} — ${t.signerPhone}` }}
                        onChange={(v) => {
                          const contact = contactByName(v.name);
                          const signer = { ...v, contactId: contact?.id, phone: contact && !v.phone ? contact.phone ?? "" : v.phone };
                          setRow(i, (r) => ({ ...r, signers: { ...r.signers, [c.stepId]: signer } }));
                        }}
                      />
                    ))}
                    {labels.map((label) => {
                      const v = variableOf(label);
                      const type = v?.type ?? "text";
                      const value = row.values[label] ?? "";
                      const check = checkValue(label, value);
                      const shown = value.trim() && check.ok && type !== "text" ? displayValue(check.value, v, lang) : "";
                      return (
                        <td key={label} className="px-1 py-1.5 align-top">
                          <input
                            value={value}
                            onChange={(e) => setRow(i, (r) => ({ ...r, values: { ...r.values, [label]: e.target.value } }))}
                            onBlur={() => {
                              if (value.trim() && check.ok && check.value !== value) setRow(i, (r) => ({ ...r, values: { ...r.values, [label]: check.value } }));
                            }}
                            placeholder={type === "date" ? t.dateHint : undefined}
                            inputMode={type === "number" || type === "amount" ? "decimal" : undefined}
                            dir={type === "text" ? undefined : "ltr"}
                            aria-label={`${label} ${i + 1}`}
                            aria-invalid={!check.ok}
                            title={check.ok ? shown || undefined : t.invalidValue}
                            className={`input min-w-[8rem] px-2 py-1.5 ${
                              !check.ok ? "border-accent-500 bg-accent-50" : value.trim() ? "" : "border-accent-300"
                            }`}
                          />
                          {type === "amount" && shown && <span className="mt-0.5 block max-w-[12rem] truncate text-[0.7rem] text-ink-500">{shown}</span>}
                        </td>
                      );
                    })}
                    {perCopySteps.length === 0 && (
                      <td className="px-1 py-1.5">
                        <input
                          value={row.label}
                          onChange={(e) => setRow(i, (r) => ({ ...r, label: e.target.value }))}
                          aria-label={`${t.copyLabel} ${i + 1}`}
                          className="input min-w-[8rem] px-2 py-1.5"
                        />
                      </td>
                    )}
                    <td className="whitespace-nowrap px-1 py-1.5">
                      <button type="button" onClick={() => setPreviewRow(i)} title={t.previewCopy} aria-label={`${t.previewCopy} ${i + 1}`} className="rounded-lg p-1.5 text-primary-700 hover:bg-primary-50">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={rows.length === 1}
                        onClick={() => {
                          setRows((list) => list.filter((_, k) => k !== i));
                          setPreviewRow((p) => Math.max(0, p > i ? p - 1 : Math.min(p, rows.length - 2)));
                        }}
                        title={t.removeCopy}
                        aria-label={`${t.removeCopy} ${i + 1}`}
                        className="rounded-lg p-1.5 text-accent-800 hover:bg-accent-50 disabled:opacity-30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {invalidCount > 0 && (
            <p role="alert" className="mt-3 rounded-lg bg-accent-50 px-3 py-2 text-sm font-bold text-accent-800">
              {t.invalidCells}
            </p>
          )}
          {fixedVars.length > 0 && (
            <p className="mt-3 text-xs text-ink-500">
              <span className="font-bold">{t.fixedNote}:</span>{" "}
              {fixedVars.map((v) => `${v.name}: ${displayValue(v.default ?? "", v, lang)}`).join(" · ")}
            </p>
          )}
          <button type="button" onClick={() => setRows((list) => [...list, emptyRow(variables)])} className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-primary-700">
            <Plus className="h-4 w-4" /> {t.addCopy}
          </button>
        </section>
      )}

      {template && (
        <section className="card p-6">
          <h2 className="font-bold text-ink-900">
            {t.previewCopy} {Math.min(previewRow, rows.length - 1) + 1}
          </h2>
          {Object.keys(tight).length > 0 && (
            <p role="status" className="mt-2 rounded-lg bg-accent-50 px-3 py-2 text-sm text-ink-800">
              {t.textLongHint}
            </p>
          )}
          {isDoc ? (
            <div className="mx-auto mt-4 max-w-3xl rounded-2xl bg-ink-100/70 p-3 sm:p-5">
              {contentError ? (
                <p className="py-10 text-center text-sm font-bold text-accent-800">{t.loadFailed}</p>
              ) : content ? (
                <DocPages
                  body={documentBodyHtml(content, {
                    mode: "preview",
                    settings: docSettings,
                    variables,
                    values: rowValues(current),
                    auto: { today: riyadhToday(), title: title.trim() },
                    steps: docSteps(current),
                    labels: { signature: t.sigStep, stamp: t.stampOf, nameOf: t.nameOfRole },
                  })}
                  settings={docSettings}
                  footer={footer}
                  labels={{ page: t.page, of: t.pageOf, measuring: t.measuring }}
                />
              ) : (
                <p className="py-10 text-center text-sm text-ink-500">{t.loading}</p>
              )}
            </div>
          ) : (
          <div className="mx-auto mt-4 max-w-3xl">
            <PdfPages
              url={`/api/admin/esign/template/${template.id}`}
              labels={{ loading: t.loading, failed: t.loadFailed, page: t.page }}
              overlay={(page) => (
                <div className="absolute inset-0" style={{ containerType: "inline-size" }}>
                  {template.fields
                    .filter((f) => f.page === page)
                    .map((f) => {
                      if (f.kind === "stamp") {
                        const color = colorOf(f.stepId);
                        return (
                          <div key={f.id} style={{ ...boxStyle(f), borderColor: color, color }} className="flex items-center justify-center rounded-full border-2 border-dashed text-[0.6rem] font-bold sm:text-xs">
                            {t.stampOf}
                          </div>
                        );
                      }
                      if (f.kind === "signature") {
                        const color = colorOf(f.stepId);
                        return (
                          <div key={f.id} style={{ ...boxStyle(f), borderColor: color, color, background: `${color}14` }} className="flex items-center justify-center rounded border-2 border-dashed text-[0.6rem] font-bold sm:text-xs">
                            {t.signatureOf}: {signerOf(current, f.stepId ?? "").name || roleOf(f.stepId ?? "")}
                          </div>
                        );
                      }
                      const text = fieldText(f, current);
                      const size = template.pages[page] ?? { w: 595, h: 842 };
                      const fit = text ? tight[f.id] : undefined;
                      return (
                        <div
                          key={f.id}
                          style={boxStyle(f)}
                          title={fit ? (fit === "overflow" ? t.textTooLong : t.textShrunk) : undefined}
                          className={`${text ? "" : "rounded bg-accent-100/70"} ${fit ? "rounded outline outline-2 outline-offset-1 outline-accent-500" : ""}`}
                        >
                          <TextBox
                            text={text}
                            boxW={f.w * size.w}
                            boxH={f.h * size.h}
                            fontSize={f.fontSize}
                            align={f.align}
                            bold={f.kind === "signerName"}
                            font={f.font}
                            onFit={(r) =>
                              setTight((prev) => {
                                const state = r.overflow ? "overflow" : r.scale < 0.85 ? "small" : undefined;
                                if (prev[f.id] === state) return prev;
                                const next = { ...prev };
                                if (state) next[f.id] = state;
                                else delete next[f.id];
                                return next;
                              })
                            }
                          />
                        </div>
                      );
                    })}
                </div>
              )}
            />
          </div>
          )}
        </section>
      )}

      <datalist id="esign-contacts">
        {contacts.map((c) => (
          <option key={c.id} value={c.name}>
            {c.title ?? ""}
          </option>
        ))}
      </datalist>

      {template && (
        <section className="card p-6">
          <h2 className="font-bold text-ink-900">{t.messageTitle}</h2>
          <p className="mt-1 text-sm text-ink-500">{t.messageHint}</p>
          <div className="mt-4">
            <MessageEditor
              locale={locale}
              initial={defaultMessage}
              onChange={setMessage}
              sample={{
                name: template.steps[0] ? signerOf(rows[0] ?? emptyRow(), template.steps[0].id).name : undefined,
                role: template.steps[0]?.role,
                title: title || undefined,
                copy: rows[0]?.label || (perCopySteps[0] ? rows[0]?.signers[perCopySteps[0].stepId]?.name : undefined),
              }}
            />
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={approve} disabled={Boolean(busy) || !template} className="btn-primary">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {busy || t.approve}
        </button>
        {error && <p role="alert" className="text-sm font-bold text-accent-800">{error}</p>}
      </div>
    </div>
  );
}

function PerCopyCells({
  value,
  labels,
  linked,
  contactLabel,
  onChange,
}: {
  value: { name: string; phone: string };
  labels: { name: string; phone: string };
  /** The name is one of the saved signers (their saved signature is offered). */
  linked: boolean;
  contactLabel: string;
  onChange: (v: { name: string; phone: string }) => void;
}) {
  return (
    <>
      <td className="px-1 py-1.5 align-top">
        <input
          value={value.name}
          list="esign-contacts"
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          aria-label={labels.name}
          className={`input min-w-[9rem] px-2 py-1.5 ${value.name.trim() ? "" : "border-accent-300"}`}
        />
        {linked && <span className="mt-0.5 block text-[0.7rem] font-bold text-primary-700">✓ {contactLabel}</span>}
      </td>
      <td className="px-1 py-1.5 align-top">
        <input
          value={value.phone}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
          aria-label={labels.phone}
          inputMode="tel"
          dir="ltr"
          className="input min-w-[8rem] px-2 py-1.5"
        />
      </td>
    </>
  );
}
