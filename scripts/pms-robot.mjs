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
// SITE_URL (default https://dentera.com.sa), MODE (yesterday | today | month |
// backfill | discover), MONTHS (backfill length, default 13).
//
// discover: signs in, opens each report by its menu path and prints only the
// page's shape (fields, buttons, column headers; digits masked), so the
// export steps can be set up without anyone sending screenshots or files.

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { isForbidden } from "./robot-safety.mjs";

const here = fileURLToPath(new URL(".", import.meta.url));
const config = JSON.parse(await readFile(join(here, "pms-robot.config.json"), "utf-8"));
const SITE = (process.env.SITE_URL || "https://dentera.com.sa").replace(/\/+$/, "");
const KEY = process.env.FINANCE_INGEST_KEY || "";
const MODE = process.env.MODE || "yesterday";
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
  // The daily run at 1 am: the whole of the day before.
  if (MODE === "yesterday") return [[addDays(today, -1), addDays(today, -1)]];
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
  if (res.ok) return (await res.json().catch(() => ({}))) ?? {};
  // The site answers with an error code only (never figures).
  const body = await res.json().catch(() => ({}));
  throw new Error(`site ${res.status} ${body?.error ?? ""}`.trim());
}

/** Clicks the first visible element whose text is exactly `text` (the page, then its frames). */
async function clickText(page, text, menu = false) {
  // Menu items are named in the config (e.g. «Deleted Invoices Report»), not buttons.
  if (!menu && isForbidden(text)) throw new Error(`refused: ${text}`);
  for (const frame of [page.mainFrame(), ...page.frames().filter((f) => f !== page.mainFrame())]) {
    const el = frame.getByText(text, { exact: true });
    const n = await el.count();
    for (let i = 0; i < n; i++) {
      if (await el.nth(i).isVisible()) {
        // Something on top (a date picker, an animation): press it anyway.
        await el.nth(i).click({ timeout: 10_000 }).catch(() => el.nth(i).click({ force: true }));
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

async function openMenu(page, path, system = "pms") {
  const walk = async () => {
    for (let i = 0; i < path.length; i++) {
      // A submenu left open: its next item is already showing (clicking
      // the parent again would close it).
      if (i < path.length - 1 && (await textVisible(page, path[i + 1]))) continue;
      await clickText(page, path[i], true);
    }
  };
  await dismissDialogs(page);
  try {
    await walk();
  } catch {
    // Lost on this page: back to the start (signing in again if asked).
    await page.goto(system === "acct" ? config.accounting.login.url : config.baseUrl, { waitUntil: "networkidle" });
    await ensureSignedIn(page, system);
    await dismissDialogs(page);
    await walk();
  }
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(2000);
  await dismissDialogs(page);
}

// --- Discover: the shape of each report page, never its data ---

/** Digits runs (dates, amounts, IDs) are masked, long texts cut. */
const safe = (text, max = 60) =>
  String(text ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[0-9٠-٩]{3,}/g, "#")
    .slice(0, max);

async function describe(page, title, navigation = false, strict = /accounting/.test(title)) {
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
          .map((el) => ({ name: el.name, id: el.id, label: labelOf(el), count: el.options.length, options: el.options.length <= 12 ? [...el.options].map((o) => o.text) : [] }));
        const buttons = [...document.querySelectorAll("button, a.btn, [role=button], input[type=image]")]
          .filter(vis)
          .map((el) => ({ text: el.textContent || el.getAttribute("title") || el.getAttribute("alt") || "", id: el.id, cls: el.className?.toString?.() ?? "" }))
          .filter((b) => b.text.trim() || b.id);
        // Column titles: the table's th cells, else its first row when that
        // row is titles (debit, credit, date…), never a row of data.
        const titles = /debit|credit|balance|account|amount|date|reference|number|status|type|entry|journal|description|مدين|دائن|رصيد|حساب|مبلغ|تاريخ|رقم|حالة|قيد|بيان/i;
        const heads = [...document.querySelectorAll("table")]
          .map((t) => {
            let cells = [...t.querySelectorAll("th")].map((th) => th.textContent);
            if (!cells.length) {
              const first = [...(t.querySelector("tr")?.children ?? [])].map((c) => c.textContent || "");
              if (first.filter((c) => titles.test(c)).length >= 2) cells = first;
            }
            return cells.concat(`(${t.querySelectorAll("tbody tr").length || t.querySelectorAll("tr").length} rows)`);
          })
          .filter((h) => h.length > 1);
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
    for (const s of info.selects) console.log(`select name=${safe(s.name)} id=${safe(s.id)} label=${safe(s.label)} options=${s.count}${s.options.length ? ` [${s.options.map((x) => safe(x)).join(" | ")}]` : ""}`);
    for (const b of info.buttons.slice(0, 40)) console.log(`button "${safe(b.text)}" id=${safe(b.id)} class=${safe(b.cls)}`);
    for (const h of info.heads.slice(0, 12))
      console.log(`table columns: ${(strict ? h.slice(0, 30).map((x, i) => (i === h.length - 1 || isTitle(x) ? safe(x) : "·")) : h.map((x) => safe(x))).join(" | ")}`);
    const menu = [...new Set(info.menu.map((x) => safe(x)))].filter(Boolean).slice(0, 160);
    if (menu.length) console.log(`menu items: ${menu.join(" | ")}`);
  }
}

/**
 * Every link of the page's menus (names and page paths only, never data),
 * hidden submenu items included, so a report's address can be used directly.
 */
async function listLinks(page, title, visibleOnly = false) {
  console.log(`\n=== ${title} ===`);
  const links = await page
    .evaluate((visibleOnly) => {
      const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      return [...document.querySelectorAll("a[href]")]
        .filter((a) => !visibleOnly || vis(a))
        .map((a) => {
          let path = "";
          try {
            const u = new URL(a.href, location.href);
            path = u.origin === location.origin ? u.pathname : "(other site)";
          } catch {}
          if (/^javascript:|#$/.test(a.getAttribute("href") || "")) path = "";
          // The submenu the link sits in (its parent item's own text).
          const parent = a.closest("ul")?.closest("li")?.querySelector(":scope > a, :scope > span");
          return { text: (a.textContent || a.title || "").trim(), path, parent: parent && parent !== a ? (parent.textContent || "").trim() : "" };
        })
        .filter((l) => l.text || l.path);
    }, visibleOnly)
    .catch(() => []);
  const seen = new Set();
  let n = 0;
  for (const l of links) {
    const line = `${safe(l.parent, 40) ? safe(l.parent, 40) + " > " : ""}${safe(l.text)}${l.path ? ` -> ${safe(l.path, 90)}` : ""}`;
    if (seen.has(line)) continue;
    seen.add(line);
    if (++n > 400) break;
    console.log(`link ${line}`);
  }
  console.log(`(${seen.size} links)`);
}

/** The systems the robot signs in to: the clinic system (PMS) and Microchips Accounting. */
function systemOf(name) {
  if (name === "acct") return { cfg: config.accounting?.login, user: process.env.ACCT_USER, pass: process.env.ACCT_PASSWORD };
  return { cfg: config.login, user: process.env.PMS_USER, pass: process.env.PMS_PASSWORD };
}

async function login(page, system = "pms") {
  const { cfg, user, pass } = systemOf(system);
  await page.goto(cfg.url, { waitUntil: "networkidle" });
  await page.locator(cfg.user).first().fill(user);
  await page.locator(cfg.password).first().fill(pass);
  await page.locator(cfg.submit).first().click();
  // The sign-in may be done in the page (no new address): wait for the form to go.
  await page.locator(cfg.password).first().waitFor({ state: "hidden", timeout: 45_000 });
  if (cfg.after) await page.locator(cfg.after).first().waitFor();
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(4000);
  // Back on the password form: the sign-in did not go through.
  if (await page.locator(cfg.password).first().isVisible().catch(() => false)) throw new Error("login");
}

/** Signed in still? Else sign in again (the PMS may drop the session on reload). */
async function ensureSignedIn(page, system = "pms") {
  const { cfg } = systemOf(system);
  if (await page.locator(cfg.password).first().isVisible().catch(() => false)) await login(page, system);
}

/**
 * The next download from this page or any tab it opens (some PMS exports
 * open a new tab that then downloads the file).
 */
function anyDownload(page, timeout) {
  const context = page.context();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("no download"));
    }, timeout);
    const watched = new Set();
    const onDownload = (d) => {
      cleanup();
      resolve(d);
    };
    const watch = (p) => {
      if (watched.has(p)) return;
      watched.add(p);
      p.on("download", onDownload);
    };
    const cleanup = () => {
      clearTimeout(timer);
      context.off("page", watch);
      for (const p of watched) p.off("download", onDownload);
    };
    context.pages().forEach(watch);
    context.on("page", watch);
  });
}

