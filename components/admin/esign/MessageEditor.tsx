"use client";

import { useRef, useState } from "react";
import { MessageSquareText, RotateCcw } from "lucide-react";
import { esignText } from "@/lib/esignText";
import type { Locale } from "@/lib/i18n";
import { DEFAULT_SIGN_MESSAGE, MAX_MESSAGE_LENGTH, MESSAGE_FIELDS, fillSignMessage } from "@/lib/esignTypes";

/**
 * The message sent with signing links: a text box, buttons that insert
 * {الاسم}, {الرابط}… where the cursor is, and an example of how it arrives.
 * Inside a form it posts as `name`; `onChange` reports it for client forms.
 */
export function MessageEditor({
  locale,
  initial,
  name = "message",
  onChange,
  sample,
}: {
  locale: Locale;
  initial?: string;
  name?: string;
  onChange?: (value: string) => void;
  /** Values for the example (defaults to sample ones). */
  sample?: { name?: string; role?: string; title?: string; copy?: string; ref?: string };
}) {
  const t = esignText(locale);
  const box = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(initial?.trim() || DEFAULT_SIGN_MESSAGE);

  function update(next: string) {
    setValue(next);
    onChange?.(next);
  }

  function insert(field: string) {
    const el = box.current;
    const token = `{${field}}`;
    if (!el) return update(value + token);
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    update(value.slice(0, start) + token + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  const example = fillSignMessage(value, {
    name: sample?.name || t.sampleName,
    role: sample?.role || t.sampleRole,
    title: sample?.title || "عقود أطباء 2027",
    copy: sample?.copy || t.sampleCopy,
    ref: sample?.ref || "ES-2026-0001",
    link: "https://dentera.com.sa/sign/…",
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {MESSAGE_FIELDS.map((field) => (
            <button
              key={field}
              type="button"
              onClick={() => insert(field)}
              className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-800 hover:bg-primary-100"
            >
              {`{${field}}`}
            </button>
          ))}
        </div>
        <textarea
          ref={box}
          name={name}
          value={value}
          onChange={(e) => update(e.target.value)}
          rows={9}
          maxLength={MAX_MESSAGE_LENGTH}
          dir="rtl"
          aria-label={t.messageTitle}
          className="input leading-relaxed"
        />
        <button
          type="button"
          onClick={() => update(DEFAULT_SIGN_MESSAGE)}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-ink-500 hover:text-ink-900"
        >
          <RotateCcw className="h-3.5 w-3.5" /> {t.resetMessage}
        </button>
      </div>
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-ink-500">
          <MessageSquareText className="h-4 w-4" /> {t.messageExample}
        </p>
        <div className="rounded-2xl rounded-tr-sm bg-primary-50 p-4 text-sm leading-relaxed text-ink-900 shadow-sm ring-1 ring-black/5">
          <p className="whitespace-pre-line break-words" dir="rtl">
            {example}
          </p>
        </div>
      </div>
    </div>
  );
}
