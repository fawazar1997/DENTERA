"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, sessionUser, type AdminUser } from "./auth";
import { canUseSection } from "./adminRoles";
import { defaultLocale, isLocale, localePath } from "./i18n";
import { logActivity } from "./activity";
import {
  CAREER_STAGES,
  QUALIFICATIONS,
  changeCareers,
  defaultCriteria,
  newCareersId,
  normalizeEmail,
  readCareers,
  type CareerApplication,
  type CareerField,
  type CareerStage,
  type CareersFile,
  type Qualification,
} from "./careers";
import { checkDriveFolder, driveHealth, driveIdFromLink } from "./googleDrive";

// Control Panel → التوظيف (the admin and the HR account).

async function requireCareers(): Promise<AdminUser> {
  const user = await sessionUser(cookies().get(SESSION_COOKIE)?.value);
  if (!user || !canUseSection(user, "/careers")) throw new Error("Unauthorized");
  return user;
}

const str = (form: FormData, key: string, max = 200) =>
  String(form.get(key) ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const list = (value: string) =>
  value
    .split(/[,،\n]/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 20);

function back(form: FormData, query = ""): never {
  const locale = str(form, "locale");
  const ret = str(form, "return", 1500);
  // Back to the list with its filters, or the given place.
  const target = ret.startsWith("?") ? ret.slice(1) : query;
  redirect(localePath(isLocale(locale) ? locale : defaultLocale, `/admin/careers${target ? `?${target}` : ""}`));
}

function refresh() {
  revalidatePath("/", "layout");
}

/** Changes one application by id. */
async function changeApplication(id: string, change: (app: CareerApplication, file: CareersFile) => CareerApplication | null) {
  return changeCareers((file) => {
    const index = file.applications.findIndex((a) => a.id === id && a.status === "done");
    if (index === -1) return { next: null, result: null };
    const next = change(file.applications[index], file);
    if (!next) return { next: null, result: null };
    const applications = [...file.applications];
    applications[index] = next;
    return { next: { ...file, applications }, result: next };
  });
}

// --- Settings ---

export async function setCareersFolderAction(form: FormData) {
  const user = await requireCareers();
  const id = driveIdFromLink(str(form, "folder", 400));
  if (!id || (await driveHealth()) !== "ok") back(form, "tab=settings&error=folder");
  const name = await checkDriveFolder(id);
  if (name === null) back(form, "tab=settings&error=folder");
  await changeCareers((file) => ({
    next: { ...file, folders: file.folders.parent === id ? file.folders : { parent: id, parentName: name, byField: {} } },
    result: null,
  }));
  await logActivity(user, "/careers", "settings", name || id);
  refresh();
  back(form, "tab=settings&saved=1");
}

export async function setCareersSettingsAction(form: FormData) {
  const user = await requireCareers();
  const visible = form.get("visible") === "on";
  const open = form.get("open") === "on";
  const intro = String(form.get("intro") ?? "").trim().slice(0, 600) || undefined;
  await changeCareers((file) => ({ next: { ...file, settings: { visible, open, intro } }, result: null }));
  await logActivity(user, "/careers", "settings", `صفحة التوظيف: ${visible ? "ظاهرة" : "مخفية"}، ${open ? "مفتوحة" : "مغلقة"}`);
  refresh();
  back(form, "tab=settings&saved=1");
}

function fieldFromForm(form: FormData, base?: CareerField): CareerField {
  const num = (key: string, min: number, max: number) => {
    const raw = str(form, key, 10);
    if (raw === "") return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : undefined;
  };
  const clinical = form.get("clinical") === "on";
  const q = str(form, "minQualification") as Qualification;
  const criteria = base?.criteria ?? defaultCriteria(clinical);
  return {
    id: base?.id ?? newCareersId().slice(0, 10),
    nameAr: str(form, "nameAr", 80),
    nameEn: str(form, "nameEn", 80) || str(form, "nameAr", 80),
    clinical,
    specialty: form.get("specialty") === "on",
    hidden: form.get("hidden") === "on" || undefined,
    criteria: {
      required: {
        minYears: num("minYears", 0, 40),
        minQualification: QUALIFICATIONS.includes(q) ? q : undefined,
        scfhs: clinical && form.get("reqScfhs") === "on" ? true : undefined,
        saudiOnly: form.get("saudiOnly") === "on" || undefined,
        cities: list(str(form, "cities", 400)),
      },
      weights: {
        experience: num("wExperience", 0, 100) ?? criteria.weights.experience,
        qualification: num("wQualification", 0, 100) ?? criteria.weights.qualification,
        scfhs: clinical ? num("wScfhs", 0, 100) ?? criteria.weights.scfhs : 0,
        city: num("wCity", 0, 100) ?? criteria.weights.city,
        languages: num("wLanguages", 0, 100) ?? criteria.weights.languages,
      },
      experienceCap: num("experienceCap", 1, 40) ?? criteria.experienceCap,
      preferredCities: list(str(form, "preferredCities", 400)),
      preferredLanguages: list(str(form, "preferredLanguages", 400)),
    },
  };
}

export async function saveCareerFieldAction(form: FormData) {
  const user = await requireCareers();
  const id = str(form, "id");
  if (!str(form, "nameAr")) back(form, "tab=settings&error=field");
  const name = await changeCareers((file) => {
    const index = file.fields.findIndex((f) => f.id === id);
    const field = fieldFromForm(form, index === -1 ? undefined : file.fields[index]);
    const fields = [...file.fields];
    if (index === -1) fields.push(field);
    else fields[index] = field;
    return { next: { ...file, fields }, result: field.nameAr };
  });
  await logActivity(user, "/careers", id ? "update" : "create", `مجال: ${name}`);
  refresh();
  back(form, `tab=settings&saved=1#field-${id}`);
}

export async function moveCareerFieldAction(form: FormData) {
  await requireCareers();
  const id = str(form, "id");
  const by = str(form, "dir") === "up" ? -1 : 1;
  await changeCareers((file) => {
    const i = file.fields.findIndex((f) => f.id === id);
    const j = i + by;
    if (i === -1 || j < 0 || j >= file.fields.length) return { next: null, result: null };
    const fields = [...file.fields];
    [fields[i], fields[j]] = [fields[j], fields[i]];
    return { next: { ...file, fields }, result: null };
  });
  refresh();
  back(form, "tab=settings");
}

export async function deleteCareerFieldAction(form: FormData) {
  const user = await requireCareers();
  const id = str(form, "id");
  const name = await changeCareers((file) => {
    const field = file.fields.find((f) => f.id === id);
    if (!field || file.applications.some((a) => a.fieldId === id)) return { next: null, result: null };
    return { next: { ...file, fields: file.fields.filter((f) => f.id !== id) }, result: field.nameAr };
  });
  if (!name) back(form, "tab=settings&error=in-use");
  await logActivity(user, "/careers", "delete", `مجال: ${name}`);
  refresh();
  back(form, "tab=settings");
}

// --- One applicant ---

export async function setStageAction(form: FormData) {
  const user = await requireCareers();
  const id = str(form, "id");
  const stage = str(form, "stage") as CareerStage;
  if (!CAREER_STAGES.includes(stage)) back(form);
  const interview = str(form, "interviewAt", 20);
  const app = await changeApplication(id, (a) => ({
    ...a,
    stage,
    interviewAt: stage === "interview" ? interview || a.interviewAt : a.interviewAt,
    history: a.stage === stage ? a.history : [...a.history, { stage, at: new Date().toISOString(), by: user }],
  }));
  if (app) await logActivity(user, "/careers", "update", `${app.ref} — ${app.name}`);
  refresh();
  back(form, `applicant=${id}`);
}

export async function setRatingAction(form: FormData) {
  await requireCareers();
  const id = str(form, "id");
  const rating = Math.min(5, Math.max(0, Math.round(Number(str(form, "rating", 2)) || 0)));
  await changeApplication(id, (a) => ({ ...a, rating: rating || undefined }));
  refresh();
  back(form, `applicant=${id}`);
}

export async function addTagAction(form: FormData) {
  await requireCareers();
  const id = str(form, "id");
  const tag = str(form, "tag", 30);
  if (tag) await changeApplication(id, (a) => (a.tags.includes(tag) ? null : { ...a, tags: [...a.tags, tag] }));
  refresh();
  back(form, `applicant=${id}`);
}

export async function removeTagAction(form: FormData) {
  await requireCareers();
  const id = str(form, "id");
  const tag = str(form, "tag", 30);
  await changeApplication(id, (a) => ({ ...a, tags: a.tags.filter((t) => t !== tag) }));
  refresh();
  back(form, `applicant=${id}`);
}

export async function addNoteAction(form: FormData) {
  const user = await requireCareers();
  const id = str(form, "id");
  const text = String(form.get("text") ?? "").trim().slice(0, 2000);
  if (text) {
    const app = await changeApplication(id, (a) => ({ ...a, notes: [...a.notes, { by: user, at: new Date().toISOString(), text }] }));
    if (app) await logActivity(user, "/careers", "update", `${app.ref} — ملاحظة`);
  }
  refresh();
  back(form, `applicant=${id}`);
}

/** Excludes applicants and puts their mobile and email on the exclusion list. */
async function exclude(ids: string[], reason: string, user: AdminUser) {
  return changeCareers((file) => {
    const now = new Date().toISOString();
    const exclusions = [...file.exclusions];
    const names: string[] = [];
    const applications = file.applications.map((a) => {
      if (!ids.includes(a.id) || a.status !== "done") return a;
      names.push(`${a.ref} — ${a.name}`);
      const email = normalizeEmail(a.email);
      if (!exclusions.some((e) => e.mobile === a.mobile || (email && e.email === email))) {
        exclusions.push({ id: newCareersId(), name: a.name, mobile: a.mobile, email, reason, at: now, by: user });
      }
      return { ...a, excluded: { at: now, by: user, reason } };
    });
    return { next: names.length ? { ...file, applications, exclusions } : null, result: names };
  });
}

export async function excludeAction(form: FormData) {
  const user = await requireCareers();
  const id = str(form, "id");
  const names = await exclude([id], str(form, "reason", 300) || "—", user);
  for (const n of names) await logActivity(user, "/careers", "update", `استبعاد: ${n}`);
  refresh();
  back(form, `applicant=${id}`);
}

/** Undoes an exclusion (and takes the person off the exclusion list). */
export async function unexcludeAction(form: FormData) {
  const user = await requireCareers();
  const id = str(form, "id");
  const app = await changeCareers((file) => {
    const a = file.applications.find((x) => x.id === id);
    if (!a?.excluded) return { next: null, result: null };
    const email = normalizeEmail(a.email);
    return {
      next: {
        ...file,
        applications: file.applications.map((x) => (x.id === id ? { ...x, excluded: undefined } : x)),
        exclusions: file.exclusions.filter((e) => e.mobile !== a.mobile && !(email && e.email === email)),
      },
      result: a,
    };
  });
  if (app) await logActivity(user, "/careers", "update", `إلغاء الاستبعاد: ${app.ref} — ${app.name}`);
  refresh();
  back(form, `applicant=${id}`);
}

export async function deleteApplicationAction(form: FormData) {
  const user = await requireCareers();
  const id = str(form, "id");
  const app = await changeCareers((file) => {
    const a = file.applications.find((x) => x.id === id);
    return a ? { next: { ...file, applications: file.applications.filter((x) => x.id !== id) }, result: a } : { next: null, result: null };
  });
  if (app) await logActivity(user, "/careers", "delete", `${app.ref} — ${app.name}`);
  refresh();
  back(form);
}

// --- Several at once (from the list) ---

export async function bulkAction(form: FormData) {
  const user = await requireCareers();
  const ids = form.getAll("ids").map(String).slice(0, 500);
  const action = str(form, "bulk");
  if (!ids.length) back(form);
  if (action.startsWith("stage:")) {
    const stage = action.slice(6) as CareerStage;
    if (CAREER_STAGES.includes(stage)) {
      const now = new Date().toISOString();
      const count = await changeCareers((file) => {
        let n = 0;
        const applications = file.applications.map((a) => {
          if (!ids.includes(a.id) || a.stage === stage) return a;
          n++;
          return { ...a, stage, history: [...a.history, { stage, at: now, by: user }] };
        });
        return { next: n ? { ...file, applications } : null, result: n };
      });
      if (count) await logActivity(user, "/careers", "update", `نقل ${count} متقدم إلى مرحلة`);
    }
  } else if (action === "tag") {
    const tag = str(form, "bulkTag", 30);
    if (tag) {
      await changeCareers((file) => ({
        next: {
          ...file,
          applications: file.applications.map((a) => (ids.includes(a.id) && !a.tags.includes(tag) ? { ...a, tags: [...a.tags, tag] } : a)),
        },
        result: null,
      }));
    }
  } else if (action === "exclude") {
    const names = await exclude(ids, str(form, "bulkReason", 300) || "—", user);
    if (names.length) await logActivity(user, "/careers", "update", `استبعاد ${names.length} متقدم`);
  }
  refresh();
  back(form);
}

// --- Exclusion list ---

export async function addExclusionAction(form: FormData) {
  const user = await requireCareers();
  const { normalizeSaudiMobile } = await import("./bookings");
  const mobile = normalizeSaudiMobile(str(form, "mobile", 30)) ?? undefined;
  const email = normalizeEmail(str(form, "email", 120));
  const name = str(form, "name", 80);
  if (!mobile && !email) back(form, "tab=exclusions&error=1");
  await changeCareers((file) => ({
    next: {
      ...file,
      exclusions: [...file.exclusions, { id: newCareersId(), name: name || "—", mobile, email, reason: str(form, "reason", 300) || "—", at: new Date().toISOString(), by: user }],
    },
    result: null,
  }));
  await logActivity(user, "/careers", "create", `قائمة الاستبعاد: ${name || mobile || email}`);
  refresh();
  back(form, "tab=exclusions");
}

export async function removeExclusionAction(form: FormData) {
  const user = await requireCareers();
  const id = str(form, "id");
  const entry = (await readCareers()).exclusions.find((e) => e.id === id);
  await changeCareers((file) => ({ next: { ...file, exclusions: file.exclusions.filter((e) => e.id !== id) }, result: null }));
  if (entry) await logActivity(user, "/careers", "delete", `قائمة الاستبعاد: ${entry.name}`);
  refresh();
  back(form, "tab=exclusions");
}
