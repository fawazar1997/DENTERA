import { headers } from "next/headers";
import Link from "next/link";
import { Link2, ShieldCheck, Trash2 } from "lucide-react";
import { isLocale, defaultLocale, type Locale, localePath } from "@/lib/i18n";
import { getSettings } from "@/lib/db";
import { getBookingsBoardData } from "@/lib/bookingBoard";
import { deleteOldBookingsAction, generateBookingsKeyAction } from "@/lib/actions";
import { supervisorText } from "@/lib/supervisorText";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { LinkCard } from "@/components/admin/LinkCard";
import { BookingsBoard } from "@/components/BookingsBoard";
import { BulkReassign } from "@/components/BulkReassign";
import { requireAdminPage } from "@/lib/adminSession";

// Admin pages always need the current data, never a stale build-time or
// revalidation-cached snapshot, so render them fresh on every request.
export const dynamic = "force-dynamic";

export default async function AdminBookingsPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { deleted?: string };
}) {
  await requireAdminPage(params.locale);
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const data = await getBookingsBoardData(locale);
  const { dict } = data;
  const settings = await getSettings();

  // Absolute links for sharing, based on the address this page was opened on.
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const linkFor = (key?: string) => {
    const path = key ? localePath(locale, `/bookings/${key}`) : "";
    return { path, link: key ? `${proto}://${host}${path}` : "" };
  };
  const agent = linkFor(settings.bookingsKey);
  const st = supervisorText(locale);
  const deleted = searchParams.deleted;

  return (
    <div className="container-x py-10">
      <h1 className="text-2xl font-extrabold text-ink-950">{dict.admin.bookings}</h1>
      <p className="mt-1 max-w-3xl text-ink-500">{dict.admin.bookingsSubtitle}</p>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <LinkCard
          title={dict.admin.bookingsLink}
          hint={dict.admin.bookingsLinkHint}
          icon={Link2}
          {...agent}
          openLabel={dict.admin.openBookings}
          action={generateBookingsKeyAction}
          dict={dict}
        />
        <section className="card p-6">
          <h2 className="flex items-center gap-2 font-bold text-ink-900">
            <ShieldCheck className="h-5 w-5 text-primary-600" />
            {dict.admin.supervisorLink}
          </h2>
          <p className="mt-1 text-sm text-ink-500">{st.manageHere}</p>
          <Link href={localePath(locale, "/admin/supervisor")} className="btn-outline mt-4">
            {st.openManage}
          </Link>
        </section>
      </div>

      <div className="mt-8">
        <BookingsBoard
          bookings={data.bookings}
          departments={data.departments}
          extensions={data.extensions}
          branches={data.branches}
          locale={locale}
          labels={data.labels}
          canAssignExtension
        />
      </div>

      <div className="mt-8">
        <BulkReassign
          doctors={data.doctors}
          branches={data.branches}
          extensions={data.extensions}
          labels={data.reassignLabels}
        />
      </div>

      <section className="card mt-8 max-w-3xl p-6">
        <h2 className="flex items-center gap-2 font-bold text-ink-900">
          <Trash2 className="h-5 w-5 text-ink-500" />
          {dict.admin.deleteOldTitle}
        </h2>
        <p className="mt-1 text-sm text-ink-500">{dict.admin.deleteOldHint}</p>
        {deleted !== undefined && (
          <p role="status" className="mt-3 rounded-lg bg-primary-100 px-4 py-2 text-sm font-bold text-ink-900">
            {dict.admin.deleteOldDone} {Number(deleted) || 0}
          </p>
        )}
        <form action={deleteOldBookingsAction} className="mt-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="locale" value={locale} />
          <label className="block">
            <span className="label">{dict.admin.deleteOldUpTo}</span>
            <input type="date" name="upTo" required defaultValue="2026-10-23" dir="ltr" className="input" />
          </label>
          <ConfirmSubmit
            label={dict.admin.deleteOldButton}
            confirmText={dict.admin.deleteOldConfirm}
            className="btn-outline"
          />
        </form>
      </section>
    </div>
  );
}
