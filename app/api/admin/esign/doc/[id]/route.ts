import { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { copyPdf, findCopy, notFound, pdfResponse } from "@/lib/esignServe";

export const dynamic = "force-dynamic";

/** Control panel: one copy as it stands (signatures so far, or the signed file). */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value))) return notFound();
  const found = await findCopy(params.id);
  if (!found?.template) return notFound();
  try {
    return pdfResponse(await copyPdf(found.pkg, found.doc, found.template), `${found.doc.label}.pdf`);
  } catch {
    return notFound();
  }
}
