"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Read-only text with a copy button (for sharing links). */
export function CopyField({
  value,
  copyLabel,
  copiedLabel,
}: {
  value: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-stretch gap-2">
      <input
        readOnly
        value={value}
        dir="ltr"
        onFocus={(e) => e.currentTarget.select()}
        className="input min-w-0 flex-1 font-mono text-xs"
      />
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          } catch {
            // Clipboard unavailable — the field is selectable instead.
          }
        }}
        className="btn-primary flex-shrink-0 px-4"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? copiedLabel : copyLabel}
      </button>
    </div>
  );
}
