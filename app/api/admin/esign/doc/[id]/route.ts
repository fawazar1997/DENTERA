import { NextRequest } from "next/server";
import { SESSION_COOKIE, sessionUser } from "@/lib/auth";
import { canUseSection } from "@/lib/adminRoles";
import { copyPdf, findCopy, notFound, pdfResponse } from "@/lib/esignServe";

export const dynamic = "force-dynamic";

/** Control panel: one copy as it stands (signatures so far, or the signed file). */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!canUseSection(await sessionUser(request.cookies.get(SESSION_COOKIE)?.value), "/esign")) return notFound();
  const found = await findCopy(params.id);
  if (!found?.template) return notFound();
  try {
    const name = `${found.doc.label} - ${found.pkg.ref}.pdf`.replace(/[\\/:*?"<>|]+/g, "-");
    const response = pdfResponse(await copyPdf(found.pkg, found.doc, found.template), name);
    // ?download=1: saved as a file instead of opened.
    if (request.nextUrl.searchParams.get("download") === "1") {
      response.headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
    }
    return response;
  } catch {
    return notFound();
  }
}
