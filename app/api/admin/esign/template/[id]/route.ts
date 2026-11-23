import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionUser } from "@/lib/auth";
import { canUseSection } from "@/lib/adminRoles";
import { isDocumentTemplate, readEsign, templateContentPath } from "@/lib/esign";
import { downloadDriveFile } from "@/lib/googleDrive";
import { readPrivateFile } from "@/lib/privateBlob";
import { notFound, pdfResponse } from "@/lib/esignServe";

export const dynamic = "force-dynamic";

/**
 * Control panel: a template's PDF, from Drive (for the editor and previews),
 * or a document template's content (JSON).
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!canUseSection(await sessionUser(request.cookies.get(SESSION_COOKIE)?.value), "/esign")) return notFound();
  const template = (await readEsign()).templates.find((t) => t.id === params.id);
  if (!template) return notFound();
  try {
    if (isDocumentTemplate(template)) {
      const bytes = await readPrivateFile(templateContentPath(template.id));
      if (!bytes) return notFound();
      return new NextResponse(Buffer.from(bytes), {
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
      });
    }
    return pdfResponse(await downloadDriveFile(template.driveFileId), template.fileName);
  } catch {
    return notFound();
  }
}
