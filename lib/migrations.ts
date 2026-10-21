import type { Database, Doctor, Partner } from "./types";
import { ABHA_SCHEDULE, KHAMIS_SCHEDULE } from "./defaults";

// One-time data updates applied to the saved database. Each runs once:
// it's applied whenever the data is read (so the site shows it right
// away) and becomes permanent with the next save from the control panel.
// Every step only fills in or adds, so it's safe to apply repeatedly.

const BOTH = ["abha", "khamis-mushait"];
const ABHA = ["abha"];
const KHAMIS = ["khamis-mushait"];

/** Doctor roster, Oct 2026 ("Users - Doctors" sheet): branch per doctor. */
const ROSTER_BRANCHES: Record<string, string[]> = {
  "ibrahim-alshahrani": BOTH,
  "mohammed-almagbol": BOTH,
  "manea-musa-al-ahmari": BOTH,
  "abdulaziz-al-shahrani": BOTH,
  "abdulaziz-abu-melha": ABHA,
  "mohammad-al-wadaei": BOTH,
  "mohammed-nimer-alqahtani": ABHA,
  "abdulmajeed-al-shahrani": BOTH,
  "waleed-saeed-asiri": ABHA,
  "faisal-ali-abboud": BOTH,
  "nasser-mesfer-al-ahmari": BOTH,
  "raed-abdullah-al-manea": ABHA,
  "ghadeer-saleh-al-wadaei": ABHA,
  "malek-abo-zeed": BOTH,
  "ola-daoud": ABHA,
  "amel-shaiban": ABHA,
  "mohammed-alamri": ABHA,
  "ali-alhaizaey": BOTH,
  "abdulellah-alamodi": ABHA,
  "ryan-al-mezher": ABHA,
  "alhanuf-almoghamer": BOTH,
  "lujain-aldossari": ABHA,
  "nadaa-alamoudi": ABHA,
  "abdullah-awn": BOTH,
  "mansour-alamri": BOTH,
  "ali-alqahtani": BOTH,
  "atheer-al-ghanem": BOTH,
  "abdulmajeed-alqahtani": KHAMIS,
  "lujain-alasiri": KHAMIS,
  "ahmed-alelyani": KHAMIS,
  "khalid-alhindi": KHAMIS,
  "saad-sabrah": KHAMIS,
  "abdulrahman-alasiri": KHAMIS,
  "mohammed-thamer-alqahtani": KHAMIS,
  "mohammed-alsharif": KHAMIS,
  "nasser-alshehri": KHAMIS,
  "abdulelah-daghriri": KHAMIS,
  "rawan-saddah": KHAMIS,
  "waleed-alhogban": BOTH,
  "sanaa-alshahrani": KHAMIS,
  "amal-alzaydani": BOTH,
  "meelaf-alshahrani": BOTH,
  "shaden-bander": BOTH,
  "nahar-abdullah-alqahtani": BOTH,
  "rima-othman-albishri": ABHA,
};

/** Doctors on the roster who weren't on the site yet. */
const NEW_DOCTORS: Doctor[] = [
  {
    id: "nahar-abdullah-alqahtani",
    nameEn: "Dr. Nahar Abdullah Alqahtani",
    nameAr: "د. نهار عبدالله القحطاني",
    titleEn: "Special Needs Dentist",
    titleAr: "أخصائي طب أسنان ذوي الاحتياجات الخاصة",
    departmentId: "general-dentistry",
    active: true,
  },
  {
    id: "rima-othman-albishri",
    nameEn: "Dr. Rima Othman Albishri",
    nameAr: "د. ريما عثمان البشري",
    titleEn: "General Dentist",
    titleAr: "طبيبة أسنان عامة",
    departmentId: "general-dentistry",
    active: true,
  },
];

/** Photos shipped with the site (public/doctors), used until one is uploaded. */
const BUNDLED_PHOTOS: Record<string, string> = {
  "ibrahim-alshahrani": "/doctors/ibrahim-alshahrani.webp",
};

/**
 * Coordinator mobile numbers, Oct 2026 sheet ("Coordinator Mobile no").
 * The sheet lists 9 digits; the leading 0 is added (05XXXXXXXX). Dr.
 * Abdulellah Alamodi and Dr. Ryan Al Mezher have no number in the sheet.
 */
