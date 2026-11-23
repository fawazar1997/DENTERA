import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionUser } from "@/lib/auth";
import { canUseSection } from "@/lib/adminRoles";
import { OFFICIAL_PATH } from "@/lib/esign";
import { readPrivateFile } from "@/lib/privateBlob";
import { notFound } from "@/lib/esignServe";

export const dynamic = "force-dynamic";

/** Control panel: the official letterhead image (editor, previews, making pages). */
export async function GET(request: NextRequest) {
  if (!canUseSection(await sessionUser(request.cookies.get(SESSION_COOKIE)?.value), "/esign")) return notFound();
  const bytes = await readPrivateFile(OFFICIAL_PATH).catch(() => null);
  if (!bytes) return notFound();
  return new NextResponse(Buffer.from(bytes), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600", "X-Robots-Tag": "noindex, nofollow" },
  });
}
