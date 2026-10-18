import Link from "next/link";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { isLocale, defaultLocale, type Locale, localePath } from "@/lib/i18n";
import { getSiteDictionary } from "@/lib/content";
import type { HomeSectionKey } from "@/lib/types";
import {
  getActiveBranches,
  getActiveDepartments,
  getActiveDoctors,
  getActivePartners,
  getLiveOffers,
  getSettings,
} from "@/lib/db";
import { Hero } from "@/components/Hero";
import { HomeBanner } from "@/components/HomeBanner";
import { OfferCarousel } from "@/components/OfferCarousel";
import { WhyDentera } from "@/components/WhyDentera";
import { DepartmentCard } from "@/components/DepartmentCard";
import { DoctorCard } from "@/components/DoctorCard";
import { CtaBanner } from "@/components/CtaBanner";
import { Testimonials } from "@/components/Testimonials";
import { Reveal } from "@/components/Reveal";
import { LogoGallery } from "@/components/LogoGallery";
import { PaymentMethods } from "@/components/PaymentMethods";
import { DoctorsCarousel } from "@/components/DoctorsCarousel";
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
  // Doctors with a photo lead the home carousel.
  const featuredDoctors = [
    ...doctors.filter((d) => d.photoUrl),
    ...doctors.filter((d) => !d.photoUrl),
  ];
  const settings = await getSettings();
  const partners = await getActivePartners("partners");
  const payments = await getActivePartners("payments");
  const branches = await getActiveBranches();
  const offers = await getLiveOffers();
  const hidden = new Set(settings.hiddenHomeSections ?? []);
  const show = (section: HomeSectionKey) => !hidden.has(section);
  const rtl = locale === "ar";
  const Arrow = rtl ? ArrowLeft : ArrowRight;

  return (
    <>
      {settings.showHomeBanner !== false &&
        (offers.length > 0 ? (
          // The home banner is the promotions carousel; each slide opens
          // its offer page. Without live offers, the plain banner shows.
          <OfferCarousel
            locale={locale}
            slides={offers.map((offer) => ({
              id: offer.id,
              title: rtl ? offer.titleAr : offer.titleEn,
              summary: rtl ? offer.summaryAr : offer.summaryEn,
              imageUrl: offer.imageUrl,
              priceNow: offer.priceNow,
              priceWas: offer.priceWas,
            }))}
            labels={{
              viewOffer: dict.offers.viewOffer,
              currency: dict.offers.currency,
              save: dict.offers.save,
              previous: rtl ? "السابق" : "Previous",
              next: rtl ? "التالي" : "Next",
            }}
          />
        ) : (
          <HomeBanner
            bannerUrl={settings.banners?.home}
            tagline={dict.footer.description}
          />
        ))}
      {show("hero") && (
        <>
          <Hero
            locale={locale}
            dict={dict}
            imageUrl={settings.heroImageUrl}
            branchNames={branches.map((b) => (rtl ? b.nameAr : b.nameEn))}
          />
        </>
      )}
      {show("doctors") && (
        <>
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
                  href={localePath(locale, `/doctors`)}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-primary-700 hover:text-primary-800"
                >
                  {dict.home.doctorsCta}
                  <Arrow className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-10">
                <DoctorsCarousel
                  rtl={rtl}
                  labels={{
                    previous: rtl ? "السابق" : "Previous",
                    next: rtl ? "التالي" : "Next",
                  }}
                >
                  {featuredDoctors.map((doctor) => (
                    <DoctorCard
                      key={doctor.id}
                      doctor={doctor}
                      department={departments.find((d) => d.id === doctor.departmentId)}
                      locale={locale}
                      dict={dict}
                    />
                  ))}
                </DoctorsCarousel>
              </div>
            </div>
          </section>
        </>
      )}
      {show("departments") && (
        <>
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
                  href={localePath(locale, `/departments`)}
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
        </>
      )}
      {show("payments") && (
        <>
          <PaymentMethods
            methods={payments}
            locale={locale}
            title={dict.home.paymentsTitle}
            body={dict.home.paymentsBody}
          />
        </>
      )}
      {show("branches") && (
        <>
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
        </>
      )}
      {show("testimonials") && (
        <>
          <Testimonials locale={locale} dict={dict} />
        </>
      )}
      {show("partners") && (
        <>
          <LogoGallery
            logos={partners}
            locale={locale}
            title={dict.home.partnersTitle}
            subtitle={dict.home.partnersSubtitle}
          />
        </>
      )}
      {show("why") && (
        <>
          <WhyDentera dict={dict} className="bg-ink-50/60" />
        </>
      )}
      {show("booking") && (
        <>
          <CtaBanner locale={locale} dict={dict} source="home" />
        </>
      )}
    </>
  );
}
