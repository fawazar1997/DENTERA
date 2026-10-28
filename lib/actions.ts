"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "./auth";
import {
  createBranch,
  createOffer,
  createDepartment,
  createDoctor,
  createPartner,
  deleteBranch,
  deleteOffer,
  deleteDepartment,
  deleteDoctor,
  deletePartner,
  reorderPartners,
  getDoctor,
  getOffer,
  getPartners,
  saveContentOverrides,
  setPageBanner,
  updateSettings,
  updateBranch,
  updateOffer,
  updateDepartment,
  updateDoctor,
  updatePartner,
} from "./db";
import { deleteImage, uploadImage } from "./blob";
import { scheduleFromForm } from "./hours";
import { CONTENT_SECTIONS, defaultText } from "./content";
import { googleMapsSearchUrl } from "./defaults";
import {
  HOME_SECTIONS,
  LOGO_GROUPS,
  homeSectionOrder,
  PAGE_KEYS,
  type LogoGroup,
  type PageKey,
  type WeekSchedule,
} from "./types";
import { SOCIAL_PLATFORMS, type SocialLinks } from "./social";
import { deleteBookingsUpTo } from "./bookings";
import { defaultLocale, isLocale, localePath } from "./i18n";

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

/** The doctor's own hours, for the branches ticked both to work at and to set hours for. */
function doctorHours(formData: FormData) {
  const branchIds = new Set(formData.getAll("branchIds").map(String));
  const hours: Record<string, WeekSchedule> = {};
  for (const id of formData.getAll("hoursFor").map(String)) {
    if (branchIds.has(id)) hours[id] = scheduleFromForm(formData, `hours_${id}_`);
  }
  return Object.keys(hours).length > 0 ? hours : undefined;
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
    achievementsEn: optStr(formData, "achievementsEn"),
    achievementsAr: optStr(formData, "achievementsAr"),
    languagesEn: optStr(formData, "languagesEn"),
    languagesAr: optStr(formData, "languagesAr"),
    branchIds: formData.getAll("branchIds").map(String),
    hours: doctorHours(formData),
    coordinationNumber: optStr(formData, "coordinationNumber"),
    showInDirectory: formData.get("showInDirectory") === "on",
    showCoordinationOnSite: formData.get("showCoordinationOnSite") === "on",
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
  const oldPhotoUrl = (await getDoctor(id))?.photoUrl;
  const newPhotoUrl = await uploadImage(fileOrNull(formData, "photo"), "doctors");
  const removePhoto = formData.get("removePhoto") === "on";
  // A new upload replaces the photo; "remove" clears it; otherwise keep it.
  const photoUrl = newPhotoUrl ?? (removePhoto ? undefined : oldPhotoUrl);
  await updateDoctor(id, { ...doctorFields(formData), photoUrl });
  if (oldPhotoUrl && oldPhotoUrl !== photoUrl) await deleteImage(oldPhotoUrl);
  revalidateAll();
}

