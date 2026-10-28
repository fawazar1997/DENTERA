import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { del, list, put } from "@vercel/blob";
import { revalidateTag, unstable_cache } from "next/cache";
import { isBlobConfigured } from "./blob";
import { privateStore, readBlobJson, readPrivateJson, writeBlobJson } from "./privateBlob";
import { inDepartment } from "./doctorDepartments";
import type {
  Branch,
  ContentOverrides,
  Database,
  Department,
  Doctor,
  Offer,
  PageKey,
  Partner,
  LogoGroup,
  SiteSettings,
} from "./types";
import { DEFAULT_BRANCHES } from "./defaults";
import { migrate } from "./migrations";
import { DEFAULT_SOCIAL_LINKS } from "./social";

const SEED_PATH = path.join(process.cwd(), "data", "seed.json");
const LOCAL_DB_PATH = path.join(process.cwd(), "data", "db.local.json");
const TMP_DB_PATH = path.join(os.tmpdir(), "dentera-db.json");

// Where the data lives:
//
// - With Vercel Blob configured (production), the whole database is one
//   JSON blob at a fixed name. Serverless instances have no shared or
//   persistent disk, so this is what lets edits made in the control panel
//   stick and show up on every instance. It lives in the private store
//   (see lib/privateBlob.ts); without one, in the public store.
// - Without Blob (local development), it's a JSON file next to the source,
//   falling back to the OS temp dir if the project dir is read-only.
/** Name prefix of database versions saved the old way (see moveLegacyDb). */
const BLOB_DB_PREFIX = "data/dentera-db";
const DB_CACHE_TAG = "dentera-db";

function readSeed(): Database {
  return withDefaults(
    JSON.parse(fs.readFileSync(SEED_PATH, "utf-8")) as Database
  );
}

function withDefaults(db: Database): Database {
  if (!db.settings) db.settings = {};
  if (!db.settings.banners) db.settings.banners = {};
  // Carry the original single home banner over to the per-page banners.
  if (db.settings.bannerUrl && !db.settings.banners.home) {
    db.settings.banners.home = db.settings.bannerUrl;
  }
  delete db.settings.bannerUrl;
  if (!db.settings.social) db.settings.social = { ...DEFAULT_SOCIAL_LINKS };
  if (!db.partners) db.partners = [];
  if (!db.branches) db.branches = structuredClone(DEFAULT_BRANCHES);
  if (!db.content) db.content = {};
  if (!db.offers) db.offers = [];
  // The contact form (and its saved requests) was removed; booking is by
  // phone now. Drop any leftover requests so they aren't kept around.
  delete (db as Database & { inquiries?: unknown }).inquiries;
  return migrate(db);
}

// --- Blob backend ---
//
// The database is one file at a fixed name, read directly by name: no
// listing, which Vercel Blob counts as a costly operation. (It used to be
// saved under a new random name each time and found by listing; the first
// read after this change copies that version over once.)

type StoreOptions = ReturnType<typeof privateStore>;

const DB_PATH = "data/site-db.json";