/**
 * Runs a report's steps (filters, dates, apply) and presses its export
 * button; returns the downloaded file's path.
 */
async function exportReport(page, rep, vars, dir, tag) {
  for (const step of rep.steps ?? []) await runStep(page, step, vars);
  const [download] = await Promise.all([anyDownload(page, rep.timeout ?? 180_000), clickText(page, rep.export)]);
  const ext = (download.suggestedFilename().match(/\.\w+$/) ?? [".xls"])[0];
  const file = join(dir, `${rep.name}-${tag}${ext}`);
  await download.saveAs(file);
  return file;
}

/**
 * The columns the dashboard uses, per report (nothing else leaves the PMS):
 * a report's «keep» list, and «keepPattern» for its payment-method columns.
 */
const DETAILED_KEEP = ["invdate", "invseqno", "patientfileno", "patientidnumber", "servicenameen", "servicegroupname", "soldprice", "discountamount", "qtysold", "total", "cashorinsurance", "doctorname", "branchname"];

/**
 * The report as CSV (the site reads CSV most reliably): only the columns
 * the dashboard uses, dates as YYYY-MM-DD HH:MM, the ID number replaced by
 * a has-ID mark. Also counts its rows and adds up its total column, to
 * check against what the site stores. Falls back to the file itself.
 */
