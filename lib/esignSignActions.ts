"use server";

import { headers } from "next/headers";
import { changeEsign, contactSignaturePath, findSigner, imagePath, readEsign, signerIn, MAX_ESIGN_IMAGE_BYTES } from "./esign";
import { finalizeEsignDocument, settlePackage } from "./esignFinalize";
import { putPrivateFile, readPrivateFile } from "./privateBlob";

// The signing page's actions, by the signer's private link. Each checks
// that it's this signer's turn on this copy, both before saving the
// drawing and again when recording it (so two clicks can't sign twice).

export type SignResult = { ok: true; completed: boolean } | { ok: false; error: "turn" | "image" | "name" | "failed" };

function clientInfo() {
  const h = headers();
  const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0].trim().slice(0, 64) || undefined;
  const userAgent = (h.get("user-agent") ?? "").slice(0, 300) || undefined;
  return { ip, userAgent };
}

function pngBytes(dataUrl: unknown): Uint8Array | null {
  const match = String(dataUrl ?? "").match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  const bytes = Buffer.from(match[1], "base64");
  const png = bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  return png && bytes.length <= MAX_ESIGN_IMAGE_BYTES ? new Uint8Array(bytes) : null;
}

type Turn = NonNullable<Awaited<ReturnType<typeof findSigner>>>;

function isTurn(ctx: Turn | null): ctx is Turn {
  return Boolean(
    ctx &&
      ctx.pkg.status === "active" &&
      ctx.doc.status === "active" &&
      ctx.doc.currentStep === ctx.stepIndex &&
      !ctx.signer.signedAt
  );
}

/**
 * Signs: with the drawing (`png`), or with the signer's saved signature
 * (`useSaved`, for saved signers who kept one). `saveSignature` keeps a
 * saved signer's drawing to reuse next time.
 */
export async function signDocumentAction(input: {
  token: string;
  png?: string;
  useSaved?: boolean;
  saveSignature?: boolean;
  typedName: string;
}): Promise<SignResult> {
  const token = String(input.token ?? "");
  const typedName = String(input.typedName ?? "").replace(/\s+/g, " ").trim().slice(0, 100);
  if (typedName.length < 2) return { ok: false, error: "name" };
  const ctx = await findSigner(token);
  if (!isTurn(ctx)) return { ok: false, error: "turn" };
  const contactId = ctx.signer.contactId;
  const contact = contactId ? (await readEsign()).contacts.find((c) => c.id === contactId) : undefined;

  let bytes: Uint8Array | null = null;
  if (input.useSaved) {
    if (contact?.signatureSavedAt) bytes = await readPrivateFile(contactSignaturePath(contact.id));
  } else {
    bytes = pngBytes(input.png);
  }
  if (!bytes) return { ok: false, error: "image" };

  try {
    await putPrivateFile(imagePath(ctx.doc.id, `s-${ctx.signer.stepId}`), bytes, "image/png");
    const { ip, userAgent } = clientInfo();
    const done = await changeEsign((file) => {
      const now = signerIn(file, token);
      if (!isTurn(now)) return { next: null, result: null };
      const packages = file.packages.map((pkg) => {
        if (pkg.id !== now.pkg.id) return pkg;
        return settlePackage({
          ...pkg,
          documents: pkg.documents.map((doc) => {
            if (doc.id !== now.doc.id) return doc;
            const signers = doc.signers.map((s, i) =>
              i === now.stepIndex ? { ...s, signedAt: new Date().toISOString(), typedName, ip, userAgent } : s
            );
            const last = now.stepIndex >= doc.signers.length - 1;
            return {
              ...doc,
              signers,
              currentStep: now.stepIndex + 1,
              ...(last ? { status: "completed" as const, completedAt: new Date().toISOString() } : {}),
            };
          }),
        });
      });
      const last = now.stepIndex >= now.doc.signers.length - 1;
      return { next: { ...file, packages }, result: { pkgId: now.pkg.id, docId: now.doc.id, last } };
    });
    if (!done) return { ok: false, error: "turn" };
    // Keep a saved signer's drawing for next time, if they asked.
    if (input.saveSignature && !input.useSaved && contact) {
      await putPrivateFile(contactSignaturePath(contact.id), bytes, "image/png");
      await changeEsign((file) => ({
        next: {
          ...file,
          contacts: file.contacts.map((c) => (c.id === contact.id ? { ...c, signatureSavedAt: new Date().toISOString(), signatureSource: "self" as const } : c)),
        },
        result: null,
      }));
    }
    // The last signature: make the signed PDF and save it to Drive now.
    if (done.last) await finalizeEsignDocument(done.pkgId, done.docId);
    return { ok: true, completed: done.last };
  } catch (error) {
    console.error("e-sign: signing failed", error);
    return { ok: false, error: "failed" };
  }
}

export async function declineDocumentAction(input: { token: string; note: string }): Promise<{ ok: boolean }> {
  const token = String(input.token ?? "");
  const note = String(input.note ?? "").replace(/\s+/g, " ").trim().slice(0, 500);
  const ctx = await findSigner(token);
  if (!isTurn(ctx)) return { ok: false };
  const docId = await changeEsign((file) => {
    const now = signerIn(file, token);
    if (!isTurn(now)) return { next: null, result: null };
    const packages = file.packages.map((pkg) =>
      pkg.id !== now.pkg.id
        ? pkg
        : settlePackage({
            ...pkg,
            documents: pkg.documents.map((doc) =>
              doc.id !== now.doc.id
                ? doc
                : {
                    ...doc,
                    status: "declined" as const,
                    declinedStep: now.signer.stepId,
                    declinedNote: note || undefined,
                    declinedAt: new Date().toISOString(),
                  }
            ),
          })
    );
    return { next: { ...file, packages }, result: now.doc.id };
  });
  return { ok: Boolean(docId) };
}
