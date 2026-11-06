import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookUser, Clock, ExternalLink, FolderOpen } from "lucide-react";
import type { ReactNode } from "react";
import { isLocale, defaultLocale, type Locale, localePath } from "@/lib/i18n";
import { formsKeyRole } from "@/lib/archive";
import { getDocCategories, getSettings, getStaffDocuments } from "@/lib/db";
import { getPriceList } from "@/lib/prices";
import { documentsText } from "@/lib/documentsText";
import { supervisorText } from "@/lib/supervisorText";
import { DocIcon } from "@/components/DocIcon";
import { RiyalIcon } from "@/components/RiyalIcon";
import { SystemsHeader } from "@/components/SystemsHeader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dentera — الأنظمة الإدارية",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

type Card = {
  key: string;
  title: string;
  hint: string;
  icon: ReactNode;
  /** Where it opens; none: not ready yet ("coming soon"). */
  href?: string;
  /** Another staff page: opens in a new tab. */
  external?: boolean;
  count?: number;
};

/**
 * The staff administrative systems page, on the staff link (the same key
 * as the forms page; the supervisor's key works too): a card for each
 * system, and "coming soon" for the ones not ready yet.
 */
export default async function SystemsHubPage({ params }: { params: { locale: string; key: string } }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const role = await formsKeyRole(params.key);
  if (!role) notFound();

  const ar = locale === "ar";
  const t = documentsText(locale);
  const [settings, categories, documents, prices] = await Promise.all([
    getSettings(),
    getDocCategories(),
    getStaffDocuments(),
    getPriceList().catch(() => null),
  ]);
  const Arrow = ar ? ArrowLeft : ArrowRight;
  const iconClass = "h-6 w-6";

  const cards: Card[] = [
    { key: "forms", title: t.forms, hint: t.formsHint, icon: <FolderOpen className={iconClass} />, href: `/forms/${params.key}` },
    ...categories.map((c): Card => {
      const count = documents.filter((d) => d.category === c.id).length;
      return {
        key: c.id,
        title: ar ? c.nameAr : c.nameEn || c.nameAr,
        hint: "",
        icon: <DocIcon icon={c.icon} className={iconClass} />,
        href: count > 0 ? `/systems/${params.key}/${c.id}` : undefined,
        count,
      };
    }),
    {
      key: "directory",
      title: t.directory,
      hint: t.directoryHint,
      icon: <BookUser className={iconClass} />,
      href: settings.directoryKey ? `/directory/${settings.directoryKey}` : undefined,
      external: true,
    },
    {
      key: "prices",
      title: t.prices,
      hint: t.pricesHint,
      icon: <RiyalIcon className={iconClass} />,
      href: settings.pricesKey && prices ? `/prices/${settings.pricesKey}` : undefined,
      external: true,
    },
  ];

  return (
    <div className="min-h-screen">
      <SystemsHeader
        locale={locale}
        title={t.hubTitle}
        badge={t.internal}
        switchPath={`/systems/${params.key}`}
        home={role === "supervisor" ? { href: `/supervisor/${params.key}`, label: supervisorText(locale).home } : undefined}
      />
      <main className="container-x py-8 sm:py-12">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/dentera-mark.svg" alt="" aria-hidden="true" className="mx-auto h-14 w-auto opacity-90" />
            <h1 className="mt-4 text-2xl font-extrabold text-ink-950 sm:text-3xl">{t.hubWelcome}</h1>
            <p className="mt-2 text-sm text-ink-500 sm:text-base">{t.hubChoose}</p>
          </div>

          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <li key={card.key}>
                {card.href ? (
                  <Link
                    href={localePath(locale, card.href)}
                    {...(card.external ? { target: "_blank", rel: "noreferrer" } : {})}
                    className="group relative isolate flex h-full min-h-[11rem] flex-col overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-ink-900 via-ink-950 to-ink-950 p-6 text-white shadow-soft ring-1 ring-ink-900/10 transition duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-300"
                  >
                    {/* The identity's fingerprint lines and tooth mark, as on the branch cards. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/brand/fingerprint-corner.svg"
                      alt=""
                      aria-hidden="true"
                      className="pointer-events-none absolute -end-10 -top-10 -z-10 h-44 w-44 opacity-40 transition duration-500 [mask-image:radial-gradient(circle,black_30%,transparent_70%)] group-hover:scale-110"
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/brand/dentera-mark.svg"
                      alt=""
                      aria-hidden="true"
                      className="pointer-events-none absolute -bottom-10 -end-6 -z-10 h-40 w-auto opacity-[0.12] transition duration-500 group-hover:-rotate-6 group-hover:opacity-20"
                    />
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                      {card.icon}
                    </span>
                    <span className="mt-4 text-xl font-extrabold leading-tight">{card.title}</span>
                    <span className="mt-1 text-sm leading-relaxed text-white/70">
                      {card.count !== undefined ? `${card.count} ${t.documentsCount}` : card.hint}
                    </span>
                    <span className="mt-auto inline-flex items-center gap-1.5 self-end pt-4 text-sm font-bold text-white/80 transition group-hover:text-white">
                      {t.open}
                      {card.external ? (
                        <ExternalLink className="h-4 w-4" />
                      ) : (
                        <Arrow className="h-4 w-4 transition rtl:group-hover:-translate-x-1 ltr:group-hover:translate-x-1" />
                      )}
                    </span>
                  </Link>
                ) : (
                  <div
                    aria-disabled="true"
                    className="relative flex h-full min-h-[11rem] flex-col overflow-hidden rounded-[1.75rem] border-2 border-dashed border-ink-200 bg-white/60 p-6 text-ink-400"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">{card.icon}</span>
                    <span className="mt-4 text-xl font-extrabold leading-tight text-ink-500">{card.title}</span>
                    <span className="mt-auto inline-flex items-center gap-1.5 self-start rounded-full bg-sand-100 px-3 py-1 text-xs font-bold text-ink-600">
                      <Clock className="h-3.5 w-3.5" />
                      {t.comingSoon}
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
