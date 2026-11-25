"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { REFRESH_TEXT, reasonText } from "@/lib/financeRefreshText";
import type { RefreshState } from "@/lib/financeRefresh";

type Msg = { tone: "ok" | "warn" | "error" | "info"; text: string } | null;

/**
 * «تحديث الآن» (Control Panel only): starts the robot's refresh run, shows it
 * running (also a scheduled run, and after the page is reopened), then
 * refreshes the figures in place.
 */
export function RefreshButton({ locale, initial, block = false }: { locale: string; initial: RefreshState; block?: boolean }) {
  const t = REFRESH_TEXT[locale === "ar" ? "ar" : "en"];
  const router = useRouter();
  const [state, setState] = useState<RefreshState>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  // The run being waited for: its start (a run that reports after it is its result).
  const waitingFrom = useRef<string | null>(initial.running ? initial.since ?? initial.requestedAt ?? new Date().toISOString() : null);
  const time = (iso?: string) =>
    iso ? new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en-GB", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Riyadh" }).format(new Date(iso)) : "";

  const poll = useCallback(async () => {
    const res = await fetch("/api/finance/refresh", { cache: "no-store" }).catch(() => null);
    if (!res?.ok) return;
    const next = (await res.json()) as RefreshState;
    setState(next);
    if (!next.running && waitingFrom.current) {
      const from = waitingFrom.current;
      waitingFrom.current = null;
      // Its result: the first run reported after it started (else the latest one).
      if (next.last && next.last.at >= from.slice(0, 16)) {
        setMsg(next.last.ok ? { tone: "ok", text: t.done } : { tone: "error", text: `${t.failed}: ${reasonText(next.last.reason, locale)}` });
      }
      router.refresh();
    }
  }, [locale, router, t]);

  useEffect(() => {
    if (!state.running) return;
    if (!waitingFrom.current) waitingFrom.current = state.since ?? new Date().toISOString();
    const id = setInterval(poll, 15_000);
    return () => clearInterval(id);
  }, [state.running, state.since, poll]);

  async function press() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/finance/refresh", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        waitingFrom.current = (body as RefreshState).requestedAt ?? new Date().toISOString();
        setState(body as RefreshState);
        return;
      }
      if (res.status === 429) setMsg({ tone: "warn", text: t.wait(Math.max(1, Math.ceil((body.waitSeconds ?? 60) / 60))) });
      else if (res.status === 409) {
        setMsg({ tone: "warn", text: t.busy });
        if (body.state) setState(body.state as RefreshState);
      } else if (res.status === 503) setMsg({ tone: "error", text: t.noToken });
      else if (res.status === 401 || res.status === 403) setMsg({ tone: "error", text: t.unauthorized });
      else setMsg({ tone: "error", text: t.dispatch });
    } catch {
      setMsg({ tone: "error", text: t.dispatch });
    } finally {
      setBusy(false);
    }
  }

  const running = state.running;
  const toneCls = {
    ok: "text-emerald-800",
    warn: "text-amber-800",
    error: "text-red-800",
    info: "text-ink-500",
  } as const;
  return (
    <div className={block ? "space-y-2" : "inline-flex flex-col items-start gap-1"}>
      <button
        type="button"
        onClick={press}
        disabled={running || busy}
        aria-busy={running || busy}
        title={t.takes}
        className="inline-flex h-9 items-center gap-2 rounded-full bg-ink-900 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-ink-500"
      >
        {running || busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
        {running ? (state.since ? t.runningSince(time(state.since)) : t.running) : t.button}
      </button>
      <p role="status" aria-live="polite" className={`text-xs font-bold ${msg ? toneCls[msg.tone] : "sr-only"}`}>
        {msg && (
          <span className="inline-flex items-center gap-1">
            {msg.tone === "ok" ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : msg.tone === "info" ? null : <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />}
            {msg.text}
          </span>
        )}
      </p>
      {block && <p className="text-xs text-ink-500">{t.takes}</p>}
    </div>
  );
}