async function toCsv(file, rep = {}) {
  try {
    const XLSX = (await import("xlsx")).default;
    const book = XLSX.read(await readFile(file), { type: "buffer", cellDates: true });
    const sheet = book.Sheets[book.SheetNames[0]];
    const pad = (n) => String(n).padStart(2, "0");
    const table = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
    const key = (v) => String(v ?? "").toLowerCase().replace(/[\s_.\-/()]+/g, "");
    const at = table.findIndex((r) => r.some((c) => key(c) === "invdate"));
    let rows = table;
    let count = null;
    let total = null;
    if (at >= 0) {
      const head = table[at].map(key);
      const keepList = rep.keep ?? DETAILED_KEEP;
      const keepRe = rep.keepPattern ? new RegExp(rep.keepPattern, "i") : null;
      const keep = head.map((h, i) => (keepList.includes(h) || (keepRe && keepRe.test(String(table[at][i]))) ? i : -1)).filter((i) => i >= 0);
      const dateCol = head.indexOf("invdate");
      const totalCol = head.indexOf(rep.totalColumn ?? "total");
      const idCol = head.indexOf("patientidnumber");
      const body = table.slice(at + 1).filter((r) => r[dateCol] instanceof Date || /\d{1,4}[/-]\d{1,2}[/-]\d{1,4}/.test(String(r[dateCol] ?? "")));
      count = body.length;
      total = totalCol >= 0 ? body.reduce((sum, r) => sum + (Number(String(r[totalCol]).replace(/,/g, "")) || 0), 0) : null;
      rows = [table[at], ...body].map((r, n) =>
        keep.map((i) => (n > 0 && i === idCol ? (/\d{6,}/.test(String(r[i] ?? "")) ? "0000000000" : "") : r[i]))
      );
    }
    const cell = (v) =>
      v instanceof Date ? `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())} ${pad(v.getHours())}:${pad(v.getMinutes())}` : String(v ?? "");
    const quote = (c) => (/[",\n\r]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c);
    const out = file.replace(/\.\w+$/, "") + ".csv";
    await writeFile(out, "\ufeff" + rows.map((r) => r.map((v) => quote(cell(v))).join(",")).join("\n"));
    return { file: out, count, total };
  } catch {
    return { file, count: null, total: null };
  }
}

/**
 * A column title of an accounting report (Debit, Credit, Balance, Account
 * No, Date…): short, words only, from a fixed list. Anything else (customer,
 * supplier or account names, amounts) is never printed for accounting.
 */
const TITLE_WORDS = /^(account|accounts|no\.?|number|name|code|id|level|opening|closing|final|balance|balances|transactions|movement|debit|credit|total|totals|date|reference|ref\.?|description|notes|source|status|module|branch|type|nature|parent|month|amount|journal|entry|#|year|specific|payment|method|transaction|count|section|customer|supplier|group|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|مدين|دائن|رصيد|الرصيد|حساب|الحساب|رقم|اسم|تاريخ|التاريخ|البيان|المبلغ|افتتاحي|الافتتاحي|ختامي|الختامي|الحركة|إجمالي|الإجمالي|الفرع|الحالة|القيد)$/i;
const isTitle = (cell) => {
  const words = String(cell ?? "").replace(/[()\-_/:.,]+/g, " ").trim().split(/\s+/).filter(Boolean);
  return words.length > 0 && words.length <= 4 && words.every((w) => TITLE_WORDS.test(w));
};

/** A downloaded report's shape: type, size, rows and column names (no values). */
async function inspect(file, strict = false) {
  const bytes = await readFile(file);
  const head = bytes.subarray(0, 8);
  const kind = head[0] === 0x50 && head[1] === 0x4b ? "xlsx" : head[0] === 0xd0 && head[1] === 0xcf ? "xls (binary)" : /^\s*</.test(bytes.subarray(0, 200).toString("utf-8")) ? "html table" : "other";
  let rows = "?";
  let columns = [];
  try {
    const XLSX = (await import("xlsx")).default;
    const book = XLSX.read(bytes, { type: "buffer" });
    const sheet = book.Sheets[book.SheetNames[0]];
    const table = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
    rows = String(table.length);
    // The header: the first row with at least 3 cells that are words, not numbers.
    // Accounting files can list customers and suppliers by name: there only
    // a row of column titles (debit, credit, balance…) is printed.
    const header = strict
      ? table.find((r) => r.filter((c) => isTitle(c)).length >= 2)
      : table.find((r) => r.filter((c) => String(c).trim() && !/^[\d.,\s/:-]+$/.test(String(c))).length >= 3);
    // Accounting: only cells that are column titles are printed (names,
    // amounts and anything else show as «·»), at most 30.
    const shown = (row) => (strict ? row.slice(0, 30).map((c) => (isTitle(c) ? safe(c) : "·")) : row.map((x) => safe(x)).filter(Boolean));
    columns = shown(header ?? []);
    // A second title row under it (e.g. Debit | Credit under each group).
    const next = header ? table[table.indexOf(header) + 1] : null;
    if (strict && next && next.filter((c) => isTitle(c)).length >= 2) columns.push(`|| under: ${shown(next).join(" | ")}`);
    if (strict && !header) columns = [`(no title row found; ${Math.max(0, ...table.slice(0, 20).map((r) => r.length))} columns)`];
  } catch {
    // Not readable here; the site's own reader decides.
  }
  console.log(`file: ${kind}, ${Math.max(1, Math.round(bytes.length / 1024))} KB, rows ${rows}`);
  if (columns.length) console.log(`file columns: ${columns.join(" | ")}`);
}

/** Exports a report for yesterday and prints the file's shape; the file is deleted. */
async function probe(page, rep, dir) {
  if (!rep.export) {
    log(`probe ${rep.name}: no export set`, false);
    return;
  }
  const pattern = rep.dateFormat ?? config.dateFormat;
  const day = addDays(riyadh(), -1);
  const y = format(day, pattern);
  // A report over a period: from the 1st of the month or of the year.
  const from = rep.range === "year" ? format(`${day.slice(0, 4)}-01-01`, pattern) : rep.range === "month" ? format(monthStart(day), pattern) : y;
  // Each way of exporting (the report's own, then its «alternatives»), for each branch.
  const ways = [rep, ...(rep.alternatives ?? []).map((alt) => ({ ...rep, ...alt }))];
  for (const branch of rep.branches ?? [null]) {
    let done = false;
    for (const [n, way] of ways.entries()) {
      const tag = `${rep.name}${branch ? ` ${branch}` : ""} (way ${n + 1}: ${way.export})`;
      try {
        if (n > 0 || branch !== (rep.branches ?? [null])[0]) {
          await closeOthers(page);
          if (rep.url) await page.goto(new URL(rep.url, config.accounting.login.url).href, { waitUntil: "networkidle" });
          else await openMenu(page, rep.menu);
        }
        const file = await exportReport(page, way, { from, to: y, branch }, dir, `probe-${n}`);
        log(`export ${tag}`);
        await inspect(file, rep.strict);
        await rm(file, { force: true });
        done = true;
        break;
      } catch (error) {
        log(`export ${tag} (${safe(error?.message, 200)})`, false);
        const tabs = page.context().pages().length;
        await describe(latest(page), `${tag} — after the attempt (${tabs} tab${tabs > 1 ? "s" : ""} open)`);
      }
    }
    if (!done) log(`probe ${rep.name}${branch ? ` ${branch}` : ""}: no way worked`, false);
  }
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
        const dir = await mkdtemp(join(tmpdir(), "probe-"));
        try {
          await probe(report, rep, dir);
        } catch (error) {
          log(`probe ${rep.name} (${safe(error?.message, 400)})`, false);
          const tabs = report.context().pages().length;
          await describe(latest(report), `${rep.name} — after the export attempt (${tabs} tab${tabs > 1 ? "s" : ""} open)`);
        } finally {
          await rm(dir, { recursive: true, force: true });
        }
      } catch (error) {
        log(`open ${rep.name} (${safe(error?.message)})`, false);
        await describe(latest(page), `${rep.name} — where it stopped`);
      }
      await closeOthers(page);
    }
    await discoverAccounting(browser);
  } finally {
    await browser.close();
  }
}

