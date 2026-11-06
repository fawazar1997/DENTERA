import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { connectDrive } from "@/lib/googleDrive";
import { GOOGLE_STATE_COOKIE, googleRedirectUri } from "../shared";

function sameText(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Google's consent page returns here with a code: save the account. */
export async function GET(request: NextRequest) {
  const [state = "", locale = "ar"] = (request.cookies.get(GOOGLE_STATE_COOKIE)?.value ?? "").split(".");
  const back = (result: string) => {
    const response = NextResponse.redirect(
      new URL(`${locale === "en" ? "/en" : ""}/admin/forms?google=${result}`, request.url)
    );
    response.cookies.delete({ name: GOOGLE_STATE_COOKIE, path: "/api/admin/google" });
    return response;
  };
  if (!(await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  if (!state || !sameText(state, params.get("state") ?? "")) return back("failed");
  if (!code) return back(params.get("error") === "access_denied" ? "denied" : "failed");
  try {
    await connectDrive(code, googleRedirectUri(request));
    return back("connected");
  } catch (error) {
    console.error("Google Drive connect failed:", error);
    return back("failed");
  }
}
