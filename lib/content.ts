import type { Locale } from "./i18n";
import { dictionaries, type Dictionary } from "./dictionaries";
import { getContentOverrides } from "./db";

type Label = { en: string; ar: string };

type FieldDef = { key: string; label: Label };

export type ContentSection = {
  id: Exclude<keyof Dictionary, "admin" | "common">;
  label: Label;
  hint?: Label;
  fields: FieldDef[];
};

const f = (key: string, en: string, ar: string): FieldDef => ({
  key,
  label: { en, ar },
});

/**
 * Everything editable from Control Panel → Texts & Numbers, in the order
 * it's shown there, with a plain-language label for every field.
 */
export const CONTENT_SECTIONS: ContentSection[] = [
  {
    id: "booking",
    label: { en: "Booking phone", ar: "رقم الحجز" },
    hint: {
      en: "Every booking button on the website calls this number.",
      ar: "كل أزرار الحجز في الموقع تتصل على هذا الرقم.",
    },
    fields: [
      f("phone", "Booking phone number", "رقم الحجز"),
      f("button", "Booking button text", "نص زر الحجز"),
      f("buttonShort", "Short booking button text (mobile)", "نص زر الحجز المختصر (الجوال)"),
      f("note", "Booking note", "ملاحظة الحجز"),
    ],
  },
  {
    id: "stats",
    label: { en: "Numbers & statistics", ar: "الأرقام والإحصائيات" },
    hint: {
      en: "Shown in the home page hero.",
      ar: "تظهر في أعلى الصفحة الرئيسية.",
    },
    fields: [
      f("yearsValue", "Years of experience — number", "سنوات الخبرة — الرقم"),
      f("yearsLabel", "Years of experience — label", "سنوات الخبرة — العنوان"),
      f("doctorsValue", "Doctors — number", "الأطباء — الرقم"),
      f("doctorsLabel", "Doctors — label", "الأطباء — العنوان"),
      f("patientsValue", "Patients — number", "المرضى — الرقم"),
      f("patientsLabel", "Patients — label", "المرضى — العنوان"),
      f("departmentsValue", "Departments — number", "الأقسام — الرقم"),
      f("departmentsLabel", "Departments — label", "الأقسام — العنوان"),
    ],
  },
  {
    id: "hero",
    label: { en: "Home page — top section", ar: "الصفحة الرئيسية — القسم العلوي" },
    fields: [
      f("eyebrow", "Small line above the title", "السطر الصغير فوق العنوان"),
      f("title", "Main title", "العنوان الرئيسي"),
      f("subtitle", "Description", "الوصف"),
      f("ctaPrimary", "Main button", "الزر الرئيسي"),
      f("ctaSecondary", "Second button", "الزر الثاني"),
    ],
  },
  {
    id: "home",
    label: { en: "Home page — sections", ar: "الصفحة الرئيسية — الأقسام" },
    fields: [
      f("whyTitle", "\"Why choose us\" — title", "«لماذا تختارنا» — العنوان"),
      f("whySubtitle", "\"Why choose us\" — description", "«لماذا تختارنا» — الوصف"),
      f("why1Title", "Reason 1 — title", "الميزة 1 — العنوان"),
      f("why1Body", "Reason 1 — text", "الميزة 1 — النص"),
      f("why2Title", "Reason 2 — title", "الميزة 2 — العنوان"),
      f("why2Body", "Reason 2 — text", "الميزة 2 — النص"),
      f("why3Title", "Reason 3 — title", "الميزة 3 — العنوان"),
      f("why3Body", "Reason 3 — text", "الميزة 3 — النص"),
      f("why4Title", "Reason 4 — title", "الميزة 4 — العنوان"),
      f("why4Body", "Reason 4 — text", "الميزة 4 — النص"),
      f("departmentsTitle", "Departments — title", "الأقسام — العنوان"),
      f("departmentsSubtitle", "Departments — description", "الأقسام — الوصف"),
      f("departmentsCta", "Departments — link", "الأقسام — الرابط"),
      f("doctorsTitle", "Doctors — title", "الأطباء — العنوان"),
      f("doctorsSubtitle", "Doctors — description", "الأطباء — الوصف"),
      f("doctorsCta", "Doctors — link", "الأطباء — الرابط"),
      f("partnersTitle", "Partners — title", "الشركاء — العنوان"),
      f("partnersSubtitle", "Partners — description", "الشركاء — الوصف"),
      f("branchesTitle", "Branches — title", "الفروع — العنوان"),
      f("branchesSubtitle", "Branches — description", "الفروع — الوصف"),
      f("testimonialsTitle", "Patient reviews — title", "آراء المرضى — العنوان"),
      f("testimonialsSubtitle", "Patient reviews — description", "آراء المرضى — الوصف"),
      f("ctaTitle", "Booking banner — title", "بنر الحجز — العنوان"),
      f("ctaBody", "Booking banner — text", "بنر الحجز — النص"),
      f("ctaButton", "Booking banner — button", "بنر الحجز — الزر"),
    ],
  },
  {
    id: "testimonials",
    label: { en: "Patient reviews", ar: "آراء المرضى" },
    fields: [
      f("t1Name", "Review 1 — name", "الرأي 1 — الاسم"),
      f("t1Quote", "Review 1 — text", "الرأي 1 — النص"),
      f("t2Name", "Review 2 — name", "الرأي 2 — الاسم"),
      f("t2Quote", "Review 2 — text", "الرأي 2 — النص"),
      f("t3Name", "Review 3 — name", "الرأي 3 — الاسم"),
      f("t3Quote", "Review 3 — text", "الرأي 3 — النص"),
    ],
  },
  {
    id: "about",
    label: { en: "About Us page", ar: "صفحة من نحن" },
    fields: [
      f("title", "Page title", "عنوان الصفحة"),
      f("subtitle", "Page description", "وصف الصفحة"),
      f("storyTitle", "Our story — title", "قصتنا — العنوان"),
      f("storyBody", "Our story — text", "قصتنا — النص"),
      f("missionTitle", "Mission — title", "المهمة — العنوان"),
      f("missionBody", "Mission — text", "المهمة — النص"),
      f("visionTitle", "Vision — title", "الرؤية — العنوان"),
      f("visionBody", "Vision — text", "الرؤية — النص"),
      f("valuesTitle", "Values — title", "القيم — العنوان"),
      f("value1", "Value 1", "القيمة 1"),
      f("value2", "Value 2", "القيمة 2"),
      f("value3", "Value 3", "القيمة 3"),
      f("value4", "Value 4", "القيمة 4"),
    ],
  },
  {
    id: "departments",
    label: { en: "Departments page", ar: "صفحة الأقسام" },
    fields: [
      f("title", "Page title", "عنوان الصفحة"),
      f("subtitle", "Page description", "وصف الصفحة"),
      f("viewDoctors", "\"View doctors\" link", "رابط «عرض الأطباء»"),
      f("empty", "Text when there are no departments", "النص عند عدم وجود أقسام"),
    ],
  },
  {
    id: "doctors",
    label: { en: "Doctors page", ar: "صفحة الأطباء" },
    fields: [
      f("title", "Page title", "عنوان الصفحة"),
      f("subtitle", "Page description", "وصف الصفحة"),
      f("experienceLabel", "\"Years of experience\" label", "عبارة «سنوات خبرة»"),
      f("filterAll", "Filter — all departments", "الفلتر — جميع الأقسام"),
      f("viewProfile", "\"View profile\" link", "رابط «عرض السيرة الذاتية»"),
      f("empty", "Text when there are no doctors", "النص عند عدم وجود أطباء"),
    ],
  },
  {
    id: "doctorProfile",
    label: { en: "Doctor profile page", ar: "صفحة السيرة الذاتية للطبيب" },
    fields: [
      f("back", "Back link", "رابط الرجوع"),
      f("about", "\"About\" heading", "عنوان «نبذة»"),
      f("qualifications", "\"Qualifications\" heading", "عنوان «المؤهلات العلمية»"),
      f("experience", "\"Experience\" heading", "عنوان «الخبرات العملية»"),
      f("services", "\"Areas of expertise\" heading", "عنوان «مجالات التخصص»"),
      f("achievements", "\"Achievements\" heading", "عنوان «الإنجازات»"),
      f("languages", "\"Languages\" heading", "عنوان «اللغات»"),
      f("branches", "\"Available at\" heading", "عنوان «يتواجد في»"),
      f("department", "\"Department\" label", "عبارة «القسم»"),
      f("yearsExperience", "\"Years of experience\" label", "عبارة «سنوات الخبرة»"),
      f("bookTitle", "Booking box — title", "مربع الحجز — العنوان"),
      f("bookBody", "Booking box — text", "مربع الحجز — النص"),
    ],
  },
  {
    id: "contact",
    label: { en: "Contact page", ar: "صفحة تواصل معنا" },
    fields: [
      f("title", "Page title", "عنوان الصفحة"),
      f("subtitle", "Page description", "وصف الصفحة"),
      f("bookingTitle", "Booking box — title", "مربع الحجز — العنوان"),
      f("bookingBody", "Booking box — text", "مربع الحجز — النص"),
      f("phoneLabel", "Phone label", "عنوان الهاتف"),
      f("emailLabel", "Email label", "عنوان البريد"),
      f("emailValue", "Email address", "البريد الإلكتروني"),
      f("hoursLabel", "Working hours label", "عنوان ساعات العمل"),
      f(
        "hoursValue",
        "Default working hours (for a branch without its own hours)",
        "ساعات العمل الافتراضية (للفرع الذي ليس له ساعات خاصة)"
      ),
      f("branchesTitle", "Branches — title", "الفروع — العنوان"),
      f("openMap", "\"Open in maps\" button", "زر «افتح على الخريطة»"),
      f("socialTitle", "Social media — title", "مواقع التواصل — العنوان"),
      f("socialBody", "Social media — text", "مواقع التواصل — النص"),
    ],
  },
  {
    id: "footer",
    label: { en: "Footer", ar: "أسفل الصفحة" },
    fields: [
      f("description", "Description under the logo", "الوصف تحت الشعار"),
      f("quickLinks", "Quick links — title", "روابط سريعة — العنوان"),
      f("departments", "Departments — title", "الأقسام — العنوان"),
      f("branches", "Branches — title", "الفروع — العنوان"),
      f("contact", "Contact — title", "التواصل — العنوان"),
      f("followUs", "Social media — title", "مواقع التواصل — العنوان"),
      f("rights", "Copyright text", "نص الحقوق"),
    ],
  },
  {
    id: "nav",
    label: { en: "Menu", ar: "القائمة العلوية" },
    fields: [
      f("home", "Home", "الرئيسية"),
      f("about", "About Us", "من نحن"),
      f("departments", "Departments", "الأقسام"),
      f("doctors", "Doctors", "الأطباء"),
      f("contact", "Contact", "تواصل معنا"),
    ],
  },
  {
    id: "meta",
    label: { en: "Site name & search engines", ar: "اسم الموقع ومحركات البحث" },
    fields: [
      f("siteName", "Site name", "اسم الموقع"),
      f("tagline", "Tagline (browser tab)", "الشعار النصي (عنوان المتصفح)"),
      f("description", "Description for Google", "الوصف في قوقل"),
    ],
  },
];

/** The built-in value for "section.key" in a language. */
export function defaultText(locale: Locale, fullKey: string): string {
  const [section, key] = fullKey.split(".");
  const group = (dictionaries[locale] as Record<string, Record<string, string>>)[
    section
  ];
  return group?.[key] ?? "";
}

/** Long default texts get a multi-line box in the editor. */
export function isLongField(fullKey: string): boolean {
  return defaultText("en", fullKey).length > 60;
}

/**
 * Site dictionary with the control panel's text edits applied. Use this
 * for every public page; the admin UI uses the plain getDictionary().
 */
export async function getSiteDictionary(locale: Locale): Promise<Dictionary> {
  const base = dictionaries[locale] as Dictionary;
  const overrides = (await getContentOverrides())[locale];
  if (!overrides || Object.keys(overrides).length === 0) return base;

  const merged = structuredClone(base) as unknown as Record<
    string,
    Record<string, string>
  >;
  for (const [fullKey, value] of Object.entries(overrides)) {
    const [section, key] = fullKey.split(".");
    if (merged[section] && key in merged[section] && value) {
      merged[section][key] = value;
    }
  }
  return merged as unknown as Dictionary;
}
