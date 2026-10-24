import { localePath, type Locale } from "@/lib/i18n";
import { getSiteDictionary } from "@/lib/content";
import { getActiveBranches, getSettings } from "@/lib/db";
import { branchSchedule } from "@/lib/hours";
import { absoluteUrl } from "@/lib/seo";
import type { Branch } from "@/lib/types";

// Clinic details in the schema.org format search engines read: the
// clinic, its branches with addresses, phone, map and opening hours.
// Built from the same data the pages show, so it never disagrees with them.

const SCHEMA_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** City of the built-in branches (the address text is free-form). */
const BRANCH_CITY: Record<string, { ar: string; en: string }> = {
  abha: { ar: "أبها", en: "Abha" },
  "khamis-mushait": { ar: "خميس مشيط", en: "Khamis Mushait" },
};

export const ORGANIZATION_ID = absoluteUrl("/#organization");

function openingHours(branch: Branch) {
  const schedule = branchSchedule(branch);
  if (!schedule) return undefined;
  return schedule.flatMap((day, index) =>
    day.closed
      ? []
      : day.periods.map((period) => ({
          "@type": "OpeningHoursSpecification",
          dayOfWeek: `https://schema.org/${SCHEMA_DAYS[index]}`,
          opens: period.from,
          closes: period.to,
        }))
  );
}

/** Writes data as a JSON-LD script tag (with "<" escaped, so text can't end the tag). */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export async function ClinicJsonLd({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  const [dict, branches, settings] = await Promise.all([
    getSiteDictionary(locale),
    getActiveBranches(),
    getSettings(),
  ]);
  const sameAs = Object.values(settings.social ?? {}).filter(
    (url): url is string => typeof url === "string" && /^https:\/\//.test(url)
  );
  const logo = absoluteUrl("/brand/dentera-icon.png");

  const data = {
    "@context": "https://schema.org",
    "@type": "Dentist",
    "@id": ORGANIZATION_ID,
    name: dict.meta.siteName,
    alternateName: ar ? "Dentera" : "دنتيرا",
    description: dict.meta.description,
    url: absoluteUrl(localePath(locale)),
    logo,
    image: absoluteUrl("/og.png"),
    telephone: dict.booking.phone,
    email: dict.contact.emailValue,
    areaServed: Object.values(BRANCH_CITY).map((city) => (ar ? city.ar : city.en)),
    ...(sameAs.length > 0 ? { sameAs } : {}),
    department: branches.map((branch) => {
      const city = BRANCH_CITY[branch.id];
      return {
        "@type": "Dentist",
        "@id": absoluteUrl(`/#branch-${branch.id}`),
        name: `${dict.meta.siteName} — ${ar ? branch.nameAr : branch.nameEn}`,
        image: logo,
        telephone: branch.phone || dict.booking.phone,
        hasMap: branch.mapUrl,
        address: {
          "@type": "PostalAddress",
          streetAddress: ar ? branch.addressAr : branch.addressEn,
          ...(city ? { addressLocality: ar ? city.ar : city.en } : {}),
          addressRegion: ar ? "عسير" : "Asir",
          addressCountry: "SA",
        },
        openingHoursSpecification: openingHours(branch),
        parentOrganization: { "@id": ORGANIZATION_ID },
      };
    }),
  };

  return <JsonLd data={data} />;
}
