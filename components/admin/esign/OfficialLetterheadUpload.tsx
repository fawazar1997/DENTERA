"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { esignText } from "@/lib/esignText";
import { localePath, type Locale } from "@/lib/i18n";
import { uploadOfficialLetterheadAction } from "@/lib/esignActions";
import { pdfFirstPagePng } from "@/components/esign/PdfPages";

/** Settings: uploads the official letterhead (a PDF becomes an image of its first page here). */
export function OfficialLetterheadUpload({ locale, replace }: { locale: Locale; replace: boolean }) {
  const t = esignText(locale);
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      const image = isPdf ? new File([await pdfFirstPagePng(await file.arrayBuffer())], "letterhead.png", { type: "image/png" }) : file;
      const form = new FormData();
      form.set("letterhead", image);
      const result = await uploadOfficialLetterheadAction(form);
      if (!result.ok) throw new Error();
      router.push(localePath(locale, "/admin/esign?tab=settings&saved=official"));
      router.refresh();
    } catch {
      setError(t.officialError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <input
        type="file"
        required
        accept="application/pdf,.pdf,image/png,image/jpeg,image/webp"
        aria-label={t.officialUpload}
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="max-w-[16rem] text-sm file:me-3 file:rounded-full file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-primary-700"
      />
      <button type="submit" disabled={busy || !file} className="btn-primary">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {replace ? t.officialReplace : t.officialUpload}
      </button>
      {error && (
        <p role="alert" className="w-full text-sm font-bold text-accent-800">
          {error}
        </p>
      )}
    </form>
  );
}