/** Database versions saved the old way (random names), newest first. */
async function listLegacyDbBlobs(store: StoreOptions = null) {
  const { blobs } = await list({ prefix: BLOB_DB_PREFIX, ...store });
  return [...blobs].sort(
    (a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );
}

/**
 * One-time move: the latest database saved the old way (private store,
 * else public) is saved at the fixed name, then the old versions are
 * removed. Null when nothing was ever saved.
 */
async function moveLegacyDb(): Promise<Database | null> {
  const store = privateStore();
  let db: Database | null = null;
  const [privateLatest] = store ? await listLegacyDbBlobs(store) : [];
  if (privateLatest) {
    db = await readPrivateJson<Database>(privateLatest.pathname);
    if (!db) throw new Error("Failed to load the database from the private store");
  } else {
    const [publicLatest] = await listLegacyDbBlobs();
    if (publicLatest) {
      const response = await fetch(publicLatest.url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load database blob (${response.status})`);
      }
      db = (await response.json()) as Database;
    }
  }
  if (!db) return null;
  await putDbBlob(db);
  try {
    if (store) {
      const old = await listLegacyDbBlobs(store);
      if (old.length > 0) await del(old.map((b) => b.url), store);
    }
    const oldPublic = await listLegacyDbBlobs();
    if (oldPublic.length > 0) await del(oldPublic.map((b) => b.url));
  } catch (error) {
    console.error("Failed to remove the old database versions:", error);
  }
  return db;
}

/** The stored database exactly as saved (null when nothing is saved yet). */
async function readBlobDbRaw(): Promise<Database | null> {
  const saved = await readBlobJson<Database>(DB_PATH);
  return saved ? saved.data : moveLegacyDb();
}

// A build renders every page, and each reads the database: read it once
// per build instead of once per page.
let buildRead: Promise<Database | null> | null = null;
function readBlobDbRawOnce(): Promise<Database | null> {
  if (process.env.NEXT_PHASE !== "phase-production-build") return readBlobDbRaw();
  buildRead ??= readBlobDbRaw();
  return buildRead;
}

async function readBlobDb(): Promise<Database> {
  const raw = await readBlobDbRaw();
  return raw ? withDefaults(raw) : readSeed();
}

// Page renders read through Next's data cache, so the Blob store is only
// hit again after a save invalidates the tag (not on every page view).
// Only the raw saved data is cached: Vercel keeps this cache across
// deployments, so defaults and migrations must run after it, on every
// read, or a new deployment's data updates would never show up.
const readBlobDbRawCached = unstable_cache(readBlobDbRawOnce, [DB_CACHE_TAG, "raw", "fixed"], {
  tags: [DB_CACHE_TAG],
});

async function readBlobDbCached(): Promise<Database> {
  const raw = await readBlobDbRawCached();
  // Copy first: migrations edit in place and the cache may hand back a
  // shared object.
  return raw ? withDefaults(structuredClone(raw)) : readSeed();
}

/** Saves the database at its fixed name (private store when connected). */
async function putDbBlob(db: Database) {
  await writeBlobJson(DB_PATH, db);
}

async function writeBlobDb(db: Database): Promise<void> {
  await putDbBlob(db);
  revalidateTag(DB_CACHE_TAG);
}

// --- File backend (local development) ---

let resolvedDbPath: string | null = null;
let memoryDb: Database | null = null;

function resolveDbPath(): string {
  if (resolvedDbPath) return resolvedDbPath;
  try {
    fs.accessSync(path.dirname(LOCAL_DB_PATH), fs.constants.W_OK);
    resolvedDbPath = LOCAL_DB_PATH;
  } catch {
    resolvedDbPath = TMP_DB_PATH;
  }
  return resolvedDbPath;
}

function ensureDb(dbPath: string): void {
  if (fs.existsSync(dbPath)) return;
  const seed = fs.readFileSync(SEED_PATH, "utf-8");
  try {
    // Exclusive write ("wx"): fails instead of overwriting if the file
    // already exists. Next.js can statically render several pages
    // concurrently at build time, and they all call this on first run —
    // without this, two pages racing the existsSync check above could
    // both decide the file is missing and write it at once.
    fs.writeFileSync(dbPath, seed, { encoding: "utf-8", flag: "wx" });
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code !== "EEXIST") throw error;
    // Another concurrent caller already created it first — that's fine.
  }
}

function readFileDb(): Database {
  if (memoryDb) return memoryDb;
  try {
    const dbPath = resolveDbPath();
    ensureDb(dbPath);
    const raw = fs.readFileSync(dbPath, "utf-8");
    return withDefaults(JSON.parse(raw) as Database);
  } catch {
    // Filesystem is entirely unavailable for writing — keep an in-memory
    // copy so the app still renders instead of crashing the page.
    memoryDb = readSeed();
    return memoryDb;
  }
}

function writeFileDb(db: Database): void {
  try {
    fs.writeFileSync(resolveDbPath(), JSON.stringify(db, null, 2), "utf-8");
    memoryDb = null;
  } catch {
    // Can't persist to disk at all — keep the change in memory so it's at
    // least reflected for the rest of this server instance's lifetime.
    memoryDb = db;
  }
}

// --- Backend selection ---

/** Read for display (may be served from the data cache). */
async function readDb(): Promise<Database> {
  if (!isBlobConfigured()) return readFileDb();
  try {
    return await readBlobDbCached();
  } catch (error) {
    // Keep the public site up even if the store is briefly unreachable.
    console.error("Failed to read database from Vercel Blob:", error);
    return readSeed();
  }
}

/** Read the latest saved version, bypassing caches, before modifying it. */
async function readDbForWrite(): Promise<Database> {
  // No fallback here: saving on top of the seed after a failed read would
  // wipe everything saved so far, so a failed read must fail the save.
  return isBlobConfigured() ? readBlobDb() : readFileDb();
}

async function writeDb(db: Database): Promise<void> {
  if (isBlobConfigured()) await writeBlobDb(db);
  else writeFileDb(db);
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function uniqueId(base: string, existingIds: string[]): string {
  const baseSlug = slugify(base) || "item";
  let id = baseSlug;
  let counter = 2;
  while (existingIds.includes(id)) {
    id = `${baseSlug}-${counter}`;
    counter += 1;
  }
  return id;
}

// Departments

export async function getDepartments(): Promise<Department[]> {
  return (await readDb()).departments;
}

export async function getActiveDepartments(): Promise<Department[]> {
  return (await readDb()).departments.filter((d) => d.active);
}

export async function getDepartment(id: string): Promise<Department | undefined> {
  return (await readDb()).departments.find((d) => d.id === id);
}

export async function createDepartment(
  input: Omit<Department, "id">
): Promise<Department> {
  const db = await readDbForWrite();
  const id = uniqueId(
    input.nameEn,
    db.departments.map((d) => d.id)
  );
  const department: Department = { id, ...input };
  db.departments.push(department);
  await writeDb(db);
  return department;
}

export async function updateDepartment(
  id: string,
  input: Partial<Omit<Department, "id">>
): Promise<Department | undefined> {
  const db = await readDbForWrite();
  const index = db.departments.findIndex((d) => d.id === id);
  if (index === -1) return undefined;
  db.departments[index] = { ...db.departments[index], ...input };
  await writeDb(db);
  return db.departments[index];
}

export async function deleteDepartment(id: string): Promise<boolean> {
  const db = await readDbForWrite();
  const before = db.departments.length;
  db.departments = db.departments.filter((d) => d.id !== id);
  const removed = db.departments.length !== before;
  if (removed) await writeDb(db);
  return removed;
}

// Doctors

export async function getDoctors(): Promise<Doctor[]> {
  return (await readDb()).doctors;
}

export async function getActiveDoctors(): Promise<Doctor[]> {
  return (await readDb()).doctors.filter((d) => d.active);
}

export async function getDoctorsByDepartment(departmentId: string): Promise<Doctor[]> {
  return (await readDb()).doctors.filter(
    (d) => inDepartment(d, departmentId) && d.active
  );
}

export async function getDoctor(id: string): Promise<Doctor | undefined> {
  return (await readDb()).doctors.find((d) => d.id === id);
}

export async function createDoctor(input: Omit<Doctor, "id">): Promise<Doctor> {
  const db = await readDbForWrite();
  const id = uniqueId(
    input.nameEn,
    db.doctors.map((d) => d.id)
  );
  const doctor: Doctor = { id, ...input };
  db.doctors.push(doctor);
  await writeDb(db);
  return doctor;
}

export async function updateDoctor(
  id: string,
  input: Partial<Omit<Doctor, "id">>
): Promise<Doctor | undefined> {
  const db = await readDbForWrite();
  const index = db.doctors.findIndex((d) => d.id === id);
  if (index === -1) return undefined;
  db.doctors[index] = { ...db.doctors[index], ...input };
  await writeDb(db);
  return db.doctors[index];
}

export async function deleteDoctor(id: string): Promise<boolean> {
  const db = await readDbForWrite();
  const before = db.doctors.length;
  db.doctors = db.doctors.filter((d) => d.id !== id);
  const removed = db.doctors.length !== before;
  if (removed) await writeDb(db);
  return removed;
}

// Site settings

export async function getSettings(): Promise<SiteSettings> {
  return (await readDb()).settings;
}

export async function updateSettings(
  input: Partial<SiteSettings>
): Promise<SiteSettings> {
  const db = await readDbForWrite();
  db.settings = { ...db.settings, ...input };
  await writeDb(db);
  return db.settings;
}

export async function setPageBanner(
  page: PageKey,
  url: string | undefined,
  variant: "desktop" | "mobile" = "desktop"
): Promise<void> {
  const db = await readDbForWrite();
  const field = variant === "mobile" ? "mobileBanners" : "banners";
  const banners = { ...db.settings[field] };
  if (url) banners[page] = url;
  else delete banners[page];
  db.settings = { ...db.settings, [field]: banners };
  await writeDb(db);
}

// Partners

export async function getPartners(): Promise<Partner[]> {
  return (await readDb()).partners;
}

export async function getActivePartners(
  group: LogoGroup = "partners"
): Promise<Partner[]> {
  return (await readDb()).partners.filter(
    (p) => p.active && (p.group ?? "partners") === group
  );
}

export async function createPartner(
  input: Omit<Partner, "id">
): Promise<Partner> {
  const db = await readDbForWrite();
  const id = uniqueId(
    input.nameEn,
    db.partners.map((p) => p.id)
  );
  const partner: Partner = { id, ...input };
  db.partners.push(partner);
  await writeDb(db);
  return partner;
}

export async function updatePartner(
  id: string,
  input: Partial<Omit<Partner, "id">>
): Promise<Partner | undefined> {
  const db = await readDbForWrite();
  const index = db.partners.findIndex((p) => p.id === id);
  if (index === -1) return undefined;
  db.partners[index] = { ...db.partners[index], ...input };
  await writeDb(db);
  return db.partners[index];
}

/**
 * Puts one group's logos in the given order (ids). The group keeps the
 * same slots in the list, so the other groups don't move; logos missing
 * from `ids` stay after the ordered ones.
 */
export async function reorderPartners(group: LogoGroup, ids: string[]): Promise<void> {
  const db = await readDbForWrite();
  const inGroup = (p: Partner) => (p.group ?? "partners") === group;
  const rank = (p: Partner) => {
    const i = ids.indexOf(p.id);
    return i === -1 ? ids.length : i;
  };
  const sorted = db.partners.filter(inGroup).sort((a, b) => rank(a) - rank(b));
  let next = 0;
  db.partners = db.partners.map((p) => (inGroup(p) ? sorted[next++] : p));
  await writeDb(db);
}

export async function deletePartner(id: string): Promise<boolean> {
  const db = await readDbForWrite();
  const before = db.partners.length;
  db.partners = db.partners.filter((p) => p.id !== id);
  const removed = db.partners.length !== before;
  if (removed) await writeDb(db);
  return removed;
}

// Branches

export async function getBranches(): Promise<Branch[]> {
  return (await readDb()).branches;
}

export async function getActiveBranches(): Promise<Branch[]> {
  return (await readDb()).branches.filter((b) => b.active);
}

export async function createBranch(input: Omit<Branch, "id">): Promise<Branch> {
  const db = await readDbForWrite();
  const id = uniqueId(
    input.nameEn,
    db.branches.map((b) => b.id)
  );
  const branch: Branch = { id, ...input };
  db.branches.push(branch);
  await writeDb(db);
  return branch;
}

export async function updateBranch(
  id: string,
  input: Partial<Omit<Branch, "id">>
): Promise<Branch | undefined> {
  const db = await readDbForWrite();
  const index = db.branches.findIndex((b) => b.id === id);
  if (index === -1) return undefined;
  db.branches[index] = { ...db.branches[index], ...input };
  await writeDb(db);
  return db.branches[index];
}

export async function deleteBranch(id: string): Promise<boolean> {
  const db = await readDbForWrite();
  const before = db.branches.length;
  db.branches = db.branches.filter((b) => b.id !== id);
  const removed = db.branches.length !== before;
  if (removed) await writeDb(db);
  return removed;
}

// Site text overrides

export async function getContentOverrides(): Promise<ContentOverrides> {
  return (await readDb()).content;
}

/**
 * Save text overrides for some fields. A value equal to the built-in
 * default (or empty) removes the override, so the default shows again.
 */
export async function saveContentOverrides(
  values: { locale: "en" | "ar"; key: string; value: string; fallback: string }[]
): Promise<void> {
  const db = await readDbForWrite();
  const content: ContentOverrides = {
    en: { ...db.content.en },
    ar: { ...db.content.ar },
  };
  for (const { locale, key, value, fallback } of values) {
    const map = content[locale]!;
    if (!value.trim() || value === fallback) delete map[key];
    else map[key] = value;
  }
  db.content = content;
  await writeDb(db);
}

// Offers

/** Today's date in Saudi Arabia (YYYY-MM-DD), for offer expiry. */
function todayInRiyadh(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" });
}

export function isOfferExpired(offer: Offer): boolean {
  return Boolean(offer.endsAt && offer.endsAt < todayInRiyadh());
}

function byOrder(a: Offer, b: Offer): number {
  return (a.order ?? 0) - (b.order ?? 0);
}

export async function getOffers(): Promise<Offer[]> {
  return [...(await readDb()).offers].sort(byOrder);
}

/** Active offers that haven't ended, in display order. */
export async function getLiveOffers(): Promise<Offer[]> {
  return (await getOffers()).filter((o) => o.active && !isOfferExpired(o));
}

export async function getOffer(id: string): Promise<Offer | undefined> {
  return (await readDb()).offers.find((o) => o.id === id);
}

export async function createOffer(input: Omit<Offer, "id">): Promise<Offer> {
  const db = await readDbForWrite();
  const id = uniqueId(
    input.titleEn || "offer",
    db.offers.map((o) => o.id)
  );
  const offer: Offer = { id, ...input };
  db.offers.push(offer);
  await writeDb(db);
  return offer;
}

export async function updateOffer(
  id: string,
  input: Partial<Omit<Offer, "id">>
): Promise<Offer | undefined> {
  const db = await readDbForWrite();
  const index = db.offers.findIndex((o) => o.id === id);
  if (index === -1) return undefined;
  db.offers[index] = { ...db.offers[index], ...input };
  await writeDb(db);
  return db.offers[index];
}

export async function deleteOffer(id: string): Promise<boolean> {
  const db = await readDbForWrite();
  const before = db.offers.length;
  db.offers = db.offers.filter((o) => o.id !== id);
  const removed = db.offers.length !== before;
  if (removed) await writeDb(db);
  return removed;
}
