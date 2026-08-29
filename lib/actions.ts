"use server";

import { revalidatePath } from "next/cache";
import {
  createDepartment,
  createDoctor,
  deleteDepartment,
  deleteDoctor,
  updateDepartment,
  updateDoctor,
} from "./db";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function num(formData: FormData, key: string): number {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : 0;
}

function revalidateAll(locale: string) {
  revalidatePath(`/${locale}/admin/doctors`);
  revalidatePath(`/${locale}/admin/departments`);
  revalidatePath(`/${locale}/admin`);
  revalidatePath(`/${locale}`);
  revalidatePath(`/${locale}/doctors`);
  revalidatePath(`/${locale}/departments`);
}

export async function createDoctorAction(formData: FormData) {
  const locale = str(formData, "locale") || "en";
  createDoctor({
    nameEn: str(formData, "nameEn"),
    nameAr: str(formData, "nameAr"),
    titleEn: str(formData, "titleEn"),
    titleAr: str(formData, "titleAr"),
    departmentId: str(formData, "departmentId"),
    bioEn: str(formData, "bioEn"),
    bioAr: str(formData, "bioAr"),
    yearsExperience: num(formData, "yearsExperience"),
    active: formData.get("active") === "on",
  });
  revalidateAll(locale);
}

export async function updateDoctorAction(formData: FormData) {
  const locale = str(formData, "locale") || "en";
  const id = str(formData, "id");
  updateDoctor(id, {
    nameEn: str(formData, "nameEn"),
    nameAr: str(formData, "nameAr"),
    titleEn: str(formData, "titleEn"),
    titleAr: str(formData, "titleAr"),
    departmentId: str(formData, "departmentId"),
    bioEn: str(formData, "bioEn"),
    bioAr: str(formData, "bioAr"),
    yearsExperience: num(formData, "yearsExperience"),
    active: formData.get("active") === "on",
  });
  revalidateAll(locale);
}

export async function deleteDoctorAction(formData: FormData) {
  const locale = str(formData, "locale") || "en";
  deleteDoctor(str(formData, "id"));
  revalidateAll(locale);
}

export async function createDepartmentAction(formData: FormData) {
  const locale = str(formData, "locale") || "en";
  createDepartment({
    nameEn: str(formData, "nameEn"),
    nameAr: str(formData, "nameAr"),
    descriptionEn: str(formData, "descriptionEn"),
    descriptionAr: str(formData, "descriptionAr"),
    icon: str(formData, "icon") || "Stethoscope",
    active: formData.get("active") === "on",
  });
  revalidateAll(locale);
}

export async function updateDepartmentAction(formData: FormData) {
  const locale = str(formData, "locale") || "en";
  const id = str(formData, "id");
  updateDepartment(id, {
    nameEn: str(formData, "nameEn"),
    nameAr: str(formData, "nameAr"),
    descriptionEn: str(formData, "descriptionEn"),
    descriptionAr: str(formData, "descriptionAr"),
    icon: str(formData, "icon") || "Stethoscope",
    active: formData.get("active") === "on",
  });
  revalidateAll(locale);
}

export async function deleteDepartmentAction(formData: FormData) {
  const locale = str(formData, "locale") || "en";
  deleteDepartment(str(formData, "id"));
  revalidateAll(locale);
}
