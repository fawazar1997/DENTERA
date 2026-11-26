import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { startScheduledRun } from "@/lib/financeRefresh";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron (vercel.json): starts the finance robot's «yesterday» run on time at 1:17 am and
 * 10:07 am Riyadh. Vercel sends «Authorization: Bearer <CRON_SECRET>» itself; anyone else gets 401.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET || "";
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const ok = secret.length >= 8 && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const slot = request.nextUrl.searchParams.get("slot") === "morning" ? "morning" : "night";
  const result = await startScheduledRun(slot);
  return NextResponse.json({ result }, { status: result === "failed" ? 502 : 200, headers: { "Cache-Control": "no-store" } });
}
