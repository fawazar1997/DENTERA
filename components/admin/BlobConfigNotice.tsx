import { AlertTriangle } from "lucide-react";
import { isBlobConfigured } from "@/lib/blob";

export function BlobConfigNotice({ text }: { text: string }) {
  if (isBlobConfigured()) return null;

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl2 border border-accent-300 bg-accent-50 p-4 text-sm text-ink-800">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <p>{text}</p>
    </div>
  );
}
