"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, sessionUser } from "./auth";
import { canUseSection } from "./adminRoles";
import { defaultLocale, isLocale, localePath } from "./i18n";
import { logActivity } from "./activity";
import { readOpsSettings, saveOpsSettings } from "./opsData";
import { KPI_KEYS, type KpiKey } from "./opsMetrics";

// Control Panel → الأداء التشغيلي → إعدادات التشغيل (the admin and the finance account).

const num = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(/[,\s٬%]/g, "").replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))));
  return Number.isFinite(n) && String(v ?? "").trim() !== "" ? n : null;
};
/** Ratios are entered as percentages; amounts in riyals. */
const PERCENT: KpiKey[] = ["newPct", "attendance", "noShow", "discountPct"];

export async function saveOpsSettingsAction(formData: FormData) {
  const user = await sessionUser(cookies().get(SESSION_COOKIE)?.value);
  if (!user || !canUseSection(user, "/operations")) throw new Error("Unauthorized");
  const settings = await readOpsSettings();
  const chairs: typeof settings.chairs = {};
  for (const b of ["abha", "khamis"] as const) {
    const n = num(formData.get(`chairs-${b}`));
    if (n !== null && n > 0 && n < 500) chairs[b] = Math.round(n);
  }
  const targets: typeof settings.targets = {};
  for (const k of KPI_KEYS) {
    const n = num(formData.get(`target-${k}`));
    if (n === null || n < 0) continue;
    targets[k] = PERCENT.includes(k) ? Math.min(n, 100) / 100 : n;
  }
  const threshold = num(formData.get("discountThreshold"));
  await saveOpsSettings({
    chairs,
    targets,
    discountThreshold: threshold !== null && threshold > 0 && threshold < 100 ? threshold / 100 : settings.discountThreshold,
    maghrabiDoctorLevel: formData.get("maghrabiDoctorLevel") === "yes",
  });
  await logActivity(user, "/operations", "settings");
  revalidatePath("/", "layout");
  const locale = String(formData.get("locale") ?? "");
  redirect(localePath(isLocale(locale) ? locale : defaultLocale, "/admin/operations?tab=opsSettings&saved=1"));
}
