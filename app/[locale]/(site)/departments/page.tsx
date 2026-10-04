import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getSiteDictionary } from "@/lib/content";
import { PageBanner } from "@/components/PageBanner";
import { getActiveDepartments, getSettings } from "@/lib/db";
import { DepartmentCard } from "@/components/DepartmentCard";
import { CtaBanner } from "@/components/CtaBanner";
import { Reveal } from "@/components/Reveal";

// Content is edited live from the control panel, so render on request
// (the database read itself is cached until the next save).
export const dynamic = "force-dynamic";

export default async function DepartmentsPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const dict = await getSiteDictionary(locale);
  const settings = await getSettings();
  const departments = await getActiveDepartments();

  return (
    <>
      <PageBanner
        title={dict.departments.title}
        subtitle={dict.departments.subtitle}
        imageUrl={settings.banners?.departments}
      />

      <section className="section-y bg-white">
        <div className="container-x">
          {departments.length === 0 ? (
            <p className="text-center text-ink-500">
              {dict.departments.empty}
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {departments.map((department, i) => (
                <Reveal key={department.id} delay={(i % 3) * 100} className="h-full">
                  <DepartmentCard
                    department={department}
                    locale={locale}
                    dict={dict}
                  />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      <CtaBanner locale={locale} dict={dict} />
    </>
  );
}
