import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { googleAuthUrl, isGoogleConfigured } from "@/lib/googleReviews";
import {
  GOOGLE_STATE_COOKIE,
  googleRedirectUri,
  isAdminRequest,
  requestOrigin,
} from "@/lib/googleOAuthRoute";
import { defaultLocale, isLocale, localePath } from "@/lib/i18n";

// Starts connecting the clinic's Google account (control panel only).
export async function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get("locale") ?? "";
  const locale = isLocale(lang) ? lang : defaultLocale;
  const origin = requestOrigin(request);
  if (!(await isAdminRequest(request))) {
    return NextResponse.redirect(`${origin}${localePath(locale, "/admin/login")}`);
  }
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(`${origin}${localePath(locale, "/admin/reviews")}?google=not_configured`);
  }
  const state = randomBytes(24).toString("base64url");
  const response = NextResponse.redirect(googleAuthUrl(googleRedirectUri(request), state));
  response.cookies.set(GOOGLE_STATE_COOKIE, `${state}.${locale}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: "/api/admin/google",
    maxAge: 600,
  });
  return response;
}
