import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { revalidateTag, unstable_cache } from "next/cache";
import { isBlobConfigured } from "./blob";
import { privateStore, readPrivateJson, writePrivateJson } from "./privateBlob";
import { getSettings } from "./db";

// Google reviews of the branches, from their Google Business Profiles.
//
// A manager of the profiles connects their Google account once from the
// control panel (OAuth); the site keeps the refresh token in the private
// store and fetches every review of each branch daily (and on demand).
// The control panel then picks which reviews the website shows, and in
// what order (settings.shownReviews).
//
// Nothing here is stored in the public store: the token is a credential,
// and the reviews file is the site's own working copy. Locally (no Blob)
// both are JSON files in data/.

export type GoogleReview = {
  /** Google's review id. */
  id: string;
  branchId: string;
  author: string;
  photoUrl?: string;
  /** 1–5. */
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
  /** The clinic's public reply, if any. */
  reply?: string;
};

export type BranchReviewSummary = {
  branchId: string;
  /** "accounts/…/locations/…" */
  location: string;
  averageRating?: number;
  totalReviewCount?: number;
};

export type ReviewsData = {
  reviews: GoogleReview[];
  summaries: BranchReviewSummary[];
  syncedAt?: string;
  /** Message of the last failed sync (cleared by a successful one). */
  lastError?: string;
};

type GoogleConnection = {
  refreshToken: string;
  /** The Google account that connected (shown in the control panel). */
  email?: string;
  connectedAt: string;
};

export type GoogleLocation = {
  /** "accounts/…/locations/…" */
  name: string;
  title: string;
  address?: string;
};

const CACHE_TAG = "dentera-google-reviews";
const SCOPE = "https://www.googleapis.com/auth/business.manage";
/** Reviews kept per branch (Google returns 50 per page). */
const MAX_PER_BRANCH = 2000;

// --- Storage ---

const FILES = { connection: "google/connection.json", reviews: "google/reviews.json" };

function localFile(pathname: string): string {
  const name = pathname.replace("/", "-").replace(".json", ".local.json");
  const dir = path.join(process.cwd(), "data");
  try {
    fs.accessSync(dir, fs.constants.W_OK);
    return path.join(dir, name);
  } catch {
    return path.join(os.tmpdir(), `dentera-${name}`);
  }
}

async function readJson<T>(pathname: string): Promise<T | null> {
  if (privateStore()) return readPrivateJson<T>(pathname);
  // Deployed without a private store: nothing is kept (see above).
  if (isBlobConfigured()) return null;
  try {
    return JSON.parse(fs.readFileSync(localFile(pathname), "utf-8")) as T;
  } catch {
    return null;
  }
}

async function writeJson(pathname: string, data: unknown): Promise<void> {
  if (privateStore()) return writePrivateJson(pathname, data);
  if (isBlobConfigured()) throw new Error("The private Blob store isn't connected");
  fs.writeFileSync(localFile(pathname), JSON.stringify(data, null, 2));
}

async function readReviewsData(): Promise<ReviewsData> {
  return (await readJson<ReviewsData>(FILES.reviews)) ?? { reviews: [], summaries: [] };
}

const readReviewsDataCached = unstable_cache(readReviewsData, [CACHE_TAG], {
  tags: [CACHE_TAG],
});

export async function getReviewsData(): Promise<ReviewsData> {
  return readReviewsDataCached();
}

async function saveReviewsData(data: ReviewsData): Promise<void> {
  await writeJson(FILES.reviews, data);
  revalidateTag(CACHE_TAG);
}

/** The reviews chosen for the website, in the chosen order. */
export async function getShownReviews(): Promise<{
  reviews: GoogleReview[];
  summaries: BranchReviewSummary[];
}> {
  const [settings, data] = await Promise.all([getSettings(), getReviewsData()]);
  const byId = new Map(data.reviews.map((r) => [r.id, r]));
  const reviews = (settings.shownReviews ?? [])
    .map((id) => byId.get(id))
    .filter((r): r is GoogleReview => r !== undefined);
  return { reviews, summaries: data.summaries };
}

// --- Google sign-in (OAuth) ---

/** The Google Cloud credentials are set (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET). */
export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: `${SCOPE} openid email`,
    // A refresh token, so the daily sync works without anyone signed in.
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function tokenRequest(body: Record<string, string>) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      ...body,
    }),
    cache: "no-store",
  });
  const json = (await response.json().catch(() => ({}))) as Record<string, string>;
  if (!response.ok) {
    throw new Error(`Google sign-in failed: ${json.error_description || json.error || response.status}`);
  }
  return json;
}

/** Finishes the sign-in: keeps the refresh token for the daily sync. */
export async function completeGoogleConnection(code: string, redirectUri: string): Promise<void> {
  const tokens = await tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
  if (!tokens.refresh_token) {
    throw new Error("Google didn't return a refresh token. Remove the app's access in your Google account and connect again.");
  }
  let email: string | undefined;
  try {
    // The id token came straight from Google over TLS; it's only read for
    // the account's email, shown in the control panel.
    const payload = JSON.parse(Buffer.from(tokens.id_token.split(".")[1], "base64url").toString());
    email = typeof payload.email === "string" ? payload.email : undefined;
  } catch {
    // No email shown; the connection still works.
  }
  const connection: GoogleConnection = {
    refreshToken: tokens.refresh_token,
    email,
    connectedAt: new Date().toISOString(),
  };
  await writeJson(FILES.connection, connection);
}

