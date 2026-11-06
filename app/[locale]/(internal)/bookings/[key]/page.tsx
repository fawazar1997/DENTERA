import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookUser, FolderOpen, Lock } from "lucide-react";
import { isLocale, defaultLocale, type Locale, localePath } from "@/lib/i18n";
import { bookingsRole } from "@/lib/bookings";
import { getSettings } from "@/lib/db";
import { RiyalIcon } from "@/components/RiyalIcon";
import { getBookingsBoardData } from "@/lib/bookingBoard";
import { BookingsBoard } from "@/components/BookingsBoard";
import { BulkReassign } from "@/components/BulkReassign";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dentera — طلبات الحجز",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

/**
 * Booking requests, reachable only through a private link created in
 * Control Panel → Booking Requests: the call center's, or the supervisor's
 * (who also assigns extensions). A wrong or revoked key gets a plain 404,
 * so the page's existence isn't revealed.
 */
export default async function CallCenterBookingsPage({
  params,
}: {
  params: { locale: string; key: string };
}) {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const role = await bookingsRole(params.key);
  if (!role) notFound();

  const data = await getBookingsBoardData(locale);
  const other = locale === "ar" ? "en" : "ar";
  // Shortcuts to the staff pages the call center uses while calling
  // (shown only once their private links exist; they open in a new tab so
  // the board keeps its place).
  const settings = await getSettings();
  const shortcuts = [
    // The supervisor also oversees the letters: the same link opens the
    // forms page with the letters register (view only).
    role === "supervisor" && {
      href: localePath(locale, `/forms/${params.key}`),
      label: data.dict.admin.formsArchive,
      icon: FolderOpen,
    },
    settings.directoryKey && {
      href: localePath(locale, `/directory/${settings.directoryKey}`),
      label: data.dict.admin.directory,
      icon: BookUser,
    },
    settings.pricesKey && {
      href: localePath(locale, `/prices/${settings.pricesKey}`),
      label: data.dict.admin.prices,
      icon: RiyalIcon,
    },
  ].filter((s): s is { href: string; label: string; icon: typeof RiyalIcon } => !!s);

  return (
    <div className="min-h-screen">
      <header className="bg-ink-950">
        <div className="container-x py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Logo className="h-8 w-auto flex-shrink-0 sm:h-9" />
              <span className="truncate text-base font-bold text-white sm:text-lg">
                {data.dict.admin.bookings}
                {role === "supervisor" && ` — ${data.dict.admin.supervisor}`}
              </span>
            </div>
            <Link
              href={localePath(other, `/bookings/${params.key}`)}
              className="flex-shrink-0 rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-ink-100 hover:border-primary-400 hover:text-white"
            >
              {other === "ar" ? "العربية" : "English"}
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-sand-200">
              <Lock className="h-3.5 w-3.5 flex-shrink-0" />
              {data.dict.admin.internalOnly}
            </span>
            {shortcuts.length > 0 && (
              <div className="flex items-center gap-2">
                {shortcuts.map(({ href, label, icon: Icon }) => (
                  <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="container-x min-w-0 py-5 sm:py-6">
        <BookingsBoard
          bookings={data.bookings}
          departments={data.departments}
          extensions={data.extensions}
          branches={data.branches}
          locale={locale}
          labels={data.labels}
          accessKey={params.key}
          canAssignExtension={role === "supervisor"}
        />
        {role === "supervisor" && (
          <div className="mt-8">
            <BulkReassign
              doctors={data.doctors}
              branches={data.branches}
              extensions={data.extensions}
              accessKey={params.key}
              labels={data.reassignLabels}
            />
          </div>
        )}
      </main>
    </div>
  );
}
