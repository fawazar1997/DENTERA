import type { Locale } from "./i18n";

// The website's privacy policy (/privacy), in Arabic and English. It
// describes what the site actually does: booking requests, job
// applications (CVs in Google Drive), no advertising trackers or
// third-party analytics.

export type PrivacySection = { id: string; title: string; paragraphs?: string[]; items?: string[]; after?: string[] };

const UPDATED = "2026-11-18";

const ar = {
  metaTitle: "سياسة الخصوصية",
  metaDescription: "كيف تجمع عيادات دنتيرا لطب الأسنان بياناتك الشخصية وتستخدمها وتحميها، وحقوقك وفق نظام حماية البيانات الشخصية.",
  title: "سياسة الخصوصية",
  intro:
    "في عيادات دنتيرا لطب الأسنان نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية وفق نظام حماية البيانات الشخصية في المملكة العربية السعودية ولوائحه التنفيذية. توضّح هذه السياسة البيانات التي نجمعها عبر موقعنا، وكيف نستخدمها ونحميها، وحقوقك تجاهها.",
  updated: "آخر تحديث",
  contents: "المحتويات",
  sections: [
    {
      id: "collect",
      title: "البيانات التي نجمعها",
      items: [
        "طلبات حجز المواعيد: الاسم، ورقم الجوال، والقسم أو الطبيب أو الفرع الذي تختاره، والعرض إن كان الطلب من صفحة عرض.",
        "طلبات التوظيف: الاسم، والجنس، والجنسية، ورقم الجوال، والبريد الإلكتروني، ومدينة الإقامة، وتاريخ الميلاد إن ذكرته، والمجال المطلوب، والمؤهل والخبرة والتصنيف المهني، والسيرة الذاتية والشهادات التي ترفقها.",
        "تواصلك معنا: ما تشاركه معنا عند الاتصال بنا أو مراسلتنا عبر الواتساب أو البريد الإلكتروني.",
        "البيانات التقنية: لا يستخدم موقعنا أدوات تتبّع إعلانية أو أدوات تحليلات تابعة لجهات أخرى. يحتفظ مزوّد الاستضافة بسجلات تقنية أساسية (مثل عنوان IP ووقت الزيارة) لأغراض الأمان وتشغيل الموقع.",
      ],
    },
    {
      id: "use",
      title: "كيف نستخدم بياناتك",
      items: [
        "التواصل معك لترتيب موعدك وتأكيده، والرد على استفساراتك.",
        "دراسة طلب التوظيف والتواصل معك بشأنه أو بشأن فرص مناسبة لاحقًا.",
        "تحسين خدماتنا وتنظيم العمل داخل العيادة.",
        "الوفاء بالالتزامات النظامية والرد على طلبات الجهات المختصة.",
      ],
      after: ["لا نبيع بياناتك الشخصية، ولا نستخدمها لأغراض تسويقية دون موافقتك."],
    },
    {
      id: "basis",
      title: "أساس المعالجة",
      paragraphs: [
        "نعالج بياناتك بناءً على موافقتك عند إرسال طلب الحجز أو طلب التوظيف، أو لتنفيذ الخدمة التي طلبتها، أو للوفاء بالتزام نظامي. ويمكنك سحب موافقتك في أي وقت دون أن يؤثر ذلك على ما تمّت معالجته قبل السحب.",
      ],
    },
    {
      id: "share",
      title: "مشاركة البيانات",
      paragraphs: ["لا يطّلع على بياناتك إلا المختصون في العيادة بحسب الحاجة، مثل مركز الاتصال لطلبات الحجز وإدارة الموارد البشرية لطلبات التوظيف. وقد نشاركها مع:"],
      items: [
        "مزوّدي الخدمات التقنية الذين يعالجونها نيابةً عنّا وبموجب التزامات حماية مناسبة، وهم: مزوّد استضافة الموقع وتخزين البيانات (Vercel)، ومزوّد تخزين ملفات التوظيف (Google Drive). وقد تُخزَّن بعض هذه البيانات خارج المملكة لدى هؤلاء المزوّدين مع الضمانات التي يتطلبها النظام.",
        "الجهات الحكومية أو القضائية عند وجود طلب نظامي.",
      ],
    },
    {
      id: "retention",
      title: "مدة الاحتفاظ",
      paragraphs: [
        "نحتفظ ببياناتك المدة اللازمة لتحقيق الغرض الذي جُمعت من أجله، أو المدة التي تتطلبها الأنظمة. نحتفظ بطلبات التوظيف لدراستها وللفرص المستقبلية المناسبة، ويمكنك طلب حذف طلبك في أي وقت. وعند انتهاء الحاجة نتلف البيانات أو نجعلها غير قابلة للربط بك.",
      ],
    },
    {
      id: "security",
      title: "حماية البيانات",
      paragraphs: [
        "نطبّق إجراءات تقنية وتنظيمية لحماية بياناتك، منها: الاتصال المشفّر (HTTPS)، وتخزين البيانات في مخازن خاصة غير متاحة للعموم، وقصر الوصول على الموظفين المختصين بحسابات وصلاحيات محددة، وتسجيل العمليات في لوحة التحكم.",
      ],
    },
    {
      id: "rights",
      title: "حقوقك",
      paragraphs: ["يكفل لك نظام حماية البيانات الشخصية الحقوق التالية:"],
      items: [
        "العلم: معرفة كيف تُجمع بياناتك وتُعالج، وهو ما توضحه هذه السياسة.",
        "الوصول: الاطلاع على بياناتك لدينا والحصول على نسخة منها.",
        "التصحيح: طلب تصحيح بياناتك أو استكمالها أو تحديثها.",
        "الإتلاف: طلب حذف بياناتك متى انتفت الحاجة إليها، ما لم يوجد ما يستوجب الاحتفاظ بها نظامًا.",
        "سحب الموافقة: في أي وقت.",
      ],
    },
    {
      id: "cookies",
      title: "ملفات تعريف الارتباط والروابط الخارجية",
      paragraphs: [
        "لا يستخدم الموقع العام ملفات تعريف ارتباط للتتبّع أو الإعلانات. نستخدم ملفات ضرورية فقط لتشغيل لوحة التحكم الخاصة بالموظفين. يعرض الموقع خطوطًا من Google Fonts، ويحتوي على روابط لخرائط Google والواتساب ومنصات التواصل الاجتماعي؛ وعند فتحها تخضع لسياسات الخصوصية الخاصة بتلك الجهات.",
      ],
    },
    {
      id: "children",
      title: "بيانات الأطفال",
      paragraphs: ["عند حجز موعد لطفل، يجب أن يقوم بالحجز وليّ أمره أو من يمثّله نظامًا."],
    },
    {
      id: "changes",
      title: "التعديلات على هذه السياسة",
      paragraphs: ["قد نحدّث هذه السياسة من وقت لآخر، ونوضّح تاريخ آخر تحديث في أعلى الصفحة. ننصحك بمراجعتها دوريًا."],
    },
    {
      id: "contact",
      title: "تواصل معنا",
      paragraphs: ["لأي استفسار عن هذه السياسة أو لممارسة حقوقك، تواصل معنا:"],
    },
  ] as PrivacySection[],
  email: "البريد الإلكتروني",
  phone: "الهاتف",
};