const COORDINATION_NUMBERS: Record<string, string> = {
  "ibrahim-alshahrani": "0564522222",
  "mohammed-almagbol": "0502051555",
  "manea-musa-al-ahmari": "0565258899",
  "abdulaziz-al-shahrani": "0548828899",
  "abdulaziz-abu-melha": "0558136665",
  "mohammad-al-wadaei": "0565458899",
  "mohammed-nimer-alqahtani": "0565258899",
  "abdulmajeed-al-shahrani": "0558136665",
  "waleed-saeed-asiri": "0565958899",
  "faisal-ali-abboud": "0565058899",
  "nasser-mesfer-al-ahmari": "0535222433",
  "raed-abdullah-al-manea": "0558136665",
  "ghadeer-saleh-al-wadaei": "0565958899",
  "malek-abo-zeed": "0565958899",
  "ola-daoud": "0565958899",
  "amel-shaiban": "0537888761",
  "mohammed-alamri": "0565958899",
  "ali-alhaizaey": "0530195783",
  "alhanuf-almoghamer": "0548828899",
  "lujain-aldossari": "0565258899",
  "nadaa-alamoudi": "0565958899",
  "abdullah-awn": "0502057971",
  "mansour-alamri": "0566653192",
  "ali-alqahtani": "0569228410",
  "atheer-al-ghanem": "0548828899",
  "abdulmajeed-alqahtani": "0566653192",
  "lujain-alasiri": "0566653192",
  "ahmed-alelyani": "0568313003",
  "khalid-alhindi": "0568313003",
  "saad-sabrah": "0538008145",
  "abdulrahman-alasiri": "0568313003",
  "mohammed-thamer-alqahtani": "0538008145",
  "mohammed-alsharif": "0566653192",
  "nasser-alshehri": "0538008145",
  "abdulelah-daghriri": "0568313003",
  "rawan-saddah": "0566653192",
  "waleed-alhogban": "0566653192",
  "sanaa-alshahrani": "0566653192",
  "amal-alzaydani": "0558136665",
  "meelaf-alshahrani": "0548828899",
  "shaden-bander": "0548828899",
  "nahar-abdullah-alqahtani": "0566653192",
  "rima-othman-albishri": "0548828899",
};

/**
 * Studio portraits (transparent cutouts, Oct 2026), bundled in
 * public/doctors. These are the official photos, so they replace
 * whatever photo the doctor had.
 */
const STUDIO_PHOTOS: Record<string, string> = {
  "abdulelah-daghriri": "/doctors/abdulelah-daghriri.webp",
  "abdulmajeed-alqahtani": "/doctors/abdulmajeed-alqahtani.webp",
  "abdulrahman-alasiri": "/doctors/abdulrahman-alasiri.webp",
};

/**
 * Payment methods and featured brands for the home page galleries. Apple
 * Pay and Tamara ship with their official marks; the rest show their name
 * until a logo is uploaded. Brands other than Invisalign start hidden:
 * suggestions to switch on from the control panel if the clinic uses them.
 */
const SEED_LOGOS: Partner[] = [
  { id: "pay-apple-pay", group: "payments", nameEn: "Apple Pay", nameAr: "Apple Pay", logoUrl: "/brand/payments/apple-pay.svg", active: true },
  { id: "pay-tamara", group: "payments", nameEn: "Tamara", nameAr: "تمارا", logoUrl: "/brand/payments/tamara.svg", active: true },
  { id: "pay-tabby", group: "payments", nameEn: "Tabby", nameAr: "تابي", active: true },
  { id: "pay-emkan", group: "payments", nameEn: "Emkan", nameAr: "إمكان", active: true },
  { id: "brand-invisalign", group: "brands", nameEn: "Invisalign", nameAr: "Invisalign", active: true },
  { id: "brand-itero", group: "brands", nameEn: "iTero", nameAr: "iTero", active: false },
  { id: "brand-straumann", group: "brands", nameEn: "Straumann", nameAr: "Straumann", active: false },
  { id: "brand-nobel-biocare", group: "brands", nameEn: "Nobel Biocare", nameAr: "Nobel Biocare", active: false },
  { id: "brand-ivoclar", group: "brands", nameEn: "Ivoclar", nameAr: "Ivoclar", active: false },
  { id: "brand-3shape", group: "brands", nameEn: "3Shape", nameAr: "3Shape", active: false },
];

// v6 — "Users - Doctors" sheet (Oct 2026): professional classification
// and specialization per doctor, which set the title (and department).
type Classification = "consultant" | "seniorSpecialist" | "specialist" | "gp";
type Specialization =
  | "ortho"
  | "implantPerio"
  | "endo"
  | "prostho"
  | "oralBioImplant"
  | "restorative"
  | "pediatric"
  | "gp"
  | "perioOralMed"
  | "maxillofacial"
  | "specialCare";

