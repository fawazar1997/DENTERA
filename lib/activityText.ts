import type { Locale } from "./i18n";
import type { ActivityAction } from "./activity";

// Texts of Control Panel → Activity log.

const ar = {
  subtitle: "كل تغيير في لوحة التحكم: من قام به (المدير أو حساب التسويق)، وماذا غيّر، ومتى. يُحفظ آخر 3000 تغيير.",
  allUsers: "كل الحسابات",
  admin: "المدير",
  allSections: "كل الأقسام",
  apply: "عرض",
  empty: "لا يوجد نشاط بعد.",
  count: "تغيير",
  prev: "السابق",
  next: "التالي",
  actions: {
    create: "أضاف",
    update: "عدّل",
    delete: "حذف",
    move: "غيّر الترتيب",
    upload: "رفع",
    import: "استورد",
    undo: "تراجع عن استيراد",
    link: "أنشأ رابطًا جديدًا",
    connect: "ربط Google Drive",
    disconnect: "ألغى ربط Google Drive",
    settings: "غيّر الإعدادات",
  } satisfies Record<ActivityAction, string>,
};

const en: typeof ar = {
  subtitle: "Every change in the control panel: who made it (the admin or the marketing account), what changed, and when. The last 3,000 changes are kept.",
  allUsers: "All accounts",
  admin: "Admin",
  allSections: "All sections",
  apply: "Show",
  empty: "No activity yet.",
  count: "changes",
  prev: "Previous",
  next: "Next",
  actions: {
    create: "Added",
    update: "Edited",
    delete: "Deleted",
    move: "Reordered",
    upload: "Uploaded",
    import: "Imported",
    undo: "Undid import",
    link: "Created a new link",
    connect: "Connected Google Drive",
    disconnect: "Disconnected Google Drive",
    settings: "Changed settings",
  },
};

export function activityText(locale: Locale) {
  return locale === "ar" ? ar : en;
}
