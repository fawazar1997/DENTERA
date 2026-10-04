import type { Branch } from "./types";

/** Toll-free booking number; every "book" button calls it. */
export const DEFAULT_BOOKING_PHONE = "8003012345";

export function googleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query
  )}`;
}

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
    active: true,
  },
  {
    id: "khamis-mushait",
    nameEn: "Khamis Mushait Branch",
    nameAr: "فرع خميس مشيط",
    addressEn: "Al-Ghunaim Square, Al-Shifa District, Khamis Mushait",
    addressAr: "الغنيم سكوير، حي الشفاء، خميس مشيط",
    mapUrl: googleMapsSearchUrl("عيادات دنتيرا للأسنان الغنيم سكوير خميس مشيط"),
    active: true,
  },
];
