"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { otherLocale } from "@/lib/i18n";

export function LanguageSwitcher({
  locale,
  className = "",
}: {
  locale: Locale;
  className?: string;
}) {
  const pathname = usePathname();
  const target = otherLocale(locale);
  const rest = pathname.split("/").slice(2).join("/");
  const href = `/${target}${rest ? `/${rest}` : ""}`;

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-3.5 py-2 text-sm font-medium text-ink-700 transition hover:border-primary-300 hover:text-primary-700 ${className}`}
    >
      <Globe className="h-4 w-4" />
      {target === "ar" ? "العربية" : "English"}
    </Link>
  );
}
