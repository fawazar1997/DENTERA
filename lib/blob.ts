import { put } from "@vercel/blob";

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

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn(
      "BLOB_READ_WRITE_TOKEN is not set — skipping image upload. " +
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

  const extension = file.name.split(".").pop() || "jpg";
  const pathname = `${folder}/${crypto.randomUUID()}.${extension}`;

  try {
    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: false,
    });
    return blob.url;
  } catch (error) {
    console.error("Image upload to Vercel Blob failed:", error);
    return undefined;
  }
}
