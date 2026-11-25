"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, sessionUser } from "./auth";
import { canUseSection } from "./adminRoles";
import { defaultLocale, isLocale, localePath } from "./i18n";
import { logActivity } from "./activity";
import { readAcctSettings, readChart, readMapping, saveAcctSettings, saveMapping } from "./acct";
import { suggestedLine } from "./acctMapping";
import { MODEL_BS, MODEL_PNL } from "./financeModel";

// Control Panel → الأداء المالي → الإعدادات: the accounting part (account
// mapping, financing maturities, reconciliation threshold). Only settings on
// this site change; nothing is ever written to the accounting system.

const LINES = new Set<string>([...MODEL_PNL.map((m) => m.line), ...MODEL_BS.map((m) => m.line), "none"]);

export async function saveAcctSettingsAction(formData: FormData) {
  const user = await sessionUser(cookies().get(SESSION_COOKIE)?.value);
  if (!user || !canUseSection(user, "/finance")) throw new Error("Unauthorized");

  // Mapping: only choices that differ from the suggestion shown are stored
  // (so a better suggestion later still applies to the rest).
  const chart = new Map(((await readChart())?.accounts ?? []).map((a) => [a.code, a]));
  const mapping = await readMapping();
  for (const [name, value] of formData.entries()) {
    const code = /^map-(\d[\d-]{0,20})$/.exec(name)?.[1];
    if (!code) continue;
    const line = String(value);
    if (!LINES.has(line)) continue;
    const shown = String(formData.get(`sug-${code}`) ?? "");
    const suggested = LINES.has(shown) ? shown : suggestedLine(code, chart.get(code)) ?? "none";
    if (line === suggested) delete mapping[code];
    else mapping[code] = line;
  }
  await saveMapping(mapping);

  // Maturities: one «YYYY-MM-DD = amount» per line.
  const maturities = String(formData.get("maturities") ?? "")
    .split(/\r?\n/)
    .map((l) => /^\s*(\d{4}-\d{2}-\d{2})\s*[=:,]\s*([\d,.\s]+)\s*$/.exec(l))
    .filter((m): m is RegExpExecArray => !!m && !Number.isNaN(Date.parse(m[1])))
    .map((m) => ({ date: m[1], amount: Math.round(Number(m[2].replace(/[,\s]/g, "")) * 100) / 100 }))
    .filter((m) => m.amount > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 240);
  const pct = Number(String(formData.get("reconThreshold") ?? "").replace(/[%\s]/g, ""));
  const settings = await readAcctSettings();
  // Bank minimums: one «account = amount» per line (account digits as the key).
  const bankMinimums: Record<string, number> = {};
  for (const l of String(formData.get("bankMinimums") ?? "").split(/\r?\n/)) {
    const m = /^\s*([\d-]{2,24})\s*[=:,]\s*([\d,.\s]+)\s*$/.exec(l);
    if (!m) continue;
    const amount = Number(m[2].replace(/[,\s]/g, ""));
    if (Number.isFinite(amount) && amount >= 0) bankMinimums[m[1].replace(/\D/g, "")] = amount;
  }
  await saveAcctSettings({ maturities, reconThreshold: Number.isFinite(pct) && pct > 0 && pct < 100 ? pct / 100 : settings.reconThreshold, bankMinimums });

  await logActivity(user, "/finance", "settings", "accounting");
  revalidatePath("/", "layout");
  const locale = String(formData.get("locale") ?? "");
  redirect(`${localePath(isLocale(locale) ? locale : defaultLocale, "/admin/finance")}?tab=settings&acctSaved=1#accounting`);
}
