import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import { CallButton } from "./CallButton";

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
        <div className="relative overflow-hidden rounded-xl2 bg-gradient-to-br from-ink-900 to-ink-950 px-8 py-14 text-center shadow-soft sm:px-16">
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
            <CallButton
              dict={dict}
              label={dict.home.ctaButton}
              variant="accent"
              className="mt-8 px-8 py-4 text-base"
            />
            <p className="mx-auto mt-5 max-w-md text-sm text-sand-200">
              {dict.booking.note}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
