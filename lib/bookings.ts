import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { BlobPreconditionFailedError, del, list } from "@vercel/blob";
import { revalidateTag, unstable_cache } from "next/cache";
import { isBlobConfigured } from "./blob";
import { privateStore, readBlobJson, readPrivateJson, writeBlobJson } from "./privateBlob";
import { getSettings } from "./db";
import type { Booking, BookingStatus } from "./types";

// Online appointment requests, worked by the call center.
//
// With Vercel Blob, all requests are one JSON file in the private store
// (see lib/privateBlob.ts), where no link can open it. Reading the board
// is then a single read, not a listing plus one read per request (which
// used up the Blob plan's operations). Every change is saved only if the
// file hasn't changed since it was read, and redone on the newer version
// otherwise, so requests arriving at the same moment are all kept.
//
// Without Blob (local development) they're kept in a JSON file.

const BOOKINGS_PATH = "data/bookings.json";
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

type BookingsFile = { bookings: Booking[] };

/** Requests saved the old way: one file each, in this folder. */
const LEGACY_PREFIX = "bookings/";

/** Every legacy request file in a store, with its URL (for removal). */
async function readLegacyBookings(
  store: ReturnType<typeof privateStore>
): Promise<{ booking: Booking; url: string }[]> {
  const found: { booking: Booking; url: string }[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: LEGACY_PREFIX, limit: 1000, cursor, ...store });
    const read = await Promise.all(
      page.blobs.map(async (blob) => {
        const booking = store
          ? await readPrivateJson<Booking>(blob.pathname)
          : await fetch(`${blob.url}?v=${new Date(blob.uploadedAt).getTime()}`, { cache: "no-store" })
              .then((r) => (r.ok ? (r.json() as Promise<Booking>) : null));
        return booking ? { booking, url: blob.url } : null;
      })
    );
    found.push(...read.filter((r): r is { booking: Booking; url: string } => r !== null));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return found;
}

/**
 * One-time move: requests saved one file each (private store, and any
 * left in the public store) go into the single bookings file, then those
 * files are removed. If another instance creates the file first, its copy
 * is kept and this one does nothing.
 */
async function moveLegacyBookings(): Promise<void> {
  const store = privateStore();
  const [kept, older] = await Promise.all([
    store ? readLegacyBookings(store) : Promise.resolve([]),
    readLegacyBookings(null),
  ]);
  const byId = new Map<string, Booking>();
  // The private copy wins over an older public one of the same request.
  for (const { booking } of [...older, ...kept]) byId.set(booking.id, booking);
  try {
    await writeBlobJson(BOOKINGS_PATH, { bookings: [...byId.values()] } satisfies BookingsFile, {
      create: true,
    });
  } catch (error) {
    if (await readBlobJson<BookingsFile>(BOOKINGS_PATH)) return;
    throw error;
  }
  try {
    if (kept.length > 0) await del(kept.map((r) => r.url), store ?? undefined);
    if (older.length > 0) await del(older.map((r) => r.url));
  } catch (error) {
    console.error("Failed to remove the old booking files:", error);
  }
}

async function readBookingsFile(): Promise<{ bookings: Booking[]; etag: string }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const saved = await readBlobJson<BookingsFile>(BOOKINGS_PATH);
    if (saved) return { bookings: saved.data.bookings ?? [], etag: saved.etag };
    await moveLegacyBookings();
  }
  throw new Error("Failed to set up the bookings file");
}

async function readAllBlob(): Promise<Booking[]> {
  return (await readBookingsFile()).bookings;
}

const readAllBlobCached = unstable_cache(readAllBlob, [CACHE_TAG, "file"], {
  tags: [CACHE_TAG],
});

/**
 * Applies a change to the saved requests. On Blob the file is saved only
 * if nobody else saved it in between; otherwise the change is re-applied
 * to the newer version, so two requests arriving together are both kept.
 * `change` returns the new list (null: nothing to save) and a result.
 */
async function changeBookings<T>(
  change: (all: Booking[]) => { next: Booking[] | null; result: T }
): Promise<T> {
  if (!isBlobConfigured()) {
    const { next, result } = change(readLocal());
    if (next) writeLocal(next);
    revalidateTag(CACHE_TAG);
    return result;
  }
  for (let attempt = 0; attempt < 8; attempt++) {
    const { bookings, etag } = await readBookingsFile();
    const { next, result } = change(bookings);
    if (!next) return result;
    try {
      await writeBlobJson(BOOKINGS_PATH, { bookings: next } satisfies BookingsFile, { ifMatch: etag });
      revalidateTag(CACHE_TAG);
      return result;
    } catch (error) {
      if (!(error instanceof BlobPreconditionFailedError)) throw error;
      // Saved by someone else meanwhile: wait a moment, then redo on theirs.
      await new Promise((r) => setTimeout(r, 50 + Math.random() * 200));
    }
  }
  throw new Error("Bookings file is busy, try again");
}

// --- API ---

/** Newest first. */
export async function getBookings(): Promise<Booking[]> {
  const all = isBlobConfigured() ? await readAllBlobCached() : readLocal();
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
  return changeBookings((all) => ({ next: [booking, ...all], result: booking }));
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

  return changeBookings((all) => {
    const index = all.findIndex((b) => b.id === id);
    if (index === -1) return { next: null, result: false };
    const next = [...all];
    next[index] = apply(all[index]);
    return { next, result: true };
  });
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

  return changeBookings((all) => {
    const moved = all.filter(matches).length;
    return { next: moved > 0 ? all.map((b) => (matches(b) ? apply(b) : b)) : null, result: moved };
  });
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
  const old = (b: Booking) => ID_PATTERN.test(b.id) && riyadhDay(createdAtFromId(b.id)) <= day;
  return changeBookings((all) => {
    const kept = all.filter((b) => !old(b));
    const deleted = all.length - kept.length;
    return { next: deleted > 0 ? kept : null, result: deleted };
  });
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
