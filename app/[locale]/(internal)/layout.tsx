import type { Metadata } from "next";
import "../../globals.css";
import { isLocale, isRtl, defaultLocale, type Locale } from "@/lib/i18n";
import { FontLinks } from "@/components/FontLinks";

// Internal staff pages: never indexed, never linked from the website.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default function InternalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const rtl = isRtl(locale);
  return (
    <html lang={locale} dir={rtl ? "rtl" : "ltr"}>
      <head>
        <FontLinks />
      </head>
      <body className={`bg-ink-50 ${rtl ? "font-arabic" : "font-sans"}`}>
        {children}
      </body>
    </html>
  );
}
