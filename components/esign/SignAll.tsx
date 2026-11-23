"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, Circle, Clock, Eye, Loader2, PenLine, XCircle } from "lucide-react";
import { esignText } from "@/lib/esignText";
import type { Locale } from "@/lib/i18n";
import { saveSignedCopyAction, signAllAction } from "@/lib/esignSignActions";
import { PdfPages, boxStyle } from "./PdfPages";
import { SignaturePad, type SignaturePadHandle } from "./SignaturePad";

type Box = { page: number; x: number; y: number; w: number; h: number };

export type BulkCopy = {
  id: string;
  label: string;
  /** ready: waiting for this signer · done: signed · later: an earlier step first · closed */
  state: "ready" | "done" | "later" | "closed";
  /** Changes when the copy changes (reloads its preview). */
  version: string;
  boxes: Box[];
};

/**
 * The unified link's page: the request's copies with their state, a
 * preview of each, and one signature for all the selected copies.
 */
export function SignAll({
  token,
  locale,
  copies,
  defaultName,
  savedSignature,
  canSave,
}: {
  token: string;
  locale: Locale;
  copies: BulkCopy[];
  defaultName: string;
  savedSignature?: string;
  canSave: boolean;
}) {
  const t = esignText(locale);
  const router = useRouter();
  const pad = useRef<SignaturePadHandle>(null);
  const ready = copies.filter((c) => c.state === "ready");
  const [selected, setSelected] = useState<Set<string>>(() => new Set(ready.map((c) => c.id)));
  const [open, setOpen] = useState<string | null>(null);
  const [name, setName] = useState(defaultName);
  const [agree, setAgree] = useState(false);
  const [useSaved, setUseSaved] = useState(Boolean(savedSignature));
  const [saveMine, setSaveMine] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(0);

  const chosen = ready.filter((c) => selected.has(c.id));

  async function sign() {
    setError("");
    const png = useSaved ? undefined : pad.current?.toPng();
    if (!useSaved && !png) return setError(t.needDrawing);
    if (name.trim().length < 2) return setError(t.needName);
    if (!agree) return setError(t.needAgree);
    if (!chosen.length) return;
    setBusy(t.signing);
    const result = await signAllAction({
      token,
      docIds: chosen.map((c) => c.id),
      png: png ?? undefined,
      useSaved,
      saveSignature: saveMine && !useSaved,
      typedName: name,
    }).catch(() => ({ ok: false as const, error: "failed" as const }));
    if (!result.ok) {
      setBusy("");
      setError(result.error === "turn" ? t.turnChanged : result.error === "name" ? t.needName : result.error === "image" ? t.needDrawing : t.failed);
      return;
    }
    // Copies this signature completed: saved to Drive one by one.
    for (const [i, id] of result.completed.entries()) {
      setBusy(`${t.bulkSaving} ${i + 1} / ${result.completed.length}`);
      await saveSignedCopyAction({ token, docId: id }).catch(() => undefined);
    }
    setDone(result.signed);
    setBusy("");
    setOpen(chosen[0]?.id ?? null);
    router.refresh();
  }

  const stateLook = {
    ready: { icon: Circle, text: t.bulkReady, tone: "bg-primary-50 text-primary-800" },
    done: { icon: CheckCircle2, text: t.bulkDone, tone: "bg-primary-500 text-white" },
    later: { icon: Clock, text: t.bulkLater, tone: "bg-ink-100 text-ink-600" },
    closed: { icon: XCircle, text: t.bulkClosed, tone: "bg-ink-100 text-ink-500" },
  } as const;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="min-w-0 space-y-3">
        {ready.length > 1 && (
          <label className="flex items-center gap-2 text-sm font-bold text-ink-700">
            <input
              type="checkbox"
              checked={chosen.length === ready.length}
              onChange={(e) => setSelected(new Set(e.target.checked ? ready.map((c) => c.id) : []))}
              className="h-4 w-4 accent-primary-600"
            />
            {t.bulkSelectAll} ({ready.length})
          </label>
        )}
        <ul className="space-y-3">
          {copies.map((c) => {
            const look = stateLook[c.state];
            const isOpen = open === c.id;
            return (
              <li key={c.id} className="card overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 p-4">
                  {c.state === "ready" ? (
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={(e) =>
                        setSelected((s) => {
                          const next = new Set(s);
                          if (e.target.checked) next.add(c.id);
                          else next.delete(c.id);
                          return next;
                        })
                      }
                      aria-label={c.label}
                      className="h-5 w-5 accent-primary-600"
                    />
                  ) : (
                    <look.icon className="h-5 w-5 text-ink-400" />
                  )}
                  <span className="min-w-0 flex-1 truncate font-bold text-ink-900">{c.label}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${look.tone}`}>{look.text}</span>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : c.id)}
                    aria-expanded={isOpen}
                    className="inline-flex items-center gap-1 rounded-full bg-ink-50 px-3 py-1.5 text-xs font-bold text-ink-700 hover:bg-ink-100"
                  >
                    <Eye className="h-3.5 w-3.5" /> {isOpen ? t.bulkHide : t.bulkPreview}
                    <ChevronDown className={`h-3.5 w-3.5 transition ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                </div>
                {isOpen && (
                  <div className="border-t border-ink-100 bg-ink-50 p-3 sm:p-4">
                    <PdfPages
                      url={`/api/sign/all/${token}/${c.id}?v=${encodeURIComponent(c.version)}`}
                      labels={{ loading: t.loading, failed: t.loadFailed, page: t.page }}
                      overlay={(page) =>
                        c.boxes
                          .filter((b) => b.page === page)
                          .map((b, i) =>
                            c.state === "done" ? (
                              <div key={i} style={boxStyle(b)} className="pointer-events-none rounded border-2 border-primary-500">
                                <span className="absolute -top-2.5 start-1 inline-flex items-center gap-1 rounded bg-primary-600 px-1.5 py-0.5 text-[0.6rem] font-bold text-white sm:-top-3 sm:text-xs">
                                  <CheckCircle2 className="h-3 w-3" /> {t.signedHere}
                                </span>
                              </div>
                            ) : c.state === "ready" ? (
                              <div key={i} style={boxStyle(b)} className="flex items-center justify-center rounded border-2 border-primary-500 bg-primary-400/15">
                                <span className="rounded bg-primary-500 px-1.5 py-0.5 text-[0.6rem] font-bold text-white sm:text-xs">{t.signHere}</span>
                              </div>
                            ) : null
                          )
                      }
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <aside className="lg:sticky lg:top-4 lg:self-start">
        {done > 0 && (
          <section role="status" className="card mb-4 border-2 border-primary-300 p-5">
            <h2 className="flex items-center gap-2 font-bold text-ink-950">
              <CheckCircle2 className="h-6 w-6 text-primary-600" /> {t.bulkDoneTitle} ({done})
            </h2>
            <p className="mt-2 text-sm text-ink-600">{t.bulkDoneText}</p>
          </section>
        )}
        {ready.length === 0 ? (
          !done && <p className="card p-5 text-sm font-bold text-ink-600">{t.bulkNoneReady}</p>
        ) : (
          <section className="card p-5">
            <h2 className="flex items-center gap-2 font-bold text-ink-950">
              <PenLine className="h-5 w-5 text-primary-600" /> {t.bulkTitle}
            </h2>
            <p className="mt-1 text-sm text-ink-500">{t.bulkHint}</p>
            {savedSignature && (
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-ink-50 p-1 text-xs font-bold">
                <button type="button" onClick={() => setUseSaved(true)} className={`rounded-lg px-2 py-2 transition ${useSaved ? "bg-white text-ink-950 shadow" : "text-ink-500"}`}>
                  {t.useSaved}
                </button>
                <button type="button" onClick={() => setUseSaved(false)} className={`rounded-lg px-2 py-2 transition ${!useSaved ? "bg-white text-ink-950 shadow" : "text-ink-500"}`}>
                  {t.drawNew}
                </button>
              </div>
            )}
            {useSaved && savedSignature ? (
              <div className="mt-4 rounded-xl border-2 border-primary-300 bg-white p-4">
                <p className="text-xs font-bold text-ink-500">{t.savedSigTitle}</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={savedSignature} alt={t.savedSigTitle} className="mx-auto mt-2 h-28 w-auto max-w-full object-contain" />
              </div>
            ) : (
              <div className="mt-4">
                <SignaturePad ref={pad} labels={{ hint: t.drawHere, clear: t.clear }} />
                {canSave && !savedSignature && (
                  <label className="mt-3 flex items-start gap-2 text-sm text-ink-700">
                    <input type="checkbox" checked={saveMine} onChange={(e) => setSaveMine(e.target.checked)} className="mt-0.5 h-4 w-4 flex-shrink-0 accent-primary-600" />
                    {t.saveMine}
                  </label>
                )}
              </div>
            )}
            <label className="mt-4 block">
              <span className="label">{t.fullName}</span>
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="input" />
            </label>
            <label className="mt-4 flex items-start gap-2 text-sm text-ink-700">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 flex-shrink-0 accent-primary-600" />
              {t.bulkAgree}
            </label>
            {error && (
              <p role="alert" className="mt-3 rounded-lg bg-accent-100 px-3 py-2 text-sm font-bold text-ink-900">
                {error}
              </p>
            )}
            <button type="button" onClick={sign} disabled={Boolean(busy) || !chosen.length} className="btn-primary mt-4 w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
              {busy || `${t.bulkSign} (${chosen.length})`}
            </button>
          </section>
        )}
      </aside>
    </div>
  );
}
