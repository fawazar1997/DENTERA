import { NextRequest, NextResponse } from "next/server";
import { ingestKeyOk } from "@/lib/finance";
import { readSpreadsheet } from "@/lib/spreadsheet";
import { parseAppointments, saveAppointments } from "@/lib/opsAppointments";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const reply = (status: number, body: object) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The robot sends the PMS operating reports here (multipart: «file», «kind» = appointments,
 * «branch» = abha | khamis, «from» / «to» as YYYY-MM-DD), with the same key as the other
 * reports. The answer gives counts only (read and stored), never data.
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
  const branch = String(form.get("branch") ?? "").toLowerCase();
  const from = String(form.get("from") ?? "");
  const to = String(form.get("to") ?? "");
  if (kind !== "appointments") return reply(400, { ok: false, error: "kind" });
  if ((branch !== "abha" && branch !== "khamis") || !ISO.test(from) || !ISO.test(to) || from > to) return reply(400, { ok: false, error: "fields" });
  try {
    const table = readSpreadsheet(new Uint8Array(await file.arrayBuffer()), file.name);
    const rows = parseAppointments(table, branch).filter((a) => a.at.slice(0, 10) >= from && a.at.slice(0, 10) <= to);
    const stored = await saveAppointments(branch, from, to, rows);
    const states = rows.reduce<Record<string, number>>((s, a) => ((s[a.state] = (s[a.state] ?? 0) + 1), s), {});
    return reply(200, { ok: true, kind, rows: rows.length, stored, states });
  } catch (error) {
    console.error("ops: ingest failed", error);
    return reply(500, { ok: false });
  }
}
