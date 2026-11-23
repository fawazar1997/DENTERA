import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FileSignature } from "lucide-react";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { contactSignaturePath, copyFields, findBulk } from "@/lib/esign";
import { readPrivateFile } from "@/lib/privateBlob";
import { esignText } from "@/lib/esignText";
import { SystemsHeader } from "@/components/SystemsHeader";
import { SignAll, type BulkCopy } from "@/components/esign/SignAll";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dentera — التوقيع الإلكتروني",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

/** A unified link: one signer (e.g. the general manager) signs every copy of a request at once. */
export default async function SignAllPage({ params }: { params: { locale: string; token: string } }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const t = esignText(locale);
  const found = await findBulk(params.token);
  if (!found?.template || found.pkg.status === "preparing") notFound();
  const { pkg, template, step, stepIndex, contact } = found;
  const role = template.steps.find((s) => s.id === step.stepId)?.role ?? "";

  const copies: BulkCopy[] = pkg.documents
    .filter((d) => d.status !== "preparing")
    .map((d) => {
      const signer = d.signers[stepIndex];
      const state =
        d.status === "cancelled" || d.status === "declined" || pkg.status === "cancelled"
          ? "closed"
          : signer?.signedAt
            ? "done"
            : d.status === "active" && d.currentStep === stepIndex
              ? "ready"
              : "later";
      return {
        id: d.id,
        label: d.label,
        state,
        version: `${d.signers.filter((s) => s.signedAt).length}-${d.status}-${d.signedFileId ? 1 : 0}`,
        boxes: copyFields(template, d)
          .filter((f) => f.kind === "signature" && f.stepId === step.stepId)
          .map((f) => ({ page: f.page, x: f.x, y: f.y, w: f.w, h: f.h })),
      };
    });
  const anyReady = copies.some((c) => c.state === "ready");
  const savedBytes = anyReady && contact?.signatureSavedAt ? await readPrivateFile(contactSignaturePath(contact.id)).catch(() => null) : null;
  const savedSignature = savedBytes ? `data:image/png;base64,${Buffer.from(savedBytes).toString("base64")}` : undefined;

  return (
    <div className="min-h-screen bg-ink-50">
      <SystemsHeader locale={locale} title={t.signTitle} badge={t.internal} switchPath={`/sign/all/${params.token}`} />
      <main className="container-x py-6 sm:py-8">
        <section className="card p-5 sm:p-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-ink-950 text-primary-300">
              <FileSignature className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink-400" dir="ltr">{pkg.ref}</p>
              <h1 className="text-lg font-extrabold text-ink-950 sm:text-xl">{pkg.title}</h1>
              <p className="mt-0.5 text-sm text-ink-600">
                {t.bulkTitle} · {t.signAs}: <span className="font-bold">{role}</span> ({step.name})
              </p>
            </div>
          </div>
        </section>
        <div className="mt-6">
          <SignAll token={params.token} locale={locale} copies={copies} defaultName={step.name ?? ""} savedSignature={savedSignature} canSave={Boolean(contact)} />
        </div>
      </main>
    </div>
  );
}
