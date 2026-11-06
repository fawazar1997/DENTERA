// Staff documents: shared by the server and the pages (no server-only
// imports here).

/** A short label for a document's type (PDF, Google Docs…), from its link. */
export function documentKind(link: string): string {
  if (/docs\.google\.com\/document/.test(link)) return "Google Docs";
  if (/docs\.google\.com\/spreadsheets/.test(link)) return "Google Sheets";
  if (/docs\.google\.com\/presentation/.test(link)) return "Google Slides";
  if (/docs\.google\.com\/forms|forms\.gle/.test(link)) return "Google Forms";
  if (/\.pdf(\?|#|$)/i.test(link)) return "PDF";
  if (/drive\.google\.com/.test(link)) return "Drive";
  return "";
}

/** Documents added within this many days show as new to staff. */
export const NEW_DOCUMENT_DAYS = 14;

export function isNewDocument(createdAt: string, now = Date.now()): boolean {
  const at = Date.parse(createdAt);
  return Number.isFinite(at) && now - at < NEW_DOCUMENT_DAYS * 24 * 60 * 60 * 1000;
}

/** The day a document was added, as staff read it (Saudi time). */
export function documentDate(createdAt: string, locale: "ar" | "en"): string {
  const at = new Date(createdAt);
  if (Number.isNaN(at.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Riyadh",
  }).format(at);
}
