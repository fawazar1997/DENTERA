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
// SITE_URL (default https://dentera.com.sa), MODE (today | month | backfill |
// discover), MONTHS (backfill length, default 13).
//
// discover: signs in, opens each report by its menu path and prints only the
// page's shape (fields, buttons, column headers; digits masked), so the
// export steps can be set up without anyone sending screenshots or files.

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

/** Clicks the first visible element whose text is exactly `text` (the page, then its frames). */
async function clickText(page, text) {
  for (const frame of [page.mainFrame(), ...page.frames().filter((f) => f !== page.mainFrame())]) {
    const el = frame.getByText(text, { exact: true });
    const n = await el.count();
    for (let i = 0; i < n; i++) {
      if (await el.nth(i).isVisible()) {
        await el.nth(i).click();
        await page.waitForLoadState("networkidle").catch(() => undefined);
        await page.waitForTimeout(1500);
        return true;
      }
    }
  }
  throw new Error(`menu: ${text}`);
}

/** A menu path, e.g. ["Reports", "Financial Reports", "Detailed Sales reports"]. */
/** The newest tab (a report may open in its own tab). */
const latest = (page) => page.context().pages().at(-1) ?? page;

async function closeOthers(page) {
  for (const p of page.context().pages()) if (p !== page) await p.close().catch(() => undefined);
}

async function textVisible(page, text) {
  for (const frame of page.frames()) {
    const el = frame.getByText(text, { exact: true });
    const n = await el.count().catch(() => 0);
    for (let i = 0; i < n; i++) if (await el.nth(i).isVisible().catch(() => false)) return true;
  }
  return false;
}

/** Closes a welcome or tour window that covers the page. */
async function dismissDialogs(page) {
  for (const text of config.dismiss ?? []) {
    if (await textVisible(page, text)) await clickText(page, text).catch(() => undefined);
  }
}

async function openMenu(page, path) {
  const walk = async () => {
    for (let i = 0; i < path.length; i++) {
      // A submenu left open: its next item is already showing (clicking
      // the parent again would close it).
      if (i < path.length - 1 && (await textVisible(page, path[i + 1]))) continue;
      await clickText(page, path[i]);
    }
  };
  await dismissDialogs(page);
  try {
    await walk();
  } catch {
    // Lost on this page: back to the start (signing in again if asked).
    await page.goto(config.baseUrl, { waitUntil: "networkidle" });
    await ensureSignedIn(page);
    await dismissDialogs(page);
    await walk();
  }
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(2000);
  await dismissDialogs(page);
}

// --- Discover: the shape of each report page, never its data ---

/** Digits runs (dates, amounts, IDs) are masked, long texts cut. */
const safe = (text) =>
  String(text ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[0-9٠-٩]{3,}/g, "#")
    .slice(0, 60);

async function describe(page, title, navigation = false) {
  console.log(`\n=== ${title} ===`);
  console.log(`path: ${safe(new URL(page.url()).pathname)}`);
  for (const frame of page.frames()) {
    const info = await frame
      .evaluate((navigation) => {
        const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        const labelOf = (el) => {
          if (el.id) {
            const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
            if (l) return l.textContent;
          }
          return el.closest("label")?.textContent || el.getAttribute("aria-label") || "";
        };
        const fields = [...document.querySelectorAll("input, textarea")]
          .filter((el) => vis(el) && !["hidden"].includes(el.type))
          .map((el) => ({
            tag: el.tagName.toLowerCase(),
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            label: labelOf(el),
            button: ["submit", "button"].includes(el.type) ? el.value : "",
          }));
        const selects = [...document.querySelectorAll("select")]
          .filter(vis)
          .map((el) => ({ name: el.name, id: el.id, label: labelOf(el), count: el.options.length, options: el.options.length <= 8 ? [...el.options].map((o) => o.text) : [] }));
        const buttons = [...document.querySelectorAll("button, a.btn, [role=button], input[type=image]")]
          .filter(vis)
          .map((el) => ({ text: el.textContent || el.getAttribute("title") || el.getAttribute("alt") || "", id: el.id, cls: el.className?.toString?.() ?? "" }))
          .filter((b) => b.text.trim() || b.id);
        const heads = [...document.querySelectorAll("table")].map((t) => [...t.querySelectorAll("th")].map((th) => th.textContent)).filter((h) => h.length);
        const menu = [...document.querySelectorAll("a, li, span")]
          .filter((el) => vis(el) && el.children.length === 0 && /report|financ|sales|تقرير|تقارير|مالي|مبيعات|collection|payment|install|تحصيل|سداد|أقساط/i.test(el.textContent || ""))
          .map((el) => el.textContent);
        // After sign-in: every link of the navigation (module names, no data).
        const nav = navigation
          ? [...document.querySelectorAll("nav a, aside a, .sidebar a, .menu a, [role=menuitem], ul li > a, ul li > span")]
              .filter((el) => vis(el) && (el.textContent || "").trim())
              .map((el) => el.textContent)
          : [];
        return { fields, selects, buttons, heads, menu: menu.concat(nav) };
      }, navigation)
      .catch(() => null);
    if (!info) continue;
    const where = frame === page.mainFrame() ? "page" : `frame ${safe(frame.name() || new URL(frame.url() || "about:blank").pathname)}`;
    if (!info.fields.length && !info.selects.length && !info.buttons.length && !info.heads.length && !info.menu.length) continue;
    console.log(`-- ${where}`);
    for (const f of info.fields)
      console.log(`field ${f.tag}[type=${f.type}] name=${safe(f.name)} id=${safe(f.id)} placeholder=${safe(f.placeholder)} label=${safe(f.label)}${f.button ? ` value=${safe(f.button)}` : ""}`);
    for (const s of info.selects) console.log(`select name=${safe(s.name)} id=${safe(s.id)} label=${safe(s.label)} options=${s.count}${s.options.length ? ` [${s.options.map(safe).join(" | ")}]` : ""}`);
    for (const b of info.buttons.slice(0, 40)) console.log(`button "${safe(b.text)}" id=${safe(b.id)} class=${safe(b.cls)}`);
    for (const h of info.heads.slice(0, 5)) console.log(`table columns: ${h.map(safe).join(" | ")}`);
    const menu = [...new Set(info.menu.map(safe))].filter(Boolean).slice(0, 80);
    if (menu.length) console.log(`menu items: ${menu.join(" | ")}`);
  }
}

