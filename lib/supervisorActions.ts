"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDoctor, updateDoctor } from "./db";
import { supervisorMayEditHours } from "./supervisorAccess";
import { logActivity } from "./activity";
import { scheduleFromForm } from "./hours";
import { isLocale, defaultLocale, localePath } from "./i18n";
import type { WeekSchedule } from "./types";

/**
 * The supervisor saves one doctor's working hours (through the supervisor link). Only the hours
 * change: the doctor's branches stay as the control panel set them, and a branch's hours are kept
 * only for a branch the doctor works at. Recorded in the activity log as the supervisor.
 */
export async function saveDoctorHoursSupervisorAction(formData: FormData) {
  const key = String(formData.get("key") ?? "");
  const locale = isLocale(String(formData.get("locale"))) ? (String(formData.get("locale")) as "ar" | "en") : defaultLocale;
  if (!(await supervisorMayEditHours(key))) throw new Error("Unauthorized");
  const id = String(formData.get("doctorId") ?? "");
  const doctor = await getDoctor(id);
  if (!doctor) throw new Error("Not found");
  const branches = new Set(doctor.branchIds ?? []);
  const hours: Record<string, WeekSchedule> = {};
  for (const branchId of formData.getAll("hoursFor").map(String)) {
    if (branches.has(branchId)) hours[branchId] = scheduleFromForm(formData, `hours_${branchId}_`);
  }
  await updateDoctor(id, { hours: Object.keys(hours).length ? hours : undefined });
  await logActivity("supervisor", "/doctors", "update", `${doctor.nameAr} — ${locale === "ar" ? "أوقات العمل" : "working hours"}`);
  revalidatePath("/", "layout");
  redirect(localePath(locale, `/doctor-hours/${key}?doctor=${encodeURIComponent(id)}&saved=1`));
}
