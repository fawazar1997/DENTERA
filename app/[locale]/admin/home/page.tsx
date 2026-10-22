import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getSettings } from "@/lib/db";
import { HOME_SECTIONS, homeSectionOrder, type HomeSectionKey } from "@/lib/types";
import { updateHomeSectionsAction } from "@/lib/actions";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { HomeSectionsEditor } from "@/components/admin/HomeSectionsEditor";

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
  const settings = await getSettings();

  return (
    <>
      <div className="container-x py-10">
        <h1 className="text-2xl font-extrabold text-ink-950">{dict.admin.homeSections}</h1>
        <p className="mt-1 max-w-3xl text-ink-500">{dict.admin.homeSectionsSubtitle}</p>

        <form action={updateHomeSectionsAction} className="card mt-6 max-w-2xl p-6">
          <HomeSectionsEditor
            initialOrder={homeSectionOrder(settings.homeSectionOrder)}
            hidden={settings.hiddenHomeSections ?? []}
            labels={Object.fromEntries(
              HOME_SECTIONS.map((section) => [section, dict.admin[LABEL_KEYS[section]]])
            ) as Record<HomeSectionKey, string>}
            moveUp={dict.admin.moveUp}
            moveDown={dict.admin.moveDown}
          />
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
