// Shapes of the careers system (التوظيف), shared by the server and the
// browser: applications from the website's careers page, the job fields
// with their screening criteria, and the exclusion list.

export const CAREER_STAGES = ["new", "review", "shortlist", "interview", "offer", "hired", "rejected"] as const;
export type CareerStage = (typeof CAREER_STAGES)[number];

/** Qualifications, lowest first (a minimum compares by this order). */
export const QUALIFICATIONS = ["highschool", "diploma", "bachelor", "master", "board", "phd"] as const;
export type Qualification = (typeof QUALIFICATIONS)[number];

/** Saudi Commission for Health Specialties classification. */
export const SCFHS_STATUSES = ["classified", "pending", "not", "na"] as const;
export type ScfhsStatus = (typeof SCFHS_STATUSES)[number];

export const GENDERS = ["male", "female"] as const;
export type Gender = (typeof GENDERS)[number];

/** Common nationalities offered in the form (anything else is typed). */
export const NATIONALITIES = ["سعودي", "مصري", "سوداني", "أردني", "سوري", "يمني", "هندي", "باكستاني", "فلبيني"];

/** Languages offered in the form. */
export const LANGUAGES = ["العربية", "الإنجليزية", "الأوردو", "الهندية", "الفلبينية"];

export type CareerCriteria = {
  /** Must-haves: an application missing one is «غير مطابق» (never auto-rejected). */
  required: {
    minYears?: number;
    minQualification?: Qualification;
    scfhs?: boolean;
    saudiOnly?: boolean;
    /** Only applicants living in these cities. */
    cities?: string[];
  };
  /** Points out of 100 (scaled if they don't add up to 100). */
  weights: { experience: number; qualification: number; scfhs: number; city: number; languages: number };
  /** Years of experience that earn the full experience points. */
  experienceCap: number;
  /** Cities that earn the city points. */
  preferredCities: string[];
  /** Languages that earn the language points (each a share). */
  preferredLanguages: string[];
};

export type CareerField = {
  id: string;
  nameAr: string;
  nameEn: string;
  /** Ask for a speciality (e.g. doctors: تقويم، علاج عصب…). */
  specialty: boolean;
  /** Clinical: the SCFHS question is asked. */
  clinical: boolean;
  hidden?: boolean;
  criteria: CareerCriteria;
};

export type CareerFile = { name: string; mimeType: string; size: number; driveFileId?: string; link?: string };

export type CareerNote = { by: string; at: string; text: string };

export type CareerApplication = {
  id: string;
  /** JOB-2026-0007 */
  ref: string;
  createdAt: string;
  /** "uploading" until its files are in Drive. */
  status: "uploading" | "done";
  // Personal
  name: string;
  gender: Gender;
  nationality: string;
  /** 05XXXXXXXX */
  mobile: string;
  email?: string;
  city: string;
  birthDate?: string;
  // Job
  fieldId: string;
  specialty?: string;
  languages: string[];
  // Experience
  years: number;
  qualification: Qualification;
  university?: string;
  gradYear?: number;
  scfhs: ScfhsStatus;
  licenseNo?: string;
  /** Non-Saudis: can transfer sponsorship. */
  transfer?: "yes" | "no";
  linkedin?: string;
  note?: string;
  // Files
  files: { cv?: CareerFile; certificates?: CareerFile };
  driveFolderId?: string;
  // HR
  stage: CareerStage;
  rating?: number;
  tags: string[];
  notes: CareerNote[];
  history: { stage: CareerStage; at: string; by: string }[];
  interviewAt?: string;
  /** Excluded by HR, or matched the exclusion list when applying. */
  excluded?: { at: string; by: string; reason: string; auto?: boolean };
  ipHash?: string;
};

export type CareerExclusion = {
  id: string;
  name: string;
  mobile?: string;
  email?: string;
  reason: string;
  at: string;
  by: string;
};

export const MAX_CV_BYTES = 10 * 1024 * 1024;
export const MAX_CERTIFICATES_BYTES = 15 * 1024 * 1024;
export const CV_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};
export const CERTIFICATE_TYPES: Record<string, string> = { "application/pdf": ".pdf" };

export function defaultCriteria(clinical: boolean): CareerCriteria {
  return {
    required: clinical ? { scfhs: true } : {},
    weights: clinical
      ? { experience: 40, qualification: 20, scfhs: 20, city: 10, languages: 10 }
      : { experience: 45, qualification: 25, scfhs: 0, city: 15, languages: 15 },
    experienceCap: 10,
    preferredCities: ["أبها", "خميس مشيط"],
    preferredLanguages: ["الإنجليزية"],
  };
}

