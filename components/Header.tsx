"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Phone } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";
import { CallButton } from "./CallButton";
import { telHref } from "@/lib/phone";

export function Header({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const links = [
    { href: `/${locale}`, label: dict.nav.home },
    { href: `/${locale}/about`, label: dict.nav.about },
    { href: `/${locale}/departments`, label: dict.nav.departments },
    { href: `/${locale}/doctors`, label: dict.nav.doctors },
    { href: `/${locale}/contact`, label: dict.nav.contact },
  ];

  const isActive = (href: string) =>
    href === `/${locale}` ? pathname === href : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-ink-100 bg-paper/85 backdrop-blur">
      <div className="container-x flex items-center justify-between py-3">
        <Link href={`/${locale}`}>
          <Logo variant="color" className="h-10 w-auto" priority />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                isActive(link.href)
                  ? "bg-primary-50 text-primary-700"
                  : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <LanguageSwitcher locale={locale} />
          <CallButton dict={dict} />
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <a
            href={telHref(dict.booking.phone)}
            className="btn-primary px-4 py-2"
            aria-label={`${dict.booking.button} ${dict.booking.phone}`}
          >
            <Phone className="h-4 w-4" />
            {dict.booking.buttonShort}
          </a>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center justify-center rounded-lg border border-ink-200 p-2 text-ink-700"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-ink-100 bg-white lg:hidden">
          <div className="container-x flex flex-col gap-1 py-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-4 py-2.5 text-sm font-medium ${
                  isActive(link.href)
                    ? "bg-primary-50 text-primary-700"
                    : "text-ink-600"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center gap-3 px-4">
              <LanguageSwitcher locale={locale} />
            </div>
            <CallButton dict={dict} className="mx-4 mt-2" />
          </div>
        </div>
      )}
    </header>
  );
}
