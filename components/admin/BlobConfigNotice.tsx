import { AlertTriangle } from "lucide-react";

export function BlobConfigNotice({ text }: { text: string }) {
  if (process.env.BLOB_READ_WRITE_TOKEN) return null;

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl2 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <p>{text}</p>
    </div>
  );
}