async function login(page) {
  await page.goto(config.login.url, { waitUntil: "networkidle" });
  await page.locator(config.login.user).first().fill(process.env.PMS_USER);
  await page.locator(config.login.password).first().fill(process.env.PMS_PASSWORD);
  await page.locator(config.login.submit).first().click();
  // The sign-in is done in the page (no new address): wait for the form to go.
  await page.locator(config.login.password).first().waitFor({ state: "hidden", timeout: 45_000 });
  if (config.login.after) await page.locator(config.login.after).first().waitFor();
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(4000);
  // Back on the password form: the sign-in did not go through.
  if (await page.locator(config.login.password).first().isVisible().catch(() => false)) throw new Error("login");
}

/** Signed in still? Else sign in again (the PMS may drop the session on reload). */
async function ensureSignedIn(page) {
  if (await page.locator(config.login.password).first().isVisible().catch(() => false)) await login(page);
}

async function discover() {
  const browser = await chromium.launch();
  try {
    const page = await (await browser.newContext({ locale: "en-US", timezoneId: "Asia/Riyadh" })).newPage();
    page.setDefaultTimeout(60_000);
    try {
      await login(page);
      log("login");
    } catch {
      log("login", false);
      await describe(page, "login page");
      process.exitCode = 1;
      return;
    }
    await describe(page, "after login", true);
    for (const rep of config.reports ?? []) {
      try {
        await ensureSignedIn(page);
        if (rep.menu) await openMenu(page, rep.menu);
        log(`open ${rep.name}`);
        const report = latest(page);
        await describe(report, report === page ? rep.name : `${rep.name} (opened in a new tab)`);
      } catch (error) {
        log(`open ${rep.name} (${safe(error?.message)})`, false);
        await describe(latest(page), `${rep.name} — where it stopped`);
      }
      await closeOthers(page);
    }
  } finally {
    await browser.close();
  }
}

async function runStep(page, step, vars) {
  const value = (text) => String(text ?? "").replace("{from}", vars.from).replace("{to}", vars.to).replace("{branch}", vars.branch ?? "");
  if (step.menu) await openMenu(page, step.menu);
  if (step.clickText) await clickText(page, value(step.clickText));
  if (step.goto) await page.goto(value(step.goto), { waitUntil: "networkidle" });
  if (step.fill) await page.locator(step.fill).first().fill(value(step.value));
  if (step.select) await page.locator(step.select).first().selectOption({ label: value(step.value) });
  if (step.click) await page.locator(step.click).first().click();
  if (step.wait) await page.waitForTimeout(Math.min(30_000, Number(step.wait)));
  if (step.waitFor) await page.locator(step.waitFor).first().waitFor({ timeout: 60_000 });
}

async function main() {
  // Not set up yet: stop quietly (no failed run every hour).
  if (!process.env.PMS_USER || !process.env.PMS_PASSWORD) {
    log("skipped: PMS_USER / PMS_PASSWORD secrets not set yet");
    return;
  }
  // Discover sends nothing to the site, so it needs no ingest key.
  if (MODE === "discover") return discover();
  if (!KEY) {
    log("skipped: FINANCE_INGEST_KEY secret not set yet");
    return;
  }
  // Only reports whose export button is known (the rest are still being set up).
  const reports = (config.reports ?? []).filter((r) => r.export);
  if (!reports.length) {
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
      await login(page);
      log("login");
    } catch {
      log("login", false);
      await report(false, "login");
      process.exitCode = 1;
      return;
    }

    for (const [from, to] of ranges()) {
      const vars = { from: format(from, config.dateFormat), to: format(to, config.dateFormat) };
      for (const rep of reports) {
        // Installments are a snapshot: once per run, not per month.
        if (rep.snapshot && from !== ranges().at(-1)[0]) continue;
        const name = `${rep.name} ${from.slice(0, 7)}`;
        try {
          for (const branch of rep.branches ?? [null]) {
            const v = { ...vars, branch };
            await ensureSignedIn(page);
            if (rep.menu) await openMenu(page, rep.menu);
            const report = latest(page);
            for (const step of rep.steps ?? []) await runStep(report, step, v);
            const [download] = await Promise.all([report.waitForEvent("download", { timeout: 120_000 }), report.locator(rep.export).first().click()]);
            await closeOthers(page);
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
