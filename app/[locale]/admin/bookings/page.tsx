import { headers } from "next/headers";
import { ExternalLink, Link2, ShieldCheck, Trash2 } from "lucide-react";
import { isLocale, defaultLocale, type Locale, localePath } from "@/lib/i18n";
import { getSettings } from "@/lib/db";
import { getBookingsBoardData } from "@/lib/bookingBoard";
import {
  deleteOldBookingsAction,
  generateBookingsKeyAction,
  generateBookingsSupervisorKeyAction,
} from "@/lib/actions";
import { CopyField } from "@/components/admin/CopyField";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { BookingsBoard } from "@/components/BookingsBoard";
import { BulkReassign } from "@/components/BulkReassign";
import { requireAdminPage } from "@/lib/adminSession";
import type { Dictionary } from "@/lib/dictionaries";

// Admin pages always need the current data, never a stale build-time or
// revalidation-cached snapshot, so render them fresh on every request.
export const dynamic = "force-dynamic";

/** One private bookings link: copy, create/replace, open. */
function LinkCard({
  title,
  hint,
  icon: Icon,
  link,
  path,
  openLabel,
  action,
  dict,
}: {
  title: string;
  hint: string;
  icon: typeof Link2;
  link: string;
  path: string;
  openLabel: string;
  action: () => Promise<void>;
  dict: Dictionary;
}) {
  return (
    <section className="card p-6">
      <h2 className="flex items-center gap-2 font-bold text-ink-900">
        <Icon className="h-5 w-5 text-primary-600" />
        {title}
      </h2>
      <p className="mt-1 text-sm text-ink-500">{hint}</p>
      <div className="mt-4">
        {link ? (
          <CopyField value={link} copyLabel={dict.admin.copyLink} copiedLabel={dict.admin.copied} />
        ) : (
          <p className="rounded-lg bg-ink-50 px-4 py-3 text-sm text-ink-500">{dict.admin.noLink}</p>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <form action={action}>
          <ConfirmSubmit
            label={link ? dict.admin.regenerateLink : dict.admin.createLink}
            confirmText={link ? dict.admin.regenerateConfirm : undefined}
            className={link ? "btn-outline" : "btn-primary"}
          />
        </form>
        {link && (
          <a
            href={path}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            {openLabel}
          </a>
        )}
      </div>
    </section>
  );
}

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
  const supervisor = linkFor(settings.bookingsSupervisorKey);
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
        <LinkCard
          title={dict.admin.supervisorLink}
          hint={dict.admin.supervisorLinkHint}
          icon={ShieldCheck}
          {...supervisor}
          openLabel={dict.admin.openSupervisor}
          action={generateBookingsSupervisorKeyAction}
          dict={dict}
        />
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