/**
 * Microchips Accounting (its own address and account): signs in and shows
 * its menu and each configured report's page, like the PMS reports.
 */
async function discoverAccounting(browser) {
  const acct = config.accounting;
  if (!acct?.login?.url) return log("accounting: skipped (no address in the config yet)");
  if (!process.env.ACCT_USER || !process.env.ACCT_PASSWORD) return log("accounting: skipped (ACCT_USER / ACCT_PASSWORD secrets not set yet)");
  const page = await (await browser.newContext({ acceptDownloads: true, locale: "en-US", timezoneId: "Asia/Riyadh" })).newPage();
  page.setDefaultTimeout(60_000);
  try {
    await login(page, "acct");
    log("accounting login");
  } catch {
    log("accounting login", false);
    await describe(page, "accounting — sign-in page");
    process.exitCode = 1;
    return;
  }
  await describe(page, "accounting — after login", true);
  await listLinks(page, "accounting — every menu link");
  for (const top of acct.explore ?? []) {
    try {
      await dismissDialogs(page);
      await clickText(page, top, true);
      await page.waitForTimeout(1500);
      await listLinks(page, `accounting — menu «${top}» opened`, true);
    } catch (error) {
      log(`accounting menu ${top} (${safe(error?.message, 200)})`, false);
    }
  }
  for (const rep of acct.reports ?? []) {
    try {
      await ensureSignedIn(page, "acct");
      if (rep.url) await page.goto(new URL(rep.url, acct.login.url).href, { waitUntil: "networkidle" });
      if (rep.menu) await openMenu(page, rep.menu, "acct");
      log(`open ${rep.name}`);
      const report = latest(page);
      await describe(report, `accounting — ${rep.name}`);
      // Discover only: open the report's filters window and show its fields.
      if (!rep.export && rep.look?.length) {
        const pattern = rep.dateFormat ?? acct.dateFormat ?? config.dateFormat;
        const day = addDays(riyadh(), -1);
        const from = rep.range === "year" ? `${day.slice(0, 4)}-01-01` : rep.range === "month" ? monthStart(day) : day;
        for (const step of rep.look) await runStep(report, step, { from: format(from, pattern), to: format(day, pattern), branch: "" });
        await describe(latest(page), `accounting — ${rep.name} — filters`);
      }
      if (rep.export) {
        const dir = await mkdtemp(join(tmpdir(), "probe-"));
        try {
          await probe(report, { dateFormat: acct.dateFormat, strict: true, timeout: 60_000, ...rep }, dir);
        } finally {
          await rm(dir, { recursive: true, force: true });
        }
      }
    } catch (error) {
      log(`open ${rep.name} (${safe(error?.message, 200)})`, false);
      await describe(latest(page), `accounting — ${rep.name} — where it stopped`);
    }
    await closeOthers(page);
  }
}

