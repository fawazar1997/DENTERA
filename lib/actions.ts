"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "./auth";
import {
  createBranch,
  createDepartment,
  createDoctor,
  createPartner,
  deleteBranch,
  deleteDepartment,
  deleteDoctor,
  deletePartner,
  getDoctor,
  getPartners,
  saveContentOverrides,
  setPageBanner,
  updateBranch,
  updateDepartment,
  updateDoctor,
  updatePartner,
} from "./db";
import { uploadImage } from "./blob";
import { CONTENT_SECTIONS, defaultText } from "./content";
import { googleMapsSearchUrl } from "./defaults";
import { PAGE_KEYS, type PageKey } from "./types";

/**
 * Server actions can be invoked from any page, not just /admin (which the
 * middleware guards), so each action checks the admin session itself.
 */
async function requireAdmin(): Promise<void> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!(await verifySessionToken(token))) {
    throw new Error("Unauthorized");
  }
}

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

/** An http(s) link, or undefined — never a javascript: or other scheme. */
function optUrl(formData: FormData, key: string): string | undefined {
  const value = str(formData, key);
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function fileOrNull(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  return value instanceof File ? value : null;
}

function revalidateAll() {
  // Every page reads from the same store, so refresh them all.
  revalidatePath("/", "layout");
}

function doctorFields(formData: FormData) {
  return {
    nameEn: str(formData, "nameEn"),
    nameAr: str(formData, "nameAr"),
    titleEn: str(formData, "titleEn"),
    titleAr: str(formData, "titleAr"),
    departmentId: str(formData, "departmentId"),
    bioEn: optStr(formData, "bioEn"),
    bioAr: optStr(formData, "bioAr"),
    yearsExperience: optNum(formData, "yearsExperience"),
    qualificationsEn: optStr(formData, "qualificationsEn"),
    qualificationsAr: optStr(formData, "qualificationsAr"),
    experienceEn: optStr(formData, "experienceEn"),
    experienceAr: optStr(formData, "experienceAr"),
    servicesEn: optStr(formData, "servicesEn"),
    servicesAr: optStr(formData, "servicesAr"),
    languagesEn: optStr(formData, "languagesEn"),
    languagesAr: optStr(formData, "languagesAr"),
    branchIds: formData.getAll("branchIds").map(String),
    active: formData.get("active") === "on",
  };
}

export async function createDoctorAction(formData: FormData) {
  await requireAdmin();
  const photoUrl = await uploadImage(fileOrNull(formData, "photo"), "doctors");
  await createDoctor({ ...doctorFields(formData), photoUrl });
  revalidateAll();
}

export async function updateDoctorAction(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const newPhotoUrl = await uploadImage(fileOrNull(formData, "photo"), "doctors");
  const photoUrl = newPhotoUrl ?? (await getDoctor(id))?.photoUrl;
  await updateDoctor(id, { ...doctorFields(formData), photoUrl });
  revalidateAll();
}

export async function deleteDoctorAction(formData: FormData) {
  await requireAdmin();
  await deleteDoctor(str(formData, "id"));
  revalidateAll();
}

export async function createDepartmentAction(formData: FormData) {
  await requireAdmin();
  await createDepartment({
    nameEn: str(formData, "nameEn"),
    nameAr: str(formData, "nameAr"),
    descriptionEn: str(formData, "descriptionEn"),
    descriptionAr: str(formData, "descriptionAr"),
    icon: str(formData, "icon") || "auto",
    active: formData.get("active") === "on",
  });
  revalidateAll();
}

export async function updateDepartmentAction(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  await updateDepartment(id, {
    nameEn: str(formData, "nameEn"),
    nameAr: str(formData, "nameAr"),
    descriptionEn: str(formData, "descriptionEn"),
    descriptionAr: str(formData, "descriptionAr"),
    icon: str(formData, "icon") || "auto",
    active: formData.get("active") === "on",
  });
  revalidateAll();
}

export async function deleteDepartmentAction(formData: FormData) {
  await requireAdmin();
  await deleteDepartment(str(formData, "id"));
  revalidateAll();
}

function pageKey(formData: FormData): PageKey | null {
  const page = str(formData, "page");
  return (PAGE_KEYS as readonly string[]).includes(page)
    ? (page as PageKey)
    : null;
}

export async function updateBannerAction(formData: FormData) {
  await requireAdmin();
  const page = pageKey(formData);
  if (!page) return;
  const url = await uploadImage(fileOrNull(formData, "banner"), "banners");
  if (url) await setPageBanner(page, url);
  revalidateAll();
}

export async function removeBannerAction(formData: FormData) {
  await requireAdmin();
  const page = pageKey(formData);
  if (!page) return;
  await setPageBanner(page, undefined);
  revalidateAll();
}

// Partners

function partnerFields(formData: FormData) {
  return {
    nameEn: str(formData, "nameEn"),
    nameAr: str(formData, "nameAr"),
    websiteUrl: optUrl(formData, "websiteUrl"),
    active: formData.get("active") === "on",
  };
}

export async function createPartnerAction(formData: FormData) {
  await requireAdmin();
  const logoUrl = await uploadImage(fileOrNull(formData, "logo"), "partners");
  await createPartner({ ...partnerFields(formData), logoUrl });
  revalidateAll();
}

export async function updatePartnerAction(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const newLogoUrl = await uploadImage(fileOrNull(formData, "logo"), "partners");
  const logoUrl =
    newLogoUrl ?? (await getPartners()).find((p) => p.id === id)?.logoUrl;
  await updatePartner(id, { ...partnerFields(formData), logoUrl });
  revalidateAll();
}

export async function deletePartnerAction(formData: FormData) {
  await requireAdmin();
  await deletePartner(str(formData, "id"));
  revalidateAll();
}

// Branches

function branchFields(formData: FormData) {
  const nameAr = str(formData, "nameAr");
  const addressAr = str(formData, "addressAr");
  return {
    nameEn: str(formData, "nameEn"),
    nameAr,
    addressEn: str(formData, "addressEn"),
    addressAr,
    mapUrl:
      optUrl(formData, "mapUrl") ??
      googleMapsSearchUrl(`عيادات دنتيرا ${nameAr} ${addressAr}`),
    phone: optStr(formData, "phone"),
    hoursEn: optStr(formData, "hoursEn"),
    hoursAr: optStr(formData, "hoursAr"),
    active: formData.get("active") === "on",
  };
}

export async function createBranchAction(formData: FormData) {
  await requireAdmin();
  await createBranch(branchFields(formData));
  revalidateAll();
}

export async function updateBranchAction(formData: FormData) {
  await requireAdmin();
  await updateBranch(str(formData, "id"), branchFields(formData));
  revalidateAll();
}

export async function deleteBranchAction(formData: FormData) {
  await requireAdmin();
  await deleteBranch(str(formData, "id"));
  revalidateAll();
}

// Site texts & numbers

/**
 * Saves one section of the Texts & Numbers editor. Fields are named
 * "en:section.key" / "ar:section.key"; only known fields are accepted.
 */
export async function saveContentAction(formData: FormData) {
  await requireAdmin();
  const sectionId = str(formData, "section");
  const section = CONTENT_SECTIONS.find((s) => s.id === sectionId);
  if (!section) return;

  const values = section.fields.flatMap((field) =>
    (["en", "ar"] as const).map((locale) => {
      const key = `${section.id}.${field.key}`;
      return {
        locale,
        key,
        value: String(formData.get(`${locale}:${key}`) ?? ""),
        fallback: defaultText(locale, key),
      };
    })
  );
  await saveContentOverrides(values);
  revalidateAll();
}
