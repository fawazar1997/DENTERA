"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { NodeSelection } from "@tiptap/pm/state";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  ArrowRight,
  Bold,
  Braces,
  Check,
  Columns3,
  Eye,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Minus,
  PenLine,
  Pencil,
  Pilcrow,
  Redo2,
  SeparatorHorizontal,
  Table as TableIcon,
  Trash2,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { esignText, type EsignText } from "@/lib/esignText";
import { localePath, type Locale } from "@/lib/i18n";
import { saveDocumentTemplateAction } from "@/lib/esignActions";
import {
  DEFAULT_DOC_SETTINGS,
  docBackground,
  type EsignContact,
  type EsignDocSettings,
  type EsignStep,
  type EsignTemplate,
  type EsignVariable,
} from "@/lib/esignTypes";
import { docVariableNames, walkDoc, type DocNode } from "@/lib/esignDoc";
import { AUTO_VARS, riyadhToday } from "@/lib/esignValues";
import { DocTable, EditorInfoContext, PageBreakNode, SignatureBlockNode, VariableNode, type EditorInfo } from "@/components/esign/document/editorNodes";
import { CONTENT_W, EDITOR_CSS, FONT_STACKS, PAGE_H, PAGE_W, type OfficialFrame } from "@/components/esign/document/docStyles";
import { documentBodyHtml, langOf } from "@/components/esign/document/renderDocument";
import { ensureDocFonts } from "@/components/esign/document/layout";
import { DocPages } from "@/components/esign/document/DocPages";
import { StepsEditor, stepColorAt } from "./StepsEditor";
import { VariablesPanel } from "./VariablesPanel";

