"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, sessionUser, type AdminUser } from "./auth";
import { canUseSection } from "./adminRoles";
import { defaultLocale, isLocale, localePath } from "./i18n";
import { logActivity } from "./activity";
import {
  FINANCE_BRANCHES,
  SPECIALTIES,
  importReportFile,
  newShareKey,
  readFinanceSettings,
  rebuildAllMonths,
  recordRun,
  saveFinanceSettings,
  type FinanceBranch,
  type Specialty,
} from "./finance";

// Control Panel → الأداء المالي (the admin and the finance account): manual
// report uploads, targets, partners, doctors' specialties; the share link is
// the admin's only.

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

async function requireFinance(): Promise<AdminUser> {
  const user = await sessionUser(cookies().get(SESSION_COOKIE)?.value);
  if (!user || !canUseSection(user, "/finance")) throw new Error("Unauthorized");
  return user;
}

async function requireAdminOnly(): Promise<AdminUser> {
  const user = await sessionUser(cookies().get(SESSION_COOKIE)?.value);
  if (user !== "admin") throw new Error("Unauthorized");
  return user;
}

const str = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();
const settingsPage = (formData: FormData, query = "") => {
  const locale = str(formData, "locale");
  return localePath(isLocale(locale) ? locale : defaultLocale, `/admin/finance?tab=settings${query}`);
};
const numberOf = (text: string) => Number(text.replace(/[,\s٬]/g, "").replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))));

/** Lines like «key = value» (or «key: value», tab-separated). */
function pairs(text: string): [string, string][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.split(/\s*(?:=|:|\t)\s*/))
    .filter((p) => p.length >= 2 && p[0].trim() && p.slice(1).join(" ").trim())
    .map((p) => [p[0].trim(), p.slice(1).join(" ").trim()]);
}

/** Uploads one or more PMS report files (the robot's fallback). */
export async function uploadFinanceReportsAction(formData: FormData) {
  const user = await requireFinance();
  const branchText = str(formData, "branch");
  const branch = FINANCE_BRANCHES.includes(branchText as FinanceBranch) ? (branchText as FinanceBranch) : undefined;
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const results: string[] = [];
  let ok = 0;
  for (const file of files.slice(0, 12)) {
    if (file.size > MAX_UPLOAD_BYTES) {
      results.push("size");
      continue;
    }
    try {
      const result = await importReportFile(new Uint8Array(await file.arrayBuffer()), file.name, branch);
      if (result.ok) ok++;
      results.push(result.ok ? `${result.kind}:${result.rows}` : "unknown");
    } catch (error) {
      console.error("finance upload:", error);
      results.push("error");
    }
  }
  await recordRun({ at: new Date().toISOString(), ok: ok > 0 && ok === files.length, source: "upload", note: results.join(" ") });
  await logActivity(user, "/finance", "import", `${ok}/${files.length}`);
  revalidatePath("/", "layout");
  redirect(settingsPage(formData, `&imported=${encodeURIComponent(results.join(","))}`));
}

/** Yearly targets, month overrides, partners and doctors' specialties. */
export async function saveFinanceSettingsAction(formData: FormData) {
  const user = await requireFinance();
  const settings = await readFinanceSettings();

  const yearTargets: Record<string, number> = { ...settings.yearTargets };
  for (const [name, value] of formData.entries()) {
    const year = /^year-(\d{4})$/.exec(name)?.[1];
    if (!year) continue;
    const n = numberOf(String(value));
    if (Number.isFinite(n) && n > 0) yearTargets[year] = Math.round(n);
  }

  const monthTargets: Record<string, number> = {};
  for (const [month, value] of pairs(str(formData, "monthTargets"))) {
    const n = numberOf(value);
    if (/^\d{4}-\d{2}$/.test(month) && Number.isFinite(n) && n > 0) monthTargets[month] = Math.round(n);
  }

  const partners = str(formData, "partners")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);

  const doctorSpecialty: Record<string, Specialty> = {};
  for (const [doctor, value] of pairs(str(formData, "doctorSpecialty"))) {
    const s = value.toLowerCase() as Specialty;
    if (SPECIALTIES.includes(s)) doctorSpecialty[doctor] = s;
  }
  const specialtiesChanged = JSON.stringify(doctorSpecialty) !== JSON.stringify(settings.doctorSpecialty);

  await saveFinanceSettings({ ...settings, yearTargets, monthTargets, partners, doctorSpecialty });
  if (specialtiesChanged) await rebuildAllMonths();
  await logActivity(user, "/finance", "settings");
  revalidatePath("/", "layout");
  redirect(settingsPage(formData, "&saved=1"));
}

/** Creates (or replaces) the private view link. */
export async function createFinanceShareKeyAction() {
  const user = await requireAdminOnly();
  const settings = await readFinanceSettings();
  await saveFinanceSettings({ ...settings, shareKey: newShareKey() });
  await logActivity(user, "/finance", "link");
  revalidatePath("/", "layout");
}

/** Revokes the private view link. */
export async function revokeFinanceShareKeyAction() {
  const user = await requireAdminOnly();
  const settings = await readFinanceSettings();
  await saveFinanceSettings({ ...settings, shareKey: undefined });
  await logActivity(user, "/finance", "delete", "link");
  revalidatePath("/", "layout");
}
