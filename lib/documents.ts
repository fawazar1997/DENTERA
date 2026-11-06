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
