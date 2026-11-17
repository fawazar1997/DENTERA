import { NextRequest } from "next/server";
import { SESSION_COOKIE, sessionUser } from "@/lib/auth";
import { canUseSection } from "@/lib/adminRoles";
import { readEsign } from "@/lib/esign";
import { downloadDriveFile } from "@/lib/googleDrive";
import { notFound, pdfResponse } from "@/lib/esignServe";

export const dynamic = "force-dynamic";

/** Control panel: a template's PDF, from Drive (for the editor and previews). */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!canUseSection(await sessionUser(request.cookies.get(SESSION_COOKIE)?.value), "/esign")) return notFound();
  const template = (await readEsign()).templates.find((t) => t.id === params.id);
  if (!template) return notFound();
  try {
    return pdfResponse(await downloadDriveFile(template.driveFileId), template.fileName);
  } catch {
    return notFound();
  }
}
