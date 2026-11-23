"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, sessionUser, type AdminUser } from "./auth";
import { canUseSection } from "./adminRoles";
import { defaultLocale, isLocale, localePath } from "./i18n";
import { logActivity } from "./activity";
import {
  changeEsign,
  imagePath,
  newEsignId,
  newSignToken,
  readEsign,
  takeRef,
  STAMP_PATH,
  contactSignaturePath,
  basePdfPath,
  templateContentPath,
  textFieldsOf,
  templateVariables,
  isDocumentTemplate,
  A4,
  DEFAULT_DOC_SETTINGS,
  MAX_DOC_CONTENT_BYTES,
  MAX_PAGE_IMAGE_BYTES,
  MAX_ESIGN_IMAGE_BYTES,
  MAX_MESSAGE_LENGTH,
  MAX_TEMPLATE_BYTES,
  type EsignDocument,
  type EsignField,
  type EsignPackage,
  type EsignStep,
  type EsignTemplate,
  type EsignVariable,
  type EsignContact,
  type EsignDocSettings,
} from "./esign";
import { deletePrivateFile, deletePrivateFolder, putPrivateFile, readPrivateFile } from "./privateBlob";
import { PDFDocument } from "pdf-lib";
import { docSignatureSteps, docStepRefs, docVariableNames, sanitizeDocContent, EMPTY_DOC } from "./esignDoc";
import { normalizeValue } from "./esignValues";
import {
  DriveError,
  checkDriveFolder,
  createDriveFolder,
  driveHealth,
  driveIdFromLink,
  getDriveFile,
  sendToUpload,
  startUpload,
} from "./googleDrive";
import { finalizeEsignDocument } from "./esignFinalize";
import { SITE_URL } from "./seo";

// Control Panel → التوقيع الإلكتروني (the admin and the HR account): the
// Drive folder, saved signers, templates (PDF + boxes + procedure) and
// signing requests.

/** The signed-in account, if it may use e-signature (else throws). */
async function requireAdmin(): Promise<AdminUser> {
  const user = await sessionUser(cookies().get(SESSION_COOKIE)?.value);
  if (!user || !canUseSection(user, "/esign")) throw new Error("Unauthorized");
  return user;
}

const str = (form: FormData, key: string, max = 200) =>
  String(form.get(key) ?? "").replace(/\s+/g, " ").trim().slice(0, max);

function back(form: FormData, query = ""): never {
  const locale = str(form, "locale");
  redirect(localePath(isLocale(locale) ? locale : defaultLocale, `/admin/esign${query ? `?${query}` : ""}`));
}

function refresh() {
  revalidatePath("/", "layout");
}

const clean = (value: unknown, max = 120) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const phoneOf = (value: unknown) => String(value ?? "").replace(/[^\d+]/g, "").slice(0, 16) || undefined;

/** A file name Drive and Windows both accept. */
function safeName(value: string): string {
  return value.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").slice(0, 120).trim() || "document";
}

/** The page's own address, so the browser may send the file to Google directly. */
function browserOrigin(): string {
  const origin = headers().get("origin");
  if (origin && /^https?:\/\/[\w.-]+(:\d+)?$/.test(origin)) return origin;
  return SITE_URL;
}

// --- Settings ---

export async function setEsignFolderAction(form: FormData) {
  const user = await requireAdmin();
  const id = driveIdFromLink(str(form, "folder", 400));
  if (!id) back(form, "tab=settings&error=folder");
  if ((await driveHealth()) !== "ok") back(form, "tab=settings&error=drive");
  const name = await checkDriveFolder(id);
  if (name === null) back(form, "tab=settings&error=folder");
  const current = (await readEsign()).folders;
  let templates = current.parent === id ? current.templates : undefined;
  let signed = current.parent === id ? current.signed : undefined;
  try {
    // Reuse the subfolders when they still exist, else make them.
    if (!templates || (await checkDriveFolder(templates)) === null) templates = await createDriveFolder("القوالب", id);
    if (!signed || (await checkDriveFolder(signed)) === null) signed = await createDriveFolder("المستندات الموقّعة", id);
  } catch {
    back(form, "tab=settings&error=drive");
  }
  await changeEsign((file) => ({ next: { ...file, folders: { parent: id, parentName: name, templates, signed } }, result: null }));
  await logActivity(user, "/esign", "settings", name || id);
  refresh();
  back(form, "tab=settings&saved=folder");
}

/** The message as typed (line breaks kept), or undefined when empty. */
function messageText(value: unknown): string | undefined {
  const text = String(value ?? "").replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim().slice(0, MAX_MESSAGE_LENGTH);
  return text || undefined;
}

/** Settings: the message new signing requests start with. Empty: back to the built-in one. */
export async function setMessageTemplateAction(form: FormData) {
  const user = await requireAdmin();
  const message = messageText(form.get("message"));
  await changeEsign((file) => ({ next: { ...file, messageTemplate: message }, result: null }));
  await logActivity(user, "/esign", "settings", "نص رسالة الإرسال");
  refresh();
  back(form, "tab=settings&saved=message");
}

