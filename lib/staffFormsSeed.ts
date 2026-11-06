import type { StaffForm } from "./types";

// The forms from the branches' old Google Site (Nov 2026), added once by
// migrateV13 in lib/migrations.ts. Each is a Google Doc template; staff make
// their own copy to fill in. "خطاب تحويل" is one template shared by both
// branches.

export const STAFF_FORMS_V13: StaffForm[] = [
  { id: "abha-medical-referral", branch: "abha", nameAr: "الإحالة الطبية", nameEn: "Medical Referral", docId: "1KBrZynX_ebPENfF1CKbn6gGgC-xFGrh6ffMxQtffMzs", active: true },
  { id: "abha-medical-report", branch: "abha", nameAr: "تقرير طبي", nameEn: "Medical Report", docId: "1TyM9z_VW7rTBNByRimUXdRvIma7efXLzkEPNzhsHLpg", active: true },
  { id: "abha-insurance-report", branch: "abha", nameAr: "تقرير التأمين", nameEn: "Insurance Report", docId: "1XKGq9Zg5LGYI-AlqD_4ZWAQynST4WzbK_d4WPUA8Eo4", active: true },
  { id: "transfer-letter", branch: "both", nameAr: "خطاب تحويل", nameEn: "Transfer Letter", docId: "1_s4NvB0jIx80Iv0WC49ZoYFltUsH7nKTIebtfAmhacE", active: true },
  { id: "abha-health-statements", branch: "abha", nameAr: "إفادات الصحة", nameEn: "Health Statements", docId: "13ASRFIvOJe-dW3e4Lyzp9lf5nYQE39QhU-GA8HqfBYc", active: true },
  { id: "abha-maintenance-report", branch: "abha", nameAr: "تقرير الصيانة", nameEn: "Maintenance Report", docId: "1iSVHoc9hzrfK41ejglbhNXBygz0u6KxVzoNUjCpz0w4", active: true },
  { id: "khamis-medical-referral", branch: "khamis-mushait", nameAr: "الإحالة الطبية", nameEn: "Medical Referral", docId: "1oKhRcCUWfE7bZ_MnKl9BrLm-76tjupBTLG9DL34dGtM", active: true },
  { id: "khamis-medical-report", branch: "khamis-mushait", nameAr: "تقرير طبي", nameEn: "Medical Report", docId: "1S0Zv1gQdnPDLF29mdGtKntcLXnC4TnhW8bRsL81KJkw", active: true },
  { id: "khamis-insurance-report", branch: "khamis-mushait", nameAr: "تقرير التأمين", nameEn: "Insurance Report", docId: "1Y1Xf8Dn4L7sQ5ag2ie9n5KmyyZxMdFmEKVse57xhkac", active: true },
  { id: "khamis-health-statements", branch: "khamis-mushait", nameAr: "إفادات الصحة", nameEn: "Health Statements", docId: "1eNQYEmcGeSOEqnSOH3qf0eGsM7i5apWuVyJTScjpbuk", active: true },
  { id: "khamis-visit-certificate", branch: "khamis-mushait", nameAr: "مشهد مراجعة", nameEn: "Visit Certificate", docId: "1VTbRI4jqTdTbKiIFgINoHMW5kz8hBJt9hRXowAy_5pw", active: true },
];

/** "الإدارة" choices on the outgoing letter form, as on the Google Form. */
export const ARCHIVE_DEPARTMENTS_OUT = [
  "الشؤون الإدارية",
  "المالية",
  "الطبية",
  "الموارد البشرية",
  "الاستقبال ومركز الاتصال",
];

/** "الإدارة المختصة" choices on the incoming letter form, as on the Google Form. */
export const ARCHIVE_DEPARTMENTS_IN = [
  "التنفيذية",
  "المالية",
  "الطبية",
  "الموارد البشرية",
  "الاستقبال ومركز الاتصال",
];
