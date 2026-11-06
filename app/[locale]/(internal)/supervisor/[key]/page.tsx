import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookUser, CalendarCheck, FolderOpen, Lock } from "lucide-react";
import type { ComponentType } from "react";
import { isLocale, defaultLocale, type Locale, localePath } from "@/lib/i18n";
import { bookingsRole } from "@/lib/bookings";
import { getSettings } from "@/lib/db";
import { getDictionary } from "@/lib/dictionaries";
import { supervisorText } from "@/lib/supervisorText";
import { RiyalIcon } from "@/components/RiyalIcon";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dentera — المشرف",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

/**
 * The supervisor's home page, reachable only through the supervisor link
 * created in Control Panel → Supervisor link: an icon for each page the
 * supervisor uses. The same key opens the supervisor's bookings and forms
 * pages; a wrong or revoked key gets a plain 404.
 */
export default async function SupervisorHomePage({ params }: { params: { locale: string; key: string } }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  if ((await bookingsRole(params.key)) !== "supervisor") notFound();

  const dict = getDictionary(locale);
  const t = supervisorText(locale);
  const settings = await getSettings();
  const other = locale === "ar" ? "en" : "ar";
  const Arrow = locale === "ar" ? ArrowLeft : ArrowRight;

  type Card = { href: string; title: string; hint: string; icon: ComponentType<{ className?: string }> };
  const cards: Card[] = ([
    { href: `/bookings/${params.key}`, title: dict.admin.bookings, hint: t.bookingsHint, icon: CalendarCheck },
    { href: `/forms/${params.key}`, title: dict.admin.formsArchive, hint: t.formsHint, icon: FolderOpen },
    settings.directoryKey && {
      href: `/directory/${settings.directoryKey}`,
      title: dict.admin.directory,
      hint: t.directoryHint,
      icon: BookUser,
    },
    settings.pricesKey && {
      href: `/prices/${settings.pricesKey}`,
      title: dict.admin.prices,
      hint: t.pricesHint,
      icon: RiyalIcon,
    },
  ] as (Card | "" | undefined)[]).filter((c): c is Card => !!c);

  return (
    <div className="min-h-screen">
      <header className="bg-ink-950">
        <div className="container-x py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Logo className="h-8 w-auto flex-shrink-0 sm:h-9" />
              <span className="truncate text-base font-bold text-white sm:text-lg">{t.title}</span>
            </div>
            <Link
              href={localePath(other, `/supervisor/${params.key}`)}
              className="flex-shrink-0 rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-ink-100 hover:border-primary-400 hover:text-white"
            >
              {other === "ar" ? "العربية" : "English"}
            </Link>
          </div>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-sand-200">
            <Lock className="h-3.5 w-3.5 flex-shrink-0" />
            {t.internal}
          </span>
        </div>
      </header>

      <main className="container-x py-8 sm:py-12">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/dentera-mark.svg" alt="" aria-hidden="true" className="mx-auto h-14 w-auto opacity-90" />
            <h1 className="mt-4 text-2xl font-extrabold text-ink-950 sm:text-3xl">{t.welcome}</h1>
            <p className="mt-2 text-sm text-ink-500 sm:text-base">{t.choose}</p>
          </div>

          <ul className="mt-8 grid gap-5 sm:grid-cols-2">
            {cards.map(({ href, title, hint, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={localePath(locale, href)}
                  className="group relative isolate flex h-full min-h-[11rem] flex-col overflow-hidden rounded-[1.75rem] bg-white p-6 shadow-soft ring-1 ring-ink-100 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-primary-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-300 sm:p-7"
                >
                  {/* The identity's fingerprint lines, fading out of the corner. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/brand/fingerprint-corner.svg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute -end-10 -top-10 -z-10 h-44 w-44 transition duration-500 [mask-image:radial-gradient(circle,black_30%,transparent_68%)] group-hover:scale-110"
                  />
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-950 text-white shadow-soft transition group-hover:bg-ink-900">
                    <Icon className="h-7 w-7" />
                  </span>
                  <span className="mt-5 text-xl font-extrabold text-ink-950">{title}</span>
                  <span className="mt-1 text-sm leading-relaxed text-ink-500">{hint}</span>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-bold text-primary-700">
                    {t.open}
                    <Arrow className="h-4 w-4 transition rtl:group-hover:-translate-x-1 ltr:group-hover:translate-x-1" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
