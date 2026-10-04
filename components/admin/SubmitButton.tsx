"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Loader2 } from "lucide-react";

/** Form submit button that shows progress, then a short "Saved" tick. */
export function SubmitButton({
  label,
  savedLabel,
  className = "btn-primary",
}: {
  label: string;
  savedLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  const [saved, setSaved] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending) {
      setSaved(true);
      const timer = setTimeout(() => setSaved(false), 2500);
      return () => clearTimeout(timer);
    }
    wasPending.current = pending;
  }, [pending]);

  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-70`}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : saved ? (
        <Check className="h-4 w-4" />
      ) : null}
      {saved && !pending ? savedLabel : label}
    </button>
  );
}
