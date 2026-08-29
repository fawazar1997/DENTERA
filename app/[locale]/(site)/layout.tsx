import "../../globals.css";
import { isLocale, isRtl, defaultLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getActiveDepartments } from "@/lib/db";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function SiteLayout({
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
  const departments = getActiveDepartments();

  return (
    <html lang={locale} dir={rtl ? "rtl" : "ltr"}>
      <body className={rtl ? "font-arabic" : "font-sans"}>
        <Header locale={locale} dict={dict} />
        <main className="min-h-screen">{children}</main>
        <Footer locale={locale} dict={dict} departments={departments} />
      </body>
    </html>
  );
}
