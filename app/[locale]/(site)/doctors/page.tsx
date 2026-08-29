import { Suspense } from "react";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getActiveDepartments, getActiveDoctors } from "@/lib/db";
import { DoctorCard } from "@/components/DoctorCard";
import { DoctorsFilter } from "@/components/DoctorsFilter";
import { CtaBanner } from "@/components/CtaBanner";

export default function DoctorsPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { department?: string };
}) {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const dict = getDictionary(locale);
  const departments = getActiveDepartments();
  const allDoctors = getActiveDoctors();
  const departmentId = searchParams.department;
  const doctors = departmentId
    ? allDoctors.filter((d) => d.departmentId === departmentId)
    : allDoctors;

  return (
    <>
      <section className="section-y bg-gradient-to-b from-primary-50 to-white">
        <div className="container-x text-center">
          <h1 className="text-4xl font-extrabold text-ink-950 sm:text-5xl">
            {dict.doctors.title}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-600">
            {dict.doctors.subtitle}
          </p>
        </div>
      </section>

      <section className="section-y bg-white">
        <div className="container-x">
          <div className="mb-10 flex justify-center">
            <Suspense fallback={<div className="input max-w-xs" />}>
              <DoctorsFilter
                locale={locale}
                dict={dict}
                departments={departments}
              />
            </Suspense>
          </div>

          {doctors.length === 0 ? (
            <p className="text-center text-ink-500">{dict.doctors.empty}</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {doctors.map((doctor) => (
                <DoctorCard
                  key={doctor.id}
                  doctor={doctor}
                  department={departments.find(
                    (d) => d.id === doctor.departmentId
                  )}
                  locale={locale}
                  dict={dict}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <CtaBanner locale={locale} dict={dict} />
    </>
  );
}
