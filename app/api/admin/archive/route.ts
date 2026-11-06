import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { archiveCsv, listArchive } from "@/lib/archive";
import { getBranches } from "@/lib/db";

/** Control panel: the whole letters register as a CSV file (opens in Excel). */
export async function GET(request: NextRequest) {
  if (!(await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const branch = request.nextUrl.searchParams.get("branch") || undefined;
  const [entries, branches] = await Promise.all([listArchive({ branch, all: true }), getBranches()]);
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
