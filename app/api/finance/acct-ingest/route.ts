import { NextRequest, NextResponse } from "next/server";
import { ingestKeyOk } from "@/lib/finance";
import { readSpreadsheet } from "@/lib/spreadsheet";
import { parseChart, parseTrialBalance, saveChart, saveTrialBalance, tbTotals, type AcctBasis, type AcctBranch } from "@/lib/acct";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const reply = (status: number, body: object) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The robot sends each Microchips Accounting export here (multipart:
 * «file», «kind» = tb | chart, and for a trial balance «branch» = abha |
 * khamis | all, «basis» = posted | all, «from» / «to» as YYYY-MM-DD), with
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
    return reply(400, { ok: false, error: "kind" });
  } catch (error) {
    console.error("acct: ingest failed", error);
    return reply(500, { ok: false });
  }
}
