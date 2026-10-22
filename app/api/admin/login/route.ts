import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  checkCredentials,
  createSessionToken,
  isAuthConfigured,
} from "@/lib/auth";

/** Failed sign-ins allowed per address before a pause. */
const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

/**
 * Failed attempts per IP address. Kept in the server's memory, so it
 * slows guessing down per server instance (not a global counter), on top
 * of the delay every failed attempt gets.
 */
const failures = new Map<string, { count: number; resetAt: number }>();

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isLockedOut(ip: string): boolean {
  const entry = failures.get(ip);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    failures.delete(ip);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

function recordFailure(ip: string): void {
  const now = Date.now();
  const entry = failures.get(ip);
  if (!entry || now > entry.resetAt) {
    failures.set(ip, { count: 1, resetAt: now + LOCKOUT_MS });
  } else {
    entry.count += 1;
  }
  // Keep the map from growing without bound.
  if (failures.size > 5000) {
    for (const [key, value] of failures) if (now > value.resetAt) failures.delete(key);
  }
}

/** Sign-in must come from this site's own pages. */
function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  if (!isAuthConfigured()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  const ip = clientIp(request);
  if (isLockedOut(ip)) {
    return NextResponse.json({ ok: false, error: "too_many_attempts" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.slice(0, 100) : "";
  const password = typeof body?.password === "string" ? body.password.slice(0, 200) : "";

  if (!(await checkCredentials(username, password))) {
    recordFailure(ip);
    // A short pause on every failure makes guessing slow.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
  }

  failures.delete(ip);
  const token = await createSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps(request),
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}

function isHttps(request: NextRequest): boolean {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto) return forwardedProto.split(",")[0].trim() === "https";
  return request.nextUrl.protocol === "https:";
}
