import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";

export function CtaBanner({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  return (
    <section className="section-y bg-white">
      <div className="container-x">
        <div className="relative overflow-hidden rounded-xl2 bg-gradient-to-br from-primary-700 to-primary-900 px-8 py-14 text-center shadow-soft sm:px-16">
          <div
            className="bg-hero-grid absolute inset-0 opacity-10 [background-size:20px_20px]"
            aria-hidden="true"
          />
          <div className="relative">
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {dict.home.ctaTitle}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-primary-100">
              {dict.home.ctaBody}
            </p>
            <Link
              href={`/${locale}/contact`}
              className="btn-accent mt-8 inline-flex"
            >
              <CalendarCheck className="h-4 w-4" />
              {dict.home.ctaButton}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
