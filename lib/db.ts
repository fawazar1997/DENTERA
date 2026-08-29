import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { Database, Department, Doctor, SiteSettings } from "./types";

const SEED_PATH = path.join(process.cwd(), "data", "seed.json");
const LOCAL_DB_PATH = path.join(process.cwd(), "data", "db.local.json");
const TMP_DB_PATH = path.join(os.tmpdir(), "dentera-db.json");

// On a normal server the project directory is writable, so we persist
// changes next to the source (survives restarts). On a read-only
// deployment (e.g. Vercel's serverless functions) that directory can't be
// written to, so we fall back to the OS temp dir. That's still writable at
// runtime, just not shared across instances or persisted across deploys —
// see README "Known limitations" for the real fix (a proper database).
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
  if (!fs.existsSync(dbPath)) {
    const seed = fs.readFileSync(SEED_PATH, "utf-8");
    fs.writeFileSync(dbPath, seed, "utf-8");
  }
}

function withDefaults(db: Database): Database {
  if (!db.settings) db.settings = {};
  return db;
}

function readDb(): Database {
  if (memoryDb) return memoryDb;
  try {
    const dbPath = resolveDbPath();
    ensureDb(dbPath);
    const raw = fs.readFileSync(dbPath, "utf-8");
    return withDefaults(JSON.parse(raw) as Database);
  } catch {
    // Filesystem is entirely unavailable for writing — keep an in-memory
    // copy so the app still renders instead of crashing the page.
    const seed = fs.readFileSync(SEED_PATH, "utf-8");
    memoryDb = withDefaults(JSON.parse(seed) as Database);
    return memoryDb;
  }
}

function writeDb(db: Database): void {
  try {
    fs.writeFileSync(resolveDbPath(), JSON.stringify(db, null, 2), "utf-8");
    memoryDb = null;
  } catch {
    // Can't persist to disk at all — keep the change in memory so it's at
    // least reflected for the rest of this server instance's lifetime.
    memoryDb = db;
  }
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

export function getDepartments(): Department[] {
  return readDb().departments;
}

export function getActiveDepartments(): Department[] {
  return readDb().departments.filter((d) => d.active);
}

export function getDepartment(id: string): Department | undefined {
  return readDb().departments.find((d) => d.id === id);
}

export function createDepartment(
  input: Omit<Department, "id">
): Department {
  const db = readDb();
  const id = uniqueId(
    input.nameEn,
    db.departments.map((d) => d.id)
  );
  const department: Department = { id, ...input };
  db.departments.push(department);
  writeDb(db);
  return department;
}

export function updateDepartment(
  id: string,
  input: Partial<Omit<Department, "id">>
): Department | undefined {
  const db = readDb();
  const index = db.departments.findIndex((d) => d.id === id);
  if (index === -1) return undefined;
  db.departments[index] = { ...db.departments[index], ...input };
  writeDb(db);
  return db.departments[index];
}

export function deleteDepartment(id: string): boolean {
  const db = readDb();
  const before = db.departments.length;
  db.departments = db.departments.filter((d) => d.id !== id);
  const removed = db.departments.length !== before;
  if (removed) writeDb(db);
  return removed;
}

// Doctors

export function getDoctors(): Doctor[] {
  return readDb().doctors;
}

export function getActiveDoctors(): Doctor[] {
  return readDb().doctors.filter((d) => d.active);
}

export function getDoctorsByDepartment(departmentId: string): Doctor[] {
  return readDb().doctors.filter(
    (d) => d.departmentId === departmentId && d.active
  );
}

export function getDoctor(id: string): Doctor | undefined {
  return readDb().doctors.find((d) => d.id === id);
}

export function createDoctor(input: Omit<Doctor, "id">): Doctor {
  const db = readDb();
  const id = uniqueId(
    input.nameEn,
    db.doctors.map((d) => d.id)
  );
  const doctor: Doctor = { id, ...input };
  db.doctors.push(doctor);
  writeDb(db);
  return doctor;
}

export function updateDoctor(
  id: string,
  input: Partial<Omit<Doctor, "id">>
): Doctor | undefined {
  const db = readDb();
  const index = db.doctors.findIndex((d) => d.id === id);
  if (index === -1) return undefined;
  db.doctors[index] = { ...db.doctors[index], ...input };
  writeDb(db);
  return db.doctors[index];
}

export function deleteDoctor(id: string): boolean {
  const db = readDb();
  const before = db.doctors.length;
  db.doctors = db.doctors.filter((d) => d.id !== id);
  const removed = db.doctors.length !== before;
  if (removed) writeDb(db);
  return removed;
}

// Site settings

export function getSettings(): SiteSettings {
  return readDb().settings;
}

export function updateSettings(input: Partial<SiteSettings>): SiteSettings {
  const db = readDb();
  db.settings = { ...db.settings, ...input };
  writeDb(db);
  return db.settings;
}
