"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Check, ChevronsUpDown, Search, X } from "lucide-react";

export type PickerDoctor = { id: string; name: string; other: string };

/**
 * Choosing the partner doctors from the official list (Control Panel →
 * Doctors): a dropdown with search and check boxes, the chosen ones as chips
 * in the order shown on the dashboard (↑ moves one up). Submits each chosen
 * doctor's id as «partners». An entry that names no official doctor stays as
 * written (shown with a warning) until removed.
 */
export function PartnerPicker({
  doctors,
  initial,
  labels,
}: {
  doctors: PickerDoctor[];
  /** Ids (or unmatched names as written), in order. */
  initial: string[];
  labels: { choose: string; search: string; none: string; notFound: string; moveUp: string; remove: string };
}) {
  const [chosen, setChosen] = useState<string[]>(initial);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const byId = useMemo(() => new Map(doctors.map((d) => [d.id, d])), [doctors]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const q = query.trim().toLowerCase();
  const shown = doctors.filter((d) => !q || d.name.toLowerCase().includes(q) || d.other.toLowerCase().includes(q));
  const toggle = (id: string) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const moveUp = (i: number) =>
    setChosen((c) => {
      if (i <= 0) return c;
      const next = [...c];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });

  return (
    <div ref={box} className="relative mt-2">
      {chosen.map((id) => (
        <input key={id} type="hidden" name="partners" value={id} />
      ))}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="input flex min-h-[2.75rem] items-center justify-between gap-2 text-start"
      >
        <span className="text-ink-600">
          {labels.choose} {chosen.length ? `(${chosen.length})` : ""}
        </span>
        <ChevronsUpDown className="h-4 w-4 flex-shrink-0 text-ink-500" />
      </button>

      {open && (
        <div className="absolute inset-x-0 z-20 mt-1 rounded-2xl border border-ink-100 bg-white p-2 shadow-card">
          <label className="flex items-center gap-2 rounded-xl bg-sand-50 px-3 py-2">
            <Search className="h-4 w-4 text-ink-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={labels.search}
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
          <ul className="mt-1 max-h-72 overflow-auto" role="listbox" aria-multiselectable="true">
            {shown.map((d) => {
              const on = chosen.includes(d.id);
              return (
                <li key={d.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => toggle(d.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-start text-sm transition ${on ? "bg-primary-50" : "hover:bg-sand-50"}`}
                  >
                    <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md ring-1 ${on ? "bg-ink-900 text-white ring-ink-900" : "ring-ink-200"}`}>
                      {on && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-ink-900">{d.name}</span>
                      <span className="block truncate text-xs text-ink-500" dir="auto">
                        {d.other}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {!shown.length && <li className="px-3 py-2 text-sm text-ink-500">{labels.none}</li>}
          </ul>
        </div>
      )}

      {chosen.length > 0 && (
        <ol className="mt-3 space-y-1.5">
          {chosen.map((id, i) => {
            const d = byId.get(id);
            return (
              <li key={id} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ring-1 ${d ? "bg-sand-50 ring-ink-100" : "bg-red-50 ring-red-100"}`}>
                <span className="w-5 text-xs font-bold text-ink-400">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-bold text-ink-900">{d ? d.name : id}</span>
                {!d && <span className="text-xs font-bold text-red-800">{labels.notFound}</span>}
                <button type="button" onClick={() => moveUp(i)} disabled={i === 0} aria-label={labels.moveUp} className="rounded-lg p-1 text-ink-500 hover:bg-white disabled:opacity-30">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => toggle(id)} aria-label={labels.remove} className="rounded-lg p-1 text-ink-500 hover:bg-white hover:text-red-800">
                  <X className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
