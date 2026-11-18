"use server";

import { headers } from "next/headers";
import {
  CERTIFICATE_TYPES,
  CV_TYPES,
  GENDERS,
  MAX_CERTIFICATES_BYTES,
  MAX_CV_BYTES,
  QUALIFICATIONS,
  SCFHS_STATUSES,
  changeCareers,
  findExclusion,
  hashIp,
  isSaudi,
  newCareersId,
  normalizeEmail,
  pruneCareers,
  readCareers,
  takeJobRef,
  type CareerApplication,
  type CareerFile,
  type Gender,
  type Qualification,
  type ScfhsStatus,
} from "./careers";
import { normalizeSaudiMobile } from "./bookings";
import { createDriveFolder, driveHealth, getDriveFile, sendToUpload, startUpload } from "./googleDrive";
import { SITE_URL } from "./seo";

// The careers page's actions (public). Sending an application:
// 1. startApplicationAction checks the answers, records the application
//    («uploading»), makes its Drive folder and returns an upload address
//    per file; 2. the browser sends the files to Google; 3.
//    finishApplicationAction checks they arrived and completes it.

/** At most this many applications per IP per hour. */
const RATE_LIMIT = 3;
/** Faster than this after the form was shown, it's a bot. */
const MIN_FILL_MS = 8000;
const SERVER_UPLOAD_LIMIT = 4 * 1024 * 1024;

export type StartInput = {
  name: string;
  gender: string;
  nationality: string;
  mobile: string;
  email?: string;
  city: string;
  birthDate?: string;
  fieldId: string;
  specialty?: string;
  languages?: string[];
  years: number | string;
  qualification: string;
  university?: string;
  gradYear?: number | string;
  scfhs?: string;
  licenseNo?: string;
  transfer?: string;
  linkedin?: string;
  note?: string;
  consent: boolean;
  cv: { name: string; type: string; size: number };
  certificates?: { name: string; type: string; size: number } | null;
  /** Honeypot (must stay empty) and when the form was shown. */
  website?: string;
  shownAt?: number;
};

export type StartResult =
  | { ok: true; id: string; uploads: { cv: string; certificates?: string } }
  | { ok: false; error: string; field?: string };

const clean = (v: unknown, max = 120) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

function clientIp(): string {
  const h = headers();
  return (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "local").split(",")[0].trim();
}

function browserOrigin(): string {
  const origin = headers().get("origin");
  if (origin && /^https?:\/\/[\w.-]+(:\d+)?$/.test(origin)) return origin;
  return SITE_URL;
}

function safeName(value: string): string {
  return value.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").slice(0, 100).trim() || "applicant";
}

