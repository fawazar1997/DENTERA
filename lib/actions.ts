"use server";

import { revalidatePath } from "next/cache";
import {
  createDepartment,
  createDoctor,
  deleteDepartment,
  deleteDoctor,
  deleteInquiry,
  getDoctor,
  updateDepartment,
  updateDoctor,
  updateInquiryStatus,
  updateSettings,
} from "./db";
import { uploadImage } from "./blob";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function optStr(formData: FormData, key: string): string | undefined {
  const value = str(formData, key);
  return value || undefined;
}

function optNum(formData: FormData, key: string): number | undefined {
  const raw = str(formData, key);
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function fileOrNull(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  return value instanceof File ? value : null;
}

function revalidateAll(locale: string) {
  revalidatePath(`/${locale}/admin/doctors`);
  revalidatePath(`/${locale}/admin/departments`);
  revalidatePath(`/${locale}/admin/settings`);
  revalidatePath(`/${locale}/admin/inquiries`);
  revalidatePath(`/${locale}/admin`);
  revalidatePath(`/${locale}`);
  revalidatePath(`/${locale}/doctors`);
  revalidatePath(`/${locale}/departments`);
}

export async function createDoctorAction(formData: FormData) {
  const locale = str(formData, "locale") || "en";
  const photoUrl = await uploadImage(fileOrNull(formData, "photo"), "doctors");
  createDoctor({
    nameEn: str(formData, "nameEn"),
    nameAr: str(formData, "nameAr"),
    titleEn: str(formData, "titleEn"),
    titleAr: str(formData, "titleAr"),
    departmentId: str(formData, "departmentId"),
    bioEn: optStr(formData, "bioEn"),
    bioAr: optStr(formData, "bioAr"),
    yearsExperience: optNum(formData, "yearsExperience"),
    photoUrl,
    active: formData.get("active") === "on",
  });
  revalidateAll(locale);
}

export async function updateDoctorAction(formData: FormData) {
  const locale = str(formData, "locale") || "en";
  const id = str(formData, "id");
  const newPhotoUrl = await uploadImage(fileOrNull(formData, "photo"), "doctors");
  const photoUrl = newPhotoUrl ?? getDoctor(id)?.photoUrl;
  updateDoctor(id, {
    nameEn: str(formData, "nameEn"),
    nameAr: str(formData, "nameAr"),
    titleEn: str(formData, "titleEn"),
    titleAr: str(formData, "titleAr"),
    departmentId: str(formData, "departmentId"),
    bioEn: optStr(formData, "bioEn"),
    bioAr: optStr(formData, "bioAr"),
    yearsExperience: optNum(formData, "yearsExperience"),
    photoUrl,
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

export async function updateBannerAction(formData: FormData) {
  const locale = str(formData, "locale") || "en";
  const newBannerUrl = await uploadImage(fileOrNull(formData, "banner"), "site");
  if (newBannerUrl) {
    updateSettings({ bannerUrl: newBannerUrl });
  }
  revalidateAll(locale);
}

export async function removeBannerAction(formData: FormData) {
  const locale = str(formData, "locale") || "en";
  updateSettings({ bannerUrl: undefined });
  revalidateAll(locale);
}

export async function markInquiryContactedAction(formData: FormData) {
  const locale = str(formData, "locale") || "en";
  updateInquiryStatus(str(formData, "id"), "contacted");
  revalidateAll(locale);
}

export async function markInquiryNewAction(formData: FormData) {
  const locale = str(formData, "locale") || "en";
  updateInquiryStatus(str(formData, "id"), "new");
  revalidateAll(locale);
}

export async function deleteInquiryAction(formData: FormData) {
  const locale = str(formData, "locale") || "en";
  deleteInquiry(str(formData, "id"));
  revalidateAll(locale);
}
