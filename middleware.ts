import { NextRequest, NextResponse } from "next/server";
import { defaultLocale, isLocale } from "./lib/i18n";
import { SESSION_COOKIE, verifySessionToken } from "./lib/auth";

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"],
};

function getPreferredLocale(request: NextRequest): string {
  const header = request.headers.get("accept-language");
  if (header?.toLowerCase().includes("ar")) return "ar";
  return defaultLocale;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const segments = pathname.split("/").filter(Boolean);
  const [maybeLocale, ...rest] = segments;

  if (!maybeLocale || !isLocale(maybeLocale)) {
    const locale = getPreferredLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const isAdminRoute = rest[0] === "admin";
  const isLoginRoute = rest[0] === "admin" && rest[1] === "login";

  if (isAdminRoute && !isLoginRoute) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const valid = await verifySessionToken(token);
    if (!valid) {
      const url = request.nextUrl.clone();
      url.pathname = `/${maybeLocale}/admin/login`;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}
