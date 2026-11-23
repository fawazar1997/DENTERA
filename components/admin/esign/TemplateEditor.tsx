"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  PenLine,
  Trash2,
  Type,
  Stamp,
  UserRound,
} from "lucide-react";
import { esignText } from "@/lib/esignText";
import { localePath, type Locale } from "@/lib/i18n";
import { saveTemplateAction } from "@/lib/esignActions";
import { STEP_COLORS, templateVariables, type EsignContact, type EsignField, type EsignStep, type EsignTemplate, type EsignVariable } from "@/lib/esignTypes";
import { AUTO_VARS, autoVarName } from "@/lib/esignValues";
import { StepsEditor } from "./StepsEditor";
import { VariablesPanel } from "./VariablesPanel";
import { PdfPages, boxStyle } from "@/components/esign/PdfPages";
import { TextBox } from "@/components/esign/TextBox";
import { fontStack } from "@/components/esign/renderTextPng";


const DEFAULT_SIZE: Record<EsignField["kind"], { w: number; h: number }> = {
  signature: { w: 0.24, h: 0.07 },
  variable: { w: 0.24, h: 0.028 },
  signerName: { w: 0.24, h: 0.028 },
  stamp: { w: 0.17, h: 0.12 },
};

const newId = () => Math.random().toString(36).slice(2, 10);

type Drag = {
  id: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  rect: DOMRect;
  box: { x: number; y: number; w: number; h: number };
};

