import { localePath } from "@/lib/i18n";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";

/** Switch between the two "About Dentera" pages. */
export function AboutTabs({
  locale,
  dict,
  active,
}: {
  locale: Locale;
  dict: Dictionary;
  active: "about" | "identity";
}) {
  const tabs = [
    { key: "about", href: localePath(locale, `/about`), label: dict.nav.aboutUs },
    { key: "identity", href: localePath(locale, `/about/identity`), label: dict.nav.identity },
  ] as const;

  return (
    <div className="relative z-10 -mt-7 flex justify-center px-4">
      <nav
        aria-label={dict.nav.about}
        className="inline-flex gap-1 rounded-full border border-ink-100 bg-white p-1.5 shadow-soft"
      >
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={active === tab.key ? "page" : undefined}
            className={`rounded-full px-6 py-2.5 text-sm font-bold transition ${
              active === tab.key
                ? "bg-ink-900 text-white"
                : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
