import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionUser } from "@/lib/auth";
import { canUseSection } from "@/lib/adminRoles";
import { readCareers } from "@/lib/careers";
import { applicantRows, filterApplicants, readQuery } from "@/lib/careersQuery";
import { careersText } from "@/lib/careersText";

export const dynamic = "force-dynamic";

const cell = (v: unknown) => {
  const s = String(v ?? "");
  // Formulas are never run when opened in Excel.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** Control panel: the applicants (as filtered on the page) as a CSV file for Excel. */
export async function GET(request: NextRequest) {
  if (!canUseSection(await sessionUser(request.cookies.get(SESSION_COOKIE)?.value), "/careers")) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const t = careersText("ar");
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const rows = filterApplicants(applicantRows(await readCareers()), readQuery(params));
  const head = [
    t.doneRef, t.appliedOn, t.name, t.gender, t.nationality, t.mobile, t.email, t.city, t.field, t.specialty,
    t.years, t.qualification, t.university, t.gradYear, t.scfhs, t.licenseNo, t.languages, t.score, t.matchFail,
    t.stage, t.rating, t.tags, t.excludedBadge, t.cv,
  ];
  const lines = rows.map((r) => [
    r.ref,
    new Date(r.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Riyadh" }),
    r.name,
    r.gender === "male" ? t.male : t.female,
    r.nationality,
    r.mobile,
    r.email,
    r.city,
    r.fieldName.ar,
    r.specialty,
    r.years,
    t.qualifications[r.qualification],
    r.university,
    r.gradYear,
    t.scfhsStatuses[r.scfhs],
    r.licenseNo,
    r.languages.join("، "),
    r.score,
    r.fails.map((f) => t.matchItems[f as keyof typeof t.matchItems]).join("، "),
    t.stages[r.stage],
    r.rating,
    r.tags.join("، "),
    r.excluded ? r.excluded.reason : "",
    r.files.cv?.link,
  ]);
  const csv = "﻿" + [head, ...lines].map((l) => l.map(cell).join(",")).join("\r\n");
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dentera-applicants-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
