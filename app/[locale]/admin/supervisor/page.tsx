import { headers } from "next/headers";
import { BookUser, CalendarCheck, Check, FolderOpen, Minus, ShieldCheck } from "lucide-react";
import type { ComponentType } from "react";
import { isLocale, defaultLocale, type Locale, localePath } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getSettings } from "@/lib/db";
import { generateBookingsSupervisorKeyAction } from "@/lib/actions";
import { supervisorText } from "@/lib/supervisorText";
import { LinkCard } from "@/components/admin/LinkCard";
import { RiyalIcon } from "@/components/RiyalIcon";
import { requireAdminPage } from "@/lib/adminSession";

// Admin pages always need the current data, never a stale build-time or
// revalidation-cached snapshot, so render them fresh on every request.
export const dynamic = "force-dynamic";

/**
 * Control Panel → Supervisor link: one private link for the supervisor,
 * opening their home page with an icon for each page they use. (Stored as
 * the bookings supervisor key, so links shared before keep working.)
 */
export default async function AdminSupervisorPage({ params }: { params: { locale: string } }) {
  await requireAdminPage(params.locale);
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = getDictionary(locale);
  const t = supervisorText(locale);
  const settings = await getSettings();

  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const key = settings.bookingsSupervisorKey;
  const path = key ? localePath(locale, `/supervisor/${key}`) : "";
  const link = key ? `${proto}://${host}${path}` : "";

  const items: { title: string; note: string; icon: ComponentType<{ className?: string }>; ready: boolean }[] = [
    { title: dict.admin.bookings, note: t.canAssign, icon: CalendarCheck, ready: true },
    { title: dict.admin.formsArchive, note: t.viewOnly, icon: FolderOpen, ready: true },
    {
      title: dict.admin.directory,
      note: settings.directoryKey ? t.sameAsStaff : t.notShared,
      icon: BookUser,
      ready: Boolean(settings.directoryKey),
    },
    {
      title: dict.admin.prices,
      note: settings.pricesKey ? t.sameAsStaff : t.notShared,
      icon: RiyalIcon,
      ready: Boolean(settings.pricesKey),
    },
  ];

  return (
    <div className="container-x py-10">
      <h1 className="text-2xl font-extrabold text-ink-950">{dict.admin.supervisorLink}</h1>
      <p className="mt-1 max-w-3xl text-ink-500">{t.adminHint}</p>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <LinkCard
          title={dict.admin.supervisorLink}
          hint={t.linkHint}
          icon={ShieldCheck}
          link={link}
          path={path}
          openLabel={dict.admin.openSupervisor}
          action={generateBookingsSupervisorKeyAction}
          dict={dict}
        />

        <section className="card p-6">
          <h2 className="font-bold text-ink-900">{t.includes}</h2>
          <ul className="mt-4 divide-y divide-ink-100">
            {items.map(({ title, note, icon: Icon, ready }) => (
              <li key={title} className="flex items-center gap-3 py-3">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-ink-950 text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink-900">{title}</p>
                  <p className="text-xs text-ink-500">{note}</p>
                </div>
                {ready ? (
                  <Check className="h-5 w-5 flex-shrink-0 text-primary-600" aria-hidden="true" />
                ) : (
                  <Minus className="h-5 w-5 flex-shrink-0 text-ink-300" aria-hidden="true" />
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
