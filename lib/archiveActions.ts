"use server";

import { headers } from "next/headers";
import { getSettings } from "./db";
import {
  ARCHIVE_BRANCHES,
  ARCHIVE_FILE_TYPES,
  MAX_ARCHIVE_FILE_BYTES,
  cancelArchiveEntry,
  completeArchiveEntry,
  getArchiveEntry,
  getArchiveFolders,
  isValidFormsKey,
  reserveArchiveEntry,
  setArchiveUploadUrl,
  type ArchiveKind,
} from "./archive";
import { DriveError, getDriveConnection, getDriveFile, sendToUpload, startUpload } from "./googleDrive";
import { SITE_URL } from "./seo";

export type StartUploadResult =
  | { ok: true; entryId: string; number?: string; uploadUrl: string }
  | { ok: false; error: "key" | "fields" | "file" | "not-set-up" | "drive" | "busy" };

/** Largest file the server-side fallback can carry (Vercel's request limit). */
const SERVER_UPLOAD_LIMIT = 4 * 1024 * 1024;

const text = (form: FormData, key: string, max = 200) =>
  String(form.get(key) ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** A file name Drive and Windows both accept. */
function safeName(value: string): string {
  return value.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 120).trim();
}

/** The page's own address, so the browser may send the file to Google directly. */
function browserOrigin(): string {
  const h = headers();
  const origin = h.get("origin");
  if (origin && /^https?:\/\/[\w.-]+(:\d+)?$/.test(origin)) return origin;
  return SITE_URL;
}

/**
 * Staff: starts sending a letter to the archive. Checks the fields, records
 * the letter (an outgoing one gets its number now) and opens a Drive upload
 * in the branch's folder. The browser then sends the file to `uploadUrl`.
 */
export async function startArchiveUploadAction(form: FormData): Promise<StartUploadResult> {
  if (!(await isValidFormsKey(text(form, "key")))) return { ok: false, error: "key" };
  const kind = text(form, "kind") as ArchiveKind;
  const branch = text(form, "branch");
  if ((kind !== "outgoing" && kind !== "incoming") || !ARCHIVE_BRANCHES[branch]) {
    return { ok: false, error: "fields" };
  }

  const settings = await getSettings();
  const departments = (kind === "outgoing" ? settings.archiveDepartmentsOut : settings.archiveDepartmentsIn) ?? [];
  const department = text(form, "department");
  const title = text(form, "title");
  const letterDate = text(form, "letterDate", 10);
  const employeeNo = text(form, "employeeNo", 40);
  const letterType = text(form, "letterType", 100);
  const party = text(form, "party");
  const letterNo = text(form, "letterNo", 60);
  const fileName = text(form, "fileName", 200);
  const mimeType = text(form, "mimeType", 100);
  const size = Number(form.get("size"));

  const required =
    kind === "outgoing" ? [department, title, letterDate, employeeNo, letterType] : [department, title, letterDate, party, letterNo];
  if (required.some((v) => !v) || !departments.includes(department) || !/^\d{4}-\d{2}-\d{2}$/.test(letterDate)) {
    return { ok: false, error: "fields" };
  }
  if (!ARCHIVE_FILE_TYPES[mimeType] || !(size > 0 && size <= MAX_ARCHIVE_FILE_BYTES)) {
    return { ok: false, error: "file" };
  }

  const folderId = (await getArchiveFolders())[branch]?.[kind];
  if (!folderId || !(await getDriveConnection())) return { ok: false, error: "not-set-up" };

  let entry;
  try {
    entry = await reserveArchiveEntry({
      kind,
      branch,
      department,
      title,
      letterDate,
      fileName,
      mimeType,
      size,
      ...(kind === "outgoing" ? { employeeNo, letterType } : { party, letterNo }),
    });
  } catch {
    return { ok: false, error: "busy" };
  }

  const ext = ARCHIVE_FILE_TYPES[mimeType];
  const driveName =
    kind === "outgoing"
      ? safeName(`${entry.number} — ${title} — ${letterDate}`) + ext
      : safeName(`وارد — ${party} — ${letterNo} — ${letterDate}`) + ext;
  try {
    const uploadUrl = await startUpload({ folderId, name: driveName, mimeType, size, origin: browserOrigin() });
    await setArchiveUploadUrl(entry.id, uploadUrl);
    return { ok: true, entryId: entry.id, number: entry.number, uploadUrl };
  } catch (error) {
    console.error("Archive: couldn't start the Drive upload:", error);
    // Nothing reached Drive: give the number back (no half-saved letter).
    await cancelArchiveEntry(entry.id).catch(() => undefined);
    return { ok: false, error: error instanceof DriveError && error.message === "not-connected" ? "not-set-up" : "drive" };
  }
}

/** Staff: the file reached Drive; checks it really is there, then files the letter. */
export async function finishArchiveUploadAction(input: {
  key: string;
  entryId: string;
  driveFileId: string;
}): Promise<{ ok: true; number?: string; link?: string } | { ok: false }> {
  if (!(await isValidFormsKey(input.key))) return { ok: false };
  const entry = await getArchiveEntry(input.entryId);
  if (!entry || entry.status !== "pending") return { ok: false };
  const folderId = (await getArchiveFolders())[entry.branch]?.[entry.kind];
  try {
    const file = await getDriveFile(input.driveFileId);
    if (!file || !folderId || !file.parents?.includes(folderId)) return { ok: false };
    const done = await completeArchiveEntry(entry.id, file);
    return done ? { ok: true, number: done.number, link: done.driveLink } : { ok: false };
  } catch (error) {
    console.error("Archive: couldn't confirm the Drive file:", error);
    return { ok: false };
  }
}

/**
 * Staff: fallback when the browser can't send the file to Google directly:
 * the server forwards it (files up to 4 MB, Vercel's request limit).
 */
export async function uploadArchiveFileAction(
  form: FormData
): Promise<{ ok: true; number?: string; link?: string } | { ok: false; error: "too-big" | "failed" }> {
  const key = text(form, "key");
  if (!(await isValidFormsKey(key))) return { ok: false, error: "failed" };
  const entry = await getArchiveEntry(text(form, "entryId"));
  const file = form.get("file");
  if (!entry || entry.status !== "pending" || !entry.uploadUrl || !(file instanceof File)) {
    return { ok: false, error: "failed" };
  }
  if (file.size > SERVER_UPLOAD_LIMIT) return { ok: false, error: "too-big" };
  if (file.size !== entry.size) return { ok: false, error: "failed" };
  try {
    const uploaded = await sendToUpload(entry.uploadUrl, await file.arrayBuffer(), entry.mimeType);
    const result = await finishArchiveUploadAction({ key, entryId: entry.id, driveFileId: uploaded.id });
    return result.ok ? result : { ok: false, error: "failed" };
  } catch (error) {
    console.error("Archive: server-side Drive upload failed:", error);
    return { ok: false, error: "failed" };
  }
}

/** Staff: the file couldn't be sent; releases the reservation. */
export async function cancelArchiveUploadAction(input: { key: string; entryId: string }): Promise<void> {
  if (!(await isValidFormsKey(input.key))) return;
  const entry = await getArchiveEntry(input.entryId);
  if (entry?.status === "pending") await cancelArchiveEntry(entry.id);
}
