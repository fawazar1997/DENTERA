import Link from "next/link";
import { isLocale, defaultLocale, type Locale, localePath } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { listActivity } from "@/lib/activity";
import { activityText } from "@/lib/activityText";
import { ADMIN_SECTION_GROUPS } from "@/components/admin/adminSections";
import { requireAdminPage } from "@/lib/adminSession";

// Admin pages always need the current data, never a stale build-time or
// revalidation-cached snapshot, so render them fresh on every request.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

/** Control Panel → Activity log (admin only): who changed what, and when. */
export default async function AdminActivityPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: Record<string, string | undefined>;
}) {
  await requireAdminPage(params.locale);
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const ar = locale === "ar";
  const dict = getDictionary(locale);
  const t = activityText(locale);

  const all = await listActivity();
  const marketingName = (process.env.MARKETING_USERNAME || "pr").trim();
  const userName = (user: string) => (user === "admin" ? t.admin : marketingName);
  const sectionLabels = new Map(
    ADMIN_SECTION_GROUPS.flatMap((g) => g.sections).map((s) => [s.path, dict.admin[s.label]] as const)
  );
  const sectionName = (path: string) => sectionLabels.get(path) ?? path;

  const userFilter = searchParams.user === "admin" || searchParams.user === "marketing" ? searchParams.user : "";
  const sectionFilter = searchParams.section && sectionLabels.has(searchParams.section) ? searchParams.section : "";
  const entries = all.filter((e) => (!userFilter || e.user === userFilter) && (!sectionFilter || e.section === sectionFilter));
  const sections = [...new Set(all.map((e) => e.section))].filter((s) => sectionLabels.has(s));

  const pages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(searchParams.page) || 1));
  const shown = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageHref = (p: number) => {
    const q = new URLSearchParams();
    if (userFilter) q.set("user", userFilter);
    if (sectionFilter) q.set("section", sectionFilter);
    if (p > 1) q.set("page", String(p));
    const text = q.toString();
    return localePath(locale, `/admin/activity${text ? `?${text}` : ""}`);
  };

  const when = new Intl.DateTimeFormat(ar ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Riyadh",
  });

  return (
    <div className="container-x py-10">
      <h1 className="text-2xl font-extrabold text-ink-950">{dict.admin.activity}</h1>
      <p className="mt-1 max-w-3xl text-ink-500">{t.subtitle}</p>

      <form method="get" className="card mt-6 flex flex-wrap items-end gap-3 p-4">
        <select name="user" defaultValue={userFilter} aria-label={t.allUsers} className="input w-auto flex-1">
          <option value="">{t.allUsers}</option>
          <option value="admin">{t.admin}</option>
          <option value="marketing">{marketingName}</option>
        </select>
        <select name="section" defaultValue={sectionFilter} aria-label={t.allSections} className="input w-auto flex-1">
          <option value="">{t.allSections}</option>
          {sections.map((s) => (
            <option key={s} value={s}>
              {sectionName(s)}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-primary">
          {t.apply}
        </button>
      </form>

      <section className="card mt-6 p-6">
        <p className="text-sm text-ink-500">
          <b className="text-ink-900">{entries.length}</b> {t.count}
        </p>
        {shown.length === 0 ? (
          <p className="mt-4 rounded-xl bg-ink-50 px-4 py-6 text-center text-ink-500">{t.empty}</p>
        ) : (
          <ul className="mt-4 divide-y divide-ink-100">
            {shown.map((e, i) => (
              <li key={`${e.at}-${i}`} className="flex flex-wrap items-start gap-3 py-3">
                <span
                  className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    e.user === "admin" ? "bg-ink-950 text-white" : "bg-primary-100 text-primary-800"
                  }`}
                >
                  {userName(e.user)}
                </span>
                <p className="min-w-0 flex-1 text-sm text-ink-800">
                  <b>{t.actions[e.action] ?? e.action}</b>
                  <span className="text-ink-500"> — {sectionName(e.section)}</span>
                  {e.item && (
                    <>
                      {": "}
                      <bdi className="font-semibold text-ink-900">{e.item}</bdi>
                    </>
                  )}
                </p>
                <time dateTime={e.at} className="flex-shrink-0 text-xs text-ink-400">
                  {when.format(new Date(e.at))}
                </time>
              </li>
            ))}
          </ul>
        )}
        {pages > 1 && (
          <nav className="mt-4 flex items-center justify-center gap-3 text-sm">
            {page > 1 && (
              <Link href={pageHref(page - 1)} className="btn-outline px-4 py-1.5">
                {t.prev}
              </Link>
            )}
            <span className="text-ink-500">
              {page} / {pages}
            </span>
            {page < pages && (
              <Link href={pageHref(page + 1)} className="btn-outline px-4 py-1.5">
                {t.next}
              </Link>
            )}
          </nav>
        )}
      </section>
    </div>
  );
}
