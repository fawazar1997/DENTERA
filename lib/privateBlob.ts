import { BlobNotFoundError, del, get, head, list, put } from "@vercel/blob";

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

/** A data file's current ETag, from the Blob API (null when it doesn't exist). */
export async function blobEtag(pathname: string): Promise<string | null> {
  try {
    return (await head(pathname, privateStore() ?? {})).etag;
  } catch (error) {
    if (error instanceof BlobNotFoundError) return null;
    throw error;
  }
}

/**
 * Reads a JSON data file by name, straight from storage (no CDN copy).
 * Null when it doesn't exist. With `forWrite`, also its ETag for a
 * conditional save: taken from the Blob API (the same source the save is
 * checked against) and before the content, so if the file changes in
 * between, the save is refused and redone rather than overwriting.
 */
export async function readBlobJson<T>(
  pathname: string,
  { forWrite = false }: { forWrite?: boolean } = {}
): Promise<{ data: T; etag: string } | null> {
  const etag = forWrite ? await blobEtag(pathname) : "";
  if (etag === null) return null;
  const result = await get(pathname, { useCache: false, ...dataStore() });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  return { data: (await new Response(result.stream).json()) as T, etag: etag || result.blob.etag };
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

// --- Private binary files (e.g. the e-signature images) ---

const LOCAL_FILES_DIR = "data/private-files";

async function localPath(pathname: string): Promise<string> {
  const path = await import("node:path");
  const safe = pathname.replace(/\.\.+/g, ".").replace(/^\/+/, "");
  return path.join(process.cwd(), LOCAL_FILES_DIR, safe);
}

/** True when files go to Blob (otherwise to data/private-files locally). */
function filesOnBlob(): boolean {
  return Boolean(privateStore() || process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

/** Saves a private file at a fixed name (replacing it). */
export async function putPrivateFile(pathname: string, bytes: Uint8Array, contentType: string): Promise<void> {
  if (!filesOnBlob()) {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const file = await localPath(pathname);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, bytes);
    return;
  }
  await put(pathname, Buffer.from(bytes), {
    ...dataStore(),
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
    cacheControlMaxAge: 60,
  });
}

/** Reads a private file (null when it doesn't exist). */
export async function readPrivateFile(pathname: string): Promise<Uint8Array | null> {
  if (!filesOnBlob()) {
    const fs = await import("node:fs/promises");
    try {
      return new Uint8Array(await fs.readFile(await localPath(pathname)));
    } catch {
      return null;
    }
  }
  const result = await get(pathname, { useCache: false, ...dataStore() });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  return new Uint8Array(await new Response(result.stream).arrayBuffer());
}

/** Deletes every private file under a folder (e.g. "esign/<id>/"). */
export async function deletePrivateFolder(prefix: string): Promise<void> {
  if (!filesOnBlob()) {
    const fs = await import("node:fs/promises");
    await fs.rm(await localPath(prefix), { recursive: true, force: true });
    return;
  }
  const options = privateStore() ?? {};
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, cursor, limit: 1000, ...options });
    if (page.blobs.length) await del(page.blobs.map((b) => b.url), options);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
}

/** Deletes one private file (no error if it isn't there). */
export async function deletePrivateFile(pathname: string): Promise<void> {
  if (!filesOnBlob()) {
    const fs = await import("node:fs/promises");
    await fs.rm(await localPath(pathname), { force: true });
    return;
  }
  const options = privateStore() ?? {};
  const page = await list({ prefix: pathname, limit: 5, ...options });
  const urls = page.blobs.filter((b) => b.pathname === pathname).map((b) => b.url);
  if (urls.length) await del(urls, options);
}