async function runStep(page, step, vars) {
  const value = (text) => String(text ?? "").replace("{from}", vars.from).replace("{to}", vars.to).replace("{branch}", vars.branch ?? "");
  if (step.menu) await openMenu(page, step.menu);
  if (step.clickText) await clickText(page, value(step.clickText));
  if (step.goto) await page.goto(value(step.goto), { waitUntil: "networkidle" });
  if (step.check) {
    // A view option (e.g. «Include Not Posted Entries»), ticked or cleared.
    const el = page.locator(step.check).first();
    if (step.value === false) await el.uncheck({ force: true });
    else await el.check({ force: true });
  }
  if (step.fill) {
    const el = page.locator(step.fill).first();
    if (MODE === "discover") console.log(`  ${step.fill} was ${safe(await el.inputValue().catch(() => ""))}`);
    await el.fill(value(step.value));
    // Tell the page the value changed, then leave the field so its date
    // picker closes (Escape would close the whole filters window).
    await el.evaluate((e) => {
      e.dispatchEvent(new Event("input", { bubbles: true }));
      e.dispatchEvent(new Event("change", { bubbles: true }));
      e.blur();
    }).catch(() => undefined);
    await page.locator(".datepicker, .ui-datepicker, .daterangepicker").evaluateAll((els) => els.forEach((d) => (d.style.display = "none"))).catch(() => undefined);
    if (MODE === "discover") console.log(`  ${step.fill} = ${safe(await el.inputValue().catch(() => ""))}`);
  }
  // An empty choice (e.g. no branch: the whole clinic) leaves the list as it is.
  if (step.select && value(step.value) !== "") await page.locator(step.select).first().selectOption({ label: value(step.value) });
  if (step.click) {
    const el = page.locator(step.click).first();
    if (isForbidden((await el.textContent().catch(() => "")) ?? "")) throw new Error("refused");
    await el.click();
  }
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
  // «accounting» / «accounting-backfill»: the accounting system alone.
  if (MODE.startsWith("accounting")) {
    const dir = await mkdtemp(join(tmpdir(), "acct-"));
    const browser = await chromium.launch();
    let result = { failed: 1, sent: 0 };
    try {
      result = await syncAccounting(browser, dir);
    } finally {
      await browser.close();
      await rm(dir, { recursive: true, force: true });
    }
    if (result.failed) process.exitCode = 1;
    return;
  }
  // Only reports whose export button is known (the rest are still being set up).
  // «enabled: false»: still being set up (discover tries it, scheduled runs skip it).
  const reports = (config.reports ?? []).filter((r) => r.export && r.enabled !== false);
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
            const file = await exportReport(latest(page), rep, v, dir, `${branch ?? "all"}-${from}`);
            await closeOthers(page);
            const csv = await toCsv(file, rep);
            const answer = await send(csv.file, branch ?? rep.branch);
            // Nothing lost: the rows and the «Total» sum of the file must be
            // what the site read and now stores for those dates (amounts are
            // compared here, never printed).
            if (csv.count !== null) {
              const near = (a, b) => typeof a === "number" && typeof b === "number" && Math.abs(a - b) < 1;
              const same = answer.rows === csv.count && (csv.total === null || near(answer.readNet, csv.total)) && near(answer.readNet, answer.storedNet);
              console.log(`check ${rep.name} ${from}..${to}: rows ${csv.count} sent, ${answer.rows ?? "?"} read; totals ${same ? "match" : "MISMATCH"}`);
              if (!same) throw new Error("check mismatch");
            }
            sent++;
          }
          log(name);
        } catch (error) {
          failed++;
          log(`${name} (${safe(error?.message, 200)})`, false);
        }
      }
    }
    // Microchips Accounting: trial balances and the chart of accounts.
    const acct = await syncAccounting(browser, dir);
    failed += acct.failed;
    sent += acct.sent;
  } finally {
    await browser.close();
    await rm(dir, { recursive: true, force: true });
  }
  await report(failed === 0 && sent > 0, failed ? `failed ${failed}` : `${MODE} sent ${sent}`);
  if (failed) process.exitCode = 1;
}

