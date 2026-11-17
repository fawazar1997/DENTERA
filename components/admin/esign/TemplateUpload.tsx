"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { esignText } from "@/lib/esignText";
import type { Locale } from "@/lib/i18n";
import { localePath } from "@/lib/i18n";
import { putToDrive } from "@/lib/putToDrive";
import {
  finishTemplateUploadAction,
  startTemplateUploadAction,
  uploadTemplateFileAction,
} from "@/lib/esignActions";
import { MAX_TEMPLATE_BYTES } from "@/lib/esignTypes";
import { pdfPageSizes } from "@/components/esign/PdfPages";

/** Uploads a template PDF to the «القوالب» Drive folder, then opens its editor. */
export function TemplateUpload({ locale, disabled }: { locale: Locale; disabled?: boolean }) {
  const t = esignText(locale);
  const router = useRouter();
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !name.trim()) return;
    if (file.type !== "application/pdf" || file.size > MAX_TEMPLATE_BYTES) {
      setError(locale === "ar" ? "اختر ملف PDF لا يزيد عن 15 ميجابايت." : "Choose a PDF up to 15 MB.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const pages = await pdfPageSizes(await file.arrayBuffer());
      const start = await startTemplateUploadAction({ name, size: file.size });
      if (!start.ok) throw new Error(start.error === "folder" ? t.folderMissing : t.driveDown);
      let id: string | null = null;
      try {
        const driveFileId = await putToDrive(start.uploadUrl, file, "application/pdf", setProgress);
        const done = await finishTemplateUploadAction({ name, fileName: file.name, driveFileId, pages });
        if (done.ok) id = done.id;
      } catch {
        // The browser couldn't reach Google: send it through the site instead.
        const form = new FormData();
        form.set("file", file);
        form.set("name", name);
        form.set("pages", JSON.stringify(pages));
        const done = await uploadTemplateFileAction(form);
        if (done.ok) id = done.id;
      }
      if (!id) throw new Error(t.failed);
      router.push(localePath(locale, `/admin/esign?template=${id}`));
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t.failed);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label className="block">
        <span className="label">{t.templateName}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} className="input" />
      </label>
      <label className="block">
        <span className="label">{t.chooseFile}</span>
        <input
          type="file"
          accept="application/pdf,.pdf"
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="input file:me-3 file:rounded-full file:border-0 file:bg-primary-50 file:px-3 file:py-1 file:text-sm file:font-bold file:text-primary-700"
        />
      </label>
      <button type="submit" disabled={busy || disabled} className="btn-primary justify-center">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {busy ? `${t.uploading} ${Math.round(progress * 100)}%` : t.upload}
      </button>
      {error && <p role="alert" className="text-sm font-bold text-accent-800 sm:col-span-3">{error}</p>}
    </form>
  );
}
