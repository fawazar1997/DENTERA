import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./auth";

/** Holds the one-time state of a Google sign-in in progress. */
export const GOOGLE_STATE_COOKIE = "dentera_google_state";

export async function isAdminRequest(request: NextRequest): Promise<boolean> {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}

export function requestOrigin(request: NextRequest): string {
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0].trim() || request.nextUrl.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host;
  return `${proto}://${host}`;
}

/** Where Google sends the admin back (must be listed in the Google Cloud credentials). */
export function googleRedirectUri(request: NextRequest): string {
  return `${requestOrigin(request)}/api/admin/google/callback`;
}
