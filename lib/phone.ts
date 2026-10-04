/** Digits (and a leading +) only, for tel: links. Safe for client code. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
