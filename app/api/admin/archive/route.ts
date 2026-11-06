import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { archiveCsv, listArchive, searchArchive } from "@/lib/archive";
import { getBranches } from "@/lib/db";

/**
 * Control panel: the letters register as a CSV file (opens in Excel), all of
 * it or as filtered on the register page (branch, kind, search).
 */
export async function GET(request: NextRequest) {
  if (!(await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const params = request.nextUrl.searchParams;
  const branch = params.get("branch") || undefined;
  const kindParam = params.get("kind");
  const kind = kindParam === "outgoing" || kindParam === "incoming" ? kindParam : undefined;
  const [all, branches] = await Promise.all([listArchive({ branch, kind, all: true }), getBranches()]);
  const entries = searchArchive(all, (params.get("q") ?? "").slice(0, 100));
  const name = new Map(branches.map((b) => [b.id, b.nameAr]));
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(archiveCsv(entries, (id) => name.get(id) ?? id), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dentera-archive-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
