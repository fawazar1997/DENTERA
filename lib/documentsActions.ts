"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "./auth";
import {
  createDocCategory,
  createStaffDocument,
  deleteDocCategory,
  deleteStaffDocument,
  getDocCategories,
  getStaffDocuments,
  moveDocCategory,
  moveStaffDocument,
  updateDocCategory,
  updateStaffDocument,
} from "./db";
import { defaultLocale, isLocale, localePath } from "./i18n";
import { logActivity } from "./activity";
import type { DocCategoryIcon } from "./types";

// Control Panel → Documents: the sections (policies, guides…) and their
// documents, each a link (the files stay in Google Drive). Admin only.

async function requireAdmin(): Promise<void> {
  if (!(await verifySessionToken(cookies().get(SESSION_COOKIE)?.value))) throw new Error("Unauthorized");
}

const str = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

function back(form: FormData, query = ""): never {
  const locale = str(form, "locale");
  redirect(localePath(isLocale(locale) ? locale : defaultLocale, `/admin/documents${query ? `?${query}` : ""}`));
}

function refresh() {
  revalidatePath("/", "layout");
}

const ICONS: DocCategoryIcon[] = ["policies", "guides", "medical", "file"];

function categoryFields(form: FormData) {
  const icon = str(form, "icon") as DocCategoryIcon;
  return {
    nameAr: str(form, "nameAr").slice(0, 80),
    nameEn: str(form, "nameEn").slice(0, 80),
    icon: ICONS.includes(icon) ? icon : "file",
  };
}

export async function createDocCategoryAction(form: FormData) {
  await requireAdmin();
  const fields = categoryFields(form);
  if (!fields.nameAr) back(form, "error=section");
  await createDocCategory(fields);
  await logActivity("admin", "/documents", "create", fields.nameAr);
  refresh();
  back(form, "saved=section");
}

export async function updateDocCategoryAction(form: FormData) {
  await requireAdmin();
  const fields = categoryFields(form);
  if (!fields.nameAr) back(form, "error=section");
  await updateDocCategory(str(form, "id"), fields);
  await logActivity("admin", "/documents", "update", fields.nameAr);
  refresh();
  back(form, "saved=section");
}

export async function moveDocCategoryAction(form: FormData) {
  await requireAdmin();
  const name = (await getDocCategories()).find((c) => c.id === str(form, "id"))?.nameAr;
  await moveDocCategory(str(form, "id"), str(form, "dir") === "up" ? -1 : 1);
  await logActivity("admin", "/documents", "move", name);
  refresh();
  back(form);
}

export async function deleteDocCategoryAction(form: FormData) {
  await requireAdmin();
  const name = (await getDocCategories()).find((c) => c.id === str(form, "id"))?.nameAr;
  const result = await deleteDocCategory(str(form, "id"));
  if (result === "ok") await logActivity("admin", "/documents", "delete", name);
  refresh();
  back(form, result === "ok" ? "saved=deleted" : "error=not-empty");
}

/** A document's title and note. */
function documentText(input: { titleAr?: string; titleEn?: string; note?: string }) {
  return {
    titleAr: (input.titleAr ?? "").trim().slice(0, 200),
    titleEn: (input.titleEn ?? "").trim().slice(0, 200) || undefined,
    note: (input.note ?? "").trim().slice(0, 300) || undefined,
  };
}

/** Adds a document: its section, name and link. */
export async function addDocumentLinkAction(form: FormData) {
  await requireAdmin();
  const category = str(form, "category");
  const link = str(form, "link").slice(0, 1000);
  const text = documentText({ titleAr: str(form, "titleAr"), titleEn: str(form, "titleEn"), note: str(form, "note") });
  const categories = await getDocCategories();
  if (!categories.some((c) => c.id === category) || !text.titleAr || !/^https:\/\/\S+$/.test(link)) {
    back(form, "error=document");
  }
  await createStaffDocument({ category, link, ...text, createdAt: new Date().toISOString() });
  await logActivity("admin", "/documents", "create", text.titleAr);
  refresh();
  back(form, `saved=document&section=${encodeURIComponent(category)}`);
}

export async function updateDocumentAction(form: FormData) {
  await requireAdmin();
  const category = str(form, "category");
  const link = str(form, "link").slice(0, 1000);
  const text = documentText({ titleAr: str(form, "titleAr"), titleEn: str(form, "titleEn"), note: str(form, "note") });
  const categories = await getDocCategories();
  if (!categories.some((c) => c.id === category) || !text.titleAr || !/^https:\/\/\S+$/.test(link)) {
    back(form, "error=document");
  }
  await updateStaffDocument(str(form, "id"), { category, link, ...text });
  await logActivity("admin", "/documents", "update", text.titleAr);
  refresh();
  back(form, "saved=document");
}

export async function moveDocumentAction(form: FormData) {
  await requireAdmin();
  const name = (await getStaffDocuments()).find((d) => d.id === str(form, "id"))?.titleAr;
  await moveStaffDocument(str(form, "id"), str(form, "dir") === "up" ? -1 : 1);
  await logActivity("admin", "/documents", "move", name);
  refresh();
  back(form);
}

/** Removes a document from the list (the file itself is untouched). */
export async function deleteDocumentAction(form: FormData) {
  await requireAdmin();
  const name = (await getStaffDocuments()).find((d) => d.id === str(form, "id"))?.titleAr;
  await deleteStaffDocument(str(form, "id"));
  await logActivity("admin", "/documents", "delete", name);
  refresh();
  back(form, "saved=deleted");
}
