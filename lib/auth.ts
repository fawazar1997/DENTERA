export const SESSION_COOKIE = "dentera_admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

/**
 * On Vercel the sign-in secrets must come from the project's environment
 * variables; the built-in fallbacks below only work on a developer's
 * machine. Without them, sign-in is refused rather than falling back to a
 * known password or a known signing key.
 */
const DEPLOYED = Boolean(process.env.VERCEL);

/** Control panel accounts: the full admin, and marketing (a few sections). */
export type AdminUser = "admin" | "marketing";

function credentialsFor(user: AdminUser): { username: string; password: string } | null {
  if (user === "admin") {
    const username = (process.env.ADMIN_USERNAME || "dentera").trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || (DEPLOYED ? "" : "dentera-admin");
    return password ? { username, password } : null;
  }
  // Marketing exists only once its password is set (no built-in fallback).
  const username = (process.env.MARKETING_USERNAME || "pr").trim().toLowerCase();
  const password = process.env.MARKETING_PASSWORD || "";
  return password ? { username, password } : null;
}

/**
 * The key a user's session cookies are signed with. It includes that user's
 * password, so changing a password signs that user out.
 */
function signingKey(user: AdminUser = "admin"): string | null {
  const secret =
    process.env.SESSION_SECRET || (DEPLOYED ? "" : "dev-only-insecure-secret-change-me");
  const credentials = credentialsFor(user);
  if (!secret || !credentials) return null;
  // (The admin's key is unchanged from before there were two accounts, so
  // admin sessions already open stay signed in.)
  return user === "admin" ? `${secret}\n${credentials.password}` : `${secret}\n${user}\n${credentials.password}`;
}

function toBase64Url(bytes: ArrayBuffer): string {
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(key: string, data: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(data)
  );
  return toBase64Url(signature);
}

/**
 * Compares two strings in constant time (both are hashed first, so the
 * time taken doesn't reveal their length or where they differ).
 */
async function safeEqual(a: string, b: string): Promise<boolean> {
  const digest = (s: string) =>
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  const [x, y] = (await Promise.all([digest(a), digest(b)])).map(
    (d) => new Uint8Array(d)
  );
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/** Whether sign-in is set up (on Vercel: the secrets are present). */
export function isAuthConfigured(): boolean {
  return signingKey() !== null;
}

/**
 * A session token: "<expires>.<signature>" for the admin (as before), or
 * "marketing~<expires>.<signature>" for marketing, each signed with that
 * user's own key.
 */
export async function createSessionToken(user: AdminUser = "admin"): Promise<string> {
  const key = signingKey(user);
  if (!key) throw new Error("Sign-in is not configured");
  const expires = String(Date.now() + SESSION_TTL_SECONDS * 1000);
  const payload = user === "admin" ? expires : `${user}~${expires}`;
  return `${payload}.${await hmac(key, payload)}`;
}

/** Who a session token belongs to (null: missing, forged or expired). */
export async function sessionUser(token: string | undefined): Promise<AdminUser | null> {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const [user, expires]: [AdminUser, string] = payload.includes("~")
    ? payload.split("~")[0] === "marketing"
      ? ["marketing", payload.split("~")[1]]
      : ["admin", ""]
    : ["admin", payload];
  const key = signingKey(user);
  if (!key || !expires) return null;
  if (!(await safeEqual(signature, await hmac(key, payload)))) return null;
  const expiresAt = Number(expires);
  return Number.isFinite(expiresAt) && Date.now() <= expiresAt ? user : null;
}

/**
 * True for the full admin only. Everything that doesn't say otherwise is
 * admin only; the sections marketing may use check `canUseSection`.
 */
export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  return (await sessionUser(token)) === "admin";
}

/** Checks a username and password; returns whose account it is. */
export async function checkCredentials(username: string, password: string): Promise<AdminUser | null> {
  const name = username.trim().toLowerCase();
  let found: AdminUser | null = null;
  // Every account is always compared, so timing doesn't reveal which
  // username exists or how close a guess is.
  for (const user of ["admin", "marketing"] as const) {
    const credentials = credentialsFor(user);
    const [userOk, passwordOk] = await Promise.all([
      safeEqual(name, credentials?.username ?? "\u0000"),
      safeEqual(password, credentials?.password ?? "\u0000"),
    ]);
    if (credentials && userOk && passwordOk && !found) found = user;
  }
  return found;
}
