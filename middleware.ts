import { NextRequest, NextResponse } from "next/server";
import { defaultLocale, isLocale, localePath } from "./lib/i18n";
import { SESSION_COOKIE, verifySessionToken } from "./lib/auth";

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"],
};

/**
 * Pages of the previous (WordPress) website, still listed by Google under
 * Arabic slugs such as "/من-نحن/", and the new page each one moved to.
 * Matched by their key words, so slug variations ("-2" suffixes, trailing
 * slashes) are covered too. Checked in order.
 */
const LEGACY_PAGES: [RegExp, string][] = [
  [/هويتنا/, "/about/identity"],
  [/نحن/, "/about"],
  [/العيادات|عيادات/, "/departments"],
  [/الفروع|فروع/, "/contact"],
  [/الاسعار|الأسعار|اسعار|أسعار/, "/contact"],
  [/احجز|موعد/, "/contact"],
];

/** WordPress-only addresses with no counterpart: sent to the home page. */
const LEGACY_WORDPRESS = /^(wp-admin|wp-login|wp-json|feed|comments\/feed|category|tag|author)(\/|$)/;

/** The new page for an address of the old website, or null. */
function legacyTarget(pathname: string, search: URLSearchParams): string | null {
  let path: string;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  path = path.replace(/^\/+|\/+$/g, "");
  if (!path) return search.has("p") || search.has("page_id") ? "/" : null;
  if (LEGACY_WORDPRESS.test(path)) return "/";
  // Only Arabic slugs: the new site's own addresses are all Latin.
  if (!/[\u0600-\u06FF]/.test(path)) return null;
  return LEGACY_PAGES.find(([words]) => words.test(path))?.[1] ?? null;
}

/**
 * Arabic is served at the site root ("/doctors"), English under "/en".
 * Internally every page lives under /[locale], so root paths are rewritten
 * to /ar (the address bar keeps the clean URL) and old /ar/... links are
 * redirected to their clean form.
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Old website addresses still in Google: move them for good (301).
  const legacy = legacyTarget(pathname, request.nextUrl.searchParams);
  if (legacy) {
    const url = request.nextUrl.clone();
    url.pathname = legacy;
    url.search = "";
    return NextResponse.redirect(url, 301);
  }

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
