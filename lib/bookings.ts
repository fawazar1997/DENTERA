import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { del, list, put } from "@vercel/blob";
import { revalidateTag, unstable_cache } from "next/cache";
import { isBlobConfigured } from "./blob";
import { privateStore, readPrivateJson } from "./privateBlob";
import { getSettings } from "./db";
import type { Booking, BookingStatus } from "./types";

// Online appointment requests, worked by the call center.
//
// With Vercel Blob, every request is its own small JSON file. Patients'
// submissions never rewrite a shared file, so two arriving together can't
// overwrite each other; a status update rewrites only that request's file.
// Each file name starts with a reversed timestamp, so listing the folder
// (which is alphabetical) returns the newest requests first.
//
// They're kept in the private store (see lib/privateBlob.ts), where no
// link can open them. Any left in the public store from before are copied
// over when read, then deleted from the public store.
//
// Without Blob (local development) they're kept in a JSON file.

const PREFIX = "bookings/";
const CACHE_TAG = "dentera-bookings";
/** Requests shown on the board (newest first). */
const MAX_SHOWN = 500;
const ID_PATTERN = /^\d{13}-[0-9a-f]{16}$/;

const LOCAL_PATH = path.join(process.cwd(), "data", "bookings.local.json");
const TMP_PATH = path.join(os.tmpdir(), "dentera-bookings.json");

export const BOOKING_STATUSES: BookingStatus[] = [
  "new",
  "no_answer",
  "contacted",
  "callback",
  "booked",
  "cancelled",
];

export { BOOKING_EXTENSIONS } from "./extensions";

export function isBookingStatus(value: string): value is BookingStatus {
  return (BOOKING_STATUSES as string[]).includes(value);
}

function newId(): string {
  // 9999999999999 − now keeps names in newest-first order for ~250 years.
  const reversed = String(9_999_999_999_999 - Date.now()).padStart(13, "0");
  return `${reversed}-${randomBytes(8).toString("hex")}`;
}

// --- File backend (local development) ---

function localPath(): string {
  try {
    fs.accessSync(path.dirname(LOCAL_PATH), fs.constants.W_OK);
    return LOCAL_PATH;
  } catch {
    return TMP_PATH;
  }
}

function readLocal(): Booking[] {
  try {
    return JSON.parse(fs.readFileSync(localPath(), "utf-8")) as Booking[];
  } catch {
    return [];
  }
}

function writeLocal(bookings: Booking[]): void {
  fs.writeFileSync(localPath(), JSON.stringify(bookings, null, 2));
}

// --- Blob backend ---

async function writeBlob(booking: Booking): Promise<void> {
  const store = privateStore();
  await put(`${PREFIX}${booking.id}.json`, JSON.stringify(booking), {
    access: store ? "private" : "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
    ...store,
  });
}

/** Requests in the public store (all of them, before the private store). */
async function readPublicEntries(): Promise<{ booking: Booking; url: string }[]> {
  const { blobs } = await list({ prefix: PREFIX, limit: MAX_SHOWN });
  const results = await Promise.all(
    blobs.map(async (blob) => {
      // The upload time in the query skips any CDN copy of an older version.
      const url = `${blob.url}?v=${new Date(blob.uploadedAt).getTime()}`;
      try {
        const response = await fetch(url, { cache: "no-store" });
        return response.ok ? { booking: (await response.json()) as Booking, url: blob.url } : null;
      } catch {
        return null;
      }
    })
  );
  return results.filter((r): r is { booking: Booking; url: string } => r !== null);
}

async function readPublicBlobs(): Promise<Booking[]> {
  return (await readPublicEntries()).map((r) => r.booking);
}

/** Requests in the private store, plus the ids of every file listed there. */
async function readPrivateBlobs(
  store: NonNullable<ReturnType<typeof privateStore>>
): Promise<{ bookings: Booking[]; listed: Set<string> }> {
  const { blobs } = await list({ prefix: PREFIX, limit: MAX_SHOWN, ...store });
  const results = await Promise.all(
    blobs.map((blob) => readPrivateJson<Booking>(blob.pathname).catch(() => null))
  );
  return {
    bookings: results.filter((b): b is Booking => b !== null),
    listed: new Set(blobs.map((blob) => blob.pathname.slice(PREFIX.length, -".json".length))),
  };
}

