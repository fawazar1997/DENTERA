import type { Locale } from "./i18n";

// The supervisor's home page (one private link that leads to every page the
// supervisor uses) and its control panel section.

const ar = {
  title: "صفحة المشرف",
  welcome: "أهلًا بك",
  choose: "اختر القسم الذي تريد فتحه",
  bookingsHint: "متابعة طلبات المواعيد وتعيين التحويلة لكل طلب.",
  formsHint: "النماذج والصادر والوارد، مع سجل الخطابات للفرعين للاطلاع فقط.",
  directoryHint: "أرقام التنسيق للأطباء في الفرعين.",
  pricesHint: "قائمة أسعار الخدمات الداخلية.",
  open: "فتح",
  quickAccess: "وصول سريع",
  home: "صفحة المشرف",
  internal: "داخلي — للمشرف فقط",
  // Control panel
  adminHint:
    "رابط واحد خاص بالمشرف يفتح صفحة رئيسية فيها أيقونات لكل ما يتابعه: طلبات الحجز (مع تعيين التحويلات)، والنماذج والخطابات مع سجل الخطابات (اطلاع فقط)، ودليل التنسيق وقائمة الأسعار. أنشئ رابطًا جديدًا لإلغاء القديم (مثلًا عند تغيّر المشرف).",
  linkHint: "شارك هذا الرابط مع المشرف فقط. من يملك الرابط يفتح كل ما في القائمة.",
  includes: "ما يظهر للمشرف",
  notShared: "يظهر عند إنشاء رابطه",
  canAssign: "عرض وتعديل الحالة وتعيين التحويلات",
  viewOnly: "النماذج والإرسال، والسجل للاطلاع فقط",
  sameAsStaff: "نفس صفحة الموظفين",
  manageHere: "رابط المشرف وما يصل إليه من صفحة «رابط المشرف» في لوحة التحكم.",
  openManage: "إدارة رابط المشرف",
};

const en: typeof ar = {
  title: "Supervisor",
  welcome: "Welcome",
  choose: "Choose what you want to open",
  bookingsHint: "Follow appointment requests and assign each one's extension.",
  formsHint: "Forms, outgoing and incoming letters, and both branches' letters register (view only).",
  directoryHint: "Doctors' coordination numbers at both branches.",
  pricesHint: "The internal price list.",
  open: "Open",
  quickAccess: "Quick access",
  home: "Supervisor home",
  internal: "Internal — supervisor only",
  adminHint:
    "One private link for the supervisor, opening a home page with an icon for everything they follow: booking requests (with assigning extensions), forms and letters with the letters register (view only), the coordination directory and the price list. Regenerate it to cancel the old link (for example, when the supervisor changes).",
  linkHint: "Share this link with the supervisor only. Anyone with it can open everything in the list.",
  includes: "What the supervisor sees",
  notShared: "Shown once its link is created",
  canAssign: "View, update status and assign extensions",
  viewOnly: "Forms and sending; the register is view only",
  sameAsStaff: "Same page as staff",
  manageHere: "The supervisor link, and what it leads to, is on the Supervisor link page of the control panel.",
  openManage: "Manage the supervisor link",
};

export type SupervisorText = typeof ar;

export function supervisorText(locale: Locale): SupervisorText {
  return locale === "ar" ? ar : en;
}
