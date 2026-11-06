import type { Metadata } from "next";
import "../../globals.css";
import { isLocale, isRtl, defaultLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { FontLinks } from "@/components/FontLinks";
import { AdminShell } from "@/components/admin/AdminShell";
import { ADMIN_SECTION_GROUPS } from "@/components/admin/adminSections";
import { currentAdminUser } from "@/lib/adminSession";
import { canUseSection } from "@/lib/adminRoles";
import { driveHealth } from "@/lib/googleDrive";

// The control panel is private: keep it out of search results.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({
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
  // The sidebar shows only the sections this account may open.
  const user = await currentAdminUser();
  const sections =
    user === "admin"
      ? null
      : ADMIN_SECTION_GROUPS.flatMap((g) => g.sections)
          .map((s) => s.path)
          .filter((path) => canUseSection(user, path));
  // The admin is told at once when the letters archive can't reach Google
  // Drive (staff can't send letters then).
  const drive = user === "admin" ? await driveHealth() : "ok";
  const driveAlert = drive === "not-connected" || drive === "failing" ? drive : null;

  return (
    <html lang={locale} dir={rtl ? "rtl" : "ltr"}>
      <head>
        <FontLinks />
      </head>
      <body className={`bg-ink-50 ${rtl ? "font-arabic" : "font-sans"}`}>
        <AdminShell locale={locale} dict={dict} sections={sections} driveAlert={driveAlert}>
          {children}
        </AdminShell>
      </body>
    </html>
  );
}
