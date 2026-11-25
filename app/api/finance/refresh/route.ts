import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, sessionUser } from "@/lib/auth";
import { canUseSection } from "@/lib/adminRoles";
import { refreshState, startRefresh } from "@/lib/financeRefresh";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

/** Control Panel only (the admin and the finance account): never the share links, which carry no session. */
async function financeUser() {
  const user = await sessionUser(cookies().get(SESSION_COOKIE)?.value);
  return user && canUseSection(user, "/finance") && (user === "admin" || user === "finance") ? user : null;
}

/** The update's state: running (any run, scheduled or manual), the last result, when it can be pressed again. */
export async function GET() {
  if (!(await financeUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  return NextResponse.json(await refreshState(), { headers: noStore });
}

/** «تحديث الآن»: starts the robot's refresh run (read-only in the source systems). */
export async function POST(request: NextRequest) {
  const user = await financeUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  // Same site only.
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== (request.headers.get("x-forwarded-host") ?? request.headers.get("host"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403, headers: noStore });
  }
  const result = await startRefresh(user);
  if (result.ok) return NextResponse.json(result.state, { headers: noStore });
  const status = result.error === "too-soon" ? 429 : result.error === "running" ? 409 : result.error === "no-token" ? 503 : 502;
  return NextResponse.json(result, { status, headers: noStore });
}
