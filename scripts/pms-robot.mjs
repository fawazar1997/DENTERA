// The finance robot: signs in to the clinic system (PMS) with a read-only
// account, exports each report in scripts/pms-robot.config.json for a date
// range, and sends the files to the site (/api/finance/ingest). Runs in
// GitHub Actions (.github/workflows/pms-sync.yml).
//
// This repository is public, so its logs are too: the robot prints only
// step names and ok / failed — never figures, names, file contents, or
// page text. Downloads go to a temporary folder that is deleted at the end.
//
// Environment: PMS_USER, PMS_PASSWORD, FINANCE_INGEST_KEY (secrets),
// SITE_URL (default https://dentera.com.sa), MODE (today | month | backfill),
// MONTHS (backfill length, default 13).

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = fileURLToPath(new URL(".", import.meta.url));
const config = JSON.parse(await readFile(join(here, "pms-robot.config.json"), "utf-8"));
const SITE = (process.env.SITE_URL || "https://dentera.com.sa").replace(/\/+$/, "");
const KEY = process.env.FINANCE_INGEST_KEY || "";
const MODE = process.env.MODE || "today";
const MONTHS = Math.min(24, Math.max(1, Number(process.env.MONTHS) || 13));

const log = (step, ok = true) => console.log(`${ok ? "ok" : "FAILED"}: ${step}`);

async function report(ok, note) {
  try {
    await fetch(`${SITE}/api/finance/run`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ok, note }),
    });
  } catch {
    log("report run", false);
  }
}

// --- Dates (Riyadh) ---
const riyadh = (d = new Date()) => new Date(d.getTime() + 3 * 3600_000).toISOString().slice(0, 10);
const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400_000).toISOString().slice(0, 10);
const monthStart = (iso) => `${iso.slice(0, 7)}-01`;
const monthEnd = (iso) => {
  const [y, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};
const shiftMonth = (iso, by) => {
  const [y, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 10);
};
function format(iso, pattern) {
  const [y, m, d] = iso.split("-");
  return pattern.replace("yyyy", y).replace("MM", m).replace("dd", d);
}

/** The date ranges to export: one per month (keeps each file small). */
function ranges() {
  const today = riyadh();
  if (MODE === "month") return [[monthStart(today), today]];
  if (MODE === "backfill") {
    const out = [];
    for (let k = MONTHS; k >= 1; k--) {
      const start = shiftMonth(today, -k);
      out.push([start, monthEnd(start)]);
    }
    out.push([monthStart(today), today]);
    return out;
  }
  // today: yesterday and today (yesterday's late edits), split at a month start.
  const y = addDays(today, -1);
  return y.slice(0, 7) === today.slice(0, 7) ? [[y, today]] : [[y, y], [today, today]];
}

async function send(path, branch) {
  const form = new FormData();
  form.append("file", new Blob([await readFile(path)]), basename(path));
  if (branch) form.append("branch", branch);
  const res = await fetch(`${SITE}/api/finance/ingest`, { method: "POST", headers: { Authorization: `Bearer ${KEY}` }, body: form });
  return res.ok;
}

async function runStep(page, step, vars) {
  const value = (text) => String(text ?? "").replace("{from}", vars.from).replace("{to}", vars.to).replace("{branch}", vars.branch ?? "");
  if (step.goto) await page.goto(value(step.goto), { waitUntil: "networkidle" });
  if (step.fill) await page.locator(step.fill).first().fill(value(step.value));
  if (step.select) await page.locator(step.select).first().selectOption({ label: value(step.value) });
  if (step.click) await page.locator(step.click).first().click();
  if (step.wait) await page.waitForTimeout(Math.min(30_000, Number(step.wait)));
  if (step.waitFor) await page.locator(step.waitFor).first().waitFor({ timeout: 60_000 });
}

async function main() {
  // Not set up yet: stop quietly (no failed run every hour).
  if (!KEY || !process.env.PMS_USER || !process.env.PMS_PASSWORD) {
    log("skipped: secrets not set yet");
    return;
  }
  if (!config.reports?.length) {
    log("skipped: reports not configured yet");
    return;
  }
  const dir = await mkdtemp(join(tmpdir(), "pms-"));
  const browser = await chromium.launch();
  let failed = 0;
  let sent = 0;
  try {
    const context = await browser.newContext({ acceptDownloads: true, locale: "en-US", timezoneId: "Asia/Riyadh" });
    const page = await context.newPage();
    page.setDefaultTimeout(60_000);

    // Sign in.
    try {
      await page.goto(config.login.url, { waitUntil: "networkidle" });
      await page.locator(config.login.user).first().fill(process.env.PMS_USER);
      await page.locator(config.login.password).first().fill(process.env.PMS_PASSWORD);
      await page.locator(config.login.submit).first().click();
      if (config.login.after) await page.locator(config.login.after).first().waitFor();
      else await page.waitForLoadState("networkidle");
      log("login");
    } catch {
      log("login", false);
      await report(false, "login");
      process.exitCode = 1;
      return;
    }

    for (const [from, to] of ranges()) {
      const vars = { from: format(from, config.dateFormat), to: format(to, config.dateFormat) };
      for (const rep of config.reports) {
        // Installments are a snapshot: once per run, not per month.
        if (rep.snapshot && from !== ranges().at(-1)[0]) continue;
        const name = `${rep.name} ${from.slice(0, 7)}`;
        try {
          for (const branch of rep.branches ?? [null]) {
            const v = { ...vars, branch };
            for (const step of rep.steps ?? []) await runStep(page, step, v);
            const [download] = await Promise.all([page.waitForEvent("download", { timeout: 120_000 }), page.locator(rep.export).first().click()]);
            const file = join(dir, `${rep.name}-${branch ?? "all"}-${from}${(download.suggestedFilename().match(/\.\w+$/) ?? [".xlsx"])[0]}`);
            await download.saveAs(file);
            if (!(await send(file, branch ?? rep.branch))) throw new Error("ingest");
            sent++;
          }
          log(name);
        } catch {
          failed++;
          log(name, false);
        }
      }
    }
  } finally {
    await browser.close();
    await rm(dir, { recursive: true, force: true });
  }
  await report(failed === 0 && sent > 0, failed ? `failed ${failed}` : `${MODE} sent ${sent}`);
  if (failed) process.exitCode = 1;
}

await main();
