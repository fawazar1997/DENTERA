import { NextRequest, NextResponse } from "next/server";
import { ingestKeyOk } from "@/lib/finance";
import { readSpreadsheet } from "@/lib/spreadsheet";
import {
  parseChart,
  parseStatement,
  parseTrialBalance,
  parseUnposted,
  saveChart,
  saveStatement,
  saveTrialBalance,
  saveUnposted,
  stTotals,
  tbTotals,
  type AcctBasis,
  type AcctBranch,
} from "@/lib/acct";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const reply = (status: number, body: object) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The robot sends each Microchips Accounting export here (multipart:
 * «file», «kind» = tb | chart | statement | unposted; a trial balance also
 * «branch» = abha | khamis | all and «basis» = posted | all; a statement
 * «account»; «from» / «to» as YYYY-MM-DD), with
 * the same key as the PMS reports. The answer gives counts and sums for the
 * robot's check; the robot logs only match / mismatch, never the figures.
 */
export async function POST(request: NextRequest) {
  if (!ingestKeyOk(request.headers.get("authorization"))) return reply(401, { ok: false });
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return reply(400, { ok: false, error: "form" });
  }
  const file = form.get("file");
  if (!(file instanceof File) || !file.size || file.size > 4 * 1024 * 1024) return reply(400, { ok: false, error: "file" });
  const kind = String(form.get("kind") ?? "");
  try {
    const table = readSpreadsheet(new Uint8Array(await file.arrayBuffer()), file.name);
    if (kind === "chart") {
      const accounts = parseChart(table);
      if (!accounts.length) return reply(422, { ok: false, error: "unknown-report" });
      const stored = await saveChart(accounts);
      return reply(200, { ok: true, kind, rows: accounts.length, stored });
    }
    if (kind === "tb") {
      const branch = String(form.get("branch") ?? "all") as AcctBranch;
      const basis = String(form.get("basis") ?? "posted") as AcctBasis;
      const from = String(form.get("from") ?? "");
      const to = String(form.get("to") ?? "");
      if (!["abha", "khamis", "all"].includes(branch) || !["posted", "all"].includes(basis) || !ISO.test(from) || !ISO.test(to) || from.slice(0, 7) !== to.slice(0, 7))
        return reply(400, { ok: false, error: "fields" });
      const rows = parseTrialBalance(table);
      if (!rows.length) return reply(422, { ok: false, error: "unknown-report" });
      const read = tbTotals(rows);
      const stored = await saveTrialBalance(from.slice(0, 7), branch, basis, { from, to, rows, importedAt: new Date().toISOString() });
      return reply(200, { ok: true, kind, rows: rows.length, read, stored });
    }
    if (kind === "statement") {
      const account = String(form.get("account") ?? "");
      const from = String(form.get("from") ?? "");
      const to = String(form.get("to") ?? "");
      if (!/^\d[\d-]{1,20}$/.test(account) || !ISO.test(from) || !ISO.test(to)) return reply(400, { ok: false, error: "fields" });
      const { opening, lines } = parseStatement(table, account);
      // An account with no movement this year is a valid, empty statement.
      const stored = await saveStatement({ code: account, from, to, opening, lines, importedAt: new Date().toISOString() });
      // Revenue accounts (the lab's 4103/4106/4109): how many lines each source module brings, and how
      // many sit on a month's last day, to tell daily entries from monthly ones (names of modules only).
      const modules: Record<string, { lines: number; monthEnd: number }> = {};
      if (account.startsWith("41")) {
        for (const l of lines) {
          const m = (l.source || "(none)").replace(/[^\p{L}\p{N} &/-]/gu, "").slice(0, 40) || "(none)";
          const last = new Date(Date.UTC(Number(l.date.slice(0, 4)), Number(l.date.slice(5, 7)), 0)).toISOString().slice(0, 10);
          modules[m] ??= { lines: 0, monthEnd: 0 };
          modules[m].lines++;
          if (l.date === last) modules[m].monthEnd++;
        }
      }
      return reply(200, { ok: true, kind, rows: lines.length, read: stTotals(lines), stored, ...(account.startsWith("41") ? { modules } : {}) });
    }
    if (kind === "unposted") {
      const to = String(form.get("to") ?? "");
      if (!ISO.test(to)) return reply(400, { ok: false, error: "fields" });
      const items = parseUnposted(table);
      const stored = await saveUnposted(to, items);
      return reply(200, { ok: true, kind, rows: stored, read: items.length });
    }
    return reply(400, { ok: false, error: "kind" });
  } catch (error) {
    console.error("acct: ingest failed", error);
    return reply(500, { ok: false });
  }
}
