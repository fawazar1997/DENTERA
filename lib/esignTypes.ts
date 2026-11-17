// Shapes of the e-signature system (التوقيع الإلكتروني), shared by the
// server and the browser. See lib/esign.ts for how they're stored.

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
  varType?: "text" | "number" | "date";
  /** Text size in PDF points (variable / signerName). */
  fontSize?: number;
  align?: "start" | "center" | "end";
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
  /** The PDF in Drive («القوالب»). */
  driveFileId: string;
  fileName: string;
  /** Page sizes in PDF points. */
  pages: { w: number; h: number }[];
  steps: EsignStep[];
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
  /** When they saved their signature to reuse (esign/contacts/<id>.png). */
  signatureSavedAt?: string;
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

/** The images a copy needs before it can be sent: one per variable / name box. */
export function textFieldsOf(template: Pick<EsignTemplate, "fields">): EsignField[] {
  return template.fields.filter((f) => f.kind === "variable" || f.kind === "signerName");
}

/** The variables to fill per copy, one per distinct label (several boxes may share one). */
export function variableLabels(template: Pick<EsignTemplate, "fields">): string[] {
  const seen: string[] = [];
  for (const f of template.fields) {
    if (f.kind === "variable" && f.label && !seen.includes(f.label)) seen.push(f.label);
  }
  return seen;
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
