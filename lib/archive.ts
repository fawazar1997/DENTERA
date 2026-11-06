import fs from "node:fs";
import path from "node:path";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { BlobPreconditionFailedError } from "@vercel/blob";
import { revalidateTag, unstable_cache } from "next/cache";
import { isBlobConfigured } from "./blob";
import { readBlobJson, writeBlobJson } from "./privateBlob";
import { getSettings } from "./db";

// The letters archive register: outgoing letters (الصادر), numbered
// ABH-2026-0061 / KHA-2026-… per branch and year, and incoming mail
// (الوارد), not numbered. The files themselves are in Google Drive (see
// lib/googleDrive.ts); this register keeps the details and the Drive link.
//
// It's one private file. Every change is saved only if the file is
// unchanged since it was read (ETag) and redone otherwise, so two letters
// sent at the same moment never get the same number.

export type ArchiveKind = "outgoing" | "incoming";

export type ArchiveEntry = {
  id: string;
  kind: ArchiveKind;
  /** Branch id ("abha", "khamis-mushait"). */
  branch: string;
  /** Outgoing only: the issued letter number. */
  number?: string;
  /** الإدارة (outgoing) / الإدارة المختصة (incoming). */
  department: string;
  /** Outgoing: الرقم الوظيفي of the employee sending it. */
  employeeNo?: string;
  /** Outgoing: نوع الخطاب. */
  letterType?: string;
  /** Incoming: الجهة (who sent it). */
  party?: string;
  /** Incoming: the sender's own letter number. */
  letterNo?: string;
  title: string;
  /** تاريخ الخطاب, YYYY-MM-DD. */
  letterDate: string;
  fileName: string;
  mimeType: string;
  size: number;
  /** pending: number reserved, file on its way to Drive. */
  status: "pending" | "done" | "cancelled";
  /** The Drive upload session, kept until the file arrives (never shown). */
  uploadUrl?: string;
  driveFileId?: string;
  driveLink?: string;
  createdAt: string;
  completedAt?: string;
};

type ArchiveFile = {
  /** Next number to issue, per "ABH-2026" (prefix and year). */
  counters: Record<string, number>;
  entries: ArchiveEntry[];
};

const ARCHIVE_PATH = "data/archive.json";
const CACHE_TAG = "dentera-archive";
const LOCAL_PATH = path.join(process.cwd(), "data", "archive.local.json");

/** Branches with an archive, and their letter-number prefix. */
export const ARCHIVE_BRANCHES: Record<string, string> = {
  abha: "ABH",
  "khamis-mushait": "KHA",
};

export const MAX_ARCHIVE_FILE_BYTES = 10 * 1024 * 1024;
export const ARCHIVE_FILE_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

