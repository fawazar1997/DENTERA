import { NextRequest, NextResponse } from "next/server";
import { ingestKeyOk, recordRun } from "@/lib/finance";

export const dynamic = "force-dynamic";

/** The robot reports each run's outcome here: {"ok": true} or {"ok": false, "note": "login"}. */
export async function POST(request: NextRequest) {
  if (!ingestKeyOk(request.headers.get("authorization"))) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { ok?: boolean; note?: string };
  await recordRun({
    at: new Date().toISOString(),
    ok: body.ok === true,
    source: "robot",
    note: String(body.note ?? "").replace(/[^\w\s:.-]/g, "").slice(0, 80) || undefined,
  });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
