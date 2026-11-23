import { findBulk } from "@/lib/esign";
import { copyPdf, notFound, pdfResponse } from "@/lib/esignServe";

export const dynamic = "force-dynamic";

/** One copy as it stands, by a unified link (one signer, every copy of a request). */
export async function GET(_request: Request, { params }: { params: { token: string; docId: string } }) {
  const found = await findBulk(params.token);
  const doc = found?.pkg.documents.find((d) => d.id === params.docId);
  if (!found?.template || !doc || found.pkg.status === "preparing" || doc.status === "cancelled" || found.pkg.status === "cancelled") return notFound();
  try {
    return pdfResponse(await copyPdf(found.pkg, doc, found.template), `${found.pkg.title} - ${doc.label}.pdf`);
  } catch {
    return notFound();
  }
}