export function DocumentEditor({
  template,
  content,
  contacts,
  locale,
  footer,
  official,
}: {
  template: EsignTemplate;
  content: DocNode;
  contacts: EsignContact[];
  locale: Locale;
  /** The letterhead footer line (Settings). */
  footer: string;
  /** The official letterhead (الكليشة), when uploaded. */
  official?: OfficialFrame;
}) {
  const t = esignText(locale);
  const ar = locale === "ar";
  const router = useRouter();
  const Back = ar ? ArrowRight : ArrowLeft;
  const [name, setName] = useState(template.name);
  const [steps, setSteps] = useState<EsignStep[]>(template.steps);
  const [variables, setVariables] = useState<EsignVariable[]>(template.variables ?? []);
  const [settings, setSettings] = useState<EsignDocSettings>({ ...DEFAULT_DOC_SETTINGS, ...template.settings });
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [sigCount, setSigCount] = useState<Record<string, number>>({});
  const [sigStep, setSigStep] = useState(template.steps[0]?.id ?? "");
  const [snapshot, setSnapshot] = useState<DocNode>(content);
  const lang = langOf(settings);
  const background = docBackground(settings);
  const onOfficial = background === "official" && Boolean(official);

  const info: EditorInfo = useMemo(
    () => ({ steps: steps.map((s, i) => ({ id: s.id, role: s.role, color: stepColorAt(i) })), t, lang }),
    [steps, t, lang]
  );

  const touch = useCallback(() => {
    setDirty(true);
    setSaved(false);
  }, []);

  // Counts how often each variable and signature step is used, and declares
  // variables typed as {{name}} that aren't in the list yet.
  const scan = useRef<ReturnType<typeof setTimeout>>();
  const rescan = useCallback((editor: Editor) => {
    clearTimeout(scan.current);
    scan.current = setTimeout(() => {
      const json = editor.getJSON() as DocNode;
      const counts: Record<string, number> = {};
      const sigs: Record<string, number> = {};
      walkDoc(json, (n) => {
        if (n.type === "variable" && !n.attrs?.auto) counts[String(n.attrs?.name)] = (counts[String(n.attrs?.name)] ?? 0) + 1;
        if (n.type === "signatureBlock") sigs[String(n.attrs?.stepId)] = (sigs[String(n.attrs?.stepId)] ?? 0) + 1;
      });
      setUsage(counts);
      setSigCount(sigs);
      const names = docVariableNames(json);
      setVariables((list) => {
        const missing = names.filter((n) => !list.some((v) => v.name === n));
        return missing.length ? [...list, ...missing.map((n) => ({ name: n, type: "text" as const }))] : list;
      });
      setSnapshot(json);
    }, 300);
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, codeBlock: false, code: false, blockquote: false, strike: false }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right", "justify"] }),
      Placeholder.configure({ placeholder: t.editorPlaceholder }),
      DocTable.configure({ resizable: true, cellMinWidth: 40 }),
      TableRow,
      TableHeader,
      TableCell,
      VariableNode,
      SignatureBlockNode,
      PageBreakNode.configure({ label: t.pageBreak }),
    ],
    content,
    onCreate: ({ editor }) => rescan(editor),
    onUpdate: ({ editor }) => {
      touch();
      rescan(editor);
    },
  });

  useEffect(() => {
    ensureDocFonts();
  }, []);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (!steps.some((s) => s.id === sigStep)) setSigStep(steps[0]?.id ?? "");
  }, [steps, sigStep]);

  /** Changes every node matching `match` (from the end, so positions stay right). */
  function changeNodes(match: (node: { type: { name: string }; attrs: Record<string, unknown> }) => "delete" | Record<string, unknown> | null) {
    if (!editor) return;
    const { state } = editor;
    const edits: { pos: number; size: number; result: "delete" | Record<string, unknown> }[] = [];
    state.doc.descendants((node, pos) => {
      const result = match(node as never);
      if (result) edits.push({ pos, size: node.nodeSize, result });
    });
    if (!edits.length) return;
    const tr = state.tr;
    for (const e of edits.reverse()) {
      if (e.result === "delete") tr.delete(e.pos, e.pos + e.size);
      else tr.setNodeMarkup(e.pos, undefined, { ...state.doc.nodeAt(e.pos)!.attrs, ...e.result });
    }
    editor.view.dispatch(tr);
  }

  function renameVariable(from: string, to: string) {
    changeNodes((n) => (n.type.name === "variable" && !n.attrs.auto && n.attrs.name === from ? { name: to } : null));
    setVariables((list) => list.map((v) => (v.name === from ? { ...v, name: to } : v)));
    touch();
  }

  function removeStep(id: string) {
    changeNodes((n) =>
      (n.type.name === "signatureBlock" && n.attrs.stepId === id) || (n.type.name === "variable" && n.attrs.auto === "signer" && n.attrs.stepId === id)
        ? "delete"
        : null
    );
  }

  function insertVariable(attrs: { name: string; auto?: string; stepId?: string }) {
    editor?.chain().focus().insertContent({ type: "variable", attrs: { auto: null, stepId: null, ...attrs } }).insertContent(" ").run();
  }

  function insertSignature(stepId: string) {
    editor
      ?.chain()
      .focus()
      .insertContent({ type: "signatureBlock", attrs: { stepId, showName: true, showRole: true, stamp: false, size: "m", align: "start" } })
      .run();
  }

  function insertSignatureRow() {
    if (!editor || !steps.length) return;
    const cells = steps.slice(0, 4).map((s) => ({
      type: "tableCell",
      content: [{ type: "signatureBlock", attrs: { stepId: s.id, showName: true, showRole: true, stamp: false, size: "m", align: "center" } }],
    }));
    editor.chain().focus().insertContent({ type: "table", attrs: { borderless: true }, content: [{ type: "tableRow", content: cells }] }).run();
  }

  async function save() {
    if (!editor) return;
    setError("");
    if (steps.some((s) => !s.role.trim())) return setError(t.errSteps);
    setSaving(true);
    const result = await saveDocumentTemplateAction({
      id: template.id,
      name,
      steps,
      variables,
      settings,
      // A plain copy: the editor's node attributes have no prototype, which server actions refuse.
      content: JSON.parse(JSON.stringify(editor.getJSON())),
    }).catch(() => ({ ok: false as const, error: "content" as const, detail: undefined }));
    setSaving(false);
    if (!result.ok) {
      const detail = "detail" in result && result.detail ? ` ${result.detail}` : "";
      setError(
        result.error === "name"
          ? t.errName
          : result.error === "steps"
            ? t.errSteps
            : result.error === "variables"
              ? `${t.errVariables}${detail}`
              : result.error === "signatures"
                ? `${t.errSignatures}${detail}`
                : t.errContent
      );
      return;
    }
    setDirty(false);
    setSaved(true);
    router.refresh();
  }

  const selection = editor?.state.selection;
  const selectedSig = selection instanceof NodeSelection && selection.node.type.name === "signatureBlock" ? selection.node : null;
  const inTable = editor?.isActive("table") ?? false;
  const ready = steps.length > 0 && steps.every((s) => (sigCount[s.id] ?? 0) > 0);

  const previewBody = useMemo(
    () =>
      preview
        ? documentBodyHtml(snapshot, {
            mode: "preview",
            settings,
            variables,
            values: {},
            auto: { today: riyadhToday(), title: name },
            steps: info.steps,
            labels: { signature: t.sigStep, stamp: t.stampOf, nameOf: t.nameOfRole },
          })
        : "",
    [preview, snapshot, settings, variables, name, info.steps, t]
  );

  return (
    <div className="mt-4 grid gap-6 xl:grid-cols-[23rem_1fr]">
      <style dangerouslySetInnerHTML={{ __html: EDITOR_CSS }} />
      {/* Side panel */}
      <div className="space-y-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:self-start xl:overflow-y-auto">
        <Link href={localePath(locale, "/admin/esign?tab=templates")} className="inline-flex items-center gap-1.5 text-sm font-bold text-primary-700">
          <Back className="h-4 w-4" /> {t.backToTemplates}
        </Link>
        <section className="card space-y-3 p-4">
          <label className="block">
            <span className="label">{t.templateName}</span>
            <input value={name} onChange={(e) => (setName(e.target.value), touch())} className="input" />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={save} disabled={saving || !editor} className="btn-primary">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
              {saved ? t.saved : t.saveTemplate}
            </button>
            <button type="button" onClick={() => setPreview((p) => !p)} className="btn-outline">
              {preview ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {preview ? t.editDoc : t.previewDoc}
            </button>
          </div>
          {dirty && <p className="text-xs font-bold text-accent-800">{t.unsaved}</p>}
          {!ready && <p className="rounded-lg bg-accent-50 px-3 py-2 text-xs text-ink-700">{t.notReadyHint}</p>}
          {error && (
            <p role="alert" className="text-sm font-bold text-accent-800">
              {error}
            </p>
          )}
        </section>

        {selectedSig && editor && (
          <SignatureOptions
            t={t}
            steps={info.steps}
            attrs={selectedSig.attrs}
            onChange={(patch) => editor.chain().updateAttributes("signatureBlock", patch).run()}
            onRemove={() => editor.chain().focus().deleteSelection().run()}
          />
        )}

        <StepsEditor
          steps={steps}
          contacts={contacts}
          t={t}
          onChange={(next) => (setSteps(next), touch())}
          onRemove={removeStep}
          countOf={(id) => `${sigCount[id] ?? 0} ${t.signatureOf}`}
        />

        <VariablesPanel
          variables={variables}
          usage={usage}
          t={t}
          lang={lang}
          onChange={(next) => (setVariables(next), touch())}
          onRename={renameVariable}
        />

        <section className="card space-y-3 p-4">
          <h2 className="font-bold text-ink-900">{t.pageSetup}</h2>
          <label className="block">
            <span className="label">{t.backgroundLabel}</span>
            <select
              value={background}
              onChange={(e) => {
                const value = e.target.value as "official" | "dentera" | "none";
                setSettings((s) => ({ ...s, background: value, letterhead: value !== "none" }));
                touch();
              }}
              className="input py-1.5 text-sm"
            >
              <option value="official" disabled={!official}>
                {t.bgOfficial}
                {official ? "" : ` — ${t.bgOfficialMissing}`}
              </option>
              <option value="dentera">{t.bgDentera}</option>
              <option value="none">{t.bgNone}</option>
            </select>
          </label>
          {background === "official" && !official && <p className="rounded-lg bg-accent-50 px-3 py-2 text-xs text-ink-700">{t.bgOfficialMissing}</p>}
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="label">{t.direction}</span>
              <select
                value={settings.dir}
                onChange={(e) => (setSettings((s) => ({ ...s, dir: e.target.value === "ltr" ? "ltr" : "rtl" })), touch())}
                className="input py-1.5 text-sm"
              >
                <option value="rtl">{t.dirRtl}</option>
                <option value="ltr">{t.dirLtr}</option>
              </select>
            </label>
            <label className="block">
              <span className="label">{t.textSize}</span>
              <select
                value={settings.size}
                onChange={(e) => (setSettings((s) => ({ ...s, size: Number(e.target.value) })), touch())}
                className="input py-1.5 text-sm"
              >
                {[9, 10, 11, 12, 13, 14].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="label">{t.fontLabel}</span>
            <select
              value={settings.font}
              onChange={(e) => (setSettings((s) => ({ ...s, font: e.target.value === "cambria" ? "cambria" : "dentera" })), touch())}
              className="input py-1.5 text-sm"
              style={{ fontFamily: FONT_STACKS[settings.font] }}
            >
              <option value="dentera">{t.fontDentera}</option>
              <option value="cambria">{t.fontCambria}</option>
            </select>
          </label>
        </section>
      </div>

      {/* The document */}
      <div className="min-w-0">
        {preview ? (
          <div className="rounded-2xl bg-ink-100/70 p-3 sm:p-6">
            <p className="mb-4 text-center text-sm text-ink-600">{t.docPreviewHint}</p>
            <DocPages
              body={previewBody}
              settings={settings}
              footer={footer}
              official={official}
              labels={{ page: t.page, of: t.pageOf, measuring: t.measuring }}
            />
          </div>
        ) : (
          <EditorInfoContext.Provider value={info}>
            <Toolbar
              editor={editor}
              t={t}
              inTable={inTable}
              steps={info.steps}
              variables={variables}
              lang={lang}
              sigStep={sigStep}
              onSigStep={setSigStep}
              onInsertVariable={insertVariable}
              onNewVariable={(n) => {
                if (!variables.some((v) => v.name === n)) setVariables((list) => [...list, { name: n, type: "text" }]);
                insertVariable({ name: n });
              }}
              onInsertSignature={() => sigStep && insertSignature(sigStep)}
              onInsertSignatureRow={insertSignatureRow}
            />
            <div className="overflow-x-auto rounded-b-2xl bg-ink-100/70 p-3 sm:p-6">
              <div
                className="relative mx-auto rounded-md bg-white px-4 py-10 shadow-md ring-1 ring-ink-200 sm:px-[68px]"
                style={onOfficial ? { maxWidth: PAGE_W, minHeight: PAGE_H, paddingTop: official!.top, paddingBottom: 60 } : { maxWidth: PAGE_W, minHeight: 900 }}
              >
                {onOfficial && (
                  // Only the letterhead's header while writing (the full page shows in the preview and the PDF).
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 rounded-t-md bg-no-repeat"
                    style={{
                      aspectRatio: `${PAGE_W} / ${official!.top - 16}`,
                      backgroundImage: `url(${official!.url})`,
                      backgroundSize: "100% auto",
                      backgroundPosition: "top",
                      maskImage: "linear-gradient(to bottom, #000 70%, transparent)",
                      WebkitMaskImage: "linear-gradient(to bottom, #000 70%, transparent)",
                    }}
                  />
                )}
                <div
                  className="esign-doc esign-editing"
                  dir={settings.dir}
                  style={{ width: "100%", maxWidth: CONTENT_W, fontFamily: FONT_STACKS[settings.font], fontSize: `${settings.size}pt` }}
                >
                  <EditorContent editor={editor} />
                </div>
              </div>
            </div>
          </EditorInfoContext.Provider>
        )}
      </div>
    </div>
  );
}

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-lg px-1.5 text-sm transition disabled:opacity-30 ${
        active ? "bg-ink-900 text-white" : "text-ink-700 hover:bg-ink-100"
      }`}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-1 h-6 w-px bg-ink-200" aria-hidden="true" />;

function Toolbar({
  editor,
  t,
  inTable,
  steps,
  variables,
  lang,
  sigStep,
  onSigStep,
  onInsertVariable,
  onNewVariable,
  onInsertSignature,
  onInsertSignatureRow,
}: {
  editor: Editor | null;
  t: EsignText;
  inTable: boolean;
  steps: EditorInfo["steps"];
  variables: EsignVariable[];
  lang: "ar" | "en";
  sigStep: string;
  onSigStep: (id: string) => void;
  onInsertVariable: (attrs: { name: string; auto?: string; stepId?: string }) => void;
  onNewVariable: (name: string) => void;
  onInsertSignature: () => void;
  onInsertSignatureRow: () => void;
}) {
  const [menu, setMenu] = useState(false);
  if (!editor) return <div className="h-24 rounded-t-2xl border border-ink-200 bg-white" />;
  const chain = () => editor.chain().focus();
  const is = (name: string, attrs?: Record<string, unknown>) => editor.isActive(name, attrs);
  const align = (a: string) => editor.isActive({ textAlign: a });

  return (
    <div className="sticky top-14 z-20 space-y-1.5 rounded-t-2xl border border-ink-200 bg-white/95 p-2 backdrop-blur lg:top-0">
      <div className="flex flex-wrap items-center gap-0.5">
        <ToolButton label={t.undo} disabled={!editor.can().undo()} onClick={() => chain().undo().run()}>
          <Undo2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton label={t.redo} disabled={!editor.can().redo()} onClick={() => chain().redo().run()}>
          <Redo2 className="h-4 w-4" />
        </ToolButton>
        <Sep />
        <ToolButton label={t.toolParagraph} active={is("paragraph")} onClick={() => chain().setParagraph().run()}>
          <Pilcrow className="h-4 w-4" />
        </ToolButton>
        <ToolButton label={t.toolH1} active={is("heading", { level: 1 })} onClick={() => chain().toggleHeading({ level: 1 }).run()}>
          <Heading1 className="h-4 w-4" />
        </ToolButton>
        <ToolButton label={t.toolH2} active={is("heading", { level: 2 })} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton label={t.toolH3} active={is("heading", { level: 3 })} onClick={() => chain().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="h-4 w-4" />
        </ToolButton>
        <Sep />
        <ToolButton label={t.toolBold} active={is("bold")} onClick={() => chain().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </ToolButton>
        <ToolButton label={t.toolItalic} active={is("italic")} onClick={() => chain().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </ToolButton>
        <ToolButton label={t.toolUnderline} active={is("underline")} onClick={() => chain().toggleUnderline().run()}>
          <UnderlineIcon className="h-4 w-4" />
        </ToolButton>
        <Sep />
        <ToolButton label={t.alignRight} active={align("right")} onClick={() => (align("right") ? chain().unsetTextAlign() : chain().setTextAlign("right")).run()}>
          <AlignRight className="h-4 w-4" />
        </ToolButton>
        <ToolButton label={t.alignCenterText} active={align("center")} onClick={() => (align("center") ? chain().unsetTextAlign() : chain().setTextAlign("center")).run()}>
          <AlignCenter className="h-4 w-4" />
        </ToolButton>
        <ToolButton label={t.alignLeft} active={align("left")} onClick={() => (align("left") ? chain().unsetTextAlign() : chain().setTextAlign("left")).run()}>
          <AlignLeft className="h-4 w-4" />
        </ToolButton>
        <ToolButton label={t.alignJustify} active={align("justify")} onClick={() => (align("justify") ? chain().unsetTextAlign() : chain().setTextAlign("justify")).run()}>
          <AlignJustify className="h-4 w-4" />
        </ToolButton>
        <Sep />
        <ToolButton label={t.bulletList} active={is("bulletList")} onClick={() => chain().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </ToolButton>
        <ToolButton label={t.orderedList} active={is("orderedList")} onClick={() => chain().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </ToolButton>
        <ToolButton label={t.insertTable} onClick={() => chain().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run()}>
          <TableIcon className="h-4 w-4" />
        </ToolButton>
        <ToolButton label={t.ruleLine} onClick={() => chain().setHorizontalRule().run()}>
          <Minus className="h-4 w-4" />
        </ToolButton>
        <ToolButton label={t.pageBreak} onClick={() => chain().insertContent({ type: "pageBreak" }).run()}>
          <SeparatorHorizontal className="h-4 w-4" />
        </ToolButton>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-ink-100 pt-1.5">
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setMenu((m) => !m)}
            aria-expanded={menu}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary-50 px-2.5 text-sm font-bold text-primary-800 ring-1 ring-primary-200 hover:bg-primary-100"
          >
            <Braces className="h-4 w-4" /> {t.insertVariable}
          </button>
          {menu && (
            <div className="absolute start-0 top-9 z-30 max-h-80 w-64 overflow-y-auto rounded-xl border border-ink-200 bg-white p-1.5 text-sm shadow-lg">
              {variables.length > 0 && <p className="px-2 pb-1 pt-1.5 text-xs font-bold text-ink-400">{t.templateVars}</p>}
              {variables.map((v) => (
                <MenuItem key={v.name} onClick={() => (onInsertVariable({ name: v.name }), setMenu(false))} color="#0e7490">
                  {v.name}
                </MenuItem>
              ))}
              <MenuItem
                onClick={() => {
                  setMenu(false);
                  const name = window.prompt(t.newVariablePrompt)?.replace(/[{}]/g, "").trim();
                  if (name) onNewVariable(name);
                }}
                color="#0f172a"
              >
                + {t.newVariable}
              </MenuItem>
              <p className="px-2 pb-1 pt-2 text-xs font-bold text-ink-400">{t.autoVars}</p>
              {AUTO_VARS.map((a) => (
                <MenuItem key={a.key} onClick={() => (onInsertVariable({ name: "", auto: a.key }), setMenu(false))} color="#7c3aed">
                  {a[lang]}
                </MenuItem>
              ))}
              {steps.map((s) => (
                <MenuItem key={s.id} onClick={() => (onInsertVariable({ name: "", auto: "signer", stepId: s.id }), setMenu(false))} color={s.color}>
                  {t.nameOfRole} {s.role || "…"}
                </MenuItem>
              ))}
            </div>
          )}
        </div>
        <span className="mx-1 h-6 w-px bg-ink-200" aria-hidden="true" />
        <select
          value={sigStep}
          onChange={(e) => onSigStep(e.target.value)}
          aria-label={t.boxStep}
          className="h-8 rounded-lg border border-ink-200 bg-white px-2 text-sm"
          disabled={!steps.length}
        >
          {steps.map((s, i) => (
            <option key={s.id} value={s.id}>
              {i + 1}. {s.role || "…"}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!steps.length}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onInsertSignature}
          title={t.insertSignatureHint}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent-50 px-2.5 text-sm font-bold text-accent-800 ring-1 ring-accent-200 hover:bg-accent-100 disabled:opacity-40"
        >
          <PenLine className="h-4 w-4" /> {t.insertSignature}
        </button>
        <button
          type="button"
          disabled={!steps.length}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onInsertSignatureRow}
          title={t.insertSignatureHint}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-bold text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50 disabled:opacity-40"
        >
          <Columns3 className="h-4 w-4" /> {t.insertSignatureRow}
        </button>
      </div>

      {inTable && (
        <div className="flex flex-wrap items-center gap-1 border-t border-ink-100 pt-1.5 text-xs font-bold">
          <ToolButton label={t.addRow} onClick={() => chain().addRowAfter().run()}>
            + {t.addRow}
          </ToolButton>
          <ToolButton label={t.addCol} onClick={() => chain().addColumnAfter().run()}>
            + {t.addCol}
          </ToolButton>
          <ToolButton label={t.delRow} onClick={() => chain().deleteRow().run()}>
            − {t.delRow}
          </ToolButton>
          <ToolButton label={t.delCol} onClick={() => chain().deleteColumn().run()}>
            − {t.delCol}
          </ToolButton>
          <ToolButton label={t.headerRow} onClick={() => chain().toggleHeaderRow().run()}>
            {t.headerRow}
          </ToolButton>
          <ToolButton
            label={t.borderless}
            active={Boolean(editor.getAttributes("table").borderless)}
            onClick={() => chain().updateAttributes("table", { borderless: !editor.getAttributes("table").borderless }).run()}
          >
            {t.borderless}
          </ToolButton>
          <ToolButton label={t.delTable} onClick={() => chain().deleteTable().run()}>
            <Trash2 className="h-3.5 w-3.5" /> {t.delTable}
          </ToolButton>
        </div>
      )}
    </div>
  );
}

function MenuItem({ onClick, color, children }: { onClick: () => void; color: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start hover:bg-ink-50"
    >
      <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: color }} />
      <span className="truncate">{children}</span>
    </button>
  );
}

function SignatureOptions({
  t,
  steps,
  attrs,
  onChange,
  onRemove,
}: {
  t: EsignText;
  steps: EditorInfo["steps"];
  attrs: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
  onRemove: () => void;
}) {
  return (
    <section className="card space-y-3 border-2 border-ink-900 p-4">
      <h2 className="font-bold text-ink-900">{t.sigOptions}</h2>
      <label className="block">
        <span className="label">{t.boxStep}</span>
        <select value={String(attrs.stepId)} onChange={(e) => onChange({ stepId: e.target.value })} className="input py-1.5 text-sm">
          {steps.map((s, i) => (
            <option key={s.id} value={s.id}>
              {i + 1}. {s.role || "…"}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="label">{t.sigSize}</span>
          <select value={String(attrs.size)} onChange={(e) => onChange({ size: e.target.value })} className="input py-1.5 text-sm">
            <option value="s">{t.sizeS}</option>
            <option value="m">{t.sizeM}</option>
            <option value="l">{t.sizeL}</option>
          </select>
        </label>
        <label className="block">
          <span className="label">{t.align}</span>
          <select value={String(attrs.align)} onChange={(e) => onChange({ align: e.target.value })} className="input py-1.5 text-sm">
            <option value="start">{t.alignStart}</option>
            <option value="center">{t.alignCenter}</option>
            <option value="end">{t.alignEnd}</option>
          </select>
        </label>
      </div>
      {(
        [
          ["showRole", t.showRole],
          ["showName", t.showName],
          ["stamp", t.withStamp],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="flex items-center gap-2 text-sm text-ink-800">
          <input type="checkbox" checked={Boolean(attrs[key])} onChange={(e) => onChange({ [key]: e.target.checked })} />
          {label}
        </label>
      ))}
      <button type="button" onClick={onRemove} className="inline-flex items-center gap-1.5 text-sm font-bold text-accent-800">
        <Trash2 className="h-4 w-4" /> {t.removeBlock}
      </button>
    </section>
  );
}
