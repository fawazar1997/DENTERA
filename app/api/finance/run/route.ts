import { NextRequest, NextResponse } from "next/server";
import { ingestKeyOk, recordRun } from "@/lib/finance";
import { REFRESH_REASONS } from "@/lib/financeRefreshText";

export const dynamic = "force-dynamic";

/**
 * The robot reports each run's outcome here: {"ok", "note", "mode",
 * "requestedBy" (admin | finance when «تحديث الآن» started it), "rows" (records
 * sent), "reason" (a failure code)}. Codes and counts only, never figures.
 */
export async function POST(request: NextRequest) {
  if (!ingestKeyOk(request.headers.get("authorization"))) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { ok?: boolean; note?: string; mode?: string; requestedBy?: string; rows?: number; reason?: string };
  const by = body.requestedBy === "admin" || body.requestedBy === "finance" ? body.requestedBy : undefined;
  const ok = body.ok === true;
  await recordRun({
    at: new Date().toISOString(),
    ok,
    source: by ? "manual" : "robot",
    by,
    note: String(body.note ?? "").replace(/[^\w\s:.-]/g, "").slice(0, 80) || undefined,
    mode: /^[a-z0-9-]{1,24}$/.test(body.mode ?? "") ? body.mode : undefined,
    rows: Number.isFinite(body.rows) && (body.rows as number) >= 0 ? Math.round(body.rows as number) : undefined,
    reason: !ok && REFRESH_REASONS.includes(body.reason as never) ? body.reason : ok ? undefined : "other",
  });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
