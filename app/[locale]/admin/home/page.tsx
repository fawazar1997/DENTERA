import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getSettings } from "@/lib/db";
import { HOME_SECTIONS, type HomeSectionKey } from "@/lib/types";
import { updateHomeSectionsAction } from "@/lib/actions";
import { AdminNav } from "@/components/admin/AdminNav";
import { SubmitButton } from "@/components/admin/SubmitButton";

// Admin pages always need the current data, never a stale build-time or
// revalidation-cached snapshot, so render them fresh on every request.
export const dynamic = "force-dynamic";

const LABEL_KEYS = {
  hero: "sectionHero",
  doctors: "sectionDoctors",
  departments: "sectionDepartments",
  payments: "sectionPayments",
  branches: "sectionBranches",
  testimonials: "sectionTestimonials",
  partners: "sectionPartners",
  why: "sectionWhy",
  booking: "sectionBooking",
} as const satisfies Record<HomeSectionKey, string>;

export default async function AdminHomeSectionsPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = getDictionary(locale);
  const hidden = new Set((await getSettings()).hiddenHomeSections ?? []);

  return (
    <>
      <AdminNav locale={locale} dict={dict} />
      <div className="container-x py-10">
        <h1 className="text-2xl font-extrabold text-ink-950">{dict.admin.homeSections}</h1>
        <p className="mt-1 max-w-3xl text-ink-500">{dict.admin.homeSectionsSubtitle}</p>

        <form action={updateHomeSectionsAction} className="card mt-6 max-w-2xl p-6">
          <ol className="divide-y divide-ink-100">
            {HOME_SECTIONS.map((section, i) => (
              <li key={section}>
                <label className="flex cursor-pointer items-center gap-4 py-3.5">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-ink-50 text-sm font-bold text-ink-500">
                    {i + 1}
                  </span>
                  <span className="flex-1 font-semibold text-ink-900">
                    {dict.admin[LABEL_KEYS[section]]}
                  </span>
                  <input
                    type="checkbox"
                    name="shown"
                    value={section}
                    defaultChecked={!hidden.has(section)}
                    className="peer h-5 w-5 rounded border-ink-300"
                  />
                </label>
              </li>
            ))}
          </ol>
          <p className="mt-4 rounded-xl bg-ink-50 px-4 py-3 text-sm text-ink-500">
            {dict.admin.homeSectionsBannerHint}
          </p>
          <div className="mt-5">
            <SubmitButton label={dict.admin.save} savedLabel={dict.admin.saved} />
          </div>
        </form>
      </div>
    </>
  );
}
