import type { Doctor } from "./types";

/** All the doctor's departments: the main one first, then any others. */
export function doctorDepartmentIds(
  doctor: Pick<Doctor, "departmentId" | "extraDepartmentIds">
): string[] {
  const extra = (doctor.extraDepartmentIds ?? []).filter((id) => id && id !== doctor.departmentId);
  return [doctor.departmentId, ...new Set(extra)];
}

export function inDepartment(
  doctor: Pick<Doctor, "departmentId" | "extraDepartmentIds">,
  departmentId: string
): boolean {
  return doctorDepartmentIds(doctor).includes(departmentId);
}
