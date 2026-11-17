"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Eye,
  EyeOff,
  Loader2,
  PenLine,
  Plus,
  Trash2,
  Type,
  UserRound,
} from "lucide-react";
import { esignText } from "@/lib/esignText";
import { localePath, type Locale } from "@/lib/i18n";
import { saveTemplateAction } from "@/lib/esignActions";
import { STEP_COLORS, type EsignContact, type EsignField, type EsignStep, type EsignTemplate } from "@/lib/esignTypes";
import { PdfPages, boxStyle } from "@/components/esign/PdfPages";


const DEFAULT_SIZE: Record<EsignField["kind"], { w: number; h: number }> = {
  signature: { w: 0.24, h: 0.07 },
  variable: { w: 0.24, h: 0.028 },
  signerName: { w: 0.24, h: 0.028 },
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
}: {
  template: EsignTemplate;
  contacts: EsignContact[];
  locale: Locale;
}) {
  const t = esignText(locale);
  const ar = locale === "ar";
  const router = useRouter();
  const Back = ar ? ArrowRight : ArrowLeft;
  const [name, setName] = useState(template.name);
  const [steps, setSteps] = useState<EsignStep[]>(template.steps);
  const [fields, setFields] = useState<EsignField[]>(template.fields);
  const [selected, setSelected] = useState<string | null>(null);
  const [placing, setPlacing] = useState<EsignField["kind"] | null>(null);
  const [placingStep, setPlacingStep] = useState<string>(template.steps[0]?.id ?? "");
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(false);
  const [error, setError] = useState("");
  const drag = useRef<Drag | null>(null);

  const stepColor = useCallback(
    (stepId?: string) => STEP_COLORS[Math.max(0, steps.findIndex((s) => s.id === stepId)) % STEP_COLORS.length],
    [steps]
  );
  const selectedField = fields.find((f) => f.id === selected) ?? null;
  const labels = useMemo(() => [...new Set(fields.filter((f) => f.kind === "variable" && f.label).map((f) => f.label!))], [fields]);

  function touch() {
    setDirty(true);
    setSavedAt(false);
  }

  function updateField(id: string, patch: Partial<EsignField>) {
    setFields((list) => list.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    touch();
  }

  function updateStep(id: string, patch: Partial<EsignStep>) {
    setSteps((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    touch();
  }

  function moveStep(index: number, by: number) {
    setSteps((list) => {
      const next = [...list];
      const [step] = next.splice(index, 1);
      next.splice(index + by, 0, step);
      return next;
    });
    touch();
  }

  function addStep() {
    const step: EsignStep = { id: newId(), role: "", defaultMode: steps.length === 0 ? "perCopy" : "same" };
    setSteps((list) => [...list, step]);
    if (!placingStep) setPlacingStep(step.id);
    touch();
  }

  function removeStep(id: string) {
    setSteps((list) => list.filter((s) => s.id !== id));
    setFields((list) => list.filter((f) => f.stepId !== id));
    if (placingStep === id) setPlacingStep(steps.find((s) => s.id !== id)?.id ?? "");
    touch();
  }

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
    if (placing !== "signature") {
      field.fontSize = 11;
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
    const result = await saveTemplateAction({ id: template.id, name, steps, fields }).catch(() => ({ ok: false }));
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

  function boxText(f: EsignField) {
    if (f.kind === "signature") return `${t.signatureOf}: ${roleOf(f.stepId)}`;
    if (f.kind === "signerName") return preview ? roleOf(f.stepId) : `${t.nameOf}: ${roleOf(f.stepId)}`;
    return preview ? `${f.label}` : f.label;
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

        <section className="card p-4">
          <h2 className="font-bold text-ink-900">{t.procedure}</h2>
          <p className="mt-1 text-xs text-ink-500">{t.procedureHint}</p>
          <ol className="mt-3 space-y-3">
            {steps.map((step, i) => (
              <li key={step.id} className="rounded-xl border border-ink-100 p-3" style={{ borderInlineStartWidth: 4, borderInlineStartColor: stepColor(step.id) }}>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: stepColor(step.id) }}>
                    {i + 1}
                  </span>
                  <input
                    value={step.role}
                    onChange={(e) => updateStep(step.id, { role: e.target.value })}
                    placeholder={t.stepRole}
                    aria-label={t.stepRole}
                    className="input py-1.5"
                  />
                </div>
                <div className="mt-2 grid gap-2">
                  <select
                    value={step.defaultMode ?? "same"}
                    onChange={(e) => updateStep(step.id, { defaultMode: e.target.value as EsignStep["defaultMode"] })}
                    aria-label={t.stepDefault}
                    className="input py-1.5 text-sm"
                  >
                    <option value="perCopy">{t.modePerCopy}</option>
                    <option value="same">{t.modeSame}</option>
                  </select>
                  {(step.defaultMode ?? "same") === "same" && contacts.length > 0 && (
                    <select
                      value={step.defaultContactId ?? ""}
                      onChange={(e) => updateStep(step.id, { defaultContactId: e.target.value || undefined })}
                      aria-label={t.defaultContact}
                      className="input py-1.5 text-sm"
                    >
                      <option value="">{t.defaultContact}: {t.none}</option>
                      {contacts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                          {c.title ? ` — ${c.title}` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-1">
                  <button type="button" disabled={i === 0} onClick={() => moveStep(i, -1)} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-50 disabled:opacity-30" aria-label="↑">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button type="button" disabled={i === steps.length - 1} onClick={() => moveStep(i, 1)} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-50 disabled:opacity-30" aria-label="↓">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <span className="ms-auto text-xs text-ink-400">
                    {fields.filter((f) => f.stepId === step.id && f.kind === "signature").length} {t.signatureOf}
                  </span>
                  <button type="button" onClick={() => removeStep(step.id)} className="rounded-lg p-1.5 text-accent-800 hover:bg-accent-50" aria-label={t.deleteBox}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ol>
          <button type="button" onClick={addStep} className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-primary-700">
            <Plus className="h-4 w-4" /> {t.addStep}
          </button>
        </section>

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
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(
              [
                ["signature", t.addSignature, PenLine],
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
        </section>

        {selectedField && (
          <section className="card space-y-3 p-4">
            <h2 className="font-bold text-ink-900">{t.boxSettings}</h2>
            {selectedField.kind === "variable" ? (
              <>
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
                </label>
                <label className="block">
                  <span className="label">{t.varType}</span>
                  <select
                    value={selectedField.varType ?? "text"}
                    onChange={(e) => updateField(selectedField.id, { varType: e.target.value as EsignField["varType"] })}
                    className="input"
                  >
                    <option value="text">{t.typeText}</option>
                    <option value="number">{t.typeNumber}</option>
                    <option value="date">{t.typeDate}</option>
                  </select>
                </label>
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
            {selectedField.kind !== "signature" && (
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
                        justifyContent: f.kind === "signature" || f.align === "center" ? "center" : f.align === "end" ? "flex-end" : "flex-start",
                      }}
                      className={`flex touch-none select-none items-center overflow-hidden whitespace-nowrap px-1 leading-none ${
                        preview && f.kind !== "signature" ? "" : "rounded border-2 border-dashed"
                      } ${isSelected ? "ring-2 ring-ink-900 ring-offset-1" : ""} cursor-move`}
                    >
                      <span className={f.kind === "signature" ? "text-[0.65rem] font-bold sm:text-xs" : preview ? "" : "font-bold"}>
                        {preview && f.kind === "variable" ? `${t.sample} ${f.label}` : boxText(f)}
                      </span>
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
