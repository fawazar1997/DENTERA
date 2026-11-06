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
  getStaffForms,
  moveStaffForm,
  updateSettings,
  updateStaffForm,
} from "./db";
import {
  ARCHIVE_BRANCHES,
  addPastLetters,
  deleteArchiveEntry,
  getArchiveEntry,
  deleteImportBatch,
  setNextLetterNumber,
  type PastLetter,
} from "./archive";
import { readPastLetters } from "./archiveImport";
import { logActivity } from "./activity";
import { readSpreadsheet } from "./spreadsheet";
import { disconnectDrive, driveIdFromLink } from "./googleDrive";
import { defaultLocale, isLocale, localePath } from "./i18n";

// Control Panel → Forms & Archive.

async function requireAdmin(): Promise<void> {
  if (!(await verifySessionToken(cookies().get(SESSION_COOKIE)?.value))) throw new Error("Unauthorized");
}

const str = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

function back(form: FormData, query = "", page = "/admin/forms"): never {
  const locale = str(form, "locale");
  redirect(localePath(isLocale(locale) ? locale : defaultLocale, `${page}${query ? `?${query}` : ""}`));
}

/** Back to the letters register page. */
function backToLetters(form: FormData, query = ""): never {
  back(form, query, "/admin/letters");
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
  await logActivity("admin", "/forms", "create", fields.nameAr);
  refresh();
  back(form);
}

export async function updateStaffFormAction(form: FormData) {
  await requireAdmin();
  const fields = formFields(form);
  if (!fields.nameAr || !fields.docId) back(form, "formError=1");
  await updateStaffForm(str(form, "id"), fields);
  await logActivity("admin", "/forms", "update", fields.nameAr);
  refresh();
  back(form);
}

export async function moveStaffFormAction(form: FormData) {
  await requireAdmin();
  const name = (await getStaffForms()).find((f) => f.id === str(form, "id"))?.nameAr;
  await moveStaffForm(str(form, "id"), str(form, "dir") === "up" ? -1 : 1);
  await logActivity("admin", "/forms", "move", name);
  refresh();
  back(form);
}

export async function deleteStaffFormAction(form: FormData) {
  await requireAdmin();
  const name = (await getStaffForms()).find((f) => f.id === str(form, "id"))?.nameAr;
  await deleteStaffForm(str(form, "id"));
  await logActivity("admin", "/forms", "delete", name);
  refresh();
  back(form);
}

/** Creates (or replaces, revoking the old one) the staff forms page link. */
export async function generateFormsKeyAction(form: FormData) {
  await requireAdmin();
  await updateSettings({ formsKey: randomBytes(24).toString("base64url") });
  await logActivity("admin", "/forms", "link");
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
  await logActivity("admin", "/forms", "settings");
  refresh();
  back(form, "saved=settings");
}

/** Sets a branch's next outgoing letter number for this year. */
export async function setNextLetterNumberAction(form: FormData) {
  await requireAdmin();
  const result = await setNextLetterNumber(str(form, "branch"), Number(str(form, "next")));
  if (result === "ok") await logActivity("admin", "/forms", "settings", `${str(form, "branch")}: ${str(form, "next")}`);
  refresh();
  back(form, result === "ok" ? "saved=number" : `numberError=${result}`);
}

export async function deleteArchiveEntryAction(form: FormData) {
  await requireAdmin();
  const entry = await getArchiveEntry(str(form, "id"));
  await deleteArchiveEntry(str(form, "id"));
  await logActivity("admin", "/letters", "delete", entry?.number || entry?.letterNo || entry?.title);
  refresh();
  backToLetters(form, "saved=deleted");
}

/**
 * Adds the old letters from the Google Sheet (downloaded as Excel or CSV),
 * one sheet per upload: outgoing or incoming.
 */
export async function importPastLettersAction(form: FormData) {
  await requireAdmin();
  const file = form.get("file");
  const kind = str(form, "kind") === "incoming" ? "incoming" : "outgoing";
  const branch = ARCHIVE_BRANCHES[str(form, "branch")] ? str(form, "branch") : "";
  if (!branch) backToLetters(form, "importError=branch");
  if (!(file instanceof File) || file.size === 0) backToLetters(form, "importError=file");
  if (file.size > 6 * 1024 * 1024) backToLetters(form, "importError=size");
  let reading: ReturnType<typeof readPastLetters>;
  try {
    reading = readPastLetters(readSpreadsheet(new Uint8Array(await file.arrayBuffer()), file.name), kind, branch);
  } catch {
    backToLetters(form, "importError=read");
  }
  if (!reading.letters.length) backToLetters(form, "importError=empty");
  const result = await addPastLetters(reading.letters);
  await logActivity("admin", "/letters", "import", `${result.added}`);
  refresh();
  backToLetters(
    form,
    `imported=${result.added}&duplicates=${result.duplicates}&incomplete=${reading.incomplete}&batch=${result.batch}`
  );
}

/** Adds one past letter typed in by hand (its file already in Drive). */
export async function addPastLetterAction(form: FormData) {
  await requireAdmin();
  const kind = str(form, "kind") === "incoming" ? "incoming" : "outgoing";
  const branch = str(form, "branch");
  const title = str(form, "title").slice(0, 300);
  const number = str(form, "number").toUpperCase().slice(0, 40);
  const letterDate = /^\d{4}-\d{2}-\d{2}$/.test(str(form, "letterDate")) ? str(form, "letterDate") : "";
  if (!ARCHIVE_BRANCHES[branch] || !title || !letterDate || (kind === "outgoing" && !number)) {
    backToLetters(form, "addError=1");
  }
  const link = str(form, "link").slice(0, 500);
  const driveFileId = link ? driveIdFromLink(link) : "";
  const letter: PastLetter = {
    kind,
    branch,
    title,
    letterDate,
    department: str(form, "department").slice(0, 120),
    createdAt: new Date(`${letterDate}T12:00:00+03:00`).toISOString(),
    driveFileId: driveFileId || undefined,
    driveLink: /^https:\/\//.test(link) ? link : driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : undefined,
  };
  if (kind === "outgoing") {
    letter.number = number;
    letter.employeeNo = str(form, "employeeNo").slice(0, 40) || undefined;
    letter.letterType = str(form, "letterType").slice(0, 120) || undefined;
  } else {
    letter.party = str(form, "party").slice(0, 200) || undefined;
    letter.letterNo = number || undefined;
  }
  const result = await addPastLetters([letter]);
  if (result.added) await logActivity("admin", "/letters", "create", letter.number || letter.letterNo || letter.title);
  refresh();
  backToLetters(form, result.added ? "saved=added" : "addError=duplicate");
}

/** Undoes one import: removes the letters it added (the Drive files stay). */
export async function undoImportAction(form: FormData) {
  await requireAdmin();
  const removed = await deleteImportBatch(str(form, "batch"));
  await logActivity("admin", "/letters", "undo", `${removed}`);
  refresh();
  backToLetters(form, `undone=${removed}`);
}

export async function disconnectDriveAction(form: FormData) {
  await requireAdmin();
  await disconnectDrive();
  await logActivity("admin", "/forms", "disconnect");
  refresh();
  back(form, "google=disconnected");
}
