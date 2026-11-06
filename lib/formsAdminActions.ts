"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "./auth";
import {
  createStaffForm,
  deleteStaffForm,
  getSettings,
  moveStaffForm,
  updateSettings,
  updateStaffForm,
} from "./db";
import { ARCHIVE_BRANCHES, deleteArchiveEntry, setNextLetterNumber } from "./archive";
import { disconnectDrive, driveIdFromLink } from "./googleDrive";
import { defaultLocale, isLocale, localePath } from "./i18n";

// Control Panel → Forms & Archive.

async function requireAdmin(): Promise<void> {
  if (!(await verifySessionToken(cookies().get(SESSION_COOKIE)?.value))) throw new Error("Unauthorized");
}

const str = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

function back(form: FormData, query = ""): never {
  const locale = str(form, "locale");
  redirect(localePath(isLocale(locale) ? locale : defaultLocale, `/admin/forms${query ? `?${query}` : ""}`));
}

function refresh() {
  revalidatePath("/", "layout");
}

/** The Google Docs id from a pasted link (…/document/d/<id>/…), or the id itself. */
function docIdFromLink(input: string): string {
  const text = input.trim();
  return text.match(/\/document\/d\/([\w-]{20,})/)?.[1] ?? (/^[\w-]{20,}$/.test(text) ? text : "");
}

function formFields(form: FormData) {
  const branch = str(form, "branch");
  return {
    branch: branch === "both" || ARCHIVE_BRANCHES[branch] ? branch : "both",
    nameAr: str(form, "nameAr").slice(0, 120),
    nameEn: str(form, "nameEn").slice(0, 120),
    docId: docIdFromLink(str(form, "link")),
    active: form.get("active") === "on",
  };
}

export async function createStaffFormAction(form: FormData) {
  await requireAdmin();
  const fields = formFields(form);
  if (!fields.nameAr || !fields.docId) back(form, "formError=1");
  await createStaffForm(fields);
  refresh();
  back(form);
}

export async function updateStaffFormAction(form: FormData) {
  await requireAdmin();
  const fields = formFields(form);
  if (!fields.nameAr || !fields.docId) back(form, "formError=1");
  await updateStaffForm(str(form, "id"), fields);
  refresh();
  back(form);
}

export async function moveStaffFormAction(form: FormData) {
  await requireAdmin();
  await moveStaffForm(str(form, "id"), str(form, "dir") === "up" ? -1 : 1);
  refresh();
  back(form);
}

export async function deleteStaffFormAction(form: FormData) {
  await requireAdmin();
  await deleteStaffForm(str(form, "id"));
  refresh();
  back(form);
}

/** Creates (or replaces, revoking the old one) the staff forms page link. */
export async function generateFormsKeyAction(form: FormData) {
  await requireAdmin();
  await updateSettings({ formsKey: randomBytes(24).toString("base64url") });
  refresh();
  back(form);
}

/** Saves the archive's Drive folders and the department choices. */
export async function saveArchiveSettingsAction(form: FormData) {
  await requireAdmin();
  const folders: Record<string, { outgoing?: string; incoming?: string }> = {};
  for (const branch of Object.keys(ARCHIVE_BRANCHES)) {
    folders[branch] = {
      outgoing: driveIdFromLink(str(form, `folder_${branch}_outgoing`)) || undefined,
      incoming: driveIdFromLink(str(form, `folder_${branch}_incoming`)) || undefined,
    };
  }
  const lines = (key: string) =>
    str(form, key)
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 30);
  const out = lines("departmentsOut");
  const incoming = lines("departmentsIn");
  const current = await getSettings();
  await updateSettings({
    archiveFolders: folders,
    archiveDepartmentsOut: out.length ? out : current.archiveDepartmentsOut,
    archiveDepartmentsIn: incoming.length ? incoming : current.archiveDepartmentsIn,
  });
  refresh();
  back(form, "saved=settings");
}

/** Sets a branch's next outgoing letter number for this year. */
export async function setNextLetterNumberAction(form: FormData) {
  await requireAdmin();
  const result = await setNextLetterNumber(str(form, "branch"), Number(str(form, "next")));
  refresh();
  back(form, result === "ok" ? "saved=number" : `numberError=${result}`);
}

export async function deleteArchiveEntryAction(form: FormData) {
  await requireAdmin();
  await deleteArchiveEntry(str(form, "id"));
  refresh();
  back(form, "saved=deleted");
}

export async function disconnectDriveAction(form: FormData) {
  await requireAdmin();
  await disconnectDrive();
  refresh();
  back(form, "google=disconnected");
}