/** A request's own message (used for its links from now on). */
export async function setPackageMessageAction(form: FormData) {
  const user = await requireAdmin();
  const id = str(form, "id");
  const message = messageText(form.get("message"));
  const title = await changeEsign((file) => {
    const index = file.packages.findIndex((p) => p.id === id);
    if (index === -1) return { next: null, result: null };
    const packages = [...file.packages];
    packages[index] = { ...packages[index], message };
    return { next: { ...file, packages }, result: `${packages[index].ref} — ${packages[index].title}` };
  });
  if (title) await logActivity(user, "/esign", "update", title);
  refresh();
  back(form, `package=${id}&saved=message`);
}

/** Settings: the clinic stamp (PNG/JPEG/WebP, best with a transparent background). */
export async function uploadStampAction(form: FormData) {
  const user = await requireAdmin();
  const file = form.get("stamp");
  if (!(file instanceof File) || !file.size || file.size > 4 * 1024 * 1024 || !/^image\/(png|jpeg|webp)$/.test(file.type)) {
    back(form, "tab=settings&error=stamp");
  }
  let png: Buffer;
  try {
    const sharp = (await import("sharp")).default;
    png = await sharp(Buffer.from(await (file as File).arrayBuffer()))
      .rotate()
      .resize({ width: 900, height: 900, fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
  } catch {
    back(form, "tab=settings&error=stamp");
  }
  await putPrivateFile(STAMP_PATH, new Uint8Array(png!), "image/png");
  await changeEsign((f) => ({ next: { ...f, stampSavedAt: new Date().toISOString() }, result: null }));
  await logActivity(user, "/esign", "upload", "ختم العيادة");
  refresh();
  back(form, "tab=settings&saved=stamp");
}

export async function deleteStampAction(form: FormData) {
  const user = await requireAdmin();
  await deletePrivateFile(STAMP_PATH);
  await changeEsign((f) => ({ next: { ...f, stampSavedAt: undefined }, result: null }));
  await logActivity(user, "/esign", "delete", "ختم العيادة");
  refresh();
  back(form, "tab=settings");
}

/** Settings: forgets a saved signer's saved signature (they draw it again next time). */
export async function deleteContactSignatureAction(form: FormData) {
  const user = await requireAdmin();
  const id = str(form, "id");
  const name = await changeEsign((file) => {
    const index = file.contacts.findIndex((c) => c.id === id);
    if (index === -1) return { next: null, result: null };
    const contacts = [...file.contacts];
    contacts[index] = { ...contacts[index], signatureSavedAt: undefined, signatureSource: undefined };
    return { next: { ...file, contacts }, result: contacts[index].name };
  });
  await deletePrivateFile(contactSignaturePath(id)).catch(() => undefined);
  if (name) await logActivity(user, "/esign", "delete", `التوقيع المحفوظ — ${name}`);
  refresh();
  back(form, "tab=settings");
}

/**
 * A signature photo or scan as a clean PNG: the paper made transparent (ink
 * darkness becomes opacity), the ink black, the margins trimmed. Null if
 * the image can't be read or has no ink.
 */
async function signatureFromImage(file: File): Promise<Uint8Array | null> {
  try {
    const sharp = (await import("sharp")).default;
    const input = Buffer.from(await file.arrayBuffer());
    const grey = await sharp(input)
      .rotate()
      .flatten({ background: "#ffffff" })
      .resize({ width: 1400, height: 700, fit: "inside", withoutEnlargement: true })
      .greyscale()
      .normalise()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { width, height } = grey.info;
    const rgba = Buffer.alloc(width * height * 4);
    let ink = 0;
    for (let i = 0; i < width * height; i++) {
      const v = grey.data[i];
      // Paper (light) → clear; ink (dark) → solid, with a soft edge.
      const alpha = v >= 215 ? 0 : v <= 110 ? 255 : Math.round(((215 - v) / 105) * 255);
      if (alpha > 128) ink++;
      rgba[i * 4] = 17;
      rgba[i * 4 + 1] = 24;
      rgba[i * 4 + 2] = 39;
      rgba[i * 4 + 3] = alpha;
    }
    if (ink < 50) return null;
    const png = await sharp(rgba, { raw: { width, height, channels: 4 } })
      .trim({ threshold: 1 })
      .resize({ width: 900, height: 450, fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    return new Uint8Array(png);
  } catch {
    return null;
  }
}

function signatureFile(form: FormData): File | null {
  const file = form.get("signature");
  if (!(file instanceof File) || !file.size) return null;
  if (file.size > 5 * 1024 * 1024 || !/^image\/(png|jpeg|webp)$/.test(file.type)) return null;
  return file;
}

export async function addEsignContactAction(form: FormData) {
  const user = await requireAdmin();
  const name = str(form, "name", 80);
  if (!name) back(form, "tab=settings&error=contact");
  const contact: EsignContact = { id: newEsignId(), name, title: str(form, "title", 80) || undefined, phone: phoneOf(form.get("phone")) };
  const file = form.get("signature");
  if (file instanceof File && file.size) {
    const upload = signatureFile(form);
    const png = upload ? await signatureFromImage(upload) : null;
    if (!png) back(form, "tab=settings&error=signature");
    await putPrivateFile(contactSignaturePath(contact.id), png!, "image/png");
    contact.signatureSavedAt = new Date().toISOString();
    contact.signatureSource = "panel";
  }
  await changeEsign((f) => ({ next: { ...f, contacts: [...f.contacts, contact] }, result: null }));
  await logActivity(user, "/esign", "create", name);
  refresh();
  back(form, "tab=settings&saved=contact");
}

/** Settings: a saved signer's name, title and phone. */
export async function updateEsignContactAction(form: FormData) {
  const user = await requireAdmin();
  const id = str(form, "id");
  const name = str(form, "name", 80);
  if (!name) back(form, "tab=settings&error=contact");
  const done = await changeEsign((file) => {
    const index = file.contacts.findIndex((c) => c.id === id);
    if (index === -1) return { next: null, result: false };
    const contacts = [...file.contacts];
    contacts[index] = { ...contacts[index], name, title: str(form, "title", 80) || undefined, phone: phoneOf(form.get("phone")) };
    return { next: { ...file, contacts }, result: true };
  });
  if (done) await logActivity(user, "/esign", "update", name);
  refresh();
  back(form, "tab=settings&saved=contact");
}

/** Settings: uploads a saved signer's signature (a photo or scan of it). */
export async function uploadContactSignatureAction(form: FormData) {
  const user = await requireAdmin();
  const id = str(form, "id");
  const { contacts } = await readEsign();
  const contact = contacts.find((c) => c.id === id);
  const upload = signatureFile(form);
  if (!contact || !upload) back(form, "tab=settings&error=signature");
  const png = await signatureFromImage(upload!);
  if (!png) back(form, "tab=settings&error=signature");
  await putPrivateFile(contactSignaturePath(id), png!, "image/png");
  await changeEsign((file) => ({
    next: {
      ...file,
      contacts: file.contacts.map((c) => (c.id === id ? { ...c, signatureSavedAt: new Date().toISOString(), signatureSource: "panel" as const } : c)),
    },
    result: null,
  }));
  await logActivity(user, "/esign", "upload", `التوقيع المحفوظ — ${contact!.name}`);
  refresh();
  back(form, "tab=settings&saved=signature");
}

/** Settings: the footer line of the letterhead on document templates. */
export async function setLetterheadFooterAction(form: FormData) {
  const user = await requireAdmin();
  const footer = str(form, "footer", 200) || undefined;
  await changeEsign((file) => ({ next: { ...file, letterheadFooter: footer }, result: null }));
  await logActivity(user, "/esign", "settings", "تذييل الترويسة");
  refresh();
  back(form, "tab=settings&saved=footer");
}

export async function deleteEsignContactAction(form: FormData) {
  const user = await requireAdmin();
  const id = str(form, "id");
  const name = await changeEsign((file) => {
    const found = file.contacts.find((c) => c.id === id);
    return found
      ? { next: { ...file, contacts: file.contacts.filter((c) => c.id !== id) }, result: found.name }
      : { next: null, result: "" };
  });
  if (name) {
    await deletePrivateFile(contactSignaturePath(id)).catch(() => undefined);
    await logActivity(user, "/esign", "delete", name);
  }
  refresh();
  back(form, "tab=settings");
}

// --- Templates ---

type PageSize = { w: number; h: number };

function cleanPages(pages: unknown): PageSize[] | null {
  if (!Array.isArray(pages) || pages.length < 1 || pages.length > 200) return null;
  const out = pages.map((p) => ({ w: Number(p?.w), h: Number(p?.h) }));
  return out.every((p) => p.w > 10 && p.h > 10 && p.w < 20000 && p.h < 20000) ? out : null;
}

export type TemplateUploadResult =
  | { ok: true; uploadUrl: string }
  | { ok: false; error: "folder" | "drive" | "file" };

/** Starts sending a template PDF to the «القوالب» folder (the browser then sends the file). */
export async function startTemplateUploadAction(input: { name: string; size: number }): Promise<TemplateUploadResult> {
  const user = await requireAdmin();
  const { folders } = await readEsign();
  if (!folders.templates) return { ok: false, error: "folder" };
  const size = Number(input.size);
  if (!(size > 0 && size <= MAX_TEMPLATE_BYTES)) return { ok: false, error: "file" };
  try {
    const uploadUrl = await startUpload({
      folderId: folders.templates,
      name: `${safeName(clean(input.name))}.pdf`,
      mimeType: "application/pdf",
      size,
      origin: browserOrigin(),
    });
    return { ok: true, uploadUrl };
  } catch {
    return { ok: false, error: "drive" };
  }
}

/** Records a template once its PDF is in Drive. Returns its id. */
export async function finishTemplateUploadAction(input: {
  name: string;
  fileName: string;
  driveFileId: string;
  pages: PageSize[];
}): Promise<{ ok: true; id: string } | { ok: false; error: "file" | "drive" }> {
  const user = await requireAdmin();
  const pages = cleanPages(input.pages);
  const name = clean(input.name, 120);
  if (!pages || !name) return { ok: false, error: "file" };
  const { folders } = await readEsign();
  const file = await getDriveFile(String(input.driveFileId)).catch(() => null);
  if (!file || !folders.templates || !file.parents?.includes(folders.templates)) return { ok: false, error: "drive" };
  const template: EsignTemplate = {
    id: newEsignId(),
    name,
    driveFileId: file.id,
    fileName: clean(input.fileName, 160) || file.name,
    pages,
    steps: [],
    fields: [],
    createdAt: new Date().toISOString(),
  };
  await changeEsign((f) => ({ next: { ...f, templates: [...f.templates, template] }, result: null }));
  await logActivity(user, "/esign", "upload", name);
  refresh();
  return { ok: true, id: template.id };
}

/** Fallback when the browser can't reach Google: the file goes through the server (up to 4 MB). */
export async function uploadTemplateFileAction(form: FormData): Promise<{ ok: true; id: string } | { ok: false; error: "file" | "drive" | "folder" }> {
  const user = await requireAdmin();
  const file = form.get("file");
  if (!(file instanceof File) || file.size > 4 * 1024 * 1024 || file.type !== "application/pdf") return { ok: false, error: "file" };
  const { folders } = await readEsign();
  if (!folders.templates) return { ok: false, error: "folder" };
  let pages: PageSize[] | null = null;
  try {
    pages = cleanPages(JSON.parse(str(form, "pages", 20000)));
  } catch {
    pages = null;
  }
  const name = str(form, "name", 120);
  if (!pages || !name) return { ok: false, error: "file" };
  try {
    const session = await startUpload({ folderId: folders.templates, name: `${safeName(name)}.pdf`, mimeType: "application/pdf", size: file.size });
    const saved = await sendToUpload(session, await file.arrayBuffer(), "application/pdf");
    return finishTemplateUploadAction({ name, fileName: file.name, driveFileId: saved.id, pages });
  } catch (error) {
    return { ok: false, error: error instanceof DriveError ? "drive" : "file" };
  }
}

const unit = (v: unknown) => Math.min(1, Math.max(0, Number(v) || 0));

/** Saves a template's procedure and boxes (from the editor). */
function cleanSteps(input: unknown): EsignStep[] {
  return (Array.isArray(input) ? input : []).slice(0, 20).map((s) => ({
    id: clean(s?.id, 40) || newEsignId(),
    role: clean(s?.role, 60),
    defaultMode: s?.defaultMode === "perCopy" ? "perCopy" : "same",
    defaultContactId: clean(s?.defaultContactId, 40) || undefined,
  }));
}

const VAR_TYPES = new Set(["text", "number", "amount", "date"]);

/** A template's variable list, checked: unique names, valid types, defaults in their stored form. */
function cleanVariables(input: unknown): EsignVariable[] {
  const out: EsignVariable[] = [];
  for (const v of (Array.isArray(input) ? input : []).slice(0, 80)) {
    const name = clean(v?.name, 60).replace(/[{}]/g, "").trim();
    if (!name || out.some((x) => x.name === name)) continue;
    const type = (VAR_TYPES.has(v?.type) ? v.type : "text") as EsignVariable["type"];
    const normal = normalizeValue(clean(v?.default, 300), type);
    const variable: EsignVariable = { name, type };
    if (normal.value && normal.ok) variable.default = normal.value;
    if (v?.fixed === true && variable.default) variable.fixed = true;
    if (type === "amount" && v?.words === true) variable.words = true;
    out.push(variable);
  }
  return out;
}

/** Saves a template's procedure and boxes (from the editor). */
export async function saveTemplateAction(input: {
  id: string;
  name: string;
  steps: EsignStep[];
  fields: EsignField[];
  variables?: EsignVariable[];
}): Promise<{ ok: boolean }> {
  const user = await requireAdmin();
  const name = clean(input.name, 120);
  const steps = cleanSteps(input.steps);
  if (!name || steps.some((s) => !s.role)) return { ok: false };
  const stepIds = new Set(steps.map((s) => s.id));
  const result = await changeEsign((file) => {
    const index = file.templates.findIndex((t) => t.id === input.id);
    if (index === -1) return { next: null, result: false };
    const template = file.templates[index];
    const fields: EsignField[] = (Array.isArray(input.fields) ? input.fields : []).slice(0, 300).flatMap((f) => {
      const kind = f.kind === "signature" || f.kind === "variable" || f.kind === "signerName" || f.kind === "stamp" ? f.kind : null;
      const page = Math.floor(Number(f.page));
      if (!kind || !(page >= 0 && page < template.pages.length)) return [];
      const box = { x: unit(f.x), y: unit(f.y), w: unit(f.w), h: unit(f.h) };
      if (box.w < 0.01 || box.h < 0.005) return [];
      const field: EsignField = { id: clean(f.id, 40) || newEsignId(), kind, page, ...box };
      if (kind === "variable") {
        if (f.auto === "today" || f.auto === "ref" || f.auto === "title") field.auto = f.auto;
        field.label = clean(f.label, 60).replace(/[{}]/g, "").trim();
        if (!field.label) return [];
        field.varType = f.varType && VAR_TYPES.has(f.varType) ? f.varType : "text";
      } else {
        if (!f.stepId || !stepIds.has(f.stepId)) return [];
        field.stepId = f.stepId;
      }
      if (kind === "variable" || kind === "signerName") {
        field.fontSize = Math.min(48, Math.max(5, Number(f.fontSize) || 11));
        field.align = f.align === "center" || f.align === "end" ? f.align : "start";
        field.font = f.font === "cambria" ? "cambria" : "dentera";
      }
      return [field];
    });
    if (isDocumentTemplate(template)) return { next: null, result: false };
    // Variable definitions for the labels the boxes use (types follow the definition).
    const used = new Set(fields.filter((f) => f.kind === "variable" && !f.auto).map((f) => f.label!));
    const variables = cleanVariables(input.variables).filter((v) => used.has(v.name));
    for (const label of used) {
      if (!variables.some((v) => v.name === label)) {
        variables.push({ name: label, type: fields.find((f) => f.label === label)?.varType ?? "text" });
      }
    }
    for (const f of fields) {
      const v = f.kind === "variable" && !f.auto ? variables.find((x) => x.name === f.label) : undefined;
      if (v) f.varType = v.type;
    }
    const templates = [...file.templates];
    templates[index] = { ...template, name, steps, fields, variables, updatedAt: new Date().toISOString() };
    return { next: { ...file, templates }, result: true };
  });
  if (result) {
    await logActivity(user, "/esign", "update", name);
    refresh();
  }
  return { ok: result };
}

export async function deleteTemplateAction(form: FormData) {
  const user = await requireAdmin();
  const id = str(form, "id");
  const name = await changeEsign((file) => {
    const template = file.templates.find((t) => t.id === id);
    if (!template || file.packages.some((p) => p.templateId === id)) return { next: null, result: null };
    return { next: { ...file, templates: file.templates.filter((t) => t.id !== id) }, result: template.name };
  });
  if (!name) back(form, "tab=templates&error=in-use");
  await deletePrivateFile(templateContentPath(id)).catch(() => undefined);
  await logActivity(user, "/esign", "delete", name);
  refresh();
  back(form, "tab=templates");
}

// --- Document templates (written in the platform) ---

/** Starts a new document template and opens it in the editor. */
export async function createDocumentTemplateAction(form: FormData) {
  const user = await requireAdmin();
  const name = str(form, "name", 120) || "مستند جديد";
  const step: EsignStep = { id: newEsignId(), role: "الموقّع", defaultMode: "perCopy" };
  const template: EsignTemplate = {
    id: newEsignId(),
    name,
    type: "document",
    driveFileId: "",
    fileName: "",
    pages: [],
    steps: [step],
    fields: [],
    variables: [],
    settings: { ...DEFAULT_DOC_SETTINGS },
    signatureSteps: [],
    createdAt: new Date().toISOString(),
  };
  await putPrivateFile(templateContentPath(template.id), new TextEncoder().encode(JSON.stringify(EMPTY_DOC)), "application/json");
  await changeEsign((f) => ({ next: { ...f, templates: [...f.templates, template] }, result: null }));
  await logActivity(user, "/esign", "create", name);
  refresh();
  back(form, `template=${template.id}`);
}

/** A copy of a template (either kind), named «… (نسخة)». */
export async function duplicateTemplateAction(form: FormData) {
  const user = await requireAdmin();
  const id = str(form, "id");
  const store = await readEsign();
  const source = store.templates.find((t) => t.id === id);
  if (!source) back(form, "tab=templates");
  const copy: EsignTemplate = {
    ...structuredClone(source!),
    id: newEsignId(),
    name: `${source!.name} (نسخة)`.slice(0, 120),
    createdAt: new Date().toISOString(),
    updatedAt: undefined,
  };
  if (isDocumentTemplate(source!)) {
    const content = await readPrivateFile(templateContentPath(source!.id));
    await putPrivateFile(templateContentPath(copy.id), content ?? new TextEncoder().encode(JSON.stringify(EMPTY_DOC)), "application/json");
  }
  await changeEsign((f) => ({ next: { ...f, templates: [...f.templates, copy] }, result: null }));
  await logActivity(user, "/esign", "create", copy.name);
  refresh();
  back(form, `template=${copy.id}`);
}

export type SaveDocumentResult =
  | { ok: true }
  | { ok: false; error: "name" | "steps" | "content" | "variables" | "signatures"; detail?: string };

/** Saves a document template: its procedure, variables, page setup and content. */
export async function saveDocumentTemplateAction(input: {
  id: string;
  name: string;
  steps: EsignStep[];
  variables: EsignVariable[];
  settings: EsignDocSettings;
  content: unknown;
}): Promise<SaveDocumentResult> {
  const user = await requireAdmin();
  const name = clean(input.name, 120);
  if (!name) return { ok: false, error: "name" };
  const steps = cleanSteps(input.steps);
  if (!steps.length || steps.some((s) => !s.role)) return { ok: false, error: "steps" };
  const content = sanitizeDocContent(input.content);
  const json = content ? JSON.stringify(content) : "";
  if (!content || json.length > MAX_DOC_CONTENT_BYTES) return { ok: false, error: "content" };
  const variables = cleanVariables(input.variables);
  const missing = docVariableNames(content).find((n) => !variables.some((v) => v.name === n));
  if (missing) return { ok: false, error: "variables", detail: missing };
  const stepIds = new Set(steps.map((s) => s.id));
  if (docStepRefs(content).some((id) => !stepIds.has(id))) return { ok: false, error: "steps" };
  const signatureSteps = docSignatureSteps(content);
  const unsigned = steps.find((s) => !signatureSteps.includes(s.id));
  if (unsigned) return { ok: false, error: "signatures", detail: unsigned.role };
  const raw = input.settings ?? DEFAULT_DOC_SETTINGS;
  const settings: EsignDocSettings = {
    letterhead: raw.letterhead !== false,
    dir: raw.dir === "ltr" ? "ltr" : "rtl",
    font: raw.font === "cambria" ? "cambria" : "dentera",
    size: Math.min(16, Math.max(8, Math.round(Number(raw.size) || 11))),
  };
  const found = (await readEsign()).templates.find((t) => t.id === input.id);
  if (!found || !isDocumentTemplate(found)) return { ok: false, error: "content" };
  await putPrivateFile(templateContentPath(found.id), new TextEncoder().encode(json), "application/json");
  const ok = await changeEsign((file) => {
    const index = file.templates.findIndex((t) => t.id === input.id);
    if (index === -1) return { next: null, result: false };
    const templates = [...file.templates];
    templates[index] = { ...templates[index], name, steps, variables, settings, signatureSteps, updatedAt: new Date().toISOString() };
    return { next: { ...file, templates }, result: true };
  });
  if (!ok) return { ok: false, error: "content" };
  await logActivity(user, "/esign", "update", name);
  refresh();
  return { ok: true };
}

// --- Packages ---

export type NewPackageInput = {
  templateId: string;
  title: string;
  /** The message sent with the links ({الاسم}, {الرابط}…). */
  message?: string;
  steps: { stepId: string; mode: "same" | "perCopy"; name?: string; phone?: string; contactId?: string }[];
  copies: {
    label?: string;
    /** Per-copy signers by step id. */
    signers: Record<string, { name: string; phone?: string; contactId?: string }>;
    values: Record<string, string>;
  }[];
};

/**
 * Records a package and its copies (status "preparing"). The browser then
 * renders each copy's text images, uploads them, and activates it.
 */
export async function createPackageAction(
  input: NewPackageInput
): Promise<{ ok: true; id: string; ref: string; createdAt: string; documents: string[] } | { ok: false; error: "fields" | "drive" | "folder" }> {
  const user = await requireAdmin();
  const store = await readEsign();
  if (!store.folders.signed) return { ok: false, error: "folder" };
  if ((await driveHealth()) !== "ok") return { ok: false, error: "drive" };
  const template = store.templates.find((t) => t.id === input.templateId);
  const title = clean(input.title, 120);
  if (!template || !title || !template.steps.length) return { ok: false, error: "fields" };
  const copies = Array.isArray(input.copies) ? input.copies.slice(0, 200) : [];
  if (!copies.length) return { ok: false, error: "fields" };

  const steps = template.steps.map((step) => {
    const chosen = input.steps?.find((s) => s.stepId === step.id);
    const mode: "same" | "perCopy" = chosen?.mode === "perCopy" ? "perCopy" : "same";
    // A saved signer, if picked (and not retyped): they may reuse a saved signature.
    const contact = mode === "same" ? store.contacts.find((c) => c.id === chosen?.contactId && c.name === clean(chosen?.name, 80)) : undefined;
    return {
      stepId: step.id,
      mode,
      name: mode === "same" ? clean(chosen?.name, 80) : undefined,
      phone: mode === "same" ? phoneOf(chosen?.phone) : undefined,
      contactId: contact?.id,
    };
  });
  if (steps.some((s) => s.mode === "same" && !s.name)) return { ok: false, error: "fields" };
  const variables = templateVariables(template);
  // A per-copy signer is linked to a saved signer with exactly the same name.
  const contactNamed = (name: string, id?: string) =>
    store.contacts.find((c) => c.id === id && c.name === name) ?? store.contacts.find((c) => c.name === name);

  const documents: EsignDocument[] = [];
  for (const [i, copy] of copies.entries()) {
    const values: Record<string, string> = {};
    for (const variable of variables) {
      const typed = variable.fixed ? variable.default ?? "" : clean(copy.values?.[variable.name], 300) || variable.default || "";
      const normal = normalizeValue(typed, variable.type);
      if (!normal.value || !normal.ok) return { ok: false, error: "fields" };
      values[variable.name] = normal.value;
    }
    const signers = steps.map((s) => {
      const own = copy.signers?.[s.stepId];
      const name = s.mode === "same" ? s.name! : clean(own?.name, 80);
      return {
        stepId: s.stepId,
        name,
        phone: s.mode === "same" ? s.phone : phoneOf(own?.phone),
        contactId: s.mode === "same" ? s.contactId : name ? contactNamed(name, clean(own?.contactId, 40))?.id : undefined,
        token: newSignToken(),
      };
    });
    if (signers.some((s) => !s.name)) return { ok: false, error: "fields" };
    const firstPerCopy = signers.find((s, k) => steps[k].mode === "perCopy");
    documents.push({
      id: newEsignId(),
      label: clean(copy.label, 80) || firstPerCopy?.name || (copies.length > 1 ? `${title} ${i + 1}` : title),
      values,
      status: "preparing",
      currentStep: 0,
      signers,
    });
  }

  const pkg: EsignPackage = {
    id: newEsignId(),
    ref: "",
    title,
    templateId: template.id,
    status: "preparing",
    steps,
    documents,
    message: messageText(input.message),
    createdBy: user,
    createdAt: new Date().toISOString(),
  };
  await changeEsign((file) => {
    const counters = { ...file.counters };
    pkg.ref = takeRef(counters);
    return { next: { ...file, counters, packages: [pkg, ...file.packages] }, result: null };
  });
  return { ok: true, id: pkg.id, ref: pkg.ref, createdAt: pkg.createdAt, documents: documents.map((d) => d.id) };
}

/** Saves one copy's rendered text images (data URLs by field id). */
export async function uploadCopyImagesAction(input: {
  packageId: string;
  documentId: string;
  images: Record<string, string>;
}): Promise<{ ok: boolean }> {
  const user = await requireAdmin();
  const store = await readEsign();
  const pkg = store.packages.find((p) => p.id === input.packageId && p.status === "preparing");
  const doc = pkg?.documents.find((d) => d.id === input.documentId);
  const template = store.templates.find((t) => t.id === pkg?.templateId);
  if (!pkg || !doc || !template) return { ok: false };
  for (const field of textFieldsOf(template)) {
    const bytes = pngBytes(input.images?.[field.id]);
    if (!bytes) return { ok: false };
    await putPrivateFile(imagePath(doc.id, `f-${field.id}`), bytes, "image/png");
  }
  return { ok: true };
}

const isPng = (b: Uint8Array) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;

/** Document copies: saves one rendered page (a PNG file, in order). */
export async function uploadCopyPageAction(form: FormData): Promise<{ ok: boolean }> {
  await requireAdmin();
  const packageId = str(form, "packageId");
  const documentId = str(form, "documentId");
  const index = Math.floor(Number(form.get("index")));
  const file = form.get("page");
  if (!(index >= 0 && index < 60) || !(file instanceof File) || !file.size || file.size > MAX_PAGE_IMAGE_BYTES) return { ok: false };
  const store = await readEsign();
  const pkg = store.packages.find((p) => p.id === packageId && p.status === "preparing");
  const doc = pkg?.documents.find((d) => d.id === documentId);
  const template = store.templates.find((t) => t.id === pkg?.templateId);
  if (!pkg || !doc || !template || !isDocumentTemplate(template)) return { ok: false };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isPng(bytes)) return { ok: false };
  await putPrivateFile(imagePath(doc.id, `page-${index}`), bytes, "image/png");
  return { ok: true };
}

/**
 * Document copies: once its pages are in, makes the copy's base PDF (one A4
 * page per image) and records where its signature and stamp boxes landed.
 */
export async function finishCopyPagesAction(input: {
  packageId: string;
  documentId: string;
  pageCount: number;
  fields: EsignField[];
}): Promise<{ ok: boolean }> {
  await requireAdmin();
  const store = await readEsign();
  const pkg = store.packages.find((p) => p.id === input.packageId && p.status === "preparing");
  const doc = pkg?.documents.find((d) => d.id === input.documentId);
  const template = store.templates.find((t) => t.id === pkg?.templateId);
  const pageCount = Math.floor(Number(input.pageCount));
  if (!pkg || !doc || !template || !isDocumentTemplate(template) || !(pageCount >= 1 && pageCount <= 60)) return { ok: false };
  const stepIds = new Set(template.steps.map((s) => s.id));
  const fields: EsignField[] = (Array.isArray(input.fields) ? input.fields : []).slice(0, 200).flatMap((f) => {
    const kind = f?.kind === "signature" || f?.kind === "stamp" ? f.kind : null;
    const page = Math.floor(Number(f?.page));
    if (!kind || !(page >= 0 && page < pageCount) || !stepIds.has(f.stepId!)) return [];
    const box = { x: unit(f.x), y: unit(f.y), w: unit(f.w), h: unit(f.h) };
    if (box.w < 0.01 || box.h < 0.005 || box.x + box.w > 1.001 || box.y + box.h > 1.001) return [];
    return [{ id: newEsignId(), kind, page, stepId: f.stepId, ...box }];
  });
  if (!template.steps.every((s) => fields.some((f) => f.kind === "signature" && f.stepId === s.id))) return { ok: false };

  const pdf = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    const bytes = await readPrivateFile(imagePath(doc.id, `page-${i}`));
    if (!bytes) return { ok: false };
    const image = await pdf.embedPng(bytes).catch(() => null);
    if (!image) return { ok: false };
    const page = pdf.addPage([A4.w, A4.h]);
    page.drawImage(image, { x: 0, y: 0, width: A4.w, height: A4.h });
  }
  pdf.setTitle(`${pkg.ref} — ${pkg.title} — ${doc.label}`);
  pdf.setProducer("Dentera e-signature");
  await putPrivateFile(basePdfPath(doc.id), await pdf.save(), "application/pdf");
  for (let i = 0; i < pageCount; i++) await deletePrivateFile(imagePath(doc.id, `page-${i}`)).catch(() => undefined);

  const pages = Array.from({ length: pageCount }, () => ({ w: A4.w, h: A4.h }));
  const ok = await changeEsign((file) => {
    const index = file.packages.findIndex((p) => p.id === pkg.id && p.status === "preparing");
    if (index === -1) return { next: null, result: false };
    const packages = [...file.packages];
    packages[index] = {
      ...packages[index],
      documents: packages[index].documents.map((d) => (d.id === doc.id ? { ...d, fields, pages } : d)),
    };
    return { next: { ...file, packages }, result: true };
  });
  return { ok };
}

/** A PNG data URL's bytes (null if it isn't a reasonably small PNG). */
function pngBytes(dataUrl: unknown): Uint8Array | null {
  const match = String(dataUrl ?? "").match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  const bytes = Buffer.from(match[1], "base64");
  const png = bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  return png && bytes.length <= MAX_ESIGN_IMAGE_BYTES ? new Uint8Array(bytes) : null;
}

/** Opens a prepared package: its links start working. */
export async function activatePackageAction(input: { packageId: string }): Promise<{ ok: boolean }> {
  const user = await requireAdmin();
  const title = await changeEsign((file) => {
    const index = file.packages.findIndex((p) => p.id === input.packageId && p.status === "preparing");
    if (index === -1) return { next: null, result: null };
    const packages = [...file.packages];
    const pkg = packages[index];
    const template = file.templates.find((t) => t.id === pkg.templateId);
    if (template && isDocumentTemplate(template) && pkg.documents.some((d) => !d.fields?.length)) return { next: null, result: null };
    packages[index] = {
      ...pkg,
      status: "active",
      documents: pkg.documents.map((d) => (d.status === "preparing" ? { ...d, status: "active" as const } : d)),
    };
    return { next: { ...file, packages }, result: `${pkg.ref} — ${pkg.title}` };
  });
  if (title) {
    await logActivity(user, "/esign", "create", title);
    refresh();
  }
  return { ok: Boolean(title) };
}

export async function cancelPackageAction(form: FormData) {
  const user = await requireAdmin();
  const id = str(form, "id");
  const title = await changeEsign((file) => {
    const index = file.packages.findIndex((p) => p.id === id);
    if (index === -1) return { next: null, result: null };
    const packages = [...file.packages];
    const pkg = packages[index];
    packages[index] = {
      ...pkg,
      status: "cancelled",
      documents: pkg.documents.map((d) =>
        d.status === "active" || d.status === "preparing" ? { ...d, status: "cancelled" as const } : d
      ),
    };
    return { next: { ...file, packages }, result: `${pkg.ref} — ${pkg.title}` };
  });
  if (title) await logActivity(user, "/esign", "update", title);
  refresh();
  back(form, `package=${id}`);
}

export async function cancelCopyAction(form: FormData) {
  const user = await requireAdmin();
  const id = str(form, "id");
  const docId = str(form, "doc");
  const label = await changeEsign((file) => {
    const index = file.packages.findIndex((p) => p.id === id);
    const pkg = file.packages[index];
    const doc = pkg?.documents.find((d) => d.id === docId && d.status === "active");
    if (!pkg || !doc) return { next: null, result: null };
    const packages = [...file.packages];
    packages[index] = { ...pkg, documents: pkg.documents.map((d) => (d.id === docId ? { ...d, status: "cancelled" as const } : d)) };
    return { next: { ...file, packages }, result: `${pkg.ref} — ${doc.label}` };
  });
  if (label) await logActivity(user, "/esign", "update", label);
  refresh();
  back(form, `package=${id}`);
}

export async function deletePackageAction(form: FormData) {
  const user = await requireAdmin();
  const id = str(form, "id");
  const removed = await changeEsign((file) => {
    const pkg = file.packages.find((p) => p.id === id);
    if (!pkg) return { next: null, result: null };
    return { next: { ...file, packages: file.packages.filter((p) => p.id !== id) }, result: pkg };
  });
  if (removed) {
    // Signed copies stay in Drive; only the temporary images go.
    for (const doc of removed.documents) await deletePrivateFolder(`esign/${doc.id}/`).catch(() => undefined);
    await logActivity(user, "/esign", "delete", `${removed.ref} — ${removed.title}`);
  }
  refresh();
  back(form);
}

export async function retrySaveAction(form: FormData) {
  const user = await requireAdmin();
  const id = str(form, "id");
  const docId = str(form, "doc");
  const ok = await finalizeEsignDocument(id, docId);
  refresh();
  back(form, `package=${id}${ok ? "" : "&error=drive"}`);
}
