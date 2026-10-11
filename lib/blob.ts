import { put } from "@vercel/blob";

/**
 * Whether Vercel Blob credentials are available. Blob stores connected
 * from the Vercel dashboard today authenticate with OIDC and only set
 * `BLOB_STORE_ID` (no `BLOB_READ_WRITE_TOKEN`); older stores and local
 * setups use the read-write token. The SDK handles either automatically.
 */
export function isBlobConfigured(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID
  );
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Uploads an image file to Vercel Blob storage and returns its public URL.
 * Returns undefined (and logs a warning) if no file was provided, the file
 * doesn't look like an image, or Blob storage isn't configured — callers
 * should treat that as "no change" rather than fail the whole request, so
 * the rest of the form still saves even without a working image host.
 */
export async function uploadImage(
  file: File | null | undefined,
  folder: string
): Promise<string | undefined> {
  if (!file || file.size === 0) return undefined;

  if (!isBlobConfigured()) {
    console.warn(
      "Vercel Blob is not configured — skipping image upload. " +
        "Enable Vercel Blob storage for this project to allow photo uploads."
    );
    return undefined;
  }

  if (file.size > MAX_FILE_SIZE) {
    console.warn(`Image upload rejected: ${file.name} exceeds 5MB.`);
    return undefined;
  }

  if (file.type && !ALLOWED_TYPES.includes(file.type)) {
    console.warn(`Image upload rejected: ${file.name} has unsupported type ${file.type}.`);
    return undefined;
  }

  // Prepare the image once, at upload: upright (phone EXIF rotation),
  // at most 2000px on its longest side, high-quality WebP that keeps
  // transparency. The site then serves this file as-is (no further
  // re-compression), so what's uploaded is what visitors see.
  let body: Blob | Buffer = file;
  let extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  let contentType = file.type || undefined;
  if (file.type !== "image/gif") {
    try {
      const sharp = (await import("sharp")).default;
      body = await sharp(Buffer.from(await file.arrayBuffer()))
        .rotate()
        .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 90, alphaQuality: 100, effort: 5 })
        .toBuffer();
      extension = "webp";
      contentType = "image/webp";
    } catch (error) {
      // Couldn't process (unusual file) — upload the original instead.
      console.warn("Image processing failed; uploading original:", error);
    }
  }
  const pathname = `${folder}/${crypto.randomUUID()}.${extension}`;

  try {
    const blob = await put(pathname, body, {
      access: "public",
      addRandomSuffix: false,
      contentType,
    });
    return blob.url;
  } catch (error) {
    console.error("Image upload to Vercel Blob failed:", error);
    return undefined;
  }
}
