import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { completeGoogleConnection } from "@/lib/googleReviews";
import {
  GOOGLE_STATE_COOKIE,
  googleRedirectUri,
  isAdminRequest,
  requestOrigin,
} from "@/lib/googleOAuthRoute";
import { defaultLocale, isLocale, localePath } from "@/lib/i18n";

// Google sends the admin back here after they approve access.
export async function GET(request: NextRequest) {
  const origin = requestOrigin(request);
  const [savedState = "", lang = ""] = (request.cookies.get(GOOGLE_STATE_COOKIE)?.value ?? "").split(".");
  const locale = isLocale(lang) ? lang : defaultLocale;
  const back = (status: string) => {
    const response = NextResponse.redirect(
      `${origin}${localePath(locale, "/admin/reviews")}?google=${status}`
    );
    response.cookies.set(GOOGLE_STATE_COOKIE, "", { path: "/api/admin/google", maxAge: 0 });
    return response;
  };

  if (!(await isAdminRequest(request))) {
    return NextResponse.redirect(`${origin}${localePath(locale, "/admin/login")}`);
  }
  const params = request.nextUrl.searchParams;
  const state = params.get("state") ?? "";
  const stateOk =
    savedState.length > 0 &&
    state.length === savedState.length &&
    timingSafeEqual(Buffer.from(state), Buffer.from(savedState));
  if (!stateOk) return back("state_mismatch");
  if (params.get("error")) return back("denied");
  const code = params.get("code");
  if (!code) return back("denied");

  try {
    await completeGoogleConnection(code, googleRedirectUri(request));
    return back("connected");
  } catch (error) {
    console.error("Google connection failed:", error);
    return back("failed");
  }
}
