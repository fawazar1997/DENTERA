"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDoctor, updateDoctor } from "./db";
import { supervisorMayEditDays } from "./supervisorAccess";
import { logActivity } from "./activity";
import { isLocale, defaultLocale, localePath } from "./i18n";

/**
 * The supervisor saves one doctor's working days (through the supervisor link), for the
 * coordination directory only: the website's working hours and the doctor's branches stay as the
 * control panel set them. Recorded in the activity log as the supervisor.
 */
export async function saveDoctorDaysSupervisorAction(formData: FormData) {
  const key = String(formData.get("key") ?? "");
  const locale = isLocale(String(formData.get("locale"))) ? (String(formData.get("locale")) as "ar" | "en") : defaultLocale;
  if (!(await supervisorMayEditDays(key))) throw new Error("Unauthorized");
  const id = String(formData.get("doctorId") ?? "");
  const doctor = await getDoctor(id);
  if (!doctor) throw new Error("Not found");
  const days: Record<string, number[]> = {};
  for (const branchId of doctor.branchIds ?? []) {
    const list = [...new Set(formData.getAll(`days_${branchId}`).map(Number))].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort();
    if (list.length) days[branchId] = list;
  }
  await updateDoctor(id, { directoryDays: Object.keys(days).length ? days : undefined });
  await logActivity("supervisor", "/doctors", "update", `${doctor.nameAr} — ${locale === "ar" ? "أيام العمل" : "working days"}`);
  revalidatePath("/", "layout");
  redirect(localePath(locale, `/doctor-days/${key}?doctor=${encodeURIComponent(id)}&saved=1`));
}
