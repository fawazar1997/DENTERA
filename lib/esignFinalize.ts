import { changeEsign, readEsign, type EsignPackage } from "./esign";
import { buildEsignPdf } from "./esignPdf";
import { createDriveFolder, downloadDriveFile, uploadDriveBytes } from "./googleDrive";
import { deletePrivateFolder } from "./privateBlob";

// When a copy's last signature is in: build its PDF and save it to Drive
// («المستندات الموقّعة/<ref> - <title>/<name>.pdf»), then drop its
// temporary images. If Drive fails, the copy is marked so the panel can
// retry (the images are kept until it succeeds).

function safeName(value: string): string {
  return value.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").slice(0, 120).trim() || "document";
}

/** A package is completed once none of its copies is still open. */
export function settlePackage(pkg: EsignPackage): EsignPackage {
  if (pkg.status !== "active") return pkg;
  const open = pkg.documents.some((d) => d.status === "active" || d.status === "preparing");
  return open ? pkg : { ...pkg, status: "completed" };
}

export async function finalizeEsignDocument(packageId: string, documentId: string): Promise<boolean> {
  const store = await readEsign();
  const pkg = store.packages.find((p) => p.id === packageId);
  const doc = pkg?.documents.find((d) => d.id === documentId);
  const template = store.templates.find((t) => t.id === pkg?.templateId);
  if (!pkg || !doc || !template || doc.status !== "completed") return false;
  if (doc.signedFileId) return true;
  try {
    let folderId = pkg.driveFolderId;
    if (!folderId) {
      if (!store.folders.signed) throw new Error("no folder");
      const created = await createDriveFolder(safeName(`${pkg.ref} - ${pkg.title}`), store.folders.signed);
      // Another copy may have made it at the same moment: keep the first.
      folderId = await changeEsign((file) => {
        const index = file.packages.findIndex((p) => p.id === packageId);
        if (index === -1) return { next: null, result: created };
        if (file.packages[index].driveFolderId) return { next: null, result: file.packages[index].driveFolderId! };
        const packages = [...file.packages];
        packages[index] = { ...packages[index], driveFolderId: created };
        return { next: { ...file, packages }, result: created };
      });
    }
    const templateBytes = await downloadDriveFile(template.driveFileId);
    const bytes = await buildEsignPdf({ template, doc, templateBytes, title: `${pkg.ref} — ${pkg.title} — ${doc.label}` });
    const saved = await uploadDriveBytes({
      folderId,
      name: `${safeName(doc.label)} - ${pkg.ref}.pdf`,
      mimeType: "application/pdf",
      bytes,
    });
    await changeEsign((file) => {
      const index = file.packages.findIndex((p) => p.id === packageId);
      if (index === -1) return { next: null, result: null };
      const packages = [...file.packages];
      const current = packages[index];
      packages[index] = settlePackage({
        ...current,
        documents: current.documents.map((d) =>
          d.id === documentId
            ? { ...d, signedFileId: saved.id, signedLink: saved.webViewLink, saveError: undefined }
            : d
        ),
      });
      return { next: { ...file, packages }, result: null };
    });
    await deletePrivateFolder(`esign/${documentId}/`).catch(() => undefined);
    return true;
  } catch (error) {
    console.error("e-sign: saving the signed PDF failed", error);
    await changeEsign((file) => {
      const index = file.packages.findIndex((p) => p.id === packageId);
      if (index === -1) return { next: null, result: null };
      const packages = [...file.packages];
      packages[index] = {
        ...packages[index],
        documents: packages[index].documents.map((d) => (d.id === documentId ? { ...d, saveError: true } : d)),
      };
      return { next: { ...file, packages }, result: null };
    }).catch(() => undefined);
    return false;
  }
}
