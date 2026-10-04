"use client";

import { useRef } from "react";

/** A switch that saves immediately when flipped (submits its form). */
export function ToggleSwitch({
  action,
  name,
  defaultChecked,
  label,
  onLabel,
  offLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  name: string;
  defaultChecked: boolean;
  label: string;
  onLabel: string;
  offLabel: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action}>
      <label className="flex cursor-pointer items-center gap-3">
        <span className="relative inline-flex">
          <input
            type="checkbox"
            name={name}
            defaultChecked={defaultChecked}
            onChange={() => formRef.current?.requestSubmit()}
            className="peer sr-only"
          />
          <span className="h-6 w-11 rounded-full bg-ink-200 transition peer-checked:bg-primary-500 peer-focus-visible:shadow-focus" />
          <span className="absolute start-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5 rtl:peer-checked:-translate-x-5" />
        </span>
        <span className="text-sm font-medium text-ink-800">{label}</span>
        <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-600">
          {defaultChecked ? onLabel : offLabel}
        </span>
      </label>
    </form>
  );
}
