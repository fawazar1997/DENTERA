import type { Database, Doctor } from "./types";

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

export const DATA_VERSION = 1;

export function migrate(db: Database & { dataVersion?: number }): Database {
  if ((db.dataVersion ?? 0) >= DATA_VERSION) return db;

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

  db.dataVersion = 1;
  return db;
}
