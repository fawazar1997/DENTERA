import { NextRequest, NextResponse } from "next/server";
import { archiveCsv, formsKeyRole, listArchive, searchArchive } from "@/lib/archive";
import { getBranches } from "@/lib/db";

/**
 * The supervisors' link: the letters register as a CSV file (opens in
 * Excel), as filtered on the page. Staff links and wrong keys get a 404.
 */
export async function GET(request: NextRequest, { params }: { params: { key: string } }) {
  if ((await formsKeyRole(params.key)) !== "supervisor") {
    return new NextResponse("Not found", { status: 404 });
  }
  const search = request.nextUrl.searchParams;
  const branch = search.get("branch") || undefined;
  const kindParam = search.get("kind");
  const kind = kindParam === "outgoing" || kindParam === "incoming" ? kindParam : undefined;
  const [all, branches] = await Promise.all([listArchive({ branch, kind }), getBranches()]);
  const entries = searchArchive(all, (search.get("q") ?? "").slice(0, 100));
  const name = new Map(branches.map((b) => [b.id, b.nameAr]));
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(archiveCsv(entries, (id) => name.get(id) ?? id), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dentera-letters-${day}.csv"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
      "Referrer-Policy": "no-referrer",
    },
  });
}
