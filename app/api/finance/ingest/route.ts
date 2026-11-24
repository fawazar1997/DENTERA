import { NextRequest, NextResponse } from "next/server";
import { importReportFile, ingestKeyOk, recordRun } from "@/lib/finance";
import { branchOf } from "@/lib/financeImport";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const reply = (status: number, body: object) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * The robot sends each PMS report here (multipart: «file», optional
 * «branch»), with its key: «Authorization: Bearer <FINANCE_INGEST_KEY>».
 * The answer says what was read, never the figures.
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
  const branchText = String(form.get("branch") ?? "");
  try {
    const result = await importReportFile(new Uint8Array(await file.arrayBuffer()), file.name, branchText ? branchOf(branchText) : undefined);
    if (!result.ok) return reply(422, { ok: false, error: "unknown-report" });
    return reply(200, { ok: true, kind: result.kind, rows: result.rows, months: result.months.length });
  } catch (error) {
    console.error("finance: ingest failed", error);
    await recordRun({ at: new Date().toISOString(), ok: false, source: "robot", note: "ingest" }).catch(() => undefined);
    return reply(500, { ok: false });
  }
}
