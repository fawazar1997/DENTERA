import { MapPin, Navigation, Clock, Phone } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import type { Branch } from "@/lib/types";
import { telHref } from "@/lib/phone";
import { Reveal } from "./Reveal";

/** Branch cards; clicking a card opens the branch on Google Maps. */
export function BranchCards({
  branches,
  locale,
  dict,
}: {
  branches: Branch[];
  locale: Locale;
  dict: Dictionary;
}) {
  const ar = locale === "ar";

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {branches.map((branch, i) => {
        const hours =
          (ar ? branch.hoursAr : branch.hoursEn) || dict.contact.hoursValue;
        return (
          <Reveal key={branch.id} delay={i * 100} className="h-full">
            <div className="card group relative flex h-full flex-col overflow-hidden p-7 hover:-translate-y-1 hover:shadow-soft">
              <div
                className="absolute -end-10 -top-10 h-32 w-32 rounded-full bg-primary-100/70 transition group-hover:scale-125"
                aria-hidden="true"
              />
              <div className="relative flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-ink-900 text-white">
                  <MapPin className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-ink-900">
                    {ar ? branch.nameAr : branch.nameEn}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-600">
                    {ar ? branch.addressAr : branch.addressEn}
                  </p>
                  {hours && (
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-500">
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      {hours}
                    </p>
                  )}
                  {branch.phone && (
                    <a
                      href={telHref(branch.phone)}
                      className="relative z-10 mt-2 flex items-center gap-1.5 text-sm text-ink-500 hover:text-primary-700"
                    >
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span dir="ltr">{branch.phone}</span>
                    </a>
                  )}
                </div>
              </div>
              <a
                href={branch.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="relative mt-6 inline-flex items-center gap-2 self-start text-sm font-semibold text-primary-700 after:absolute after:inset-[-100vmax] after:content-[''] hover:text-primary-800"
              >
                <Navigation className="h-4 w-4" />
                {dict.contact.openMap}
              </a>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}
