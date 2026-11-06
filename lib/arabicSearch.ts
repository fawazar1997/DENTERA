/**
 * Arabic text folded for searching: no diacritics or tatweel, one alef, ة as
 * ه, ى as ي, Arabic-Indic digits as 0-9. Shared by the server and the pages
 * so a search finds the same letters everywhere.
 */
export function foldArabic(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\s+/g, " ")
    .trim();
}