/** True when `key` matches the forms page link saved in the control panel. */
export async function isValidFormsKey(key: string): Promise<boolean> {
  const saved = (await getSettings()).formsKey;
  if (!saved || !key) return false;
  const a = Buffer.from(saved);
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The current year in Saudi time (numbers restart every year). */
export function archiveYear(now = Date.now()): number {
  return Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric" }).format(now));
}

export function formatLetterNumber(prefix: string, year: number, n: number): string {
  return `${prefix}-${year}-${String(n).padStart(4, "0")}`;
}

/** Drive folders per branch: the control panel's, else the Vercel setting. */
export async function getArchiveFolders(): Promise<Record<string, { outgoing?: string; incoming?: string }>> {
  let fallback: Record<string, { outgoing?: string; incoming?: string }> = {};
  try {
    fallback = JSON.parse(process.env.ARCHIVE_DRIVE_FOLDERS || "{}");
  } catch {
    // Ignore a malformed setting.
  }
  const saved = (await getSettings()).archiveFolders ?? {};
  const result: Record<string, { outgoing?: string; incoming?: string }> = {};
  for (const branch of Object.keys(ARCHIVE_BRANCHES)) {
    result[branch] = {
      outgoing: saved[branch]?.outgoing || fallback[branch]?.outgoing || undefined,
      incoming: saved[branch]?.incoming || fallback[branch]?.incoming || undefined,
    };
  }
  return result;
}

// --- Storage ---

function emptyFile(): ArchiveFile {
  return { counters: {}, entries: [] };
}

function readLocal(): ArchiveFile {
  try {
    return JSON.parse(fs.readFileSync(LOCAL_PATH, "utf-8")) as ArchiveFile;
  } catch {
    return emptyFile();
  }
}

async function readArchive(): Promise<ArchiveFile> {
  if (!isBlobConfigured()) return readLocal();
  return (await readBlobJson<ArchiveFile>(ARCHIVE_PATH))?.data ?? emptyFile();
}

const readArchiveCached = unstable_cache(readArchive, [CACHE_TAG], { tags: [CACHE_TAG] });

/**
 * Applies a change to the register. `change` returns the new register (null:
 * nothing to save) and a result. On Blob, it's saved only if nobody saved in
 * between, and redone on the newer version otherwise.
 */
async function changeArchive<T>(change: (file: ArchiveFile) => { next: ArchiveFile | null; result: T }): Promise<T> {
  if (!isBlobConfigured()) {
    const { next, result } = change(readLocal());
    if (next) fs.writeFileSync(LOCAL_PATH, JSON.stringify(next, null, 2));
    revalidateTag(CACHE_TAG);
    return result;
  }
  for (let attempt = 0; attempt < 8; attempt++) {
    const saved = await readBlobJson<ArchiveFile>(ARCHIVE_PATH, { forWrite: true });
    const { next, result } = change(saved?.data ?? emptyFile());
    if (!next) return result;
    try {
      await writeBlobJson(ARCHIVE_PATH, next, saved ? { ifMatch: saved.etag } : { create: true });
      revalidateTag(CACHE_TAG);
      return result;
    } catch (error) {
      const conflict =
        error instanceof BlobPreconditionFailedError || (!saved && /exist/i.test(String(error)));
      if (!conflict) throw error;
      await new Promise((r) => setTimeout(r, 50 + Math.random() * 200));
    }
  }
  throw new Error("Archive is busy, try again");
}

// --- Reading ---

/** The number the next outgoing letter of a branch will get. */
export async function nextLetterNumber(branch: string): Promise<string | null> {
  const prefix = ARCHIVE_BRANCHES[branch];
  if (!prefix) return null;
  const year = archiveYear();
  const file = isBlobConfigured() ? await readArchiveCached() : readLocal();
  return formatLetterNumber(prefix, year, file.counters[`${prefix}-${year}`] ?? 1);
}

/** Next numbers for every branch (for the control panel). */
export async function nextLetterNumbers(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const branch of Object.keys(ARCHIVE_BRANCHES)) out[branch] = (await nextLetterNumber(branch)) ?? "";
  return out;
}

/** Register entries, newest first (pending and cancelled ones only when asked). */
export async function listArchive(
  options: { branch?: string; kind?: ArchiveKind; all?: boolean } = {}
): Promise<ArchiveEntry[]> {
  const file = isBlobConfigured() ? await readArchiveCached() : readLocal();
  return file.entries
    .filter((e) => (options.all || e.status === "done") && (!options.branch || e.branch === options.branch))
    .filter((e) => !options.kind || e.kind === options.kind)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(({ uploadUrl: _hidden, ...rest }) => rest);
}

/** One entry, including its upload session (server use only). */
export async function getArchiveEntry(id: string): Promise<ArchiveEntry | undefined> {
  return (await readArchive()).entries.find((e) => e.id === id);
}

// --- Changing ---

export type NewArchiveEntry = Omit<ArchiveEntry, "id" | "number" | "status" | "createdAt" | "completedAt">;

/**
 * Records a letter before its file is uploaded. An outgoing letter gets the
 * branch's next number here, so two at once can never share one.
 */
export async function reserveArchiveEntry(input: NewArchiveEntry): Promise<ArchiveEntry> {
  const prefix = ARCHIVE_BRANCHES[input.branch];
  if (!prefix) throw new Error("unknown-branch");
  const year = archiveYear();
  const counterKey = `${prefix}-${year}`;
  const id = randomBytes(9).toString("base64url");
  return changeArchive((file) => {
    const entry: ArchiveEntry = { ...input, id, status: "pending", createdAt: new Date().toISOString() };
    const counters = { ...file.counters };
    if (input.kind === "outgoing") {
      const n = counters[counterKey] ?? 1;
      entry.number = formatLetterNumber(prefix, year, n);
      counters[counterKey] = n + 1;
    }
    return { next: { counters, entries: [...file.entries, entry] }, result: entry };
  });
}

/** Saves the upload session of a reserved entry. */
export async function setArchiveUploadUrl(id: string, uploadUrl: string): Promise<void> {
  await changeArchive((file) => {
    const index = file.entries.findIndex((e) => e.id === id && e.status === "pending");
    if (index === -1) return { next: null, result: undefined };
    const entries = [...file.entries];
    entries[index] = { ...entries[index], uploadUrl };
    return { next: { ...file, entries }, result: undefined };
  });
}

