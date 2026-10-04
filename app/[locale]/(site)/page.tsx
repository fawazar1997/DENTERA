import Link from "next/link";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getSiteDictionary } from "@/lib/content";
import {
  getActiveBranches,
  getActiveDepartments,
  getActiveDoctors,
  getActivePartners,
  getSettings,
} from "@/lib/db";
import { Hero } from "@/components/Hero";
import { HomeBanner } from "@/components/HomeBanner";
import { WhyChooseUs } from "@/components/WhyChooseUs";
import { DepartmentCard } from "@/components/DepartmentCard";
import { DoctorCard } from "@/components/DoctorCard";
import { CtaBanner } from "@/components/CtaBanner";
import { Testimonials } from "@/components/Testimonials";
import { Reveal } from "@/components/Reveal";
import { PartnersMarquee } from "@/components/PartnersMarquee";
import { BranchCards } from "@/components/BranchCards";

// Content is edited live from the control panel, so render on request
// (the database read itself is cached until the next save).
export const dynamic = "force-dynamic";

export default async function HomePage({
  params,
}: {
  params: { locale: string };
}) {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const dict = await getSiteDictionary(locale);
  const departments = await getActiveDepartments();
  const doctors = await getActiveDoctors();
  const settings = await getSettings();
  const partners = await getActivePartners();
  const branches = await getActiveBranches();
  const rtl = locale === "ar";
  const Arrow = rtl ? ArrowLeft : ArrowRight;

  return (
    <>
      {settings.showHomeBanner !== false && (
        <HomeBanner
          bannerUrl={settings.banners?.home}
          tagline={dict.footer.description}
        />
      )}
      <Hero locale={locale} dict={dict} imageUrl={settings.heroImageUrl} />
      <WhyChooseUs dict={dict} />

      <section className="section-y bg-ink-50/60">
        <div className="container-x">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
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
            {departments.slice(0, 4).map((department, i) => (
              <Reveal key={department.id} delay={i * 80} className="h-full">
                <DepartmentCard
                  department={department}
                  locale={locale}
                  dict={dict}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-y bg-white">
        <div className="container-x">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
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
            {doctors.slice(0, 4).map((doctor, i) => (
              <Reveal key={doctor.id} delay={i * 80} className="h-full">
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
        </div>
      </section>

      <PartnersMarquee partners={partners} locale={locale} dict={dict} />

      {branches.length > 0 && (
        <section className="section-y bg-ink-50/60">
          <div className="container-x">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
                {dict.home.branchesTitle}
              </h2>
              <p className="mt-4 text-lg text-ink-600">
                {dict.home.branchesSubtitle}
              </p>
            </div>
            <div className="mx-auto mt-12 max-w-4xl">
              <BranchCards branches={branches} locale={locale} dict={dict} />
            </div>
          </div>
        </section>
      )}

      <Testimonials locale={locale} dict={dict} />
      <CtaBanner locale={locale} dict={dict} />
    </>
  );
}
