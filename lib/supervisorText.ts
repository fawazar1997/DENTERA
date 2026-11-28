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
  hoursTitle: "أوقات عمل الأطباء",
  hoursHint: "تعديل أوقات عمل الطبيب في كل فرع يعمل فيه.",
  hoursPick: "اختر الطبيب لتعديل أوقات عمله",
  hoursSearch: "ابحث باسم الطبيب",
  hoursNone: "لا يوجد أطباء مطابقون.",
  hoursNoBranches: "هذا الطبيب غير مرتبط بأي فرع. تُحدَّد فروع الطبيب من لوحة التحكم.",
  hoursBranchesNote: "الفروع تُحدَّد من لوحة التحكم؛ هنا تُعدَّل الساعات فقط. إن لم تُحدَّد للطبيب ساعات في فرع، فلا تظهر له ساعات في الموقع ودليل التنسيق.",
  hoursSave: "حفظ الأوقات",
  hoursSaved: "تم الحفظ",
  hoursSavedNote: "تم حفظ أوقات العمل، وتظهر الآن في الموقع ودليل التنسيق.",
  hoursBack: "كل الأطباء",
  hoursOwn: "ساعات محددة",
  hoursOff: "صلاحية تعديل أوقات عمل الأطباء غير مفعّلة لرابط المشرف.",
  canEditHours: "السماح للمشرف بتعديل أوقات عمل الأطباء",
  canEditHoursHint: "يعدّل الساعات فقط (لا الفروع ولا بيانات الطبيب)، ويُسجَّل كل تعديل في سجل النشاط باسم المشرف.",
  allowed: "مسموح",
  notAllowed: "غير مسموح",
  hoursCanEdit: "تعديل الساعات لكل طبيب في فروعه",
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
  hoursTitle: "Doctors' working hours",
  hoursHint: "Edit a doctor's working hours in each branch they work at.",
  hoursPick: "Choose a doctor to edit their working hours",
  hoursSearch: "Search by doctor's name",
  hoursNone: "No matching doctors.",
  hoursNoBranches: "This doctor isn't linked to any branch. A doctor's branches are set in the control panel.",
  hoursBranchesNote: "Branches are set in the control panel; only the hours are edited here. When no hours are set for a doctor in a branch, none are shown on the website or in the coordination directory.",
  hoursSave: "Save hours",
  hoursSaved: "Saved",
  hoursSavedNote: "The working hours are saved and now show on the website and in the coordination directory.",
  hoursBack: "All doctors",
  hoursOwn: "Hours set",
  hoursOff: "Editing doctors' working hours isn't enabled for the supervisor link.",
  canEditHours: "Allow the supervisor to edit doctors' working hours",
  canEditHoursHint: "Hours only (not branches or the doctor's details); every change is recorded in the activity log as the supervisor.",
  allowed: "Allowed",
  notAllowed: "Not allowed",
  hoursCanEdit: "Edit hours for each doctor in their branches",
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
