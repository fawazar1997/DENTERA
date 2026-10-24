import type { Metadata } from "next";
import { isLocale, locales, defaultLocale, type Locale } from "@/lib/i18n";
import { getSiteDictionary } from "@/lib/content";
import { SHARE_IMAGE, SITE_URL } from "@/lib/seo";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// Any first path segment other than "en"/"ar" (e.g. a browser's automatic
// /favicon.ico probe) 404s immediately instead of being rendered as if it
// were a locale value.
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const dict = await getSiteDictionary(locale);
  return {
    // Relative links in page metadata (canonical, share images) resolve
    // against the public address.
    metadataBase: new URL(SITE_URL),
    applicationName: dict.meta.siteName,
    title: {
      default: dict.meta.homeTitle,
      template: `%s | ${dict.meta.siteName}`,
    },
    description: dict.meta.description,
    openGraph: {
      type: "website",
      siteName: dict.meta.siteName,
      locale: locale === "ar" ? "ar_SA" : "en_US",
      images: [SHARE_IMAGE],
    },
    twitter: { card: "summary_large_image", images: [SHARE_IMAGE.url] },
  };
}

export default function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
