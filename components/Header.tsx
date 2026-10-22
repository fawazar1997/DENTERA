"use client";

import { localePath } from "@/lib/i18n";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Phone, ChevronDown } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";
import { CallButton } from "./CallButton";
import { telHref } from "@/lib/phone";

export function Header({
  locale,
  dict,
  showOffers = false,
}: {
  locale: Locale;
  dict: Dictionary;
  /** Show the Offers menu link (only while there are live offers). */
  showOffers?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  type NavLink = {
    href: string;
    label: string;
    children?: { href: string; label: string }[];
  };
  const links: NavLink[] = [
    { href: localePath(locale), label: dict.nav.home },
    {
      href: localePath(locale, `/about`),
      label: dict.nav.about,
      children: [
        { href: localePath(locale, `/about`), label: dict.nav.aboutUs },
        { href: localePath(locale, `/about/identity`), label: dict.nav.identity },
      ],
    },
    { href: localePath(locale, `/departments`), label: dict.nav.departments },
    { href: localePath(locale, `/doctors`), label: dict.nav.doctors },
    ...(showOffers
      ? [{ href: localePath(locale, `/offers`), label: dict.nav.offers }]
      : []),
    { href: localePath(locale, `/contact`), label: dict.nav.contact },
  ];

  const isActive = (href: string) =>
    href === localePath(locale) ? pathname === href : pathname.startsWith(href);
  // Sub-pages match exactly, so "About Us" isn't lit on "Our Identity".
  const isExact = (href: string) => pathname === href;

  return (
    <header className="sticky top-0 z-50 border-b border-ink-100 bg-paper/85 backdrop-blur">
      <div className="container-x flex items-center justify-between py-3">
        <Link href={localePath(locale)}>
          <Logo variant="color" className="h-10 w-auto" priority />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((link) =>
            link.children ? (
              <div key={link.href} className="group relative">
                <Link
                  href={link.href}
                  aria-haspopup="true"
                  className={`inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                    isActive(link.href)
                      ? "bg-primary-50 text-primary-700"
                      : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                  }`}
                >
                  {link.label}
                  <ChevronDown className="h-3.5 w-3.5 transition group-hover:rotate-180 group-focus-within:rotate-180" />
                </Link>
                <div className="invisible absolute start-0 top-full z-50 pt-2 opacity-0 transition duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                  <div className="min-w-[12rem] rounded-xl2 border border-ink-100 bg-white p-2 shadow-soft">
                    {link.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`block rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                          isExact(child.href)
                            ? "bg-primary-50 text-primary-700"
                            : "text-ink-700 hover:bg-ink-50 hover:text-ink-900"
                        }`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
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
            )
          )}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <LanguageSwitcher locale={locale} />
          <CallButton dict={dict} />
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <a
            href={telHref(dict.booking.phone)}
            className="btn-book px-4 py-2"
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
            {links.flatMap((link) =>
              link.children
                ? [
                    <p
                      key={`${link.href}-group`}
                      className="px-4 pb-1 pt-2.5 text-xs font-bold text-ink-400"
                    >
                      {link.label}
                    </p>,
                    ...link.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setOpen(false)}
                        className={`rounded-lg px-4 py-2.5 ps-8 text-sm font-medium ${
                          isExact(child.href)
                            ? "bg-primary-50 text-primary-700"
                            : "text-ink-600"
                        }`}
                      >
                        {child.label}
                      </Link>
                    )),
                  ]
                : [
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
              </Link>,
                  ]
            )}
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
