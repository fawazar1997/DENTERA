import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { LoginForm } from "@/components/admin/LoginForm";

// Rendered on request like every other page: a statically built copy gets
// regenerated after control-panel saves (they revalidate every path), and
// that regeneration 404s for this locale route.
export const dynamic = "force-dynamic";

export default function AdminLoginPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const dict = getDictionary(locale);

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-gradient-to-b from-primary-50 to-white px-4 py-16">
      <LoginForm locale={locale} dict={dict} />
    </div>
  );
}