/** The months whose trial balances to export: [first day, last day] each. */
function acctMonths() {
  const today = riyadh();
  const y = addDays(today, -1);
  const upTo = (start) => (start.slice(0, 7) === y.slice(0, 7) ? y : monthEnd(start));
  if (MODE === "backfill" || MODE === "accounting-backfill") {
    // Every month of the financial year so far (from 1 January).
    const out = [];
    for (let m = `${y.slice(0, 4)}-01-01`; m <= y; m = shiftMonth(m, 1)) out.push([m, upTo(m)]);
    return out;
  }
  if (MODE === "month") return [[monthStart(y), y]];
  // Every night: the month before in full (late postings) and this month so far.
  const prev = shiftMonth(monthStart(y), -1);
  return [[prev, monthEnd(prev)], [monthStart(y), y]];
}

async function sendAcct(path, fields) {
  const form = new FormData();
  form.append("file", new Blob([await readFile(path)]), basename(path));
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  const res = await fetch(`${SITE}/api/finance/acct-ingest`, { method: "POST", headers: { Authorization: `Bearer ${KEY}` }, body: form });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`site ${res.status} ${body?.error ?? ""}`.trim());
  return body ?? {};
}

/**
 * Exports each accounting report that has a «kind» (tb, chart) and sends it
 * to the site. Read-only in the accounting system; the log shows counts and
 * match / mismatch only.
 */
