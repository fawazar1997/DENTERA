import { PDFDocument, StandardFonts, rgb, type PDFImage } from "pdf-lib";
import { readPrivateFile } from "./privateBlob";
import { imagePath, stampTime, textFieldsOf, type EsignDocument, type EsignTemplate } from "./esign";

// Builds a copy's PDF: the template with that copy's values and names
// (images rendered in the admin's browser, so Arabic is shaped exactly as
// on screen), each signature made so far, and very faintly under each
// signature the date and time it was signed (Riyadh).

const STAMP_SIZE = 5.5;

export async function buildEsignPdf(input: {
  template: EsignTemplate;
  doc: EsignDocument;
  templateBytes: Uint8Array;
  title?: string;
}): Promise<Uint8Array> {
  const { template, doc } = input;
  const pdf = await PDFDocument.load(input.templateBytes, { ignoreEncryption: true });
  const pages = pdf.getPages();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const images = new Map<string, PDFImage | null>();

  async function image(name: string): Promise<PDFImage | null> {
    if (!images.has(name)) {
      const bytes = await readPrivateFile(imagePath(doc.id, name));
      images.set(name, bytes ? await pdf.embedPng(bytes).catch(() => null) : null);
    }
    return images.get(name) ?? null;
  }

  // Variable values and signer names.
  for (const field of textFieldsOf(template)) {
    const page = pages[field.page];
    if (!page) continue;
    const png = await image(`f-${field.id}`);
    if (!png) continue;
    const { width, height } = page.getSize();
    page.drawImage(png, {
      x: field.x * width,
      y: height - (field.y + field.h) * height,
      width: field.w * width,
      height: field.h * height,
    });
  }

  // Signatures, each fitted inside its box, with the faint time under it.
  for (const field of template.fields) {
    if (field.kind !== "signature") continue;
    const signer = doc.signers.find((s) => s.stepId === field.stepId);
    if (!signer?.signedAt) continue;
    const page = pages[field.page];
    if (!page) continue;
    const png = await image(`s-${signer.stepId}`);
    if (!png) continue;
    const { width, height } = page.getSize();
    const box = {
      x: field.x * width,
      y: height - (field.y + field.h) * height,
      w: field.w * width,
      h: field.h * height,
    };
    const scale = Math.min(box.w / png.width, box.h / png.height);
    const w = png.width * scale;
    const h = png.height * scale;
    page.drawImage(png, { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, width: w, height: h });

    const stamp = stampTime(signer.signedAt);
    const textWidth = font.widthOfTextAtSize(stamp, STAMP_SIZE);
    const below = box.y - STAMP_SIZE - 1.5;
    page.drawText(stamp, {
      x: box.x + (box.w - textWidth) / 2,
      y: below > 2 ? below : box.y + 1.5,
      size: STAMP_SIZE,
      font,
      color: rgb(0.55, 0.57, 0.62),
      opacity: 0.75,
    });
  }

  if (input.title) pdf.setTitle(input.title);
  pdf.setProducer("Dentera e-signature");
  pdf.setModificationDate(new Date());
  return pdf.save();
}
