import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { isLocale, defaultLocale, type Locale, localePath } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getBranches, getDepartments, getDoctors, getOffers, getPartners } from "@/lib/db";
import { getBookings } from "@/lib/bookings";
import { ADMIN_SECTION_GROUPS } from "@/components/admin/adminSections";

// Admin pages always need the current data, never a stale build-time or
// revalidation-cached snapshot, so render them fresh on every request.
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const dict = getDictionary(locale);
  const [doctors, departments, partners, branches, offers, bookings] = await Promise.all([
    getDoctors(),
    getDepartments(),
    getPartners(),
    getBranches(),
    getOffers(),
    getBookings().catch(() => []),
  ]);
  const Arrow = locale === "ar" ? ArrowLeft : ArrowRight;
  const newBookings = bookings.filter((b) => b.status === "new").length;

  // A count shown on a section's card, where one helps.
  const counts: Record<string, number> = {
    "/doctors": doctors.length,
    "/departments": departments.length,
    "/offers": offers.length,
    "/partners": partners.length,
    "/branches": branches.length,
  };

  return (
    <div className="container-x py-10">
      <h1 className="text-2xl font-extrabold text-ink-950">{dict.admin.dashboardTitle}</h1>
      <p className="mt-1 max-w-3xl text-ink-500">{dict.admin.dashboardSubtitle}</p>

      {newBookings > 0 && (
        <Link
          href={localePath(locale, "/admin/bookings")}
          className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-ink-900 px-6 py-5 text-white transition hover:bg-ink-800"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-11 min-w-[2.75rem] items-center justify-center rounded-full bg-primary-500 px-3 text-lg font-extrabold text-ink-900">
              {newBookings}
            </span>
            <span className="font-bold">
              {dict.admin.bookings} — {dict.admin.newRequests}
            </span>
          </span>
          <Arrow className="h-5 w-5 flex-shrink-0" />
        </Link>
      )}

      {ADMIN_SECTION_GROUPS.filter((group) => group.sections.some((s) => s.hint)).map((group) => (
        <section key={group.label} className="mt-10">
          <h2 className="text-sm font-extrabold text-ink-500">{dict.admin[group.label]}</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {group.sections.map((section) => (
              <Link
                key={section.path}
                href={localePath(locale, `/admin${section.path}`)}
                className="card group flex items-start gap-4 p-5 hover:-translate-y-0.5 hover:shadow-soft"
              >
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary-100 text-ink-900">
                  <section.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-bold text-ink-900">
                    {dict.admin[section.label]}
                    {section.path === "/bookings" && newBookings > 0 ? (
                      <span className="rounded-full bg-primary-500 px-2 py-0.5 text-xs font-extrabold text-ink-900">
                        {newBookings} {dict.admin.newRequests}
                      </span>
                    ) : counts[section.path] !== undefined ? (
                      <span className="rounded-full bg-ink-50 px-2 py-0.5 text-xs font-bold text-ink-500">
                        {counts[section.path]}
                      </span>
                    ) : null}
                  </span>
                  {section.hint && (
                    <span className="mt-1 block text-sm leading-relaxed text-ink-500">
                      {dict.admin[section.hint]}
                    </span>
                  )}
                </span>
                <Arrow className="mt-1 h-4 w-4 flex-shrink-0 text-ink-300 transition group-hover:text-ink-900" />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