async function syncAccounting(browser, dir) {
  const acct = config.accounting;
  const reports = (acct?.reports ?? []).filter((r) => r.kind && r.export && r.enabled !== false);
  if (!reports.length) return { failed: 0, sent: 0 };
  if (!process.env.ACCT_USER || !process.env.ACCT_PASSWORD) {
    log("accounting: skipped (ACCT_USER / ACCT_PASSWORD secrets not set yet)");
    return { failed: 0, sent: 0 };
  }
  let failed = 0;
  let sent = 0;
  const context = await browser.newContext({ acceptDownloads: true, locale: "en-US", timezoneId: "Asia/Riyadh" });
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  try {
    await login(page, "acct");
    log("accounting login");
  } catch {
    log("accounting login", false);
    await context.close();
    return { failed: 1, sent: 0 };
  }
  const pattern = acct.dateFormat ?? config.dateFormat;
  const open = async (rep) => {
    await ensureSignedIn(page, "acct");
    await page.goto(new URL(rep.url, acct.login.url).href, { waitUntil: "networkidle" });
  };
  for (const rep of reports) {
    const periods = rep.kind === "tb" ? acctMonths() : [[null, null]];
    for (const [from, to] of periods) {
      for (const branch of rep.branches ?? [null]) {
        const name = `${rep.name}${branch ? ` ${branch}` : ""}${from ? ` ${from.slice(0, 7)}` : ""}`;
        try {
          await open(rep);
          const vars = { from: from ? format(from, pattern) : "", to: to ? format(to, pattern) : "", branch };
          const file = await exportReport(latest(page), rep, vars, dir, `${rep.name}-${branch ?? "all"}-${from ?? "now"}`);
          await closeOthers(page);
          const csv = await toCsv(file, rep);
          const fields = { kind: rep.kind };
          if (rep.kind === "tb") Object.assign(fields, { branch: branch ? branch.toLowerCase() : "all", basis: rep.basis ?? "posted", from, to });
          const answer = await sendAcct(csv.file, fields);
          // What the site read must be what it now stores (sums compared here, never printed).
          const near = (a, b) => typeof a === "number" && typeof b === "number" && Math.abs(a - b) < 0.01;
          const same =
            rep.kind === "tb"
              ? answer.rows > 0 && answer.read?.rows === answer.stored?.rows && near(answer.read?.dr, answer.stored?.dr) && near(answer.read?.cr, answer.stored?.cr)
              : answer.rows > 0 && answer.rows === answer.stored;
          const balanced = rep.kind === "tb" ? (Math.abs((answer.read?.dr ?? 0) - (answer.read?.cr ?? 0)) < 0.5 ? ", debits = credits" : ", debits ≠ credits (shown on the dashboard, not adjusted)") : "";
          console.log(`check ${name}: rows ${answer.rows ?? "?"} read; stored ${same ? "match" : "MISMATCH"}${balanced}`);
          if (!same) throw new Error("check mismatch");
          sent++;
          log(name);
        } catch (error) {
          failed++;
          log(`${name} (${safe(error?.message, 200)})`, false);
        }
      }
    }
  }
  await context.close();
  return { failed, sent };
}

await main();
