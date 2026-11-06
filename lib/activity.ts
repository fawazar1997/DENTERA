import fs from "node:fs";
import path from "node:path";
import { BlobPreconditionFailedError } from "@vercel/blob";
import { isBlobConfigured } from "./blob";
import { readBlobJson, writeBlobJson } from "./privateBlob";
import type { AdminUser } from "./auth";

// The control panel's activity log: who (the admin or marketing) added,
// changed or deleted what, and when. One private file with the newest
// entries; each addition is saved only if the file is unchanged since it
// was read (ETag) and redone otherwise, so entries made at the same moment
// are all kept.

export type ActivityAction =
  | "create"
  | "update"
  | "delete"
  | "move"
  | "upload"
  | "import"
  | "undo"
  | "link"
  | "connect"
  | "disconnect"
  | "settings";

export type ActivityEntry = {
  /** When, ISO time. */
  at: string;
  user: AdminUser;
  /** Control panel section path ("/doctors", "/letters"…). */
  section: string;
  action: ActivityAction;
  /** What it was done to (a doctor's name, a letter number…). */
  item?: string;
};

type ActivityFile = { entries: ActivityEntry[] };

const ACTIVITY_PATH = "data/activity.json";
const LOCAL_PATH = path.join(process.cwd(), "data", "activity.local.json");
/** How many entries are kept (the oldest are dropped). */
const MAX_ENTRIES = 3000;

function readLocal(): ActivityFile {
  try {
    return JSON.parse(fs.readFileSync(LOCAL_PATH, "utf-8")) as ActivityFile;
  } catch {
    return { entries: [] };
  }
}

/** The log, newest first. */
export async function listActivity(): Promise<ActivityEntry[]> {
  const file = isBlobConfigured()
    ? (await readBlobJson<ActivityFile>(ACTIVITY_PATH))?.data ?? { entries: [] }
    : readLocal();
  return [...file.entries].reverse();
}

async function append(entry: ActivityEntry): Promise<void> {
  const add = (file: ActivityFile): ActivityFile => ({
    entries: [...file.entries, entry].slice(-MAX_ENTRIES),
  });
  if (!isBlobConfigured()) {
    fs.writeFileSync(LOCAL_PATH, JSON.stringify(add(readLocal()), null, 2));
    return;
  }
  for (let attempt = 0; attempt < 8; attempt++) {
    const saved = await readBlobJson<ActivityFile>(ACTIVITY_PATH, { forWrite: true });
    try {
      await writeBlobJson(ACTIVITY_PATH, add(saved?.data ?? { entries: [] }), saved ? { ifMatch: saved.etag } : { create: true });
      return;
    } catch (error) {
      const conflict = error instanceof BlobPreconditionFailedError || (!saved && /exist/i.test(String(error)));
      if (!conflict) throw error;
      await new Promise((r) => setTimeout(r, 50 + Math.random() * 200));
    }
  }
  throw new Error("Activity log is busy");
}

/**
 * Records one change. Never throws: a change that worked must not be
 * reported as failed because its log line couldn't be saved.
 */
export async function logActivity(
  user: AdminUser | null,
  section: string,
  action: ActivityAction,
  item?: string
): Promise<void> {
  if (!user) return;
  try {
    await append({
      at: new Date().toISOString(),
      user,
      section,
      action,
      item: item?.trim().slice(0, 160) || undefined,
    });
  } catch (error) {
    console.error("activity log:", error);
  }
}
