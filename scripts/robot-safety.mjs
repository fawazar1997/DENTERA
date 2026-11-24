// What the finance robot may press. It only reads reports: any button that
// would change the clinic or accounting system (post, unpost, reverse,
// approve, save, delete, edit, create, import, send to ZATCA…) is refused.
// View filters that merely show more rows, such as «Show unposted» /
// «عرض غير المرحّل», are allowed. Menu items are named in the config and
// are not checked here.

const FORBIDDEN =
  /\b(post|posting|unpost|re-?post|reverse|reversal|zatca|cancel|delete|remove|void|save|submit|approve|reject|refund|send|edit|update|modify|new|add|create|import|upload|close|lock|reopen|transfer|pay)\b|ترحيل|الغاء الترحيل|إلغاء|الغاء|عكس|حذف|حفظ|إرسال|ارسال|اعتماد|رفض|تعديل|جديد|إضافة|اضافة|استيراد|رفع|إقفال|اقفال|قفل|سداد|دفع/i;

/** Filters that only show more rows (allowed even though they mention posting). */
const VIEW_FILTERS = /^(show|display|include|view)\s+(un-?posted|not posted|posted)( entries| only)?$|^(عرض|إظهار|اظهار)\s+(غير\s+)?(المرحل|المرحّل|المرحلة|المرحّلة)$/i;

export function isForbidden(text) {
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return false;
  if (VIEW_FILTERS.test(t)) return false;
  return FORBIDDEN.test(t);
}
