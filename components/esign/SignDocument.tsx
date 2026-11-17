"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PenLine, XCircle } from "lucide-react";
import { esignText } from "@/lib/esignText";
import type { Locale } from "@/lib/i18n";
import { declineDocumentAction, signDocumentAction } from "@/lib/esignSignActions";
import { PdfPages, boxStyle } from "./PdfPages";
import { SignaturePad, type SignaturePadHandle } from "./SignaturePad";

type Box = { page: number; x: number; y: number; w: number; h: number };

/**
 * The signing page's document and, on the signer's turn, the pad: draw,
 * type the full name, confirm, sign (or decline with a reason).
 */
export function SignDocument({
  token,
  locale,
  canSign,
  boxes,
  defaultName,
}: {
  token: string;
  locale: Locale;
  canSign: boolean;
  /** This signer's signature boxes, outlined on the pages. */
  boxes: Box[];
  defaultName: string;
}) {
  const t = esignText(locale);
  const router = useRouter();
  const pad = useRef<SignaturePadHandle>(null);
  const [name, setName] = useState(defaultName);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [declining, setDeclining] = useState(false);
  const [note, setNote] = useState("");

  async function sign() {
    setError("");
    const png = pad.current?.toPng();
    if (!png) return setError(t.needDrawing);
    if (name.trim().length < 2) return setError(t.needName);
    if (!agree) return setError(t.needAgree);
    setBusy(true);
    const result = await signDocumentAction({ token, png, typedName: name }).catch(() => ({ ok: false as const, error: "failed" as const }));
    if (result.ok) {
      router.refresh();
      return;
    }
    setBusy(false);
    setError(result.error === "turn" ? t.turnChanged : result.error === "name" ? t.needName : result.error === "image" ? t.needDrawing : t.failed);
  }

  async function decline() {
    setBusy(true);
    const result = await declineDocumentAction({ token, note }).catch(() => ({ ok: false }));
    if (result.ok) {
      router.refresh();
      return;
    }
    setBusy(false);
    setError(t.turnChanged);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="min-w-0">
        <PdfPages
          url={`/api/sign/${token}`}
          labels={{ loading: t.loading, failed: t.loadFailed, page: t.page }}
          overlay={(page) =>
            canSign
              ? boxes
                  .filter((b) => b.page === page)
                  .map((b, i) => (
                    <div
                      key={i}
                      style={boxStyle(b)}
                      className="flex items-center justify-center rounded border-2 border-primary-500 bg-primary-400/15 motion-safe:animate-pulse"
                    >
                      <span className="rounded bg-primary-500 px-1.5 py-0.5 text-[0.6rem] font-bold text-white sm:text-xs">{t.signHere}</span>
                    </div>
                  ))
              : null
          }
        />
      </div>

      {canSign && (
        <aside id="sign-pad" className="scroll-mt-4 lg:sticky lg:top-4 lg:self-start">
          <section className="card p-5">
            <h2 className="flex items-center gap-2 font-bold text-ink-950">
              <PenLine className="h-5 w-5 text-primary-600" /> {t.yourTurn}
            </h2>
            <p className="mt-1 text-sm text-ink-500">{t.yourBoxes}</p>
            <div className="mt-4">
              <SignaturePad ref={pad} labels={{ hint: t.drawHere, clear: t.clear }} />
            </div>
            <label className="mt-4 block">
              <span className="label">{t.fullName}</span>
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="input" />
            </label>
            <label className="mt-4 flex items-start gap-2 text-sm text-ink-700">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 flex-shrink-0 accent-primary-600" />
              {t.agree}
            </label>
            {error && (
              <p role="alert" className="mt-3 rounded-lg bg-accent-100 px-3 py-2 text-sm font-bold text-ink-900">
                {error}
              </p>
            )}
            <button type="button" onClick={sign} disabled={busy} className="btn-primary mt-4 w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
              {busy ? t.signing : t.sign}
            </button>

            <div className="mt-5 border-t border-ink-100 pt-4">
              {declining ? (
                <div className="space-y-2">
                  <label className="block">
                    <span className="label">{t.declineReason}</span>
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} className="input" />
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={decline} disabled={busy} className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-bold text-ink-900">
                      {t.sendDecline}
                    </button>
                    <button type="button" onClick={() => setDeclining(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-ink-600">
                      {t.cancel}
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setDeclining(true)} className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-500 hover:text-accent-800">
                  <XCircle className="h-4 w-4" /> {t.decline}
                </button>
              )}
            </div>
          </section>
        </aside>
      )}
    </div>
  );
}
