import type { NextRequest } from "next/server";

export const GOOGLE_STATE_COOKIE = "dentera_google_state";

export function isHttps(request: NextRequest): boolean {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto) return forwardedProto.split(",")[0].trim() === "https";
  return request.nextUrl.protocol === "https:";
}

/**
 * Where Google sends the clinic back after consent. It must be listed
 * exactly in the Google Cloud app (e.g. https://dentera.com.sa/api/admin/google/callback).
 */
export function googleRedirectUri(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  return `${isHttps(request) ? "https" : "http"}://${host}/api/admin/google/callback`;
}
