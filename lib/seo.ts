import type { Metadata } from "next";
import { localePath, type Locale } from "./i18n";

/**
 * The site's public address. Search engines are pointed here (canonical
 * links, sitemap), whichever address a page was opened on.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://dentera.com.sa").replace(
  /\/+$/,
  ""
);

/** Image shown when a page is shared (WhatsApp, X, …). */
export const SHARE_IMAGE = { url: "/og-icon.png", width: 1200, height: 630 };

/** A full address for a site path (full addresses pass through unchanged). */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

/**
 * Title, description, canonical address and Arabic/English alternates for
 * a site page. `path` is the page's path without a language prefix
 * ("" for home, "/doctors", …).
 */
export function pageMetadata({
  locale,
  siteName,
  path,
  title,
  description,
  image,
  absoluteTitle = false,
}: {
  locale: Locale;
  siteName: string;
  path: string;
  title: string;
  description?: string;
  /** A page-specific share image (e.g. a doctor's photo). */
  image?: string;
  /** Use the title as is, without " | Dentera" after it. */
  absoluteTitle?: boolean;
}): Metadata {
  const url = localePath(locale, path);
  const desc = description?.replace(/\s+/g, " ").trim().slice(0, 300) || undefined;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description: desc,
    alternates: {
      canonical: url,
      languages: {
        ar: localePath("ar", path),
        en: localePath("en", path),
        "x-default": localePath("ar", path),
      },
    },
    openGraph: {
      type: "website",
      siteName,
      url,
      title,
      description: desc,
      locale: locale === "ar" ? "ar_SA" : "en_US",
      alternateLocale: locale === "ar" ? "en_US" : "ar_SA",
      images: [image ? { url: image } : SHARE_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [image ?? SHARE_IMAGE.url],
    },
  };
}
