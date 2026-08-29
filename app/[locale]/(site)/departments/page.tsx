import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getActiveDepartments } from "@/lib/db";
import { DepartmentCard } from "@/components/DepartmentCard";
import { CtaBanner } from "@/components/CtaBanner";
import { Reveal } from "@/components/Reveal";

export default function DepartmentsPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const dict = getDictionary(locale);
  const departments = getActiveDepartments();

  return (
    <>
      <section className="section-y bg-gradient-to-b from-primary-50 to-paper">
        <div className="container-x text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-ink-950 sm:text-5xl">
            {dict.departments.title}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-600">
            {dict.departments.subtitle}
          </p>
        </div>
      </section>

      <section className="section-y bg-white">
        <div className="container-x">
          {departments.length === 0 ? (
            <p className="text-center text-ink-500">
              {dict.departments.empty}
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {departments.map((department, i) => (
                <Reveal key={department.id} delay={(i % 3) * 100}>
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
