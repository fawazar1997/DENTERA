"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { SOCIAL_ICON_PATHS } from "@/lib/socialIconPaths";

/** A signer link's buttons: copy it, open it, or open WhatsApp with a ready message. */
export function LinkActions({
  url,
  whatsappUrl,
  labels,
  highlight = false,
}: {
  url: string;
  whatsappUrl?: string;
  labels: { copy: string; copied: string; whatsapp: string; open: string };
  highlight?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
          } catch {
            window.prompt(labels.copy, url);
          }
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
          highlight ? "bg-ink-900 text-white hover:bg-ink-800" : "bg-ink-100 text-ink-700 hover:bg-ink-200"
        }`}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? labels.copied : labels.copy}
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1.5 text-xs font-bold text-ink-700 transition hover:bg-ink-200"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        {labels.open}
      </a>
      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
            highlight ? "bg-primary-500 text-white hover:bg-primary-600" : "bg-primary-50 text-primary-700 hover:bg-primary-100"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-3.5 w-3.5">
            <path d={SOCIAL_ICON_PATHS.whatsapp} />
          </svg>
          {labels.whatsapp}
        </a>
      )}
    </span>
  );
}