const SPECIALIZATIONS: Record<Specialization, { en: string; ar: string; department: string }> = {
  ortho: { en: "Orthodontics", ar: "تقويم الأسنان", department: "orthodontics" },
  implantPerio: { en: "Implants & Periodontics", ar: "زراعة الأسنان وأمراض اللثة", department: "periodontics" },
  endo: { en: "Endodontics", ar: "علاج العصب والجذور", department: "endodontics" },
  prostho: { en: "Prosthodontics", ar: "التركيبات السنية", department: "implants-prosthodontics" },
  oralBioImplant: { en: "Oral Biology & Dental Implants", ar: "بيولوجيا الفم وزراعة الأسنان", department: "implants-prosthodontics" },
  restorative: { en: "Restorative & Cosmetic Dentistry", ar: "طب الأسنان الترميمي والتجميلي", department: "restorative-dentistry" },
  pediatric: { en: "Pediatric Dentistry", ar: "طب أسنان الأطفال", department: "pediatric-dentistry" },
  gp: { en: "General Dentistry", ar: "طب الأسنان العام", department: "general-dentistry" },
  perioOralMed: { en: "Periodontics, Implants & Oral Medicine", ar: "أمراض اللثة والزراعة وطب الفم", department: "periodontics" },
  maxillofacial: { en: "Implants & Maxillofacial Surgery", ar: "زراعة الأسنان وجراحة الوجه والفكين", department: "oral-surgery" },
  specialCare: {
    en: "Family & Special Care Dentistry for Adults",
    ar: "طب أسنان الأسرة ورعاية ذوي الاحتياجات الخاصة للبالغين",
    department: "general-dentistry",
  },
};

/** [classification, specialization, female?] per doctor, from the sheet. */
const ROSTER_V6: Record<string, [Classification, Specialization, true?]> = {
  "ibrahim-alshahrani": ["consultant", "ortho"],
  "mohammed-almagbol": ["consultant", "implantPerio"],
  "manea-musa-al-ahmari": ["consultant", "implantPerio"],
  "abdulaziz-al-shahrani": ["consultant", "ortho"],
  "abdulaziz-abu-melha": ["consultant", "endo"],
  "mohammad-al-wadaei": ["consultant", "prostho"],
  "mohammed-nimer-alqahtani": ["consultant", "oralBioImplant"],
  "abdulmajeed-al-shahrani": ["consultant", "endo"],
  "waleed-saeed-asiri": ["consultant", "restorative"],
  "faisal-ali-abboud": ["consultant", "pediatric"],
  "nasser-mesfer-al-ahmari": ["consultant", "prostho"],
  "raed-abdullah-al-manea": ["consultant", "endo"],
  "ghadeer-saleh-al-wadaei": ["consultant", "prostho", true],
  "malek-abo-zeed": ["specialist", "prostho"],
  "ola-daoud": ["gp", "gp", true],
  "amel-shaiban": ["consultant", "endo", true],
  "mohammed-alamri": ["consultant", "restorative"],
  "ali-alhaizaey": ["consultant", "ortho"],
  "alhanuf-almoghamer": ["seniorSpecialist", "pediatric", true],
  "lujain-aldossari": ["consultant", "prostho", true],
  "nadaa-alamoudi": ["consultant", "restorative", true],
  "abdullah-awn": ["consultant", "perioOralMed"],
  "mansour-alamri": ["seniorSpecialist", "ortho"],
  "ali-alqahtani": ["consultant", "maxillofacial"],
  "atheer-al-ghanem": ["seniorSpecialist", "ortho"],
  "abdulmajeed-alqahtani": ["gp", "gp"],
  "lujain-alasiri": ["gp", "gp", true],
  "ahmed-alelyani": ["consultant", "endo"],
  "khalid-alhindi": ["consultant", "prostho"],
  "saad-sabrah": ["consultant", "endo"],
  "abdulrahman-alasiri": ["consultant", "implantPerio"],
  "mohammed-thamer-alqahtani": ["consultant", "restorative"],
  "mohammed-alsharif": ["consultant", "restorative"],
  "nasser-alshehri": ["consultant", "endo"],
  "abdulelah-daghriri": ["consultant", "implantPerio"],
  "rawan-saddah": ["consultant", "ortho", true],
  "waleed-alhogban": ["consultant", "endo"],
  "sanaa-alshahrani": ["seniorSpecialist", "pediatric", true],
  "amal-alzaydani": ["consultant", "endo", true],
  "meelaf-alshahrani": ["seniorSpecialist", "ortho", true],
  "shaden-bander": ["gp", "gp", true],
  "nahar-abdullah-alqahtani": ["seniorSpecialist", "specialCare"],
  "rima-othman-albishri": ["gp", "gp", true],
};

/** Professors (أ.د.) — the sheet lists them as consultants. */
const PROFESSORS = new Set(["ibrahim-alshahrani", "abdulaziz-al-shahrani", "abdulaziz-abu-melha"]);

