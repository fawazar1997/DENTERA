import Link from "next/link";
import { MapPin, Phone, Mail } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import type { Department } from "@/lib/types";
import { Logo } from "./Logo";

export function Footer({
  locale,
  dict,
  departments,
}: {
  locale: Locale;
  dict: Dictionary;
  departments: Department[];
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-ink-100 bg-ink-950 text-ink-200">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo
            locale={locale}
            siteName={dict.meta.siteName}
            markColorClassName="text-accent-400"
            textColorClassName="text-white"
          />
          <p className="mt-4 text-sm leading-relaxed text-ink-300">
            {dict.footer.description}
          </p>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">
            {dict.footer.quickLinks}
          </h4>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link href={`/${locale}`} className="hover:text-white">
                {dict.nav.home}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/about`} className="hover:text-white">
                {dict.nav.about}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/doctors`} className="hover:text-white">
                {dict.nav.doctors}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/contact`} className="hover:text-white">
                {dict.nav.contact}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">
            {dict.footer.departments}
          </h4>
          <ul className="space-y-2.5 text-sm">
            {departments.slice(0, 5).map((department) => (
              <li key={department.id}>
                <Link
                  href={`/${locale}/departments`}
                  className="hover:text-white"
                >
                  {locale === "ar" ? department.nameAr : department.nameEn}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">
            {dict.footer.contact}
          </h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-400" />
              <span>{dict.contact.addressValue}</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 flex-shrink-0 text-primary-400" />
              <span dir="ltr">{dict.contact.phoneValue}</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 flex-shrink-0 text-primary-400" />
              <span dir="ltr">{dict.contact.emailValue}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ink-800">
        <div className="container-x flex flex-col items-center justify-between gap-3 py-6 text-xs text-ink-400 sm:flex-row">
          <p>
            &copy; {year} {dict.meta.siteName}. {dict.footer.rights}
          </p>
          <Link href={`/${locale}/admin`} className="hover:text-ink-200">
            {dict.nav.admin}
          </Link>
        </div>
      </div>
    </footer>
  );
}
