// Shapes of the e-signature system (التوقيع الإلكتروني), shared by the
// server and the browser. See lib/esign.ts for how they're stored.

/** Fonts a text box can use: Dentera's official font (Almarai) or Cambria. */
export type EsignFont = "dentera" | "cambria";

/** What a variable holds: shapes how its value is checked and printed. */
export type EsignVarType = "text" | "number" | "amount" | "date";

/** A template's variable (e.g. الراتب): filled per copy unless fixed. */
export type EsignVariable = {
  name: string;
  type: EsignVarType;
  /** Prefilled in every copy (and always used when fixed). */
  default?: string;
  /** Always the default value: no column when filling. */
  fixed?: boolean;
  /** amount: also written in words. */
  words?: boolean;
};

/** Values filled in automatically: the approval date, the request number and title. */
export type EsignAutoVar = "today" | "ref" | "title";

/** A document template's page setup. */
export type EsignDocSettings = {
  /** Dentera's letterhead (logo at the top, footer line, page numbers). */
  letterhead: boolean;
  dir: "rtl" | "ltr";
  font: EsignFont;
  /** Body text size in points. */
  size: number;
};

export const DEFAULT_DOC_SETTINGS: EsignDocSettings = { letterhead: true, dir: "rtl", font: "dentera", size: 11 };

/** A box on a template page, in 0–1 of the page's width/height (from the top-left). */
export type EsignField = {
  id: string;
  kind: "signature" | "variable" | "signerName" | "stamp";
  /** Page index, from 0. */
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  /** signature / signerName / stamp: the procedure step it belongs to (a stamp is printed once that step signs). */
  stepId?: string;
  /** variable: its name (e.g. الراتب), shown as a column when filling. */
  label?: string;
  varType?: EsignVarType;
  /** variable: filled in automatically instead of per copy. */
  auto?: EsignAutoVar;
  /** Text size in PDF points (variable / signerName). */
  fontSize?: number;
  align?: "start" | "center" | "end";
  /** variable / signerName: the font (default: Dentera's). */
  font?: EsignFont;
};

/** One step of a template's procedure, in signing order. */
export type EsignStep = {
  id: string;
  /** Who signs here, e.g. الطبيب، المدير العام. */
  role: string;
  /** Default when a package is made: one person for all copies, or one per copy. */
  defaultMode?: "same" | "perCopy";
  /** Default person for "same" (a saved contact). */
  defaultContactId?: string;
};

export type EsignTemplate = {
  id: string;
  name: string;
  /** "document": written in the platform's editor (its content is a private file); missing: an uploaded PDF. */
  type?: "pdf" | "document";
  /** Variable definitions (type, default, fixed). Older PDF templates have none: see templateVariables. */
  variables?: EsignVariable[];
  /** document: page setup. */
  settings?: EsignDocSettings;
  /** document: the steps that have a signature block (checked when saved). */
  signatureSteps?: string[];
  /** The PDF in Drive («القوالب»); empty for a document template. */
  driveFileId: string;
  fileName: string;
  /** Page sizes in PDF points (PDF templates). */
  pages: { w: number; h: number }[];
  steps: EsignStep[];
  /** The boxes (PDF templates; a document copy has its own, measured when it is made). */
  fields: EsignField[];
  createdAt: string;
  updatedAt?: string;
};

export type EsignSigner = {
  stepId: string;
  name: string;
  /** Set when picked from the saved signers: lets them save and reuse their signature. */
  contactId?: string;
  phone?: string;
  /** The secret part of this signer's link (/sign/<token>). */
  token: string;
  signedAt?: string;
  /** The name typed when signing. */
  typedName?: string;
  ip?: string;
  userAgent?: string;
};

export type EsignDocumentStatus = "preparing" | "active" | "completed" | "declined" | "cancelled";

/** One copy of a package: its own values and signers, one signed PDF. */
export type EsignDocument = {
  id: string;
  /** What the copy is called in lists and in Drive (e.g. the doctor's name). */
  label: string;
  /** Variable values by variable label (boxes sharing a label share the value). */
  values: Record<string, string>;
  /** Document templates: where this copy's signature, stamp boxes landed (measured when made). Its base PDF is esign/<id>/base.pdf. */
  fields?: EsignField[];
  pages?: { w: number; h: number }[];
  status: EsignDocumentStatus;
  /** Index (in the procedure) of the step whose turn it is. */
  currentStep: number;
  signers: EsignSigner[];
  declinedNote?: string;
  declinedStep?: string;
  declinedAt?: string;
  /** The signed PDF in Drive. */
  signedFileId?: string;
  signedLink?: string;
  /** Set when the signed PDF couldn't be saved to Drive (retry from the panel). */
  saveError?: boolean;
  completedAt?: string;
};

export type EsignPackage = {
  id: string;
  /** ES-2026-0007 */
  ref: string;
  title: string;
  templateId: string;
  /** "preparing" until its images are uploaded, then "active". */
  status: "preparing" | "active" | "completed" | "cancelled";
  steps: { stepId: string; mode: "same" | "perCopy"; name?: string; phone?: string; contactId?: string }[];
  documents: EsignDocument[];
  /** The package's folder inside «المستندات الموقّعة». */
  driveFolderId?: string;
  /** The message sent with its links (a template, see fillSignMessage). */
  message?: string;
  createdBy: string;
  createdAt: string;
};

