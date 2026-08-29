"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteButton({
  action,
  id,
  locale,
  label,
  confirmText,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  locale: string;
  label: string;
  confirmText: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(confirmText)) return;
        const formData = new FormData();
        formData.set("id", id);
        formData.set("locale", locale);
        startTransition(async () => {
          await action(formData);
          router.refresh();
        });
      }}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
