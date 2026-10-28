import { get, put } from "@vercel/blob";

// The private Blob store holds what must never be reachable by a link:
// patients' booking requests and the site database (which includes the
// private link keys and doctors' coordination numbers). Photos, banners
// and logos stay in the public store, since the website shows them.
//
// The store is connected to the project with the "PRIVATE_BLOB" prefix,
// so Vercel provides PRIVATE_BLOB_STORE_ID (signed in through the
// project's built-in identity) and possibly PRIVATE_BLOB_READ_WRITE_TOKEN.
// Until it's connected, everything stays in the public store as before.

/** Options that point a Blob call at the private store (null if not connected). */
export function privateStore(): { storeId?: string; token?: string } | null {
  const storeId = process.env.PRIVATE_BLOB_STORE_ID?.trim();
  const token = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN?.trim();
  if (token) return { token };
  if (storeId) return { storeId };
  return null;
}

/** Reads a private JSON file (null when it doesn't exist). */
export async function readPrivateJson<T>(pathname: string): Promise<T | null> {
  const store = privateStore();
  if (!store) return null;
  const result = await get(pathname, { access: "private", useCache: false, ...store });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  return (await new Response(result.stream).json()) as T;
}

/**
 * Where a data file lives: the private store when connected, otherwise
 * the public store (local previews before the private one existed).
 */
function dataStore() {
  const store = privateStore();
  return store
    ? { access: "private" as const, ...store }
    : { access: "public" as const };
}

/**
 * Reads a JSON data file by name, straight from storage (no CDN copy), with
 * its ETag for a conditional save. Null when it doesn't exist.
 */
export async function readBlobJson<T>(
  pathname: string
): Promise<{ data: T; etag: string } | null> {
  const result = await get(pathname, { useCache: false, ...dataStore() });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  return { data: (await new Response(result.stream).json()) as T, etag: result.blob.etag };
}

/**
 * Saves a JSON data file at a fixed name. With `ifMatch`, only if it hasn't
 * changed since read (throws BlobPreconditionFailedError otherwise); with
 * `create`, only if it doesn't exist yet (throws if it does).
 */
export async function writeBlobJson(
  pathname: string,
  data: unknown,
  options: { ifMatch?: string; create?: boolean } = {}
): Promise<void> {
  await put(pathname, JSON.stringify(data), {
    ...dataStore(),
    addRandomSuffix: false,
    contentType: "application/json",
    cacheControlMaxAge: 60,
    ...(options.ifMatch
      ? { ifMatch: options.ifMatch }
      : { allowOverwrite: !options.create }),
  });
}
