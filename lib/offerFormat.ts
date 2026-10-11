// Display helpers for offers. Client-safe (no db imports).

export function formatPrice(value: number, currency: string): string {
  const amount = value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return `${amount} ${currency}`;
}

/** Whole-percent discount, or undefined when there's no real saving. */
export function discountPercent(now?: number, was?: number): number | undefined {
  if (!now || !was || was <= now) return undefined;
  return Math.round(((was - now) / was) * 100);
}

/** "2026-10-31" → "31 October 2026" / "31 أكتوبر 2026". */
export function formatOfferDate(date: string, locale: "en" | "ar"): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
