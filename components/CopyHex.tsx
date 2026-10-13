"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Small button that copies a color code (e.g. #0CB8CD). */
export function CopyHex({
  value,
  label,
  copiedLabel,
}: {
  value: string;
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard blocked — the code is visible to copy by hand.
        }
      }}
      className="inline-flex items-center gap-1 rounded-full bg-ink-50 px-2.5 py-1 text-xs font-bold text-ink-700 transition hover:bg-primary-50 hover:text-primary-700"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? copiedLabel : label}
    </button>
  );
}
