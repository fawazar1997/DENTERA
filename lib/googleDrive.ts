import fs from "node:fs";
import path from "node:path";
import { isBlobConfigured } from "./blob";
import { readBlobJson, writeBlobJson } from "./privateBlob";

// Google Drive, where the letters archive keeps its files (the site keeps
// only the register). The clinic's Google account authorises the site once
// from the control panel (OAuth); the resulting refresh token is kept in the
// private store. The Google Cloud app's id and secret are Vercel settings:
// GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.
//
// Files are uploaded with resumable sessions: the server starts a session in
// the right folder, and the browser sends the file straight to Google, so
// big scans never pass through (or count against) the site.

const TOKEN_PATH = "data/google-drive.json";
const LOCAL_TOKEN_PATH = path.join(process.cwd(), "data", "google-drive.local.json");

// Overridable only so tests can point at a stand-in server.
const ACCOUNTS = process.env.GOOGLE_ACCOUNTS_BASE || "https://accounts.google.com";
const OAUTH = process.env.GOOGLE_OAUTH_BASE || "https://oauth2.googleapis.com";
const API = process.env.GOOGLE_API_BASE || "https://www.googleapis.com";

const SCOPES = ["https://www.googleapis.com/auth/drive", "openid", "email"];

type SavedToken = { refreshToken: string | null; email?: string; connectedAt?: string };

/** A Drive file, as the archive needs it. */
export type DriveFile = { id: string; name: string; parents?: string[]; webViewLink?: string; size?: string };

export class DriveError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

/** True when the Google Cloud app's id and secret are set in Vercel. */
export function isDriveAppConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

async function readToken(): Promise<SavedToken | null> {
  if (!isBlobConfigured()) {
    try {
      return JSON.parse(fs.readFileSync(LOCAL_TOKEN_PATH, "utf-8")) as SavedToken;
    } catch {
      return null;
    }
  }
  return (await readBlobJson<SavedToken>(TOKEN_PATH))?.data ?? null;
}

async function writeToken(token: SavedToken): Promise<void> {
  if (isBlobConfigured()) await writeBlobJson(TOKEN_PATH, token);
  else fs.writeFileSync(LOCAL_TOKEN_PATH, JSON.stringify(token, null, 2));
  cachedAccess = null;
}

/** The connected Google account (null until the clinic connects one). */
export async function getDriveConnection(): Promise<{ email?: string; connectedAt?: string } | null> {
  const token = await readToken();
  return token?.refreshToken ? { email: token.email, connectedAt: token.connectedAt } : null;
}

/** Google's consent page, returning to `redirectUri` with a code. */
export function driveAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    // Always ask, so Google sends a refresh token even on a reconnect.
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${ACCOUNTS}/o/oauth2/v2/auth?${params}`;
}

/** Trades the consent code for a refresh token and saves it. */
export async function connectDrive(code: string, redirectUri: string): Promise<string | undefined> {
  const response = await fetch(`${OAUTH}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as {
    refresh_token?: string;
    access_token?: string;
    expires_in?: number;
    id_token?: string;
  };
  if (!response.ok || !data.refresh_token) throw new DriveError("token-exchange", response.status);
  // The account's email, from the signed-in identity (shown in the panel).
  let email: string | undefined;
  try {
    const payload = data.id_token?.split(".")[1];
    if (payload) email = JSON.parse(Buffer.from(payload, "base64url").toString()).email;
  } catch {
    // Not essential.
  }
  await writeToken({ refreshToken: data.refresh_token, email, connectedAt: new Date().toISOString() });
  return email;
}

/** Forgets the account (and tells Google to revoke the token). */
export async function disconnectDrive(): Promise<void> {
  const token = await readToken();
  if (token?.refreshToken) {
    await fetch(`${OAUTH}/revoke?token=${encodeURIComponent(token.refreshToken)}`, {
      method: "POST",
      cache: "no-store",
    }).catch(() => undefined);
  }
  await writeToken({ refreshToken: null });
}

let cachedAccess: { token: string; expiresAt: number } | null = null;
let refreshing: Promise<string> | null = null;

async function accessToken(): Promise<string> {
  if (cachedAccess && cachedAccess.expiresAt > Date.now() + 60_000) return cachedAccess.token;
  // Calls made at the same moment share one refresh.
  refreshing ??= refreshAccessToken().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function refreshAccessToken(): Promise<string> {
  const saved = await readToken();
  if (!saved?.refreshToken || !isDriveAppConfigured()) throw new DriveError("not-connected");
  const response = await fetch(`${OAUTH}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: saved.refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as { access_token?: string; expires_in?: number };
  if (!response.ok || !data.access_token) throw new DriveError("token-refresh", response.status);
  cachedAccess = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return data.access_token;
}

const FILE_FIELDS = "id,name,parents,webViewLink,size";

/**
 * Starts a resumable upload of one file into `folderId` and returns the
 * session address the file is then sent to (by the browser, or the server
 * as a fallback). `origin` lets that browser upload pass Google's CORS check.
 */
export async function startUpload(input: {
  folderId: string;
  name: string;
  mimeType: string;
  size: number;
  origin?: string;
}): Promise<string> {
  const token = await accessToken();
  const response = await fetch(
    `${API}/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=${FILE_FIELDS}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": input.mimeType,
        "X-Upload-Content-Length": String(input.size),
        ...(input.origin ? { Origin: input.origin } : {}),
      },
      body: JSON.stringify({ name: input.name, parents: [input.folderId] }),
      cache: "no-store",
    }
  );
  const location = response.headers.get("location");
  if (!response.ok || !location) throw new DriveError("start-upload", response.status);
  return location;
}

/** Sends the whole file to an upload session (the server-side route). */
export async function sendToUpload(sessionUrl: string, bytes: ArrayBuffer, mimeType: string): Promise<DriveFile> {
  const response = await fetch(sessionUrl, {
    method: "PUT",
    headers: { "Content-Type": mimeType, "Content-Length": String(bytes.byteLength) },
    body: bytes,
    cache: "no-store",
  });
  if (!response.ok) throw new DriveError("upload", response.status);
  return (await response.json()) as DriveFile;
}

/** A file's details (null when it doesn't exist or can't be seen). */
export async function getDriveFile(id: string): Promise<DriveFile | null> {
  if (!/^[\w-]{10,200}$/.test(id)) return null;
  const token = await accessToken();
  const response = await fetch(`${API}/drive/v3/files/${id}?supportsAllDrives=true&fields=${FILE_FIELDS}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new DriveError("get-file", response.status);
  return (await response.json()) as DriveFile;
}

/** A folder's name, to check a folder id in the control panel (null: not reachable). */
export async function checkDriveFolder(id: string): Promise<string | null> {
  try {
    const token = await accessToken();
    const response = await fetch(
      `${API}/drive/v3/files/${encodeURIComponent(id)}?supportsAllDrives=true&fields=id,name,mimeType`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );
    if (!response.ok) return null;
    const data = (await response.json()) as { name?: string; mimeType?: string };
    return data.mimeType === "application/vnd.google-apps.folder" ? data.name ?? "" : null;
  } catch {
    return null;
  }
}

/** A Drive folder or file id from a pasted link (or the id itself). */
export function driveIdFromLink(input: string): string {
  const text = input.trim();
  const match =
    text.match(/\/folders\/([\w-]{10,})/) ??
    text.match(/[?&]id=([\w-]{10,})/) ??
    text.match(/\/d\/([\w-]{10,})/) ??
    text.match(/^([\w-]{10,})$/);
  return match?.[1] ?? "";
}