/** A saved signer (e.g. the general manager), to pick instead of typing. */
export type EsignContact = {
  id: string;
  name: string;
  title?: string;
  phone?: string;
  /** When their signature was saved to reuse (esign/contacts/<id>.png). */
  signatureSavedAt?: string;
  /** Who saved it: uploaded from the panel, or by them when signing. */
  signatureSource?: "panel" | "self";
};

export type EsignDriveFolders = {
  /** The linked parent folder. */
  parent?: string;
  parentName?: string;
  templates?: string;
  signed?: string;
};

/** Each procedure step's colour, by its position. */
export const STEP_COLORS = ["#0891b2", "#db2777", "#7c3aed", "#d97706", "#16a34a", "#2563eb", "#dc2626", "#0d9488"];

/** Largest template PDF accepted. */
export const MAX_TEMPLATE_BYTES = 15 * 1024 * 1024;
/** Largest drawn signature / rendered text image accepted. */
export const MAX_ESIGN_IMAGE_BYTES = 300 * 1024;

/** Largest document template content (JSON). */
export const MAX_DOC_CONTENT_BYTES = 500 * 1024;
/** Largest rendered page image of a document copy. */
export const MAX_PAGE_IMAGE_BYTES = 3 * 1024 * 1024;
/** A4 in PDF points. */
export const A4 = { w: 595.28, h: 841.89 };

export const isDocumentTemplate = (t: Pick<EsignTemplate, "type">) => t.type === "document";

/** The boxes of a copy: the template's (PDF), or the ones measured for that copy (document). */
export function copyFields(template: Pick<EsignTemplate, "type" | "fields">, doc: Pick<EsignDocument, "fields">): EsignField[] {
  return template.type === "document" ? doc.fields ?? [] : template.fields;
}

/** A template can be used once every step has somewhere to sign. */
export function templateReady(template: EsignTemplate): boolean {
  if (!template.steps.length) return false;
  if (template.type === "document") return template.steps.every((s) => template.signatureSteps?.includes(s.id));
  return template.steps.every((s) => template.fields.some((f) => f.kind === "signature" && f.stepId === s.id));
}

/** The letterhead's footer until one is saved in Settings. */
export const DEFAULT_LETTERHEAD_FOOTER = "عيادات دنتيرا لطب الأسنان  •  Dentera Dental Clinics  •  dentera.com.sa";

/** The images a PDF-template copy needs before it can be sent: one per variable / name box. */
export function textFieldsOf(template: Pick<EsignTemplate, "fields" | "type">): EsignField[] {
  if (template.type === "document") return [];
  return template.fields.filter((f) => f.kind === "variable" || f.kind === "signerName");
}

/**
 * A template's variables, in order. Older PDF templates have no list: their
 * boxes' labels and types are used (one per distinct label).
 */
export function templateVariables(template: Pick<EsignTemplate, "fields" | "variables" | "type">): EsignVariable[] {
  const list = [...(template.variables ?? [])];
  if (template.type !== "document") {
    for (const f of template.fields) {
      if (f.kind === "variable" && !f.auto && f.label && !list.some((v) => v.name === f.label)) {
        list.push({ name: f.label, type: f.varType ?? "text" });
      }
    }
    // Only the variables a box still uses.
    return list.filter((v) => template.fields.some((f) => f.kind === "variable" && !f.auto && f.label === v.name));
  }
  return list;
}

/** The variables filled per copy (not fixed), one per name. */
export function variableLabels(template: Pick<EsignTemplate, "fields" | "variables" | "type">): string[] {
  return templateVariables(template)
    .filter((v) => !v.fixed)
    .map((v) => v.name);
}

// --- The message sent with a signing link ---

/** What can go in the message; each is replaced for every signer. */
export const MESSAGE_FIELDS = ["الاسم", "الصفة", "العنوان", "النسخة", "المرجع", "الرابط"] as const;

/** The message used until one is saved in Settings. */
export const DEFAULT_SIGN_MESSAGE = `السلام عليكم {الاسم}،

نأمل التكرّم بتوقيع «{العنوان}» إلكترونيًا بصفتكم {الصفة}، من خلال الرابط التالي:
{الرابط}

يُفتح الرابط من الجوال أو الكمبيوتر، ويتم التوقيع خلال دقيقة.

مع خالص الشكر،
عيادات دنتيرا`;

export const MAX_MESSAGE_LENGTH = 1500;

/**
 * A signer's message: the template with {الاسم}, {الصفة}, {العنوان},
 * {النسخة}, {المرجع} and {الرابط} filled in. The link is added at the end
 * if the template forgot it.
 */
export function fillSignMessage(
  template: string | undefined,
  values: { name: string; role: string; title: string; copy: string; ref: string; link: string }
): string {
  const text = (template ?? "").trim() || DEFAULT_SIGN_MESSAGE;
  const map: Record<string, string> = {
    الاسم: values.name,
    الصفة: values.role,
    العنوان: values.title,
    النسخة: values.copy,
    المرجع: values.ref,
    الرابط: values.link,
  };
  const filled = text.replace(/\{([^{}]{1,12})\}/g, (whole, key: string) => map[key.trim()] ?? whole);
  return filled.includes(values.link) ? filled : `${filled}\n\n${values.link}`;
}
