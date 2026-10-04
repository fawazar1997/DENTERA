import { Suspense } from "react";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getSiteDictionary } from "@/lib/content";
import { PageBanner } from "@/components/PageBanner";
import { getActiveDepartments, getActiveDoctors, getSettings } from "@/lib/db";
import { DoctorCard } from "@/components/DoctorCard";
import { DoctorsFilter } from "@/components/DoctorsFilter";
import { CtaBanner } from "@/components/CtaBanner";
import { Reveal } from "@/components/Reveal";

// Content is edited live from the control panel, so render on request
// (the database read itself is cached until the next save).
export const dynamic = "force-dynamic";

export default async function DoctorsPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { department?: string };
}) {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const dict = await getSiteDictionary(locale);
  const settings = await getSettings();
  const departments = await getActiveDepartments();
  const allDoctors = await getActiveDoctors();
  const departmentId = searchParams.department;
  const doctors = departmentId
    ? allDoctors.filter((d) => d.departmentId === departmentId)
    : allDoctors;

  return (
    <>
      <PageBanner
        title={dict.doctors.title}
        subtitle={dict.doctors.subtitle}
        imageUrl={settings.banners?.doctors}
      />

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
              {doctors.map((doctor, i) => (
                <Reveal key={doctor.id} delay={(i % 3) * 100} className="h-full">
                  <DoctorCard
                    doctor={doctor}
                    department={departments.find(
                      (d) => d.id === doctor.departmentId
                    )}
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
