import { NextRequest, NextResponse } from "next/server";
import { defaultLocale, isLocale, localePath } from "./lib/i18n";
import { SESSION_COOKIE, verifySessionToken } from "./lib/auth";

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"],
};

/**
 * Arabic is served at the site root ("/doctors"), English under "/en".
 * Internally every page lives under /[locale], so root paths are rewritten
 * to /ar (the address bar keeps the clean URL) and old /ar/... links are
 * redirected to their clean form.
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const [first, ...rest] = pathname.split("/").filter(Boolean);

  if (first === defaultLocale) {
    const url = request.nextUrl.clone();
    url.pathname = `/${rest.join("/")}`;
    url.search = search;
    return NextResponse.redirect(url, 308);
  }

  const explicit = first !== undefined && isLocale(first);
  const locale = explicit ? first : defaultLocale;
  const route = explicit ? rest : pathname.split("/").filter(Boolean);

  const isAdminRoute = route[0] === "admin";
  const isLoginRoute = isAdminRoute && route[1] === "login";
  if (isAdminRoute && !isLoginRoute) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!(await verifySessionToken(token))) {
      const url = request.nextUrl.clone();
      url.pathname = localePath(locale, "/admin/login");
      return NextResponse.redirect(url);
    }
  }

  if (!explicit) {
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}