/** The connected Google account (without its token), or null. */
export async function getGoogleConnection(): Promise<{ email?: string; connectedAt: string } | null> {
  const connection = await readJson<GoogleConnection>(FILES.connection);
  return connection ? { email: connection.email, connectedAt: connection.connectedAt } : null;
}

export async function disconnectGoogle(): Promise<void> {
  const connection = await readJson<GoogleConnection>(FILES.connection);
  if (connection) {
    // Also revoke it at Google, so the token is useless even if a copy exists.
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(connection.refreshToken)}`, {
      method: "POST",
      cache: "no-store",
    }).catch(() => undefined);
  }
  await writeJson(FILES.connection, null);
}

async function accessToken(): Promise<string> {
  const connection = await readJson<GoogleConnection>(FILES.connection);
  if (!connection?.refreshToken) throw new Error("No Google account is connected");
  const tokens = await tokenRequest({
    grant_type: "refresh_token",
    refresh_token: connection.refreshToken,
  });
  return tokens.access_token;
}

async function googleGet<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (json as { error?: { message?: string } }).error?.message;
    throw new Error(`Google API ${response.status}: ${message || response.statusText}`);
  }
  return json as T;
}

// --- Business Profile data ---

/** Every location the connected account manages (to match with branches). */
export async function listGoogleLocations(): Promise<GoogleLocation[]> {
  const token = await accessToken();
  const { accounts = [] } = await googleGet<{ accounts?: { name: string }[] }>(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts?pageSize=20",
    token
  );
  const locations: GoogleLocation[] = [];
  for (const account of accounts) {
    let pageToken = "";
    do {
      const params = new URLSearchParams({
        readMask: "name,title,storefrontAddress",
        pageSize: "100",
        ...(pageToken ? { pageToken } : {}),
      });
      const page = await googleGet<{
        locations?: {
          name: string;
          title?: string;
          storefrontAddress?: { addressLines?: string[]; locality?: string };
        }[];
        nextPageToken?: string;
      }>(`https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?${params}`, token);
      for (const location of page.locations ?? []) {
        const address = location.storefrontAddress;
        locations.push({
          // The reviews API wants the account in the name.
          name: `${account.name}/${location.name}`,
          title: location.title ?? location.name,
          address: [...(address?.addressLines ?? []), address?.locality].filter(Boolean).join("، ") || undefined,
        });
      }
      pageToken = page.nextPageToken ?? "";
    } while (pageToken);
  }
  return locations;
}

const STARS: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

/**
 * A review's own words. Google can append a machine translation, as
 * "(Translated by Google) …" with the original after "(Original)".
 */
export function originalComment(comment: string | undefined): string {
  const text = (comment ?? "").trim();
  const original = text.split("(Original)")[1];
  if (original !== undefined) return original.trim();
  return text.split("(Translated by Google)")[0].trim();
}

type ApiReview = {
  reviewId: string;
  reviewer?: { displayName?: string; profilePhotoUrl?: string; isAnonymous?: boolean };
  starRating?: string;
  comment?: string;
  createTime: string;
  updateTime: string;
  reviewReply?: { comment?: string };
};

/** Fetches every review of each linked branch and saves them. */
export async function syncGoogleReviews(): Promise<ReviewsData> {
  const links = Object.entries((await getSettings()).googleLocations ?? {}).filter(
    (entry): entry is [string, string] => Boolean(entry[1])
  );
  const previous = await readReviewsData();
  try {
    if (links.length === 0) throw new Error("No branch is linked to a Google location yet");
    const token = await accessToken();
    const reviews: GoogleReview[] = [];
    const summaries: BranchReviewSummary[] = [];
    for (const [branchId, location] of links) {
      let pageToken = "";
      let summary: BranchReviewSummary = { branchId, location };
      let count = 0;
      do {
        const params = new URLSearchParams({
          pageSize: "50",
          orderBy: "updateTime desc",
          ...(pageToken ? { pageToken } : {}),
        });
        const page = await googleGet<{
          reviews?: ApiReview[];
          averageRating?: number;
          totalReviewCount?: number;
          nextPageToken?: string;
        }>(`https://mybusiness.googleapis.com/v4/${location}/reviews?${params}`, token);
        summary = {
          branchId,
          location,
          averageRating: page.averageRating ?? summary.averageRating,
          totalReviewCount: page.totalReviewCount ?? summary.totalReviewCount,
        };
        for (const review of page.reviews ?? []) {
          const rating = STARS[review.starRating ?? ""];
          if (!rating) continue;
          reviews.push({
            id: review.reviewId,
            branchId,
            author: review.reviewer?.isAnonymous
              ? ""
              : (review.reviewer?.displayName ?? "").trim(),
            photoUrl: review.reviewer?.isAnonymous ? undefined : review.reviewer?.profilePhotoUrl,
            rating,
            comment: originalComment(review.comment),
            createdAt: review.createTime,
            updatedAt: review.updateTime,
            reply: originalComment(review.reviewReply?.comment) || undefined,
          });
        }
        count += page.reviews?.length ?? 0;
        pageToken = page.nextPageToken ?? "";
      } while (pageToken && count < MAX_PER_BRANCH);
      summaries.push(summary);
    }
    const data: ReviewsData = { reviews, summaries, syncedAt: new Date().toISOString() };
    await saveReviewsData(data);
    return data;
  } catch (error) {
    // Keep the reviews already fetched; record why this sync failed.
    const message = error instanceof Error ? error.message : String(error);
    await saveReviewsData({ ...previous, lastError: message }).catch(() => undefined);
    throw error;
  }
}
