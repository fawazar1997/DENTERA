import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import { getActiveDepartments } from "@/lib/db";
import { bookingFormLabels } from "@/lib/bookingLabels";
import { CallButton } from "./CallButton";
import { BookingForm } from "./BookingForm";

/** Booking banner: invitation and call button beside the request form. */
export async function CtaBanner({
  locale,
  dict,
  source = "cta",
}: {
  locale: Locale;
  dict: Dictionary;
  /** Page the banner is on, saved with each request. */
  source?: string;
}) {
  const departments = await getActiveDepartments();
  const ar = locale === "ar";

  return (
    <section id="book" className="section-y scroll-mt-24 bg-white">
      <div className="container-x">
        <div className="relative overflow-hidden rounded-xl2 bg-gradient-to-br from-ink-900 to-ink-950 px-6 py-10 shadow-soft sm:px-12 sm:py-14">
          <div
            className="bg-brand-pattern bg-primary-400 opacity-[0.14] absolute inset-0"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-24 -start-24 h-72 w-72 rounded-full bg-primary-500/20 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative grid items-center gap-10 lg:grid-cols-2">
            <div className="text-center lg:text-start">
              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {dict.home.ctaTitle}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-primary-100 lg:mx-0">
                {dict.home.ctaBody}
              </p>
              <CallButton
                dict={dict}
                label={dict.home.ctaButton}
                variant="accent"
                className="mt-8 px-8 py-4 text-base"
              />
              <p className="mx-auto mt-5 max-w-md text-sm text-sand-200 lg:mx-0">
                {dict.booking.note}
              </p>
            </div>
            <div>
              <p className="mb-3 text-center text-lg font-bold text-white lg:text-start">
                {dict.booking.formTitle}
              </p>
              <BookingForm
                source={source}
                labels={bookingFormLabels(dict)}
                departments={departments.map((d) => ({ id: d.id, name: ar ? d.nameAr : d.nameEn }))}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
