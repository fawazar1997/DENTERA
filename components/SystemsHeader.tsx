import Link from "next/link";
import { LayoutGrid, Lock } from "lucide-react";
import { localePath, type Locale } from "@/lib/i18n";
import { Logo } from "./Logo";

/**
 * The header of the staff administrative systems pages: logo, title,
 * language switch, the "internal" badge and a link back to the hub (or, on
 * the supervisor's link, to the supervisor's home).
 */
export function SystemsHeader({
  locale,
  title,
  badge,
  switchPath,
  home,
}: {
  locale: Locale;
  title: string;
  badge: string;
  /** This page's path without the locale, for the language switch. */
  switchPath: string;
  home?: { href: string; label: string };
}) {
  const other = locale === "ar" ? "en" : "ar";
  return (
    <header className="bg-ink-950">
      <div className="container-x py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Logo className="h-8 w-auto flex-shrink-0 sm:h-9" />
            <span className="truncate text-base font-bold text-white sm:text-lg">{title}</span>
          </div>
          <Link
            href={localePath(other, switchPath)}
            className="flex-shrink-0 rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-ink-100 hover:border-primary-400 hover:text-white"
          >
            {other === "ar" ? "العربية" : "English"}
          </Link>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-sand-200">
            <Lock className="h-3.5 w-3.5 flex-shrink-0" />
            {badge}
          </span>
          {home && (
            <Link
              href={localePath(locale, home.href)}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ink-950 hover:bg-sand-100"
            >
              <LayoutGrid className="h-4 w-4 flex-shrink-0" />
              {home.label}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
