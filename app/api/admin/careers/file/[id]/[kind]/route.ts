import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionUser } from "@/lib/auth";
import { canUseSection } from "@/lib/adminRoles";
import { readCareers } from "@/lib/careers";
import { downloadDriveFile } from "@/lib/googleDrive";

export const dynamic = "force-dynamic";

const notFound = () => NextResponse.json({ ok: false }, { status: 404, headers: { "Cache-Control": "no-store" } });

/** Control panel: an applicant's CV or certificates file, from Drive (shown in the page). */
export async function GET(request: NextRequest, { params }: { params: { id: string; kind: string } }) {
  if (!canUseSection(await sessionUser(request.cookies.get(SESSION_COOKIE)?.value), "/careers")) return notFound();
  if (params.kind !== "cv" && params.kind !== "certificates") return notFound();
  const app = (await readCareers()).applications.find((a) => a.id === params.id);
  const file = app?.files[params.kind as "cv" | "certificates"];
  if (!file?.driveFileId) return notFound();
  try {
    const bytes = await downloadDriveFile(file.driveFileId);
    const download = request.nextUrl.searchParams.get("download") === "1";
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return notFound();
  }
}
