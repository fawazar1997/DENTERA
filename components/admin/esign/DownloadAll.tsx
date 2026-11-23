"use client";

import { useState } from "react";
import { Download, FileStack, Loader2 } from "lucide-react";
import { esignText } from "@/lib/esignText";
import type { Locale } from "@/lib/i18n";

const safe = (name: string) => name.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 120) || "document";

function save(bytes: Uint8Array, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([bytes as unknown as BlobPart], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * A request's completed copies in one download: a ZIP of the signed PDFs,
 * or all of them merged into one PDF (for printing). Built in the browser
 * from each copy's file.
 */
export function DownloadAll({
  copies,
  total,
  title,
  locale,
}: {
  copies: { id: string; label: string }[];
  total: number;
  /** «ES-2026-0007 - عقود 2027» */
  title: string;
  locale: Locale;
}) {
  const t = esignText(locale);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function fetchAll(): Promise<{ label: string; bytes: Uint8Array }[]> {
    const out: { label: string; bytes: Uint8Array }[] = [];
    for (const [i, copy] of copies.entries()) {
      setBusy(`${t.downloadPreparing} ${i + 1} / ${copies.length}`);
      const res = await fetch(`/api/admin/esign/doc/${copy.id}`, { cache: "no-store" });
      if (!res.ok) throw new Error("download");
      out.push({ label: copy.label, bytes: new Uint8Array(await res.arrayBuffer()) });
    }
    return out;
  }

  async function zip() {
    setError("");
    try {
      const files = await fetchAll();
      const { zipSync } = await import("fflate");
      const used = new Set<string>();
      const entries: Record<string, Uint8Array> = {};
      for (const f of files) {
        let name = `${safe(f.label)}.pdf`;
        for (let n = 2; used.has(name); n++) name = `${safe(f.label)} (${n}).pdf`;
        used.add(name);
        entries[name] = f.bytes;
      }
      // PDFs are already compressed: stored as they are.
      save(zipSync(entries, { level: 0 }), `${safe(title)}.zip`, "application/zip");
    } catch {
      setError(t.downloadFailed);
    } finally {
      setBusy("");
    }
  }

  async function merged() {
    setError("");
    try {
      const files = await fetchAll();
      const { PDFDocument } = await import("pdf-lib");
      const out = await PDFDocument.create();
      for (const f of files) {
        const src = await PDFDocument.load(f.bytes, { ignoreEncryption: true });
        for (const page of await out.copyPages(src, src.getPageIndices())) out.addPage(page);
      }
      out.setTitle(title);
      save(await out.save(), `${safe(title)}.pdf`, "application/pdf");
    } catch {
      setError(t.downloadFailed);
    } finally {
      setBusy("");
    }
  }

  if (!copies.length) return null;
  const count = copies.length < total ? ` (${copies.length}/${total})` : "";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={zip} disabled={Boolean(busy)} className="btn-primary">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {busy || `${t.downloadAllZip}${count}`}
      </button>
      <button type="button" onClick={merged} disabled={Boolean(busy)} className="btn-outline">
        <FileStack className="h-4 w-4" /> {t.downloadAllPdf}
        {count}
      </button>
      {error && (
        <p role="alert" className="w-full text-sm font-bold text-accent-800">
          {error}
        </p>
      )}
    </div>
  );
}