export async function startApplicationAction(input: StartInput): Promise<StartResult> {
  // Bots: a hidden field people never fill, or sent too fast. They get a fake "ok".
  if (clean(input.website) || !input.shownAt || Date.now() - Number(input.shownAt) < MIN_FILL_MS) {
    return { ok: true, id: "", uploads: { cv: "" } };
  }
  const store = await readCareers();
  if (!store.settings.visible || !store.settings.open) return { ok: false, error: "closed" };
  if (!store.folders.parent || (await driveHealth()) !== "ok") return { ok: false, error: "unavailable" };

  // The answers
  const name = clean(input.name, 80);
  if (name.length < 5 || !name.includes(" ")) return { ok: false, error: "name", field: "name" };
  const gender = GENDERS.includes(input.gender as Gender) ? (input.gender as Gender) : null;
  if (!gender) return { ok: false, error: "gender", field: "gender" };
  const nationality = clean(input.nationality, 40);
  if (!nationality) return { ok: false, error: "nationality", field: "nationality" };
  const mobile = normalizeSaudiMobile(String(input.mobile ?? ""));
  if (!mobile) return { ok: false, error: "mobile", field: "mobile" };
  const email = normalizeEmail(clean(input.email, 120));
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, error: "email", field: "email" };
  const city = clean(input.city, 60);
  if (!city) return { ok: false, error: "city", field: "city" };
  const field = store.fields.find((f) => f.id === input.fieldId && !f.hidden);
  if (!field) return { ok: false, error: "field", field: "fieldId" };
  const years = Math.floor(Number(input.years));
  if (!(years >= 0 && years <= 60)) return { ok: false, error: "years", field: "years" };
  const qualification = QUALIFICATIONS.includes(input.qualification as Qualification) ? (input.qualification as Qualification) : null;
  if (!qualification) return { ok: false, error: "qualification", field: "qualification" };
  const scfhs: ScfhsStatus = field.clinical
    ? SCFHS_STATUSES.includes(input.scfhs as ScfhsStatus)
      ? (input.scfhs as ScfhsStatus)
      : ("" as ScfhsStatus)
    : "na";
  if (!scfhs) return { ok: false, error: "scfhs", field: "scfhs" };
  if (!input.consent) return { ok: false, error: "consent", field: "consent" };
  const cv = input.cv;
  if (!cv || !CV_TYPES[cv.type] || !(cv.size > 0 && cv.size <= MAX_CV_BYTES)) return { ok: false, error: "cv", field: "cv" };
  const cert = input.certificates || null;
  if (cert && (!CERTIFICATE_TYPES[cert.type] || !(cert.size > 0 && cert.size <= MAX_CERTIFICATES_BYTES))) {
    return { ok: false, error: "certificates", field: "certificates" };
  }
  const birthDate = /^\d{4}-\d{2}-\d{2}$/.test(String(input.birthDate ?? "")) ? String(input.birthDate) : undefined;
  const gradYear = Number(input.gradYear);
  const linkedin = clean(input.linkedin, 200);

  // Rate limit, by hashed IP
  const ip = hashIp(clientIp());
  const hourAgo = Date.now() - 3600 * 1000;
  if (store.recent.filter((r) => r.ip === ip && r.at > hourAgo).length >= RATE_LIMIT) return { ok: false, error: "rate" };

  const id = newCareersId();
  const fileMeta = (f: { name: string; type: string; size: number }): CareerFile => ({
    name: clean(f.name, 120) || "file",
    mimeType: f.type,
    size: f.size,
  });
  const app: CareerApplication = {
    id,
    ref: "",
    createdAt: new Date().toISOString(),
    status: "uploading",
    name,
    gender,
    nationality,
    mobile,
    email,
    city,
    birthDate,
    fieldId: field.id,
    specialty: field.specialty ? clean(input.specialty, 80) || undefined : undefined,
    languages: (Array.isArray(input.languages) ? input.languages : []).map((l) => clean(l, 30)).filter(Boolean).slice(0, 8),
    years,
    qualification,
    university: clean(input.university, 100) || undefined,
    gradYear: gradYear >= 1960 && gradYear <= 2100 ? gradYear : undefined,
    scfhs,
    licenseNo: field.clinical ? clean(input.licenseNo, 40) || undefined : undefined,
    transfer: !isSaudi(nationality) && (input.transfer === "yes" || input.transfer === "no") ? input.transfer : undefined,
    linkedin: /^https?:\/\//i.test(linkedin) ? linkedin : undefined,
    note: String(input.note ?? "").trim().slice(0, 1500) || undefined,
    files: { cv: fileMeta(cv), certificates: cert ? fileMeta(cert) : undefined },
    stage: "new",
    tags: [],
    notes: [],
    history: [],
    ipHash: ip,
  };

  try {
    // The field's folder (made once), then the applicant's own folder.
    let fieldFolder = store.folders.byField?.[field.id];
    if (!fieldFolder) {
      const made = await createDriveFolder(field.nameAr, store.folders.parent);
      fieldFolder = await changeCareers((file) => {
        const existing = file.folders.byField?.[field.id];
        if (existing) return { next: null, result: existing };
        return {
          next: { ...file, folders: { ...file.folders, byField: { ...(file.folders.byField ?? {}), [field.id]: made } } },
          result: made,
        };
      });
    }
    const saved = await changeCareers((file) => {
      const counters = { ...file.counters };
      const ref = takeJobRef(counters);
      const match = findExclusion(file.exclusions, { mobile, email });
      const record: CareerApplication = {
        ...app,
        ref,
        excluded: match ? { at: app.createdAt, by: "system", reason: match.reason, auto: true } : undefined,
      };
      const next = pruneCareers({ ...file, counters, applications: [...file.applications, record], recent: [...file.recent, { ip, at: Date.now() }] });
      return { next, result: record };
    });
    const folder = await createDriveFolder(safeName(`${saved.ref} - ${name}`), fieldFolder);
    await changeCareers((file) => ({
      next: { ...file, applications: file.applications.map((a) => (a.id === id ? { ...a, driveFolderId: folder } : a)) },
      result: null,
    }));
    const origin = browserOrigin();
    const ext = (type: string, map: Record<string, string>) => map[type] ?? "";
    const cvUrl = await startUpload({
      folderId: folder,
      name: `${safeName(`${saved.ref} - ${name}`)} - السيرة الذاتية${ext(cv.type, CV_TYPES)}`,
      mimeType: cv.type,
      size: cv.size,
      origin,
    });
    const certUrl = cert
      ? await startUpload({
          folderId: folder,
          name: `${safeName(`${saved.ref} - ${name}`)} - الشهادات والاعتمادات.pdf`,
          mimeType: cert.type,
          size: cert.size,
          origin,
        })
      : undefined;
    return { ok: true, id, uploads: { cv: cvUrl, certificates: certUrl } };
  } catch (error) {
    console.error("careers: start failed", error);
    return { ok: false, error: "server" };
  }
}