/** Marks an entry done once its file is in Drive. */
export async function completeArchiveEntry(
  id: string,
  drive: { id: string; webViewLink?: string }
): Promise<ArchiveEntry | null> {
  return changeArchive((file) => {
    const index = file.entries.findIndex((e) => e.id === id);
    if (index === -1 || file.entries[index].status === "cancelled") return { next: null, result: null };
    const entries = [...file.entries];
    const { uploadUrl: _done, ...rest } = entries[index];
    entries[index] = {
      ...rest,
      status: "done",
      driveFileId: drive.id,
      driveLink: drive.webViewLink || `https://drive.google.com/file/d/${drive.id}/view`,
      completedAt: new Date().toISOString(),
    };
    return { next: { ...file, entries }, result: entries[index] };
  });
}

/**
 * Gives up on an entry whose file never arrived. An outgoing number that's
 * still the latest goes back to the counter (no gap); otherwise the entry is
 * kept as cancelled so the skipped number stays explained.
 */
export async function cancelArchiveEntry(id: string): Promise<void> {
  await changeArchive((file) => {
    const entry = file.entries.find((e) => e.id === id);
    if (!entry || entry.status !== "pending") return { next: null, result: undefined };
    const counters = { ...file.counters };
    const match = entry.number?.match(/^([A-Z]+)-(\d{4})-(\d+)$/);
    const counterKey = match ? `${match[1]}-${match[2]}` : "";
    if (entry.kind === "incoming" || (match && counters[counterKey] === Number(match[3]) + 1)) {
      if (match) counters[counterKey] = Number(match[3]);
      return { next: { counters, entries: file.entries.filter((e) => e.id !== id) }, result: undefined };
    }
    const entries = file.entries.map((e) =>
      e.id === id ? { ...e, status: "cancelled" as const, uploadUrl: undefined } : e
    );
    return { next: { counters, entries }, result: undefined };
  });
}

/** Control panel: removes an entry from the register (the Drive file stays). */
export async function deleteArchiveEntry(id: string): Promise<boolean> {
  return changeArchive((file) => {
    const entries = file.entries.filter((e) => e.id !== id);
    return entries.length === file.entries.length
      ? { next: null, result: false }
      : { next: { ...file, entries }, result: true };
  });
}

/**
 * Control panel: sets the next outgoing number of a branch for this year
 * (e.g. 61, to continue the old Sheet). It can't go back to a number already
 * issued, so no two letters ever share one.
 */
export async function setNextLetterNumber(branch: string, next: number): Promise<"ok" | "too-low" | "invalid"> {
  const prefix = ARCHIVE_BRANCHES[branch];
  if (!prefix || !Number.isInteger(next) || next < 1 || next > 99999) return "invalid";
  const year = archiveYear();
  const counterKey = `${prefix}-${year}`;
  return changeArchive((file) => {
    const issued = file.entries
      .map((e) => e.number?.match(new RegExp(`^${counterKey}-(\\d+)$`))?.[1])
      .filter((n): n is string => !!n)
      .map(Number);
    if (issued.some((n) => n >= next)) return { next: null, result: "too-low" as const };
    return {
      next: { ...file, counters: { ...file.counters, [counterKey]: next } },
      result: "ok" as const,
    };
  });
}

/** The register as CSV (opens in Excel, Arabic included). */
export function archiveCsv(entries: ArchiveEntry[], branchName: (id: string) => string): string {
  const cell = (v: string | number | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = [
    "النوع", "الفرع", "رقم الخطاب", "الجهة", "رقم خطاب الجهة", "عنوان الخطاب", "نوع الخطاب",
    "الإدارة", "الرقم الوظيفي", "تاريخ الخطاب", "تاريخ الرفع", "الحالة", "رابط الملف",
  ];
  const rows = entries.map((e) =>
    [
      e.kind === "outgoing" ? "صادر" : "وارد",
      branchName(e.branch),
      e.number,
      e.party,
      e.letterNo,
      e.title,
      e.letterType,
      e.department,
      e.employeeNo,
      e.letterDate,
      e.createdAt.slice(0, 10),
      e.status === "done" ? "مكتمل" : e.status === "pending" ? "لم يكتمل الرفع" : "ملغي",
      e.driveLink,
    ]
      .map(cell)
      .join(",")
  );
  return "﻿" + [header.map(cell).join(","), ...rows].join("\r\n");
}
