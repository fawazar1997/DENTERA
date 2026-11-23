"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { EsignText } from "@/lib/esignText";
import type { EsignVarType, EsignVariable } from "@/lib/esignTypes";
import { displayValue, normalizeValue, type ValueLang } from "@/lib/esignValues";

/**
 * A template's variables: name, type, default value, fixed for every copy,
 * amount in words. Renaming one renames it wherever it is used.
 */
export function VariablesPanel({
  variables,
  usage,
  t,
  lang,
  onChange,
  onRename,
  canAdd = true,
}: {
  variables: EsignVariable[];
  /** How many times each variable is used. */
  usage: Record<string, number>;
  t: EsignText;
  lang: ValueLang;
  onChange: (variables: EsignVariable[]) => void;
  onRename: (from: string, to: string) => void;
  canAdd?: boolean;
}) {
  const update = (name: string, patch: Partial<EsignVariable>) =>
    onChange(variables.map((v) => (v.name === name ? { ...v, ...patch } : v)));

  return (
    <section className="card p-4">
      <h2 className="font-bold text-ink-900">{t.variablesTitle}</h2>
      <p className="mt-1 text-xs text-ink-500">{t.variablesHint}</p>
      <ul className="mt-3 space-y-3">
        {variables.map((v) => (
          <VariableRow
            key={v.name}
            variable={v}
            used={usage[v.name] ?? 0}
            t={t}
            lang={lang}
            taken={(name) => variables.some((x) => x.name === name && x.name !== v.name)}
            onUpdate={(patch) => update(v.name, patch)}
            onRename={(to) => onRename(v.name, to)}
            onDelete={() => onChange(variables.filter((x) => x.name !== v.name))}
          />
        ))}
      </ul>
      {canAdd && (
        <button
          type="button"
          onClick={() => {
            const name = window.prompt(t.newVariablePrompt)?.replace(/[{}]/g, "").trim();
            if (!name) return;
            if (variables.some((x) => x.name === name)) return window.alert(t.varNameTaken);
            onChange([...variables, { name, type: "text" }]);
          }}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-primary-700"
        >
          <Plus className="h-4 w-4" /> {t.newVariable}
        </button>
      )}
    </section>
  );
}

function VariableRow({
  variable: v,
  used,
  t,
  lang,
  taken,
  onUpdate,
  onRename,
  onDelete,
}: {
  variable: EsignVariable;
  used: number;
  t: EsignText;
  lang: ValueLang;
  taken: (name: string) => boolean;
  onUpdate: (patch: Partial<EsignVariable>) => void;
  onRename: (to: string) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(v.name);
  const [defaultText, setDefaultText] = useState(v.default ?? "");
  const check = normalizeValue(defaultText, v.type);
  const shown = check.ok && check.value ? displayValue(check.value, v, lang) : "";

  function commitName() {
    const next = name.replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
    if (!next || next === v.name) return setName(v.name);
    if (taken(next)) {
      window.alert(t.varNameTaken);
      return setName(v.name);
    }
    onRename(next);
  }

  function commitDefault() {
    const normal = normalizeValue(defaultText, v.type);
    if (!normal.ok) return;
    setDefaultText(normal.value);
    onUpdate({ default: normal.value || undefined, fixed: normal.value ? v.fixed : undefined });
  }

  return (
    <li className="rounded-xl border border-ink-100 p-3">
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          aria-label={t.varName}
          className="input py-1.5 font-bold"
        />
        <button
          type="button"
          disabled={used > 0}
          onClick={onDelete}
          title={used > 0 ? `${t.usedTimes}: ${used}` : t.deleteVar}
          aria-label={t.deleteVar}
          className="rounded-lg p-1.5 text-accent-800 hover:bg-accent-50 disabled:opacity-30"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <select
          value={v.type}
          onChange={(e) => {
            const type = e.target.value as EsignVarType;
            const normal = normalizeValue(defaultText, type);
            onUpdate({ type, words: type === "amount" ? v.words : undefined, default: normal.ok && normal.value ? normal.value : undefined });
            if (normal.ok) setDefaultText(normal.value);
          }}
          aria-label={t.varType}
          className="input py-1.5 text-sm"
        >
          <option value="text">{t.typeText}</option>
          <option value="number">{t.typeNumber}</option>
          <option value="amount">{t.typeAmount}</option>
          <option value="date">{t.typeDate}</option>
        </select>
        <input
          value={defaultText}
          onChange={(e) => setDefaultText(e.target.value)}
          onBlur={commitDefault}
          placeholder={v.type === "date" ? t.dateHint : t.defaultValue}
          aria-label={t.defaultValue}
          aria-invalid={!check.ok}
          dir={v.type === "text" ? undefined : "ltr"}
          className={`input py-1.5 text-sm ${check.ok ? "" : "border-accent-500 bg-accent-50"}`}
        />
      </div>
      {shown && v.type !== "text" && <p className="mt-1 text-xs text-ink-500">{shown}</p>}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-700">
        <label className="inline-flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={Boolean(v.fixed)}
            disabled={!v.default}
            onChange={(e) => onUpdate({ fixed: e.target.checked || undefined })}
          />
          {t.fixedValue}
        </label>
        {v.type === "amount" && (
          <label className="inline-flex items-center gap-1.5">
            <input type="checkbox" checked={Boolean(v.words)} onChange={(e) => onUpdate({ words: e.target.checked || undefined })} />
            {t.inWords}
          </label>
        )}
        <span className={`ms-auto ${used ? "text-ink-400" : "font-bold text-accent-800"}`}>
          {used ? `${t.usedTimes}: ${used}` : t.unusedVar}
        </span>
      </div>
    </li>
  );
}
