import type { Locale } from "./i18n";

// The clinic's other systems (each with its own sign-in), shown as small
// quick links on the staff and supervisor pages.

export type ClinicSystem = { id: "pms" | "hr" | "yeastar"; title: string; hint: string; url: string };

const SYSTEMS: { id: ClinicSystem["id"]; url: string; ar: [string, string]; en: [string, string] }[] = [
  {
    id: "pms",
    url: "https://dentera.microchips-cloud.com/pms",
    ar: ["PMS", "نظام العيادة: المرضى والمواعيد."],
    en: ["PMS", "Clinic system: patients and appointments."],
  },
  {
    id: "hr",
    url: "https://dentera.microchips-cloud.com/hr/Default/Login",
    ar: ["HR", "نظام الموارد البشرية."],
    en: ["HR", "Human resources system."],
  },
  {
    id: "yeastar",
    url: "https://dentera.ras.yeastar.com/",
    ar: ["Yeastar", "السنترال: المكالمات والتحويلات."],
    en: ["Yeastar", "Phone system: calls and extensions."],
  },
];

/** The systems with these ids, in this order, with their texts. */
export function clinicSystems(locale: Locale, ids: ClinicSystem["id"][]): ClinicSystem[] {
  return ids.flatMap((id) => {
    const s = SYSTEMS.find((x) => x.id === id);
    if (!s) return [];
    const [title, hint] = locale === "ar" ? s.ar : s.en;
    return [{ id, title, hint, url: s.url }];
  });
}
