import { NextRequest } from "next/server";
import { findSigner } from "@/lib/esign";
import { copyPdf, notFound, pdfResponse } from "@/lib/esignServe";

export const dynamic = "force-dynamic";

/**
 * A signer's copy as it stands, by their private link: the values and the
 * signatures so far, or the signed file once complete. Closed for a
 * cancelled copy or package.
 */
export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  const found = await findSigner(params.token);
  if (!found?.template || found.pkg.status === "preparing") return notFound();
  if (found.doc.status === "cancelled" || found.pkg.status === "cancelled") return notFound();
  try {
    const bytes = await copyPdf(found.pkg, found.doc, found.template);
    const download = request.nextUrl.searchParams.get("download") === "1";
    const response = pdfResponse(bytes, `${found.pkg.title} - ${found.doc.label}.pdf`);
    if (download) {
      response.headers.set(
        "Content-Disposition",
        `attachment; filename*=UTF-8''${encodeURIComponent(`${found.pkg.title} - ${found.doc.label}.pdf`)}`
      );
    }
    return response;
  } catch {
    return notFound();
  }
}
