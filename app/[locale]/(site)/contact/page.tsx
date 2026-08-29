import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getActiveDepartments } from "@/lib/db";
import { ContactForm } from "@/components/ContactForm";

export default function ContactPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const dict = getDictionary(locale);
  const departments = getActiveDepartments();

  const info = [
    { icon: MapPin, label: dict.contact.addressLabel, value: dict.contact.addressValue, dir: undefined as "ltr" | undefined },
    { icon: Phone, label: dict.contact.phoneLabel, value: dict.contact.phoneValue, dir: "ltr" as const },
    { icon: Mail, label: dict.contact.emailLabel, value: dict.contact.emailValue, dir: "ltr" as const },
    { icon: Clock, label: dict.contact.hoursLabel, value: dict.contact.hoursValue, dir: undefined },
  ];

  return (
    <>
      <section className="section-y bg-gradient-to-b from-primary-50 to-paper">
        <div className="container-x text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-ink-950 sm:text-5xl">
            {dict.contact.title}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-600">
            {dict.contact.subtitle}
          </p>
        </div>
      </section>

      <section className="section-y bg-white">
        <div className="container-x grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold text-ink-900">
              {dict.contact.formTitle}
            </h2>
            <div className="mt-6">
              <ContactForm dict={dict} locale={locale} departments={departments} />
            </div>
          </div>

          <div className="space-y-4">
            {info.map((item) => (
              <div key={item.label} className="card flex items-start gap-4 p-6">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-500">
                    {item.label}
                  </p>
                  <p className="mt-1 font-medium text-ink-900" dir={item.dir}>
                    {item.value}
                  </p>
                </div>
              </div>
            ))}

            <div className="card overflow-hidden">
              <iframe
                title="map"
                className="h-64 w-full"
                loading="lazy"
                src="https://www.google.com/maps?q=Riyadh%2C%20Saudi%20Arabia&output=embed"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
