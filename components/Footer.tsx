import Link from "next/link";
import { MapPin, Phone, Mail } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import type { Branch, Department } from "@/lib/types";
import { telHref } from "@/lib/phone";
import { Logo } from "./Logo";

export function Footer({
  locale,
  dict,
  departments,
  branches,
}: {
  locale: Locale;
  dict: Dictionary;
  departments: Department[];
  branches: Branch[];
}) {
  const year = new Date().getFullYear();
  const ar = locale === "ar";

  return (
    <footer className="border-t border-ink-100 bg-ink-950 text-ink-200">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo variant="color" className="h-10 w-auto" />
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

          <h4 className="mb-4 mt-8 text-sm font-semibold uppercase tracking-wide text-white">
            {dict.footer.departments}
          </h4>
          <ul className="space-y-2.5 text-sm">
            {departments.slice(0, 5).map((department) => (
              <li key={department.id}>
                <Link
                  href={`/${locale}/doctors?department=${department.id}`}
                  className="hover:text-white"
                >
                  {ar ? department.nameAr : department.nameEn}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">
            {dict.footer.branches}
          </h4>
          <ul className="space-y-4 text-sm">
            {branches.map((branch) => (
              <li key={branch.id}>
                <a
                  href={branch.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-2.5 hover:text-white"
                >
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-400" />
                  <span>
                    <span className="block font-semibold text-white">
                      {ar ? branch.nameAr : branch.nameEn}
                    </span>
                    <span className="text-ink-300 group-hover:text-ink-100">
                      {ar ? branch.addressAr : branch.addressEn}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">
            {dict.footer.contact}
          </h4>
          <ul className="space-y-3 text-sm">
            <li>
              <a
                href={telHref(dict.booking.phone)}
                className="flex items-center gap-2.5 hover:text-white"
              >
                <Phone className="h-4 w-4 flex-shrink-0 text-primary-400" />
                <span dir="ltr" className="font-semibold">
                  {dict.booking.phone}
                </span>
              </a>
            </li>
            <li>
              <a
                href={`mailto:${dict.contact.emailValue}`}
                className="flex items-center gap-2.5 hover:text-white"
              >
                <Mail className="h-4 w-4 flex-shrink-0 text-primary-400" />
                <span dir="ltr">{dict.contact.emailValue}</span>
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ink-800">
        <div className="container-x py-6 text-center text-xs text-ink-400 sm:text-start">
          <p>
            &copy; {year} {dict.meta.siteName}. {dict.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
