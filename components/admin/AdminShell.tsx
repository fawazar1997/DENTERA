"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ExternalLink, LogOut, Menu, X } from "lucide-react";
import { localePath, type Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/Logo";
import { ADMIN_SECTION_GROUPS } from "./adminSections";

/**
 * The control panel frame: a sidebar on the start side (the right in
 * Arabic) listing every section by group, which becomes a slide-in menu
 * on phones. The sign-in page shows without it.
 */
export function AdminShell({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const admin = localePath(locale, "/admin");
  const isLogin = pathname.startsWith(`${admin}/login`);

  // Close the phone menu after moving to another section.
  useEffect(() => setOpen(false), [pathname]);

  if (isLogin) {
    return (
      <>
        <div className="bg-ink-900">
          <div className="container-x flex items-center justify-between py-3.5">
            <Logo variant="color" className="h-8 w-auto" />
            <LanguageSwitcher
              locale={locale}
              className="border-white/20 text-sand-200 hover:border-primary-400 hover:text-white"
            />
          </div>
        </div>
        <main>{children}</main>
      </>
    );
  }

  const isActive = (href: string) =>
    href === admin ? pathname === admin : pathname.startsWith(href);

  async function handleSignOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    // Full page load so no signed-in pages stay in the client cache.
    window.location.assign(`${admin}/login`);
  }

  const nav = (
    <div className="flex h-full flex-col">
      <Link href={admin} className="flex items-center gap-3 px-5 py-4">
        <Logo variant="color" className="h-8 w-auto" />
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold text-sand-100">
          {dict.admin.badge}
        </span>
      </Link>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4 pt-1">
        {ADMIN_SECTION_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 text-xs font-bold text-sand-300">{dict.admin[group.label]}</p>
            <ul className="mt-1 space-y-0.5">
              {group.sections.map((section) => {
                const href = `${admin}${section.path}`;
                const active = isActive(href);
                return (
                  <li key={section.path}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold transition ${
                        active
                          ? "bg-white text-ink-900"
                          : "text-sand-100 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <section.icon
                        className={`h-[18px] w-[18px] flex-shrink-0 ${active ? "text-primary-500" : "text-primary-300"}`}
                      />
                      {dict.admin[section.label]}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-1 border-t border-white/10 px-3 py-3">
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-sand-100 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-[18px] w-[18px] text-accent-300" />
          {dict.admin.signOut}
        </button>
        <div className="flex items-center justify-between gap-2 px-3 pt-1">
          <Link
            href={localePath(locale)}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-sand-100 hover:text-white"
          >
            <ExternalLink className="h-4 w-4 text-primary-300" />
            {dict.admin.viewSite}
          </Link>
          <LanguageSwitcher
            locale={locale}
            className="border-white/20 px-3 py-1.5 text-sand-200 hover:border-primary-400 hover:text-white"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Computer: fixed sidebar on the start side. */}
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 bg-ink-900 lg:block">{nav}</aside>

      {/* Phone and tablet: top bar with a menu button. */}
      <div className="sticky top-0 z-30 flex items-center justify-between bg-ink-900 px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={dict.admin.menu}
          aria-expanded={open}
          className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-bold text-white hover:bg-white/10"
        >
          <Menu className="h-5 w-5" />
          {dict.admin.menu}
        </button>
        <Link href={admin}>
          <Logo variant="color" className="h-7 w-auto" />
        </Link>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label={dict.admin.closeMenu}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink-950/50"
          />
          <aside className="absolute inset-y-0 start-0 w-72 max-w-[85vw] bg-ink-900 shadow-soft">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={dict.admin.closeMenu}
              className="absolute end-3 top-4 flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
            {nav}
          </aside>
        </div>
      )}

      <main className="min-h-screen lg:ps-64">{children}</main>
    </div>
  );
}
