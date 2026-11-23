"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { EsignText } from "@/lib/esignText";
import { STEP_COLORS, type EsignContact, type EsignStep } from "@/lib/esignTypes";

const newId = () => Math.random().toString(36).slice(2, 10);

export const stepColorAt = (index: number) => STEP_COLORS[Math.max(0, index) % STEP_COLORS.length];

/** A template's signing procedure: roles in order, each with its default signer. */
export function StepsEditor({
  steps,
  contacts,
  t,
  onChange,
  onRemove,
  countOf,
}: {
  steps: EsignStep[];
  contacts: EsignContact[];
  t: EsignText;
  onChange: (steps: EsignStep[]) => void;
  /** Called before a step is removed (to drop what belongs to it). */
  onRemove?: (id: string) => void;
  /** e.g. "2 توقيع" under each step. */
  countOf?: (stepId: string) => string;
}) {
  const update = (id: string, patch: Partial<EsignStep>) => onChange(steps.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const move = (index: number, by: number) => {
    const next = [...steps];
    const [step] = next.splice(index, 1);
    next.splice(index + by, 0, step);
    onChange(next);
  };

  return (
    <section className="card p-4">
      <h2 className="font-bold text-ink-900">{t.procedure}</h2>
      <p className="mt-1 text-xs text-ink-500">{t.procedureHint}</p>
      <ol className="mt-3 space-y-3">
        {steps.map((step, i) => (
          <li key={step.id} className="rounded-xl border border-ink-100 p-3" style={{ borderInlineStartWidth: 4, borderInlineStartColor: stepColorAt(i) }}>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: stepColorAt(i) }}>
                {i + 1}
              </span>
              <input
                value={step.role}
                onChange={(e) => update(step.id, { role: e.target.value })}
                placeholder={t.stepRole}
                aria-label={t.stepRole}
                className="input py-1.5"
              />
            </div>
            <div className="mt-2 grid gap-2">
              <select
                value={step.defaultMode ?? "same"}
                onChange={(e) => update(step.id, { defaultMode: e.target.value as EsignStep["defaultMode"] })}
                aria-label={t.stepDefault}
                className="input py-1.5 text-sm"
              >
                <option value="perCopy">{t.modePerCopy}</option>
                <option value="same">{t.modeSame}</option>
              </select>
              {(step.defaultMode ?? "same") === "same" && contacts.length > 0 && (
                <select
                  value={step.defaultContactId ?? ""}
                  onChange={(e) => update(step.id, { defaultContactId: e.target.value || undefined })}
                  aria-label={t.defaultContact}
                  className="input py-1.5 text-sm"
                >
                  <option value="">
                    {t.defaultContact}: {t.none}
                  </option>
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
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-50 disabled:opacity-30" aria-label="↑">
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={i === steps.length - 1}
                onClick={() => move(i, 1)}
                className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-50 disabled:opacity-30"
                aria-label="↓"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              {countOf && <span className="ms-auto text-xs text-ink-400">{countOf(step.id)}</span>}
              <button
                type="button"
                onClick={() => {
                  onRemove?.(step.id);
                  onChange(steps.filter((s) => s.id !== step.id));
                }}
                className={`${countOf ? "" : "ms-auto"} rounded-lg p-1.5 text-accent-800 hover:bg-accent-50`}
                aria-label={t.deleteBox}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={() => onChange([...steps, { id: newId(), role: "", defaultMode: steps.length === 0 ? "perCopy" : "same" }])}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-primary-700"
      >
        <Plus className="h-4 w-4" /> {t.addStep}
      </button>
    </section>
  );
}
