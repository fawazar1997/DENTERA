import { NextResponse } from "next/server";
import { readEsign, type EsignDocument, type EsignPackage, type EsignTemplate } from "./esign";
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

/** A copy as it stands: the signed file once saved, else built from the template and what's signed so far. */
export async function copyPdf(pkg: EsignPackage, doc: EsignDocument, template: EsignTemplate): Promise<Uint8Array> {
  if (doc.signedFileId) return downloadDriveFile(doc.signedFileId);
  const templateBytes = await downloadDriveFile(template.driveFileId);
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
