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

/** Saves a private JSON file under a fixed name (replacing the previous one). */
export async function writePrivateJson(pathname: string, data: unknown): Promise<void> {
  const store = privateStore();
  if (!store) throw new Error("The private Blob store isn't connected");
  await put(pathname, JSON.stringify(data), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    ...store,
  });
}
