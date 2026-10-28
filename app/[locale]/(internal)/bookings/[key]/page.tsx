import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { isLocale, defaultLocale, type Locale, localePath } from "@/lib/i18n";
import { bookingsRole } from "@/lib/bookings";
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
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-sand-200">
            <Lock className="h-3.5 w-3.5 flex-shrink-0" />
            {data.dict.admin.internalOnly}
          </span>
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
