import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { driveAuthUrl, isDriveAppConfigured } from "@/lib/googleDrive";
import { GOOGLE_STATE_COOKIE, googleRedirectUri, isHttps } from "../shared";

/** Control panel → "Connect Google Drive": off to Google's consent page. */
export async function GET(request: NextRequest) {
  if (!(await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "ar";
  if (!isDriveAppConfigured()) {
    return NextResponse.redirect(new URL(`${locale === "en" ? "/en" : ""}/admin/forms?google=not-configured`, request.url));
  }
  const state = randomBytes(18).toString("base64url");
  const response = NextResponse.redirect(driveAuthUrl(googleRedirectUri(request), state));
  // Checked on the way back, so only a consent started here is accepted.
  response.cookies.set(GOOGLE_STATE_COOKIE, `${state}.${locale}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps(request),
    path: "/api/admin/google",
    maxAge: 600,
  });
  return response;
}