/** The fields a new store starts with (editable in the panel). */
export function defaultFields(): CareerField[] {
  const f = (id: string, nameAr: string, nameEn: string, clinical: boolean, specialty = false): CareerField => ({
    id,
    nameAr,
    nameEn,
    clinical,
    specialty,
    criteria: defaultCriteria(clinical),
  });
  const dentist = f("dentist", "طبيب/ة أسنان", "Dentist", true, true);
  dentist.criteria.required.minYears = 2;
  return [
    dentist,
    f("hygienist", "أخصائي/ة صحة الفم والأسنان", "Dental hygienist", true),
    f("assistant", "مساعد/ة طبيب أسنان", "Dental assistant", true),
    f("nurse", "تمريض", "Nursing", true),
    f("reception", "استقبال وخدمة عملاء", "Reception & customer service", false),
    f("callcenter", "مركز الاتصال", "Call center", false),
    f("admin", "إداري / محاسبة", "Administration / accounting", false),
    f("marketing", "تسويق", "Marketing", false),
    f("other", "أخرى", "Other", false),
  ];
}

const fold = (s: string) =>
  s
    .trim()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .toLowerCase();

export function isSaudi(nationality: string): boolean {
  const n = fold(nationality);
  return n.startsWith("سعود") || n.startsWith("saudi");
}

export type MatchItem = {
  key: "experience" | "qualification" | "scfhs" | "city" | "languages" | "saudi";
  ok: boolean;
  /** A must-have the application misses. */
  required?: boolean;
  points: number;
  max: number;
};

/**
 * How well an application fits its field's criteria: a score out of 100
 * from the weighted points, and the must-haves it misses (if any, it's
 * «غير مطابق»).
 */
export function matchApplication(app: CareerApplication, field: CareerField | undefined) {
  const c = field?.criteria ?? defaultCriteria(false);
  const weights = { ...c.weights };
  if (!field?.clinical) weights.scfhs = 0;
  const total = Object.values(weights).reduce((a, b) => a + Math.max(0, b), 0) || 1;
  const scale = 100 / total;
  const items: MatchItem[] = [];
  const req = c.required;

  const qIndex = QUALIFICATIONS.indexOf(app.qualification);
  const expShare = Math.min(1, app.years / Math.max(1, c.experienceCap));
  items.push({
    key: "experience",
    ok: req.minYears === undefined || app.years >= req.minYears,
    required: req.minYears !== undefined,
    points: weights.experience * expShare * scale,
    max: weights.experience * scale,
  });
  const minQ = req.minQualification ? QUALIFICATIONS.indexOf(req.minQualification) : -1;
  items.push({
    key: "qualification",
    ok: minQ === -1 || qIndex >= minQ,
    required: minQ !== -1,
    points: weights.qualification * (Math.max(0, qIndex) / (QUALIFICATIONS.length - 1)) * scale,
    max: weights.qualification * scale,
  });
  if (field?.clinical) {
    const scfhsShare = app.scfhs === "classified" ? 1 : app.scfhs === "pending" ? 0.5 : 0;
    items.push({
      key: "scfhs",
      ok: !req.scfhs || app.scfhs === "classified",
      required: Boolean(req.scfhs),
      points: weights.scfhs * scfhsShare * scale,
      max: weights.scfhs * scale,
    });
  }
  const city = fold(app.city);
  const inCities = (list: string[]) => list.some((x) => fold(x) && city.includes(fold(x)));
  items.push({
    key: "city",
    ok: !req.cities?.length || inCities(req.cities),
    required: Boolean(req.cities?.length),
    points: inCities(c.preferredCities) ? weights.city * scale : 0,
    max: weights.city * scale,
  });
  const langs = app.languages.map(fold);
  const wanted = c.preferredLanguages.map(fold).filter(Boolean);
  const langShare = wanted.length ? wanted.filter((l) => langs.includes(l)).length / wanted.length : 1;
  items.push({ key: "languages", ok: true, points: weights.languages * langShare * scale, max: weights.languages * scale });
  if (req.saudiOnly) items.push({ key: "saudi", ok: isSaudi(app.nationality), required: true, points: 0, max: 0 });

  const score = Math.round(items.reduce((a, i) => a + i.points, 0));
  const fails = items.filter((i) => i.required && !i.ok).map((i) => i.key);
  return { score: Math.min(100, score), fails, items };
}

/** Experience bands for the analytics. */
export function experienceBand(years: number): string {
  if (years < 1) return "0";
  if (years < 3) return "1–2";
  if (years < 6) return "3–5";
  if (years < 11) return "6–10";
  return "11+";
}
