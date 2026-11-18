"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { PdfPages } from "@/components/esign/PdfPages";

/** An applicant's file shown in the page: PDF pages, an image, or nothing (Word: download). */
export function FilePreview({
  url,
  mimeType,
  labels,
  startOpen = false,
}: {
  url: string;
  mimeType: string;
  labels: { show: string; hide: string; loading: string; failed: string; page: string };
  startOpen?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const pdf = mimeType === "application/pdf";
  const image = mimeType.startsWith("image/");
  if (!pdf && !image) return null;
  return (
    <div className="mt-3">
      <button type="button" onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-700">
        {open ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        {open ? labels.hide : labels.show}
      </button>
      {open && (
        <div className="mt-3 max-h-[75vh] overflow-y-auto rounded-xl bg-ink-50 p-3">
          {pdf ? (
            <PdfPages url={url} labels={{ loading: labels.loading, failed: labels.failed, page: labels.page }} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="mx-auto max-w-full rounded-lg" />
          )}
        </div>
      )}
    </div>
  );
}