async function readAllBlobs(): Promise<Booking[]> {
  const store = privateStore();
  if (!store) return readPublicBlobs();
  const [{ bookings: kept, listed }, older] = await Promise.all([
    readPrivateBlobs(store),
    readPublicEntries(),
  ]);
  // Requests still in the public store (from before the private one) are
  // copied over, and each public file is deleted once its private copy
  // exists. Going by the private listing (not by what could be read) means
  // a private copy that failed to load is never overwritten with the older
  // public one.
  const copied: Booking[] = [];
  const toDelete: string[] = [];
  await Promise.all(
    older.map(async ({ booking, url }) => {
      if (!listed.has(booking.id)) {
        try {
          await writeBlob(booking);
          copied.push(booking);
        } catch (error) {
          console.error("Failed to copy a booking request:", error);
          return;
        }
      }
      toDelete.push(url);
    })
  );
  if (toDelete.length > 0) {
    await del(toDelete).catch((error) =>
      console.error("Failed to remove old public booking files:", error)
    );
  }
  return [...kept, ...copied];
}

/** One request by id, from the private store first, then the public one. */
async function readOneBlob(id: string): Promise<Booking | null> {
  const store = privateStore();
  if (store) {
    const kept = await readPrivateJson<Booking>(`${PREFIX}${id}.json`).catch(() => null);
    if (kept) return kept;
  }
  const { blobs } = await list({ prefix: `${PREFIX}${id}.json`, limit: 1 });
  const blob = blobs[0];
  if (!blob) return null;
  const response = await fetch(`${blob.url}?v=${Date.now()}`, { cache: "no-store" });
  return response.ok ? ((await response.json()) as Booking) : null;
}

const readAllBlobsCached = unstable_cache(readAllBlobs, [CACHE_TAG, "private"], {
  tags: [CACHE_TAG],
});

// --- API ---

/** Newest first. */
export async function getBookings(): Promise<Booking[]> {
  const all = isBlobConfigured() ? await readAllBlobsCached() : readLocal();
  return [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, MAX_SHOWN);
}

export async function createBooking(
  input: Pick<
    Booking,
    "name" | "phone" | "departmentId" | "doctorId" | "branchId" | "source" | "extension"
  >
): Promise<Booking> {
  const now = new Date().toISOString();
  const booking: Booking = { id: newId(), createdAt: now, status: "new", ...input };
  if (isBlobConfigured()) {
    await writeBlob(booking);
  } else {
    writeLocal([booking, ...readLocal()]);
  }
  revalidateTag(CACHE_TAG);
  return booking;
}

export async function updateBooking(
  id: string,
  change: {
    status: BookingStatus;
    note?: string;
    agent?: string;
    /** undefined: keep the current one; null: clear it. */
    extension?: string | null;
  }
): Promise<boolean> {
  if (!ID_PATTERN.test(id)) return false;
  const now = new Date().toISOString();

  const apply = (b: Booking): Booking => {
    const extension = change.extension === undefined ? b.extension : change.extension ?? undefined;
    return {
      ...b,
      status: change.status,
      note: change.note,
      agent: change.agent ?? b.agent,
      extension,
      updatedAt: now,
      history: [
        ...(b.history ?? []),
        { status: change.status, at: now, agent: change.agent, extension },
      ].slice(-20),
    };
  };

  if (isBlobConfigured()) {
    const booking = await readOneBlob(id);
    if (!booking) return false;
    await writeBlob(apply(booking));
  } else {
    const all = readLocal();
    const index = all.findIndex((b) => b.id === id);
    if (index === -1) return false;
    all[index] = apply(all[index]);
    writeLocal(all);
  }
  revalidateTag(CACHE_TAG);
  return true;
}

/** Requests the call center still has to work: not booked or cancelled. */
const OPEN_STATUSES = new Set<BookingStatus>(["new", "no_answer", "contacted", "callback"]);

/**
 * Moves matching requests to another extension at once (e.g. when the
 * staff member on an extension is away). Matches by doctor and/or current
 * extension, optionally one branch, and by default only open requests.
 * Returns how many were moved.
 */
