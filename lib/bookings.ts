import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { list, put } from "@vercel/blob";
import { revalidateTag, unstable_cache } from "next/cache";
import { isBlobConfigured } from "./blob";
import { getSettings } from "./db";
import type { Booking, BookingStatus } from "./types";

// Online appointment requests, worked by the call center.
//
// With Vercel Blob, every request is its own small JSON file. Patients'
// submissions never rewrite a shared file, so two arriving together can't
// overwrite each other; a status update rewrites only that request's file.
// Each file name starts with a reversed timestamp, so listing the folder
// (which is alphabetical) returns the newest requests first. Names end in
// random characters and the store isn't listable without its credentials.
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
  await put(`${PREFIX}${booking.id}.json`, JSON.stringify(booking), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}

async function readAllBlobs(): Promise<Booking[]> {
  const { blobs } = await list({ prefix: PREFIX, limit: MAX_SHOWN });
  const results = await Promise.all(
    blobs.map(async (blob) => {
      // The upload time in the query skips any CDN copy of an older version.
      const url = `${blob.url}?v=${new Date(blob.uploadedAt).getTime()}`;
      try {
        const response = await fetch(url, { cache: "no-store" });
        return response.ok ? ((await response.json()) as Booking) : null;
      } catch {
        return null;
      }
    })
  );
  return results.filter((b): b is Booking => b !== null);
}

const readAllBlobsCached = unstable_cache(readAllBlobs, [CACHE_TAG], {
  tags: [CACHE_TAG],
});

// --- API ---

/** Newest first. */
export async function getBookings(): Promise<Booking[]> {
  const all = isBlobConfigured() ? await readAllBlobsCached() : readLocal();
  return [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, MAX_SHOWN);
}

export async function createBooking(
  input: Pick<Booking, "name" | "phone" | "departmentId" | "doctorId" | "source">
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
  change: { status: BookingStatus; note?: string; agent?: string }
): Promise<boolean> {
  if (!ID_PATTERN.test(id)) return false;
  const now = new Date().toISOString();

  const apply = (b: Booking): Booking => ({
    ...b,
    status: change.status,
    note: change.note,
    agent: change.agent ?? b.agent,
    updatedAt: now,
    history: [...(b.history ?? []), { status: change.status, at: now, agent: change.agent }].slice(-20),
  });

  if (isBlobConfigured()) {
    const { blobs } = await list({ prefix: `${PREFIX}${id}.json`, limit: 1 });
    const blob = blobs[0];
    if (!blob) return false;
    const response = await fetch(`${blob.url}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return false;
    await writeBlob(apply((await response.json()) as Booking));
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

/** True when `key` matches the call-center link saved in the control panel. */
export async function isValidBookingsKey(key: string | undefined | null): Promise<boolean> {
  const saved = (await getSettings()).bookingsKey;
  if (!saved || !key) return false;
  const a = Buffer.from(saved);
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
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
