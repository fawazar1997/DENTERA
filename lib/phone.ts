/** Digits (and a leading +) only, for tel: links. Safe for client code. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/**
 * WhatsApp chat link for a Saudi mobile number. Accepts local
 * (05XXXXXXXX), short (5XXXXXXXX) or international (+966 / 00966) forms.
 * An optional message is pre-filled in the chat.
 */
export function whatsappHref(phone: string, message?: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("05") && digits.length === 10) digits = `966${digits.slice(1)}`;
  else if (digits.startsWith("5") && digits.length === 9) digits = `966${digits}`;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}