export async function reassignBookings(match: {
  doctorId?: string;
  fromExtension?: string;
  branchId?: string;
  openOnly: boolean;
  to: string;
  agent?: string;
}): Promise<number> {
  if (!match.doctorId && !match.fromExtension) return 0;
  const now = new Date().toISOString();
  const matches = (b: Booking) =>
    (!match.doctorId || b.doctorId === match.doctorId) &&
    (!match.fromExtension || b.extension === match.fromExtension) &&
    (!match.branchId || b.branchId === match.branchId) &&
    (!match.openOnly || OPEN_STATUSES.has(b.status)) &&
    b.extension !== match.to;
  const apply = (b: Booking): Booking => ({
    ...b,
    extension: match.to,
    agent: match.agent ?? b.agent,
    updatedAt: now,
    history: [
      ...(b.history ?? []),
      { status: b.status, at: now, agent: match.agent, extension: match.to },
    ].slice(-20),
  });

  let moved = 0;
  if (isBlobConfigured()) {
    const targets = (await readAllBlobs()).filter(matches);
    // A few at a time, so a big move doesn't flood the store.
    for (let i = 0; i < targets.length; i += 10) {
      await Promise.all(targets.slice(i, i + 10).map((b) => writeBlob(apply(b))));
    }
    moved = targets.length;
  } else {
    const all = readLocal();
    const next = all.map((b) => {
      if (!matches(b)) return b;
      moved++;
      return apply(b);
    });
    writeLocal(next);
  }
  revalidateTag(CACHE_TAG);
  return moved;
}

/** A request's arrival time, read from its id (reversed timestamp). */
function createdAtFromId(id: string): number {
  return 9_999_999_999_999 - Number(id.slice(0, 13));
}

/** "YYYY-MM-DD" of a moment in Saudi time. */
function riyadhDay(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date(ms));
}

/**
 * Permanently deletes every request received on or before `day`
 * ("YYYY-MM-DD", Saudi time). Returns how many were deleted.
 */
export async function deleteBookingsUpTo(day: string): Promise<number> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return 0;
  const old = (id: string) => ID_PATTERN.test(id) && riyadhDay(createdAtFromId(id)) <= day;
  let deleted = 0;

  if (isBlobConfigured()) {
    // The private store and the public one (copies from before the private
    // store); each request is counted once even if both hold a copy.
    const store = privateStore();
    const ids = new Set<string>();
    for (const options of store ? [store, {}] : [{}]) {
      let cursor: string | undefined;
      do {
        const page = await list({ prefix: PREFIX, limit: 1000, cursor, ...options });
        const gone = page.blobs.filter((b) => old(b.pathname.slice(PREFIX.length, -".json".length)));
        if (gone.length > 0) {
          await del(gone.map((b) => b.url), options);
          for (const b of gone) ids.add(b.pathname);
        }
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
    }
    deleted = ids.size;
  } else {
    const all = readLocal();
    const kept = all.filter((b) => !old(b.id));
    deleted = all.length - kept.length;
    writeLocal(kept);
  }
  revalidateTag(CACHE_TAG);
  return deleted;
}

function sameKey(saved: string | undefined, key: string): boolean {
  if (!saved || !key) return false;
  const a = Buffer.from(saved);
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Who a private bookings link belongs to: the supervisor (who also assigns
 * extensions) or the call center; null for a wrong or revoked key.
 */
export async function bookingsRole(
  key: string | undefined | null
): Promise<"supervisor" | "agent" | null> {
  if (!key) return null;
  const settings = await getSettings();
  if (sameKey(settings.bookingsSupervisorKey, key)) return "supervisor";
  if (sameKey(settings.bookingsKey, key)) return "agent";
  return null;
}

/**
 * Saudi mobile in the 05XXXXXXXX form, from what a patient may type:
 * Arabic digits, spaces/dashes, +966 / 966 / 00966 prefixes, or 5XXXXXXXX.
 */
export function normalizeSaudiMobile(input: string): string | null {
  const digits = input
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[^\d]/g, "");
  const local = digits.replace(/^(00966|966)/, "").replace(/^0/, "");
  return /^5\d{8}$/.test(local) ? `0${local}` : null;
}