/** Checks a file landed in the application's folder with the size declared. */
async function checkUploaded(fileId: string, folder: string | undefined, size: number) {
  const file = await getDriveFile(String(fileId ?? "")).catch(() => null);
  if (!file || !folder || !file.parents?.includes(folder)) return null;
  if (file.size && Number(file.size) !== size) return null;
  return file;
}

/** Completes an application once its files are in Drive. Returns its reference. */
export async function finishApplicationAction(input: {
  id: string;
  cv: string;
  certificates?: string;
}): Promise<{ ok: true; ref: string } | { ok: false }> {
  const store = await readCareers();
  const app = store.applications.find((a) => a.id === input.id && a.status === "uploading");
  if (!app || Date.now() - Date.parse(app.createdAt) > 3600 * 1000) return { ok: false };
  const cv = await checkUploaded(input.cv, app.driveFolderId, app.files.cv?.size ?? -1);
  if (!cv) return { ok: false };
  const cert = app.files.certificates && input.certificates
    ? await checkUploaded(input.certificates, app.driveFolderId, app.files.certificates.size)
    : null;
  const ref = await changeCareers((file) => {
    const index = file.applications.findIndex((a) => a.id === input.id && a.status === "uploading");
    if (index === -1) return { next: null, result: null };
    const applications = [...file.applications];
    const current = applications[index];
    applications[index] = {
      ...current,
      status: "done",
      files: {
        cv: current.files.cv ? { ...current.files.cv, driveFileId: cv.id, link: cv.webViewLink } : undefined,
        certificates:
          current.files.certificates && cert
            ? { ...current.files.certificates, driveFileId: cert.id, link: cert.webViewLink }
            : undefined,
      },
    };
    return { next: { ...file, applications }, result: current.ref };
  });
  return ref ? { ok: true, ref } : { ok: false };
}

/** Fallback when the browser can't reach Google: the file goes through the site (up to 4 MB). */
export async function uploadApplicationFileAction(form: FormData): Promise<{ ok: true; fileId: string } | { ok: false }> {
  const id = clean(form.get("id"), 40);
  const kind = clean(form.get("kind"), 20) as "cv" | "certificates";
  const file = form.get("file");
  if (!(file instanceof File) || file.size > SERVER_UPLOAD_LIMIT || (kind !== "cv" && kind !== "certificates")) return { ok: false };
  const app = (await readCareers()).applications.find((a) => a.id === id && a.status === "uploading");
  const meta = app?.files[kind];
  if (!app || !meta || !app.driveFolderId || meta.size !== file.size || meta.mimeType !== file.type) return { ok: false };
  try {
    const session = await startUpload({
      folderId: app.driveFolderId,
      name: `${safeName(`${app.ref} - ${app.name}`)} - ${kind === "cv" ? "السيرة الذاتية" : "الشهادات والاعتمادات"}${
        (kind === "cv" ? CV_TYPES : CERTIFICATE_TYPES)[file.type] ?? ""
      }`,
      mimeType: file.type,
      size: file.size,
    });
    const saved = await sendToUpload(session, await file.arrayBuffer(), file.type);
    return { ok: true, fileId: saved.id };
  } catch {
    return { ok: false };
  }
}
