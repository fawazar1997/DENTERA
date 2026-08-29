import Link from "next/link";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getActiveDepartments, getActiveDoctors } from "@/lib/db";
import { Hero } from "@/components/Hero";
import { WhyChooseUs } from "@/components/WhyChooseUs";
import { DepartmentCard } from "@/components/DepartmentCard";
import { DoctorCard } from "@/components/DoctorCard";
import { CtaBanner } from "@/components/CtaBanner";
import { Testimonials } from "@/components/Testimonials";

export default function HomePage({
  params,
}: {
  params: { locale: string };
}) {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const dict = getDictionary(locale);
  const departments = getActiveDepartments();
  const doctors = getActiveDoctors();
  const rtl = locale === "ar";
  const Arrow = rtl ? ArrowLeft : ArrowRight;

  return (
    <>
      <Hero locale={locale} dict={dict} />
      <WhyChooseUs dict={dict} />

      <section className="section-y bg-ink-50/60">
        <div className="container-x">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-3xl font-extrabold text-ink-950 sm:text-4xl">
                {dict.home.departmentsTitle}
              </h2>
              <p className="mt-3 max-w-xl text-lg text-ink-600">
                {dict.home.departmentsSubtitle}
              </p>
            </div>
            <Link
              href={`/${locale}/departments`}
              className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-primary-700 hover:text-primary-800"
            >
              {dict.home.departmentsCta}
              <Arrow className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {departments.slice(0, 4).map((department) => (
              <DepartmentCard
                key={department.id}
                department={department}
                locale={locale}
                dict={dict}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="section-y bg-white">
        <div className="container-x">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-3xl font-extrabold text-ink-950 sm:text-4xl">
                {dict.home.doctorsTitle}
              </h2>
              <p className="mt-3 max-w-xl text-lg text-ink-600">
                {dict.home.doctorsSubtitle}
              </p>
            </div>
            <Link
              href={`/${locale}/doctors`}
              className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-primary-700 hover:text-primary-800"
            >
              {dict.home.doctorsCta}
              <Arrow className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {doctors.slice(0, 4).map((doctor) => (
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
        </div>
      </section>

      <Testimonials locale={locale} dict={dict} />
      <CtaBanner locale={locale} dict={dict} />
    </>
  );
}
