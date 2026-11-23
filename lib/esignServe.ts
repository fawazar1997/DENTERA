import { NextResponse } from "next/server";
import { basePdfPath, isDocumentTemplate, readEsign, type EsignDocument, type EsignPackage, type EsignTemplate } from "./esign";
import { readPrivateFile } from "./privateBlob";
import { buildEsignPdf } from "./esignPdf";
import { downloadDriveFile } from "./googleDrive";

// Serving e-signature PDFs: never cached, never indexed, shown in the page.

export function pdfResponse(bytes: Uint8Array, name = "document.pdf"): NextResponse {
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    },
  });
}

export const notFound = () => NextResponse.json({ ok: false }, { status: 404, headers: { "Cache-Control": "no-store" } });

/** The PDF a copy is built on: the template's from Drive, or a document copy's own base PDF. */
export async function copyBaseBytes(template: EsignTemplate, doc: EsignDocument): Promise<Uint8Array> {
  if (isDocumentTemplate(template)) {
    const bytes = await readPrivateFile(basePdfPath(doc.id));
    if (!bytes) throw new Error("e-sign: the copy's pages are missing");
    return bytes;
  }
  return downloadDriveFile(template.driveFileId);
}

/** A copy as it stands: the signed file once saved, else built from its base and what's signed so far. */
export async function copyPdf(pkg: EsignPackage, doc: EsignDocument, template: EsignTemplate): Promise<Uint8Array> {
  if (doc.signedFileId) return downloadDriveFile(doc.signedFileId);
  const templateBytes = await copyBaseBytes(template, doc);
  return buildEsignPdf({ template, doc, templateBytes, title: `${pkg.ref} — ${pkg.title}` });
}

/** Finds a copy by its id (control panel). */
export async function findCopy(docId: string) {
  const file = await readEsign();
  for (const pkg of file.packages) {
    const doc = pkg.documents.find((d) => d.id === docId);
    if (doc) return { pkg, doc, template: file.templates.find((t) => t.id === pkg.templateId) };
  }
  return null;
}
