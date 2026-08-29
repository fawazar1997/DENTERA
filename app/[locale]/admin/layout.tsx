import Link from "next/link";
import { Sparkles } from "lucide-react";
import "../../globals.css";
import { isLocale, isRtl, defaultLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

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
      <body className={`bg-ink-50 ${rtl ? "font-arabic" : "font-sans"}`}>
        <div className="border-b border-ink-200 bg-ink-950">
          <div className="container-x flex items-center justify-between py-3.5">
            <Link
              href={`/${locale}/admin`}
              className="flex items-center gap-2 text-lg font-extrabold text-white"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600">
                <Sparkles className="h-4 w-4" />
              </span>
              {dict.meta.siteName}
              <span className="rounded-full bg-primary-800 px-2.5 py-0.5 text-xs font-semibold text-primary-100">
                {dict.nav.admin}
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <LanguageSwitcher
                locale={locale}
                className="border-ink-700 text-ink-200 hover:border-primary-400 hover:text-white"
              />
              <Link
                href={`/${locale}`}
                className="text-sm font-medium text-ink-300 hover:text-white"
              >
                {dict.admin.viewSite}
              </Link>
            </div>
          </div>
        </div>
        <main className="min-h-[calc(100vh-64px)]">{children}</main>
      </body>
    </html>
  );
}
