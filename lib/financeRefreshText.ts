// The «تحديث الآن» messages and the robot's failure codes (client-safe: no server imports).

export const REFRESH_REASONS = ["acct-login", "acct-session", "pms-login", "network", "timeout", "site", "export", "cancelled", "other"] as const;
export type RefreshReason = (typeof REFRESH_REASONS)[number];

/** The minutes between two presses of «تحديث الآن». */
export const REFRESH_GAP_MINUTES = 20;

const REASON_TEXT: Record<"ar" | "en", Record<RefreshReason, string>> = {
  ar: {
    "acct-login": "تعذّر تسجيل الدخول إلى النظام المحاسبي",
    "acct-session": "انتهت جلسة النظام المحاسبي",
    "pms-login": "تعذّر تسجيل الدخول إلى نظام العيادة",
    network: "تعذّر الاتصال بالنظام",
    timeout: "انتهت مهلة الطلب",
    site: "تعذّر حفظ البيانات في الموقع",
    export: "لم يُنزَّل أحد التقارير من النظام",
    cancelled: "أُلغي التحديث قبل اكتماله",
    other: "حدث خطأ غير متوقع أثناء التحديث",
  },
  en: {
    "acct-login": "Couldn't sign in to the accounting system",
    "acct-session": "The accounting system's session expired",
    "pms-login": "Couldn't sign in to the clinic system",
    network: "Couldn't connect to the system",
    timeout: "The request timed out",
    site: "Couldn't save the data on the site",
    export: "A report didn't download from the system",
    cancelled: "The update was cancelled before it finished",
    other: "An unexpected error stopped the update",
  },
};

export function reasonText(reason: string | undefined, locale: string): string {
  const lang = locale === "ar" ? "ar" : "en";
  return REASON_TEXT[lang][(REFRESH_REASONS as readonly string[]).includes(reason ?? "") ? (reason as RefreshReason) : "other"];
}

export const BY_TEXT: Record<"ar" | "en", Record<"admin" | "finance", string>> = {
  ar: { admin: "مدير المنصة", finance: "المالية" },
  en: { admin: "Platform admin", finance: "Finance" },
};

export const REFRESH_TEXT = {
  ar: {
    button: "تحديث الآن",
    running: "جارٍ التحديث…",
    runningSince: (t: string) => `جارٍ التحديث… بدأ الساعة ${t}`,
    busy: "يوجد تحديث جارٍ",
    done: "تم التحديث بنجاح",
    failed: "فشل التحديث",
    wait: (m: number) => `يمكن التحديث بعد ${m} ${m === 1 ? "دقيقة" : m === 2 ? "دقيقتين" : m <= 10 ? "دقائق" : "دقيقة"}`,
    noToken: "لم يُضبط مفتاح التشغيل (GITHUB_ACTIONS_TOKEN) في Vercel",
    dispatch: "تعذّر بدء التحديث، حاول بعد قليل",
    unauthorized: "انتهت جلسة لوحة التحكم، سجّل الدخول من جديد",
    takes: "يستغرق التحديث نحو 10 دقائق ويقرأ فقط من الأنظمة",
    lastUpdate: "آخر تحديث",
    lastFailed: (t: string) => `آخر تحديث فشل في ${t}`,
  },
  en: {
    button: "Update now",
    running: "Updating…",
    runningSince: (t: string) => `Updating… started at ${t}`,
    busy: "An update is already running",
    done: "Updated successfully",
    failed: "The update failed",
    wait: (m: number) => `You can update again in ${m} minute${m === 1 ? "" : "s"}`,
    noToken: "The run key (GITHUB_ACTIONS_TOKEN) isn't set in Vercel",
    dispatch: "Couldn't start the update; try again shortly",
    unauthorized: "Your Control Panel session ended; sign in again",
    takes: "An update takes about 10 minutes and only reads from the systems",
    lastUpdate: "Last update",
    lastFailed: (t: string) => `The last update failed at ${t}`,
  },
};
