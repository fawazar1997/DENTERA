export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];
/** Arabic is the main language: it lives at the site root, English under /en. */
export const defaultLocale: Locale = "ar";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function isRtl(locale: Locale): boolean {
  return locale === "ar";
}

export function otherLocale(locale: Locale): Locale {
  return locale === "en" ? "ar" : "en";
}

/**
 * Site path for a locale: Arabic paths have no prefix ("/doctors"),
 * English ones start with /en ("/en/doctors"). `path` starts with "/".
 */
export function localePath(locale: Locale, path = ""): string {
  if (locale === defaultLocale) return path || "/";
  return `/${locale}${path}`;
}

/** The same page in the other language, from a browser path. */
export function switchLocalePath(pathname: string, target: Locale): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] && isLocale(segments[0])) segments.shift();
  return localePath(target, segments.length ? `/${segments.join("/")}` : "");
}
