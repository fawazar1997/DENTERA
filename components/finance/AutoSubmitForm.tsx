"use client";

import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";

/**
 * The dashboard's filters: a change to the date or branch shows it at once
 * (no «عرض» button). A plain GET form underneath, so it still works
 * before the page's script has loaded.
 */
export function AutoSubmitForm({ action, className, children }: { action: string; className?: string; children: ReactNode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form
      method="get"
      action={action}
      className={`${className ?? ""} ${pending ? "opacity-70" : ""}`}
      aria-busy={pending}
      onChange={(e) => {
        const form = e.currentTarget;
        const query = new URLSearchParams();
        for (const [k, v] of new FormData(form)) if (String(v)) query.set(k, String(v));
        const q = query.toString();
        start(() => router.push(q ? `${action}?${q}` : action, { scroll: false }));
      }}
    >
      {children}
    </form>
  );
}