export async function deleteDoctorAction(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const photoUrl = (await getDoctor(id))?.photoUrl;
  if (await deleteDoctor(id)) await deleteImage(photoUrl);
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

/** Which version of a banner a form changes: the wide one or the phone one. */
function bannerVariant(formData: FormData): "desktop" | "mobile" {
  return formData.get("variant") === "mobile" ? "mobile" : "desktop";
}

export async function updateBannerAction(formData: FormData) {
  await requireAdmin();
  const page = pageKey(formData);
  if (!page) return;
  const url = await uploadImage(fileOrNull(formData, "banner"), "banners");
  if (url) await setPageBanner(page, url, bannerVariant(formData));
  revalidateAll();
}

export async function removeBannerAction(formData: FormData) {
  await requireAdmin();
  const page = pageKey(formData);
  if (!page) return;
  await setPageBanner(page, undefined, bannerVariant(formData));
  revalidateAll();
}

export async function setHomeBannerVisibilityAction(formData: FormData) {
  await requireAdmin();
  await updateSettings({ showHomeBanner: formData.get("visible") === "on" });
  revalidateAll();
}

export async function updateHeroImageAction(formData: FormData) {
  await requireAdmin();
  const url = await uploadImage(fileOrNull(formData, "image"), "hero");
  if (url) await updateSettings({ heroImageUrl: url });
  revalidateAll();
}

export async function removeHeroImageAction() {
  await requireAdmin();
  await updateSettings({ heroImageUrl: undefined });
  revalidateAll();
}

// Social media

export async function saveSocialAction(formData: FormData) {
  await requireAdmin();
  const social: SocialLinks = {};
  for (const platform of SOCIAL_PLATFORMS) {
    const url = optUrl(formData, platform.key);
    if (url) social[platform.key] = url;
  }
  await updateSettings({ social });
  revalidateAll();
}

// Partners

function partnerFields(formData: FormData) {
  const group = str(formData, "group");
  return {
    group: (LOGO_GROUPS as readonly string[]).includes(group)
      ? (group as LogoGroup)
      : undefined,
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

export async function reorderPartnersAction(formData: FormData) {
  await requireAdmin();
  const group = str(formData, "group");
  if (!(LOGO_GROUPS as readonly string[]).includes(group)) return;
  await reorderPartners(group as LogoGroup, formData.getAll("order").map(String));
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
    schedule: scheduleFromForm(formData),
    hoursNoteEn: optStr(formData, "hoursNoteEn"),
    hoursNoteAr: optStr(formData, "hoursNoteAr"),
    // The old free-text hours are replaced by the schedule once saved.
    hoursEn: undefined,
    hoursAr: undefined,
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

// Offers

/** A YYYY-MM-DD date from a date input, or undefined. */
function optDate(formData: FormData, key: string): string | undefined {
  const value = str(formData, key);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function offerFields(formData: FormData) {
  return {
    titleEn: str(formData, "titleEn"),
    titleAr: str(formData, "titleAr"),
    summaryEn: optStr(formData, "summaryEn"),
    summaryAr: optStr(formData, "summaryAr"),
    detailsEn: optStr(formData, "detailsEn"),
    detailsAr: optStr(formData, "detailsAr"),
    termsEn: optStr(formData, "termsEn"),
    termsAr: optStr(formData, "termsAr"),
    priceNow: optNum(formData, "priceNow"),
    priceWas: optNum(formData, "priceWas"),
    endsAt: optDate(formData, "endsAt"),
    departmentId: optStr(formData, "departmentId"),
    branchIds: formData.getAll("branchIds").map(String),
    order: optNum(formData, "order"),
    active: formData.get("active") === "on",
  };
}

export async function createOfferAction(formData: FormData) {
  await requireAdmin();
  const imageUrl = await uploadImage(fileOrNull(formData, "image"), "offers");
  const mobileImageUrl = await uploadImage(fileOrNull(formData, "mobileImage"), "offers");
  await createOffer({ ...offerFields(formData), imageUrl, mobileImageUrl });
  revalidateAll();
}

export async function updateOfferAction(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const current = await getOffer(id);
  const newImageUrl = await uploadImage(fileOrNull(formData, "image"), "offers");
  const imageUrl = newImageUrl ?? current?.imageUrl;
  const newMobileUrl = await uploadImage(fileOrNull(formData, "mobileImage"), "offers");
  // A new phone image replaces the old one; "remove" clears it.
  const mobileImageUrl =
    newMobileUrl ??
    (formData.get("removeMobileImage") === "on" ? undefined : current?.mobileImageUrl);
  await updateOffer(id, { ...offerFields(formData), imageUrl, mobileImageUrl });
  revalidateAll();
}

export async function deleteOfferAction(formData: FormData) {
  await requireAdmin();
  await deleteOffer(str(formData, "id"));
  revalidateAll();
}

// Staff coordination directory

/** 24 random bytes → 32 URL-safe characters; not guessable. */
function randomKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Creates (or replaces, revoking the old one) the private directory link. */
export async function generateDirectoryKeyAction() {
  await requireAdmin();
  await updateSettings({ directoryKey: randomKey() });
  revalidateAll();
}

/** Creates (or replaces, revoking the old one) the call center's bookings link. */
export async function generateBookingsKeyAction() {
  await requireAdmin();
  await updateSettings({ bookingsKey: randomKey() });
  revalidateAll();
}

/** Creates (or replaces, revoking the old one) the supervisor's bookings link. */
export async function generateBookingsSupervisorKeyAction() {
  await requireAdmin();
  await updateSettings({ bookingsSupervisorKey: randomKey() });
  revalidateAll();
}

/** Permanently deletes booking requests received on or before a date. */
export async function deleteOldBookingsAction(formData: FormData) {
  await requireAdmin();
  const locale = str(formData, "locale");
  const count = await deleteBookingsUpTo(str(formData, "upTo"));
  revalidateAll();
  redirect(localePath(isLocale(locale) ? locale : defaultLocale, `/admin/bookings?deleted=${count}`));
}

// Home page sections

/** Saves the home page section order and which sections are shown. */
export async function updateHomeSectionsAction(formData: FormData) {
  await requireAdmin();
  const shown = new Set(formData.getAll("shown").map(String));
  await updateSettings({
    hiddenHomeSections: HOME_SECTIONS.filter((section) => !shown.has(section)),
    homeSectionOrder: homeSectionOrder(formData.getAll("order").map(String)),
  });
  revalidateAll();
}
