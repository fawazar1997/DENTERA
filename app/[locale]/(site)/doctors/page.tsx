import type { Metadata } from "next";
import { Suspense } from "react";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getSiteDictionary } from "@/lib/content";
import { inDepartment } from "@/lib/doctorDepartments";
import { pageMetadata } from "@/lib/seo";
import { PageBanner } from "@/components/PageBanner";
import { getActiveDepartments, getActiveDoctors, getSettings } from "@/lib/db";
import { DoctorCard } from "@/components/DoctorCard";
import { DoctorsFilter } from "@/components/DoctorsFilter";
import { CtaBanner } from "@/components/CtaBanner";
import { Reveal } from "@/components/Reveal";

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = await getSiteDictionary(locale);
  return pageMetadata({
    locale,
    siteName: dict.meta.siteName,
    path: "/doctors",
    title: dict.doctors.title,
    description: `${dict.doctors.subtitle} ${dict.meta.description}`,
  });
}

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
    ? allDoctors.filter((d) => inDepartment(d, departmentId))
    : allDoctors;

  return (
    <>
      <PageBanner
        title={dict.doctors.title}
        subtitle={dict.doctors.subtitle}
        imageUrl={settings.banners?.doctors}
        mobileImageUrl={settings.mobileBanners?.doctors}
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
                      (d) =>
                        d.id ===
                        (departmentId && inDepartment(doctor, departmentId)
                          ? departmentId
                          : doctor.departmentId)
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

      <CtaBanner locale={locale} dict={dict} source="doctors" />
    </>
  );
}
