import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getGoogleConnection, syncGoogleReviews } from "@/lib/googleReviews";

// Daily refresh of the Google reviews (see vercel.json). Vercel's
// scheduler calls it with "Authorization: Bearer <CRON_SECRET>".
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return (
    Boolean(secret) &&
    header.length === expected.length &&
    timingSafeEqual(Buffer.from(header), Buffer.from(expected))
  );
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!(await getGoogleConnection())) {
    return NextResponse.json({ ok: true, skipped: "not connected" });
  }
  try {
    const data = await syncGoogleReviews();
    return NextResponse.json({ ok: true, reviews: data.reviews.length });
  } catch (error) {
    console.error("Google reviews sync failed:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
