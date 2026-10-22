export const SESSION_COOKIE = "dentera_admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

/**
 * On Vercel the sign-in secrets must come from the project's environment
 * variables; the built-in fallbacks below only work on a developer's
 * machine. Without them, sign-in is refused rather than falling back to a
 * known password or a known signing key.
 */
const DEPLOYED = Boolean(process.env.VERCEL);

function adminCredentials(): { username: string; password: string } | null {
  const username = (process.env.ADMIN_USERNAME || "dentera").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || (DEPLOYED ? "" : "dentera-admin");
  return password ? { username, password } : null;
}

/**
 * The key session cookies are signed with. It includes the password, so
 * changing the password signs everyone out.
 */
function signingKey(): string | null {
  const secret =
    process.env.SESSION_SECRET || (DEPLOYED ? "" : "dev-only-insecure-secret-change-me");
  const credentials = adminCredentials();
  if (!secret || !credentials) return null;
  return `${secret}\n${credentials.password}`;
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

export async function createSessionToken(): Promise<string> {
  const key = signingKey();
  if (!key) throw new Error("Sign-in is not configured");
  const payload = String(Date.now() + SESSION_TTL_SECONDS * 1000);
  return `${payload}.${await hmac(key, payload)}`;
}

export async function verifySessionToken(
  token: string | undefined
): Promise<boolean> {
  const key = signingKey();
  if (!token || !key) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if (!(await safeEqual(signature, await hmac(key, payload)))) return false;
  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && Date.now() <= expiresAt;
}

/** Checks a username and password against the control panel account. */
export async function checkCredentials(
  username: string,
  password: string
): Promise<boolean> {
  const credentials = adminCredentials();
  if (!credentials) return false;
  // Both are always compared, so a wrong username takes as long as a
  // wrong password.
  const [userOk, passwordOk] = await Promise.all([
    safeEqual(username.trim().toLowerCase(), credentials.username),
    safeEqual(password, credentials.password),
  ]);
  return userOk && passwordOk;
}
