import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowDown, CheckCircle2, Circle, CircleDot, Clock, Download, FileSignature, XCircle } from "lucide-react";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { contactSignaturePath, copyFields, findSigner } from "@/lib/esign";
import { readPrivateFile } from "@/lib/privateBlob";
import { esignText } from "@/lib/esignText";
import { SystemsHeader } from "@/components/SystemsHeader";
import { SignDocument } from "@/components/esign/SignDocument";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dentera — التوقيع الإلكتروني",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

/** A signer's private page: their copy, whose turn it is, and the pad on theirs. */
export default async function SignPage({ params }: { params: { locale: string; token: string } }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const t = esignText(locale);
  const found = await findSigner(params.token);
  if (!found?.template || found.pkg.status === "preparing") notFound();
  const { pkg, doc, template, signer, stepIndex } = found;
  const cancelled = pkg.status === "cancelled" || doc.status === "cancelled";
  const declined = doc.status === "declined";
  const completed = doc.status === "completed";
  const yourTurn = !cancelled && doc.status === "active" && doc.currentStep === stepIndex && !signer.signedAt;
  const roleOf = (stepId: string) => template.steps.find((s) => s.id === stepId)?.role ?? "";
  const current = doc.signers[doc.currentStep];
  // A saved signer: their saved signature (to reuse), or the option to save one.
  const savedBytes =
    yourTurn && found.contact?.signatureSavedAt
      ? await readPrivateFile(contactSignaturePath(found.contact.id)).catch(() => null)
      : null;
  const savedSignature = savedBytes ? `data:image/png;base64,${Buffer.from(savedBytes).toString("base64")}` : undefined;

  const banner = cancelled
    ? { icon: XCircle, text: t.cancelledTitle, tone: "bg-ink-100 text-ink-700" }
    : declined
      ? { icon: XCircle, text: t.declinedTitle, tone: "bg-accent-100 text-ink-900" }
      : completed
        ? { icon: CheckCircle2, text: t.completed, tone: "bg-primary-100 text-ink-900" }
        : signer.signedAt
          ? { icon: CheckCircle2, text: t.alreadySigned, tone: "bg-primary-100 text-ink-900" }
          : yourTurn
            ? null
            : { icon: Clock, text: `${t.notYet} — ${t.waitingFor}: ${roleOf(current?.stepId ?? "")} (${current?.name ?? ""})`, tone: "bg-sand-100 text-ink-900" };

  return (
    <div className="min-h-screen bg-ink-50">
      <SystemsHeader locale={locale} title={t.signTitle} badge={t.internal} switchPath={`/sign/${params.token}`} />
      <main className="container-x py-6 sm:py-8">
        <section className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-ink-950 text-primary-300">
                <FileSignature className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-ink-400" dir="ltr">{pkg.ref}</p>
                <h1 className="text-lg font-extrabold text-ink-950 sm:text-xl">{pkg.title}</h1>
                <p className="mt-0.5 text-sm text-ink-600">
                  {t.documentLabel}: {doc.label} · {t.signAs}: <span className="font-bold">{roleOf(signer.stepId)}</span> ({signer.name})
                </p>
              </div>
            </div>
            {completed && doc.signedFileId && (
              <a href={`/api/sign/${params.token}?download=1`} className="btn-primary">
                <Download className="h-4 w-4" /> {t.download}
              </a>
            )}
          </div>

          <ol className="mt-5 flex flex-wrap items-center gap-2" aria-label={t.steps}>
            {doc.signers.map((s, i) => {
              const done = Boolean(s.signedAt);
              const now = doc.status === "active" && i === doc.currentStep;
              const no = declined && doc.declinedStep === s.stepId;
              const Icon = done ? CheckCircle2 : no ? XCircle : now ? CircleDot : Circle;
              return (
                <li
                  key={s.stepId}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                    done ? "bg-primary-100 text-primary-800" : now ? "bg-ink-900 text-white" : no ? "bg-accent-100 text-accent-800" : "bg-ink-50 text-ink-500"
                  } ${i === stepIndex ? "ring-2 ring-primary-400 ring-offset-1" : ""}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {i + 1}. {roleOf(s.stepId)}
                </li>
              );
            })}
          </ol>

          {yourTurn && (
            <a href="#sign-pad" className="btn-primary mt-5 w-full lg:hidden">
              <ArrowDown className="h-4 w-4" /> {t.goToSign}
            </a>
          )}

          {banner && (
            <p role="status" className={`mt-5 flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-bold ${banner.tone}`}>
              <banner.icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
              {banner.text}
            </p>
          )}
        </section>

        {!cancelled && (
          <div className="mt-6">
            <SignDocument
              token={params.token}
              locale={locale}
              canSign={yourTurn}
              boxes={copyFields(template, found.doc)
                .filter((f) => f.kind === "signature" && f.stepId === signer.stepId)
                .map((f) => ({ page: f.page, x: f.x, y: f.y, w: f.w, h: f.h }))}
              defaultName={signer.name}
              savedSignature={savedSignature}
              canSave={Boolean(found.contact)}
              signed={Boolean(signer.signedAt)}
              version={`${doc.signers.filter((s) => s.signedAt).length}-${doc.status}-${doc.signedFileId ? 1 : 0}`}
            />
          </div>
        )}
      </main>
    </div>
  );
}
