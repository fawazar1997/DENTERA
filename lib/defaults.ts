import type { Branch, WeekSchedule } from "./types";

/** Toll-free booking number; every "book" button calls it. */
export const DEFAULT_BOOKING_PHONE = "8003012345";

export function googleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query
  )}`;
}

/** Same hours every day except Friday (closed) and an optional Thursday. */
function weekly(from: string, to: string, thursdayTo = to): WeekSchedule {
  return Array.from({ length: 7 }, (_, day) =>
    day === 5
      ? { closed: true, periods: [] }
      : { closed: false, periods: [{ from, to: day === 4 ? thursdayTo : to }] }
  );
}

/** Abha (Google Maps, Oct 2026): Sat–Thu 9 AM – 10 PM, Friday closed. */
export const ABHA_SCHEDULE = weekly("09:00", "22:00");

/** Khamis Mushait: Sat–Wed 12 PM – 10 PM, Thu 12 PM – 9 PM, Friday closed. */
export const KHAMIS_SCHEDULE = weekly("12:00", "22:00", "21:00");

// The two Dentera branches. The map links search Google Maps for the
// clinic at each location; paste an exact "Share → Copy link" pin from
// Google Maps in the control panel (Branches) to point at a precise spot.
export const DEFAULT_BRANCHES: Branch[] = [
  {
    id: "abha",
    nameEn: "Abha Branch",
    nameAr: "فرع أبها",
    addressEn: "Makkah Al-Mukarramah St., Al-Nuzha District, Abha",
    addressAr: "شارع مكة المكرمة، حي النزهة، أبها",
    mapUrl: googleMapsSearchUrl("عيادات دنتيرا للأسنان أبها حي النزهة"),
    schedule: ABHA_SCHEDULE,
    active: true,
  },
  {
    id: "khamis-mushait",
    nameEn: "Khamis Mushait Branch",
    nameAr: "فرع خميس مشيط",
    addressEn: "Al-Ghunaim Square, Al-Shifa District, Khamis Mushait",
    addressAr: "الغنيم سكوير، حي الشفاء، خميس مشيط",
    mapUrl: googleMapsSearchUrl("عيادات دنتيرا للأسنان الغنيم سكوير خميس مشيط"),
    schedule: KHAMIS_SCHEDULE,
    active: true,
  },
];
