import fs from "node:fs";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { BlobPreconditionFailedError } from "@vercel/blob";
import { revalidateTag, unstable_cache } from "next/cache";
import { isBlobConfigured } from "./blob";
import { readBlobJson, writeBlobJson } from "./privateBlob";
import {
  defaultFields,
  type CareerApplication,
  type CareerExclusion,
  type CareerField,
} from "./careersTypes";

export * from "./careersTypes";

// The careers system (التوظيف): applications sent from the website's
// careers page, screened in Control Panel → التوظيف. The CVs live in
// Google Drive («التوظيف»/<field>/<ref - name>/); everything else is one
// private file, saved only if unchanged since read (ETag) and redone
// otherwise, as the letters register is.

export type CareersFile = {
  counters: Record<string, number>;
  applications: CareerApplication[];
  fields: CareerField[];
  exclusions: CareerExclusion[];
  folders: { parent?: string; parentName?: string; byField?: Record<string, string> };
  /** visible: the careers page is on the site (off until HR sets it up); open: it accepts applications. */
  settings: { visible: boolean; open: boolean; intro?: string };
  /** Recent submissions (hashed IP + time), for the rate limit. */
  recent: { ip: string; at: number }[];
};

const CAREERS_PATH = "data/careers.json";
const CACHE_TAG = "dentera-careers";
const LOCAL_PATH = path.join(process.cwd(), "data", "careers.local.json");

function emptyFile(): CareersFile {
  return {
    counters: {},
    applications: [],
    fields: defaultFields(),
    exclusions: [],
    folders: {},
    settings: { visible: false, open: true },
    recent: [],
  };
}

function normalize(file: Partial<CareersFile> | null | undefined): CareersFile {
  const base = emptyFile();
  if (!file) return base;
  return {
    ...base,
    ...file,
    fields: file.fields?.length ? file.fields : base.fields,
    settings: { ...base.settings, ...(file.settings ?? {}) },
  };
}

function readLocal(): CareersFile {
  try {
    return normalize(JSON.parse(fs.readFileSync(LOCAL_PATH, "utf-8")));
  } catch {
    return emptyFile();
  }
}

/** The whole store, fresh from storage. */
export async function readCareers(): Promise<CareersFile> {
  if (!isBlobConfigured()) return readLocal();
  return normalize((await readBlobJson<CareersFile>(CAREERS_PATH))?.data);
}

/** Applies a change; on Blob it's redone if someone saved in between. */
export async function changeCareers<T>(change: (file: CareersFile) => { next: CareersFile | null; result: T }): Promise<T> {
  if (!isBlobConfigured()) {
    const { next, result } = change(readLocal());
    if (next) fs.writeFileSync(LOCAL_PATH, JSON.stringify(next, null, 2));
    revalidateTag(CACHE_TAG);
    return result;
  }
  for (let attempt = 0; attempt < 8; attempt++) {
    const saved = await readBlobJson<CareersFile>(CAREERS_PATH, { forWrite: true });
    const { next, result } = change(normalize(saved?.data));
    if (!next) return result;
    try {
      await writeBlobJson(CAREERS_PATH, next, saved ? { ifMatch: saved.etag } : { create: true });
      revalidateTag(CACHE_TAG);
      return result;
    } catch (error) {
      const conflict = error instanceof BlobPreconditionFailedError || (!saved && /exist/i.test(String(error)));
      if (!conflict) throw error;
      await new Promise((r) => setTimeout(r, 50 + Math.random() * 200));
    }
  }
  throw new Error("Careers store is busy, try again");
}

export function newCareersId(): string {
  return randomBytes(12).toString("base64url");
}

/** Takes the next application reference (JOB-2026-0007), updating `counters`. */
export function takeJobRef(counters: Record<string, number>): string {
  const year = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric" }).format(Date.now()));
  const n = counters[String(year)] ?? 1;
  counters[String(year)] = n + 1;
  return `JOB-${year}-${String(n).padStart(4, "0")}`;
}

/** An IP address as a one-way hash (only to count submissions). */
export function hashIp(ip: string): string {
  return createHash("sha256")
    .update(`${process.env.SESSION_SECRET ?? "dentera"}:${ip}`)
    .digest("base64url")
    .slice(0, 22);
}

/** Whether the careers page is shown on the site (for the menu, footer and sitemap). */
export async function careersVisible(): Promise<boolean> {
  try {
    return await readVisibleCached();
  } catch {
    return false;
  }
}

const readVisibleCached = unstable_cache(async () => (await readCareers()).settings.visible, [CACHE_TAG, "visible"], {
  tags: [CACHE_TAG],
});

export const normalizeEmail = (email?: string) => (email ?? "").trim().toLowerCase() || undefined;

/** The exclusion entry an applicant matches (by mobile or email), if any. */
export function findExclusion(
  exclusions: CareerExclusion[],
  person: { mobile?: string; email?: string }
): CareerExclusion | undefined {
  const email = normalizeEmail(person.email);
  return exclusions.find((e) => (person.mobile && e.mobile === person.mobile) || (email && e.email === email));
}

/** Applications that are finished (files in Drive); unfinished ones older than a day are dropped. */
export function liveApplications(file: CareersFile): CareerApplication[] {
  return file.applications.filter((a) => a.status === "done");
}

/** Removes unfinished uploads older than a day and rate-limit entries older than a day. */
export function pruneCareers(file: CareersFile): CareersFile {
  const dayAgo = Date.now() - 24 * 3600 * 1000;
  return {
    ...file,
    applications: file.applications.filter((a) => a.status === "done" || Date.parse(a.createdAt) > dayAgo),
    recent: file.recent.filter((r) => r.at > dayAgo),
  };
}

/** The ids of applications by someone who applied before (same mobile or email, earlier). */
export function repeatApplicants(apps: CareerApplication[]): Set<string> {
  const seen = new Map<string, string>();
  const repeat = new Set<string>();
  for (const app of [...apps].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const keys = [`m:${app.mobile}`, app.email ? `e:${normalizeEmail(app.email)}` : ""].filter(Boolean);
    if (keys.some((k) => seen.has(k))) repeat.add(app.id);
    for (const k of keys) if (!seen.has(k)) seen.set(k, app.id);
  }
  return repeat;
}
