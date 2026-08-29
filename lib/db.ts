import fs from "node:fs";
import path from "node:path";
import type { Database, Department, Doctor } from "./types";

const SEED_PATH = path.join(process.cwd(), "data", "seed.json");
const DB_PATH = path.join(process.cwd(), "data", "db.local.json");

function ensureDb(): void {
  if (!fs.existsSync(DB_PATH)) {
    const seed = fs.readFileSync(SEED_PATH, "utf-8");
    fs.writeFileSync(DB_PATH, seed, "utf-8");
  }
}

function readDb(): Database {
  ensureDb();
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(raw) as Database;
}

function writeDb(db: Database): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
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