export type PrivacyText = typeof ar;

const en: PrivacyText = {
  metaTitle: "Privacy policy",
  metaDescription: "How Dentera Dental Clinics collect, use and protect your personal data, and your rights under the Personal Data Protection Law.",
  title: "Privacy policy",
  intro:
    "At Dentera Dental Clinics we respect your privacy and protect your personal data in line with the Personal Data Protection Law of the Kingdom of Saudi Arabia and its implementing regulations. This policy explains what data we collect through our website, how we use and protect it, and your rights.",
  updated: "Last updated",
  contents: "Contents",
  sections: [
    {
      id: "collect",
      title: "Data we collect",
      items: [
        "Appointment requests: your name, mobile number, the department, doctor or branch you choose, and the offer if you booked from an offer's page.",
        "Job applications: name, gender, nationality, mobile number, email, city, date of birth if given, the field you apply for, your qualification, experience and professional classification, and the CV and certificates you attach.",
        "Contacting us: what you share when you call us or message us on WhatsApp or by email.",
        "Technical data: our website uses no advertising trackers or third-party analytics. Our hosting provider keeps basic technical logs (such as IP address and visit time) for security and to run the site.",
      ],
    },
    {
      id: "use",
      title: "How we use your data",
      items: [
        "To contact you to arrange and confirm your appointment, and to answer your questions.",
        "To review your job application and contact you about it or about suitable future opportunities.",
        "To improve our services and organise our work.",
        "To meet legal obligations and respond to competent authorities.",
      ],
      after: ["We do not sell your personal data, and we do not use it for marketing without your consent."],
    },
    {
      id: "basis",
      title: "Legal basis",
      paragraphs: [
        "We process your data based on your consent when you send a booking request or a job application, to provide the service you asked for, or to meet a legal obligation. You may withdraw your consent at any time; this does not affect processing done before.",
      ],
    },
    {
      id: "share",
      title: "Sharing",
      paragraphs: ["Only the relevant clinic staff see your data, as needed — e.g. the call center for bookings and Human Resources for job applications. We may share it with:"],
      items: [
        "Technology providers who process it on our behalf under suitable protection commitments: our website hosting and data storage provider (Vercel) and our job-application file storage (Google Drive). Some of this data may be stored outside the Kingdom by these providers, with the safeguards the law requires.",
        "Government or judicial authorities when legally required.",
      ],
    },
    {
      id: "retention",
      title: "Retention",
      paragraphs: [
        "We keep your data for as long as needed for the purpose it was collected for, or as long as the law requires. Job applications are kept for review and suitable future opportunities; you can ask us to delete yours at any time. When no longer needed, data is destroyed or made impossible to link to you.",
      ],
    },
    {
      id: "security",
      title: "Security",
      paragraphs: [
        "We apply technical and organisational measures to protect your data, including encrypted connections (HTTPS), storage in private stores not open to the public, access limited to the relevant staff with their own accounts and permissions, and a log of actions in our control panel.",
      ],
    },
    {
      id: "rights",
      title: "Your rights",
      paragraphs: ["Under the Personal Data Protection Law you have the right to:"],
      items: [
        "Be informed of how your data is collected and processed, as this policy explains.",
        "Access your data and obtain a copy.",
        "Ask us to correct, complete or update your data.",
        "Ask us to delete your data once it's no longer needed, unless the law requires us to keep it.",
        "Withdraw your consent at any time.",
      ],
    },
    {
      id: "cookies",
      title: "Cookies and external links",
      paragraphs: [
        "The public website uses no tracking or advertising cookies. We use strictly necessary cookies only for our staff control panel. The site displays fonts from Google Fonts and links to Google Maps, WhatsApp and social platforms; when you open them, their own privacy policies apply.",
      ],
    },
    {
      id: "children",
      title: "Children's data",
      paragraphs: ["Appointments for a child must be booked by their parent or legal guardian."],
    },
    {
      id: "changes",
      title: "Changes to this policy",
      paragraphs: ["We may update this policy from time to time and show the date of the last update at the top of this page."],
    },
    {
      id: "contact",
      title: "Contact us",
      paragraphs: ["For any question about this policy or to exercise your rights, contact us:"],
    },
  ],
  email: "Email",
  phone: "Phone",
};

export function privacyText(locale: Locale): PrivacyText & { updatedDate: string } {
  const text = locale === "ar" ? ar : en;
  const updatedDate = new Date(`${UPDATED}T12:00:00Z`).toLocaleDateString(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return { ...text, updatedDate };
}
