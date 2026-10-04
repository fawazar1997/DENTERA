import "../../globals.css";
import { isLocale, isRtl, defaultLocale, type Locale } from "@/lib/i18n";
import { getSiteDictionary } from "@/lib/content";
import { getActiveBranches, getActiveDepartments } from "@/lib/db";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FontLinks } from "@/components/FontLinks";

// Content is edited live from the control panel, so render on request
// (the database read itself is cached until the next save).
export const dynamic = "force-dynamic";

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const dict = await getSiteDictionary(locale);
  const rtl = isRtl(locale);
  const departments = await getActiveDepartments();
  const branches = await getActiveBranches();

  return (
    <html lang={locale} dir={rtl ? "rtl" : "ltr"}>
      <head>
        <FontLinks />
      </head>
      <body className={rtl ? "font-arabic" : "font-sans"}>
        <Header locale={locale} dict={dict} />
        <main className="min-h-screen">{children}</main>
        <Footer
          locale={locale}
          dict={dict}
          departments={departments}
          branches={branches}
        />
      </body>
    </html>
  );
}
