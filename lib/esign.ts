import fs from "node:fs";
import path from "node:path";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { BlobPreconditionFailedError } from "@vercel/blob";
import { revalidateTag } from "next/cache";
import { isBlobConfigured } from "./blob";
import { readBlobJson, writeBlobJson } from "./privateBlob";
import type {
  EsignContact,
  EsignDocument,
  EsignDriveFolders,
  EsignPackage,
  EsignSigner,
  EsignTemplate,
} from "./esignTypes";

export * from "./esignTypes";

// The e-signature system (التوقيع الإلكتروني). Templates are PDFs kept in
// Google Drive with boxes drawn on them (signatures, variables, names) and
// an ordered procedure of signers. A package sends one template to one or
// more copies; each copy has its own values and its own link per signer,
// and becomes one signed PDF in Drive.
//
// Everything but the PDFs is one private file, saved only if unchanged
// since read (ETag) and redone otherwise, as the letters register is. The
// small images (drawn signatures, rendered Arabic text) are private files
// under esign/<document id>/ until the signed PDF is saved.

type EsignFile = {
  /** Next package number per year. */
  counters: Record<string, number>;
  templates: EsignTemplate[];
  packages: EsignPackage[];
  contacts: EsignContact[];
  folders: EsignDriveFolders;
  /** The default message for new signing requests (Settings). */
  messageTemplate?: string;
};

const ESIGN_PATH = "data/esign.json";
const CACHE_TAG = "dentera-esign";
const LOCAL_PATH = path.join(process.cwd(), "data", "esign.local.json");

function emptyFile(): EsignFile {
  return { counters: {}, templates: [], packages: [], contacts: [], folders: {} };
}

function normalize(file: Partial<EsignFile> | null | undefined): EsignFile {
  return { ...emptyFile(), ...(file ?? {}) };
}

function readLocal(): EsignFile {
  try {
    return normalize(JSON.parse(fs.readFileSync(LOCAL_PATH, "utf-8")));
  } catch {
    return emptyFile();
  }
}

/** The whole store, straight from storage (always fresh: signing must see the latest turn). */
export async function readEsign(): Promise<EsignFile> {
  if (!isBlobConfigured()) return readLocal();
  return normalize((await readBlobJson<EsignFile>(ESIGN_PATH))?.data);
}

/**
 * Applies a change. `change` returns the new store (null: nothing to save)
 * and a result; on Blob it's saved only if nobody saved in between, and
 * redone on the newer version otherwise.
 */
export async function changeEsign<T>(change: (file: EsignFile) => { next: EsignFile | null; result: T }): Promise<T> {
  if (!isBlobConfigured()) {
    const { next, result } = change(readLocal());
    if (next) fs.writeFileSync(LOCAL_PATH, JSON.stringify(next, null, 2));
    revalidateTag(CACHE_TAG);
    return result;
  }
  for (let attempt = 0; attempt < 8; attempt++) {
    const saved = await readBlobJson<EsignFile>(ESIGN_PATH, { forWrite: true });
    const { next, result } = change(normalize(saved?.data));
    if (!next) return result;
    try {
      await writeBlobJson(ESIGN_PATH, next, saved ? { ifMatch: saved.etag } : { create: true });
      revalidateTag(CACHE_TAG);
      return result;
    } catch (error) {
      const conflict = error instanceof BlobPreconditionFailedError || (!saved && /exist/i.test(String(error)));
      if (!conflict) throw error;
      await new Promise((r) => setTimeout(r, 50 + Math.random() * 200));
    }
  }
  throw new Error("E-sign store is busy, try again");
}

export function newEsignId(): string {
  return randomBytes(9).toString("base64url");
}

/** A signer link's secret: long and random, never guessable. */
export function newSignToken(): string {
  return randomBytes(24).toString("base64url");
}

function sameKey(saved: string | undefined, key: string): boolean {
  if (!saved || !key) return false;
  const a = Buffer.from(saved);
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The current year in Saudi time. */
function esignYear(now = Date.now()): number {
  return Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric" }).format(now));
}

/** Takes the next package reference (ES-2026-0007) from `file.counters` (mutates the copy given). */
export function takeRef(counters: Record<string, number>): string {
  const year = esignYear();
  const n = counters[String(year)] ?? 1;
  counters[String(year)] = n + 1;
  return `ES-${year}-${String(n).padStart(4, "0")}`;
}

export type SignerContext = {
  pkg: EsignPackage;
  doc: EsignDocument;
  template: EsignTemplate | undefined;
  signer: EsignSigner;
  /** The signer's position in the procedure. */
  stepIndex: number;
};

/** Finds a signer link (null when no copy has it). */
export async function findSigner(token: string): Promise<SignerContext | null> {
  if (!/^[\w-]{20,64}$/.test(token)) return null;
  const file = await readEsign();
  return signerIn(file, token);
}

export function signerIn(file: EsignFile, token: string): SignerContext | null {
  for (const pkg of file.packages) {
    for (const doc of pkg.documents) {
      const stepIndex = doc.signers.findIndex((s) => sameKey(s.token, token));
      if (stepIndex !== -1) {
        return {
          pkg,
          doc,
          template: file.templates.find((t) => t.id === pkg.templateId),
          signer: doc.signers[stepIndex],
          stepIndex,
        };
      }
    }
  }
  return null;
}

/** Where a copy's images live. */
export function imagePath(docId: string, name: string): string {
  return `esign/${docId}/${name}.png`;
}

/** A Riyadh date and time for the faint stamp under a signature: 2026-11-17 10:32 */
export function stampTime(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

/** A package's status from its copies. */
export function packageStatus(pkg: EsignPackage): EsignPackage["status"] {
  if (pkg.status === "cancelled" || pkg.status === "preparing") return pkg.status;
  const open = pkg.documents.some((d) => d.status === "active" || d.status === "preparing");
  return open ? "active" : "completed";
}