export function TemplateEditor({
  template,
  contacts,
  locale,
  stampUrl,
}: {
  template: EsignTemplate;
  contacts: EsignContact[];
  locale: Locale;
  /** The clinic stamp (a data URL), for the preview. */
  stampUrl?: string;
}) {
  const t = esignText(locale);
  const ar = locale === "ar";
  const router = useRouter();
  const Back = ar ? ArrowRight : ArrowLeft;
  const [name, setName] = useState(template.name);
  const [steps, setSteps] = useState<EsignStep[]>(template.steps);
  const [fields, setFields] = useState<EsignField[]>(template.fields);
  const [variables, setVariables] = useState<EsignVariable[]>(() => templateVariables(template));
  const [selected, setSelected] = useState<string | null>(null);
  const [placing, setPlacing] = useState<EsignField["kind"] | null>(null);
  const [placingStep, setPlacingStep] = useState<string>(template.steps[0]?.id ?? "");
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(false);
  const [error, setError] = useState("");
  const drag = useRef<Drag | null>(null);
  // Sample text per box for the preview (not saved), e.g. a long value to size the box.
  const [samples, setSamples] = useState<Record<string, string>>({});

  const stepColor = useCallback(
    (stepId?: string) => STEP_COLORS[Math.max(0, steps.findIndex((s) => s.id === stepId)) % STEP_COLORS.length],
    [steps]
  );
  const selectedField = fields.find((f) => f.id === selected) ?? null;
  const labels = useMemo(() => [...new Set(fields.filter((f) => f.kind === "variable" && !f.auto && f.label).map((f) => f.label!))], [fields]);
  const usage = useMemo(() => {
    const out: Record<string, number> = {};
    for (const f of fields) if (f.kind === "variable" && !f.auto && f.label) out[f.label] = (out[f.label] ?? 0) + 1;
    return out;
  }, [fields]);
  // Every label a box uses has a definition (type, default…).
  useEffect(() => {
    const missing = labels.filter((l) => !variables.some((v) => v.name === l));
    if (missing.length) setVariables((list) => [...list, ...missing.map((name) => ({ name, type: "text" as const }))]);
  }, [labels, variables]);

  function touch() {
    setDirty(true);
    setSavedAt(false);
  }

  function updateField(id: string, patch: Partial<EsignField>) {
    setFields((list) => list.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    touch();
  }

  function removeStep(id: string) {
    setFields((list) => list.filter((f) => f.stepId !== id));
    if (placingStep === id) setPlacingStep(steps.find((s) => s.id !== id)?.id ?? "");
  }

  useEffect(() => {
    if (!steps.some((s) => s.id === placingStep) && steps[0]) setPlacingStep(steps[0].id);
  }, [steps, placingStep]);

  function place(page: number, e: React.MouseEvent<HTMLDivElement>) {
    if (!placing) {
      setSelected(null);
      return;
    }
    if (placing !== "variable" && !steps.some((s) => s.id === placingStep)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const size = DEFAULT_SIZE[placing];
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const field: EsignField = {
      id: newId(),
      kind: placing,
      page,
      x: Math.min(1 - size.w, Math.max(0, px - size.w / 2)),
      y: Math.min(1 - size.h, Math.max(0, py - size.h / 2)),
      ...size,
    };
    if (placing === "variable") {
      field.label = `${ar ? "متغير" : "Variable"} ${labels.length + 1}`;
      field.varType = "text";
    } else {
      field.stepId = placingStep;
    }
    if (placing === "variable" || placing === "signerName") {
      field.fontSize = 11;
      field.font = "dentera";
      field.align = "start";
    }
    setFields((list) => [...list, field]);
    setSelected(field.id);
    setPlacing(null);
    touch();
  }

  function startDrag(e: React.PointerEvent, field: EsignField, mode: Drag["mode"]) {
    e.stopPropagation();
    e.preventDefault();
    const page = (e.currentTarget as HTMLElement).closest("[data-page]") as HTMLElement | null;
    if (!page) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setSelected(field.id);
    drag.current = { id: field.id, mode, startX: e.clientX, startY: e.clientY, rect: page.getBoundingClientRect(), box: { x: field.x, y: field.y, w: field.w, h: field.h } };
  }

  function onDrag(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / d.rect.width;
    const dy = (e.clientY - d.startY) / d.rect.height;
    if (d.mode === "move") {
      updateField(d.id, {
        x: Math.min(1 - d.box.w, Math.max(0, d.box.x + dx)),
        y: Math.min(1 - d.box.h, Math.max(0, d.box.y + dy)),
      });
    } else {
      updateField(d.id, {
        w: Math.min(1 - d.box.x, Math.max(0.03, d.box.w + dx)),
        h: Math.min(1 - d.box.y, Math.max(0.012, d.box.h + dy)),
      });
    }
  }

  async function save() {
    setError("");
    if (steps.some((s) => !s.role.trim())) {
      setError(t.stepRole);
      return;
    }
    setSaving(true);
    const result = await saveTemplateAction({ id: template.id, name, steps, fields, variables: variables.filter((v) => usage[v.name]) }).catch(() => ({ ok: false }));
    setSaving(false);
    if (!result.ok) {
      setError(t.failed);
      return;
    }
    setDirty(false);
    setSavedAt(true);
    router.refresh();
  }

  const ready = steps.length > 0 && steps.every((s) => fields.some((f) => f.kind === "signature" && f.stepId === s.id));
  const roleOf = (stepId?: string) => steps.find((s) => s.id === stepId)?.role || "…";

  /** The preview text of a box: its sample, or a default one. */
  function sampleOf(f: EsignField): string {
    const own = samples[f.id]?.trim();
    if (own) return own;
    if (f.auto) return f.auto === "today" ? "23-11-2026" : f.auto === "ref" ? "ES-2026-0001" : name;
    return f.kind === "signerName" ? roleOf(f.stepId) : `${t.sample} ${f.label ?? ""}`;
  }

  function boxText(f: EsignField) {
    if (f.kind === "signature") return `${t.signatureOf}: ${roleOf(f.stepId)}`;
    if (f.kind === "stamp") return `${t.stampOf}: ${roleOf(f.stepId)}`;
    if (f.kind === "signerName") return preview ? roleOf(f.stepId) : `${t.nameOf}: ${roleOf(f.stepId)}`;
    if (f.auto) return autoVarName(f.auto, ar ? "ar" : "en");
    return f.label;
  }

  return (
    <div className="mt-4 grid gap-6 lg:grid-cols-[22rem_1fr]">
      {/* Side panel */}
      <div className="space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto">
        <Link href={localePath(locale, "/admin/esign?tab=templates")} className="inline-flex items-center gap-1.5 text-sm font-bold text-primary-700">
          <Back className="h-4 w-4" /> {t.backToTemplates}
        </Link>
        <section className="card space-y-3 p-4">
          <label className="block">
            <span className="label">{t.templateName}</span>
            <input value={name} onChange={(e) => (setName(e.target.value), touch())} className="input" />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={save} disabled={saving} className="btn-primary">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : savedAt ? <Check className="h-4 w-4" /> : null}
              {savedAt ? t.saved : t.saveTemplate}
            </button>
            <button type="button" onClick={() => setPreview((p) => !p)} className="btn-outline">
              {preview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {preview ? t.previewOff : t.preview}
            </button>
          </div>
          {dirty && <p className="text-xs font-bold text-accent-800">{t.unsaved}</p>}
          {!ready && <p className="rounded-lg bg-accent-50 px-3 py-2 text-xs text-ink-700">{t.notReadyHint}</p>}
          {error && <p role="alert" className="text-sm font-bold text-accent-800">{error}</p>}
        </section>

        <StepsEditor
          steps={steps}
          contacts={contacts}
          t={t}
          onChange={(next) => (setSteps(next), touch())}
          onRemove={removeStep}
          countOf={(id) => `${fields.filter((f) => f.stepId === id && f.kind === "signature").length} ${t.signatureOf}`}
        />

        <section className="card p-4">
          <h2 className="font-bold text-ink-900">{t.boxes}</h2>
          <p className="mt-1 text-xs text-ink-500">{t.boxesHint}</p>
          {steps.length > 0 && (
            <label className="mt-3 block">
              <span className="label">{t.boxStep}</span>
              <select value={placingStep} onChange={(e) => setPlacingStep(e.target.value)} className="input py-1.5 text-sm">
                {steps.map((s, i) => (
                  <option key={s.id} value={s.id}>
                    {i + 1}. {s.role || "…"}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="mt-3 grid grid-cols-4 gap-2">
            {(
              [
                ["signature", t.addSignature, PenLine],
                ["stamp", t.addStamp, Stamp],
                ["signerName", t.addName, UserRound],
                ["variable", t.addVariable, Type],
              ] as const
            ).map(([kind, label, Icon]) => (
              <button
                key={kind}
                type="button"
                disabled={kind !== "variable" && !steps.length}
                onClick={() => setPlacing((p) => (p === kind ? null : kind))}
                className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-bold transition disabled:opacity-40 ${
                  placing === kind ? "border-primary-500 bg-primary-50 text-primary-800" : "border-ink-200 text-ink-700 hover:border-primary-300"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </div>
          {placing && <p className="mt-2 rounded-lg bg-primary-50 px-3 py-2 text-xs font-bold text-primary-800">{t.clickToPlace}</p>}
          {!stampUrl && fields.some((f) => f.kind === "stamp") && (
            <p className="mt-2 rounded-lg bg-accent-50 px-3 py-2 text-xs text-ink-700">{t.stampMissing}</p>
          )}
        </section>

        {variables.some((v) => usage[v.name]) && (
          <VariablesPanel
            variables={variables.filter((v) => usage[v.name])}
            usage={usage}
            t={t}
            lang={ar ? "ar" : "en"}
            canAdd={false}
            onChange={(next) => {
              setVariables((list) => [...next, ...list.filter((v) => !usage[v.name])]);
              touch();
            }}
            onRename={(from, to) => {
              setFields((list) => list.map((f) => (f.kind === "variable" && !f.auto && f.label === from ? { ...f, label: to } : f)));
              setVariables((list) => list.map((v) => (v.name === from ? { ...v, name: to } : v)));
              touch();
            }}
          />
        )}

        {selectedField && (
          <section className="card space-y-3 p-4">
            <h2 className="font-bold text-ink-900">{t.boxSettings}</h2>
            {selectedField.kind === "variable" ? (
              <>
                <label className="block">
                  <span className="label">{t.insertVariable}</span>
                  <select
                    value={selectedField.auto ?? ""}
                    onChange={(e) => {
                      const auto = (e.target.value || undefined) as EsignField["auto"];
                      updateField(selectedField.id, auto ? { auto, label: autoVarName(auto) } : { auto: undefined, label: labels[0] ?? `${t.typeText} 1` });
                    }}
                    className="input"
                  >
                    <option value="">{t.templateVars}</option>
                    {AUTO_VARS.map((a) => (
                      <option key={a.key} value={a.key}>
                        {t.autoVars}: {a[ar ? "ar" : "en"]}
                      </option>
                    ))}
                  </select>
                </label>
                {!selectedField.auto && (
                  <label className="block">
                    <span className="label">{t.varName}</span>
                    <input
                      value={selectedField.label ?? ""}
                      list="esign-labels"
                      onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                      className="input"
                    />
                    <datalist id="esign-labels">
                      {labels.map((l) => (
                        <option key={l} value={l} />
                      ))}
                    </datalist>
                    <span className="mt-1 block text-xs text-ink-500">{t.variablesHint.split(".")[0]}.</span>
                  </label>
                )}
              </>
            ) : (
              <label className="block">
                <span className="label">{t.boxStep}</span>
                <select
                  value={selectedField.stepId}
                  onChange={(e) => updateField(selectedField.id, { stepId: e.target.value })}
                  className="input"
                >
                  {steps.map((s, i) => (
                    <option key={s.id} value={s.id}>
                      {i + 1}. {s.role || "…"}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {(selectedField.kind === "variable" || selectedField.kind === "signerName") && (
              <label className="block">
                <span className="label">{t.fontLabel}</span>
                <select
                  value={selectedField.font ?? "dentera"}
                  onChange={(e) => updateField(selectedField.id, { font: e.target.value as EsignField["font"] })}
                  className="input"
                  style={{ fontFamily: fontStack(selectedField.font) }}
                >
                  <option value="dentera">{t.fontDentera}</option>
                  <option value="cambria">{t.fontCambria}</option>
                </select>
              </label>
            )}
            {(selectedField.kind === "variable" || selectedField.kind === "signerName") && (
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="label">{t.fontSize}</span>
                  <input
                    type="number"
                    min={5}
                    max={48}
                    value={selectedField.fontSize ?? 11}
                    onChange={(e) => updateField(selectedField.id, { fontSize: Number(e.target.value) || 11 })}
                    className="input"
                  />
                </label>
                <label className="block">
                  <span className="label">{t.align}</span>
                  <select
                    value={selectedField.align ?? "start"}
                    onChange={(e) => updateField(selectedField.id, { align: e.target.value as EsignField["align"] })}
                    className="input"
                  >
                    <option value="start">{t.alignStart}</option>
                    <option value="center">{t.alignCenter}</option>
                    <option value="end">{t.alignEnd}</option>
                  </select>
                </label>
              </div>
            )}
            {(selectedField.kind === "variable" || selectedField.kind === "signerName") && (
              <label className="block">
                <span className="label">{t.sampleText}</span>
                <input
                  value={samples[selectedField.id] ?? ""}
                  onChange={(e) => {
                    setSamples((s) => ({ ...s, [selectedField.id]: e.target.value }));
                    setPreview(true);
                  }}
                  placeholder={sampleOf(selectedField)}
                  className="input"
                />
                <span className="mt-1 block text-xs text-ink-500">{t.textFitHint}</span>
              </label>
            )}
            <button
              type="button"
              onClick={() => {
                setFields((list) => list.filter((f) => f.id !== selectedField.id));
                setSelected(null);
                touch();
              }}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-accent-800"
            >
              <Trash2 className="h-4 w-4" /> {t.deleteBox}
            </button>
          </section>
        )}
      </div>

      {/* Pages */}
      <div className="min-w-0" onPointerMove={onDrag} onPointerUp={() => (drag.current = null)}>
        <PdfPages
          url={`/api/admin/esign/template/${template.id}`}
          labels={{ loading: t.loading, failed: t.loadFailed, page: t.page }}
          overlay={(page) => (
            <div
              data-page={page}
              onClick={(e) => place(page, e)}
              className={`absolute inset-0 ${placing ? "cursor-crosshair" : ""}`}
              style={{ containerType: "inline-size" }}
            >
              {fields
                .filter((f) => f.page === page)
                .map((f) => {
                  const color = f.kind === "variable" ? "#475569" : stepColor(f.stepId);
                  const isSelected = f.id === selected;
                  const graphic = f.kind === "signature" || f.kind === "stamp";
                  const size = template.pages[page]?.w ?? 595;
                  return (
                    <div
                      key={f.id}
                      role="button"
                      tabIndex={0}
                      aria-label={boxText(f)}
                      onClick={(e) => (e.stopPropagation(), setSelected(f.id))}
                      onPointerDown={(e) => startDrag(e, f, "move")}
                      style={{
                        ...boxStyle(f),
                        borderColor: color,
                        background: preview ? "transparent" : `${color}1a`,
                        color: preview ? "#111827" : color,
                        fontSize: `calc(${((f.fontSize ?? 11) / size) * 100}cqw)`,
                        justifyContent: graphic || f.align === "center" ? "center" : f.align === "end" ? "flex-end" : "flex-start",
                      }}
                      className={`flex touch-none select-none items-center overflow-hidden whitespace-nowrap px-1 leading-none ${
                        preview && !graphic ? "" : "rounded border-2 border-dashed"
                      } ${isSelected ? "ring-2 ring-ink-900 ring-offset-1" : ""} cursor-move`}
                    >
                      {preview && (f.kind === "variable" || f.kind === "signerName") ? (
                        <TextBox
                          text={sampleOf(f)}
                          boxW={f.w * (template.pages[page]?.w ?? 595)}
                          boxH={f.h * (template.pages[page]?.h ?? 842)}
                          fontSize={f.fontSize}
                          align={f.align}
                          bold={f.kind === "signerName"}
                          font={f.font}
                        />
                      ) : preview && f.kind === "stamp" && stampUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={stampUrl} alt={t.stampTitle} className="pointer-events-none h-full w-full object-contain" />
                      ) : (
                        <span
                          className={graphic ? "text-[0.65rem] font-bold sm:text-xs" : "font-bold"}
                          style={graphic ? undefined : { fontFamily: fontStack(f.font) }}
                        >
                          {boxText(f)}
                        </span>
                      )}
                      {isSelected && (
                        <span
                          onPointerDown={(e) => startDrag(e, f, "resize")}
                          className="absolute bottom-0 right-0 h-3.5 w-3.5 cursor-nwse-resize rounded-sm bg-ink-900"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        />
      </div>
    </div>
  );
}