function rosterTitle(id: string, [cls, spec, female]: [Classification, Specialization, true?]) {
  const sp = SPECIALIZATIONS[spec];
  if (cls === "gp") {
    return {
      titleEn: "General Dental Practitioner",
      titleAr: female ? "طبيبة أسنان عامة" : "طبيب أسنان عام",
    };
  }
  const en = {
    consultant: PROFESSORS.has(id) ? "Professor & Consultant" : "Consultant",
    seniorSpecialist: "Senior Specialist",
    specialist: "Specialist",
  }[cls];
  const ar = {
    consultant: PROFESSORS.has(id) ? (female ? "أستاذة واستشارية" : "أستاذ واستشاري") : female ? "استشارية" : "استشاري",
    seniorSpecialist: female ? "أخصائية أولى" : "أخصائي أول",
    specialist: female ? "أخصائية" : "أخصائي",
  }[cls];
  return { titleEn: `${en} – ${sp.en}`, titleAr: `${ar} ${sp.ar}` };
}

export const DATA_VERSION = 6;

export function migrate(db: Database & { dataVersion?: number }): Database {
  const version = db.dataVersion ?? 0;
  if (version >= DATA_VERSION) return db;
  if (version < 1) migrateV1(db);
  if (version < 2) migrateV2(db);
  if (version < 3) migrateV3(db);
  if (version < 4) migrateV4(db);
  if (version < 5) migrateV5(db);
  if (version < 6) migrateV6(db);
  db.dataVersion = DATA_VERSION;
  return db;
}

function migrateV1(db: Database): void {
  // v1 — Oct 2026 doctor roster: add new doctors, set each doctor's
  // branches (only where none were chosen yet), bundled photos.
  const ids = new Set(db.doctors.map((d) => d.id));
  for (const doctor of NEW_DOCTORS) {
    if (!ids.has(doctor.id)) db.doctors.push({ ...doctor });
  }
  db.doctors = db.doctors.map((doctor) => {
    const next = { ...doctor };
    const branches = ROSTER_BRANCHES[doctor.id];
    if (branches && !(next.branchIds && next.branchIds.length > 0)) {
      next.branchIds = [...branches];
    }
    if (!next.photoUrl && BUNDLED_PHOTOS[doctor.id]) {
      next.photoUrl = BUNDLED_PHOTOS[doctor.id];
    }
    return next;
  });
}

/** v2 — coordinator numbers, only where none was entered in the panel. */
function migrateV2(db: Database): void {
  db.doctors = db.doctors.map((doctor) => {
    const number = COORDINATION_NUMBERS[doctor.id];
    return number && !doctor.coordinationNumber?.trim()
      ? { ...doctor, coordinationNumber: number }
      : doctor;
  });
}

/** v3 — studio portraits for doctors who have one. */
function migrateV3(db: Database): void {
  db.doctors = db.doctors.map((doctor) =>
    STUDIO_PHOTOS[doctor.id] ? { ...doctor, photoUrl: STUDIO_PHOTOS[doctor.id] } : doctor
  );
}

/** v4 — branch working hours from Google Maps (replace the old hours text). */
function migrateV4(db: Database): void {
  const schedules: Record<string, typeof ABHA_SCHEDULE> = {
    abha: ABHA_SCHEDULE,
    "khamis-mushait": KHAMIS_SCHEDULE,
  };
  db.branches = db.branches.map((branch) =>
    schedules[branch.id]
      ? {
          ...branch,
          schedule: schedules[branch.id].map((d) => ({ ...d, periods: [...d.periods] })),
          hoursEn: undefined,
          hoursAr: undefined,
        }
      : branch
  );
}

/** v5 — payment methods and featured brands galleries. */
function migrateV5(db: Database): void {
  const ids = new Set(db.partners.map((p) => p.id));
  for (const logo of SEED_LOGOS) {
    if (!ids.has(logo.id)) db.partners.push({ ...logo });
  }
}

/** v6 — titles, departments and coordination numbers from the Oct 2026 sheet. */
function migrateV6(db: Database): void {
  const departments = new Set(db.departments.map((d) => d.id));
  db.doctors = db.doctors.map((doctor) => {
    const row = ROSTER_V6[doctor.id];
    if (!row) return doctor;
    const department = SPECIALIZATIONS[row[1]].department;
    return {
      ...doctor,
      ...rosterTitle(doctor.id, row),
      departmentId: departments.has(department) ? department : doctor.departmentId,
      coordinationNumber: COORDINATION_NUMBERS[doctor.id] ?? doctor.coordinationNumber,
      ...(doctor.id === "faisal-ali-abboud" ? { nameAr: "د. فيصل بن عبود" } : {}),
    };
  });
}
