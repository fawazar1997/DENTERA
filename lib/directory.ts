import { timingSafeEqual } from "node:crypto";
import type { Locale } from "./i18n";
import { getDictionary } from "./dictionaries";
import { getBranches, getDepartments, getDoctors, getSettings } from "./db";
import { doctorDepartmentIds } from "./doctorDepartments";
import type { DirectoryDoctor, DirectoryLabels } from "@/components/DoctorDirectory";

/** True when `key` matches the directory link saved in the control panel. */
export async function isValidDirectoryKey(key: string): Promise<boolean> {
  const saved = (await getSettings()).directoryKey;
  if (!saved || !key) return false;
  const a = Buffer.from(saved);
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Everything the staff directory needs — and nothing more. The staff page
 * lists every doctor, including those hidden on the website (flagged),
 * except any whose "show in the coordination directory" switch is off;
 * the control panel's copy passes includeExcluded to list those too.
 */
export async function getDirectoryData(
  locale: Locale,
  { includeExcluded = false }: { includeExcluded?: boolean } = {}
) {
  const dict = getDictionary(locale);
  const [doctors, departments, branches, settings] = await Promise.all([
    getDoctors(),
    getDepartments(),
    getBranches(),
    getSettings(),
  ]);
  // Working days (the directory's own, set through the supervisor link; not the website's hours),
  // when the directory shows them (control panel → coordination directory) and the doctor's switch is on.
  const showDays = settings.directoryShowHours !== false;
  const ownDays = (d: (typeof doctors)[number]) =>
    (d.branchIds ?? []).filter((id) => (d.directoryDays?.[id] ?? []).length > 0).map((branchId) => ({ branchId, days: d.directoryDays![branchId] }));

  const list: DirectoryDoctor[] = doctors
    .filter((d) => includeExcluded || d.showInDirectory !== false)
    .map((d) => ({
    id: d.id,
    nameEn: d.nameEn,
    nameAr: d.nameAr,
    titleEn: d.titleEn,
    titleAr: d.titleAr,
    departmentIds: doctorDepartmentIds(d),
    branchIds: d.branchIds ?? [],
    coordinationNumber: d.coordinationNumber,
    photoUrl: d.photoUrl,
    active: d.active,
    inDirectory: d.showInDirectory !== false,
    days: showDays && d.showHoursInDirectory !== false ? ownDays(d) : [],
    // Control panel copy only: the doctor has working days set, hidden from the directory by their switch.
    daysHidden: includeExcluded && showDays && d.showHoursInDirectory === false && ownDays(d).length > 0,
  }));

  const labels: DirectoryLabels = {
    searchPlaceholder: dict.admin.searchPlaceholder,
    allDepartments: dict.admin.allDepartments,
    allBranches: dict.admin.allBranches,
    allStatuses: dict.admin.allStatuses,
    onlyWithNumber: dict.admin.onlyWithNumber,
    onlyWithoutNumber: dict.admin.onlyWithoutNumber,
    results: dict.admin.results,
    noResults: dict.admin.noResults,
    coordinationNumber: dict.admin.coordinationNumber,
    department: dict.admin.department,
    branches: dict.admin.branches,
    callNumber: dict.admin.callNumber,
    copyLink: dict.admin.copyLink,
    copied: dict.admin.copied,
    notSet: dict.admin.notSet,
    hiddenOnSite: dict.admin.hiddenOnSite,
    notInDirectory: dict.admin.notInDirectory,
    workingHours: dict.admin.directoryWorkingHours,
    inToday: dict.admin.inToday,
    notInToday: dict.admin.notInToday,
    daysHidden: dict.admin.hoursHiddenBadge,
  };

  return {
    dict,
    doctors: list,
    departments: departments.map(({ id, nameEn, nameAr }) => ({ id, nameEn, nameAr })),
    branches: branches.map(({ id, nameEn, nameAr }) => ({ id, nameEn, nameAr })),
    labels,
  };
}
