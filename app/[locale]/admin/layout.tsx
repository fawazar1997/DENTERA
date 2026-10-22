import type { Metadata } from "next";
import "../../globals.css";
import { isLocale, isRtl, defaultLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { FontLinks } from "@/components/FontLinks";
import { AdminShell } from "@/components/admin/AdminShell";

// The control panel is private: keep it out of search results.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const dict = getDictionary(locale);
  const rtl = isRtl(locale);

  return (
    <html lang={locale} dir={rtl ? "rtl" : "ltr"}>
      <head>
        <FontLinks />
      </head>
      <body className={`bg-ink-50 ${rtl ? "font-arabic" : "font-sans"}`}>
        <AdminShell locale={locale} dict={dict}>
          {children}
        </AdminShell>
      </body>
    </html>
  );
}
