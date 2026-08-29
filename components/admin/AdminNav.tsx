"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, Stethoscope, Building2, LogOut } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";

export function AdminNav({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    {
      href: `/${locale}/admin`,
      label: dict.admin.dashboardTitle,
      icon: LayoutDashboard,
    },
    {
      href: `/${locale}/admin/doctors`,
      label: dict.admin.doctors,
      icon: Stethoscope,
    },
    {
      href: `/${locale}/admin/departments`,
      label: dict.admin.departments,
      icon: Building2,
    },
  ];

  const isActive = (href: string) =>
    href === `/${locale}/admin` ? pathname === href : pathname.startsWith(href);

  async function handleSignOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push(`/${locale}/admin/login`);
  }

  return (
    <div className="border-b border-ink-200 bg-white">
      <div className="container-x flex items-center justify-between">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-4 text-sm font-semibold transition ${
                isActive(tab.href)
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-ink-500 hover:text-ink-800"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex flex-shrink-0 items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          {dict.admin.signOut}
        </button>
      </div>
    </div>
  );
}
