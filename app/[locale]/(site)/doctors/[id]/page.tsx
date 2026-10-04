import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  Briefcase,
  Sparkles,
  Trophy,
  Languages,
  MapPin,
  CheckCircle2,
  Clock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getSiteDictionary } from "@/lib/content";
import { getActiveBranches, getDepartment, getDoctor } from "@/lib/db";
import { DoctorPhoto } from "@/components/DoctorPhoto";
import { DepartmentIcon } from "@/components/IconMap";
import { CallButton } from "@/components/CallButton";
import { Reveal } from "@/components/Reveal";

// Content is edited live from the control panel, so render on request
// (the database read itself is cached until the next save).
export const dynamic = "force-dynamic";

type Params = { locale: string; id: string };

function resolveLocale(value: string): Locale {
  return isLocale(value) ? value : defaultLocale;
}

/** "One item per line" CV fields → list items. */
function lines(text?: string): string[] {
  return (text ?? "")
    .split("\n")
    .map((line) => line.replace(/^[\s•\-–*]+/, "").trim())
    .filter(Boolean);
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const locale = resolveLocale(params.locale);
  const doctor = await getDoctor(params.id);
  if (!doctor || !doctor.active) return {};
  const dict = await getSiteDictionary(locale);
  const name = locale === "ar" ? doctor.nameAr : doctor.nameEn;
  const title = locale === "ar" ? doctor.titleAr : doctor.titleEn;
  return {
    title: `${name} — ${dict.meta.siteName}`,
    description: (locale === "ar" ? doctor.bioAr : doctor.bioEn) || title,
  };
}

function CvSection({
  icon: Icon,
  title,
  items,
  delay,
  wide = false,
}: {
  icon: LucideIcon;
  title: string;
  items: string[];
  delay: number;
  wide?: boolean;
}) {
  return (
    <Reveal delay={delay} className={wide ? "md:col-span-2" : ""}>
      <section className="card h-full p-6">
        <h2 className="flex items-center gap-3 text-base font-bold text-ink-900">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
            <Icon className="h-5 w-5" />
          </span>
          {title}
        </h2>
        <ul className={`mt-4 gap-x-6 space-y-2.5 ${wide ? "md:columns-2" : ""}`}>
          {items.map((item, i) => (
            <li
              key={i}
              className="flex break-inside-avoid items-start gap-2.5 text-sm leading-relaxed text-ink-700"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>
    </Reveal>
  );
}

export default async function DoctorProfilePage({
  params,
}: {
  params: Params;
}) {
  const locale = resolveLocale(params.locale);
  const doctor = await getDoctor(params.id);
  if (!doctor || !doctor.active) notFound();

  const dict = await getSiteDictionary(locale);
  const department = await getDepartment(doctor.departmentId);
  const branches = (await getActiveBranches()).filter((b) =>
    doctor.branchIds?.includes(b.id)
  );

  const ar = locale === "ar";
  const BackArrow = ar ? ArrowRight : ArrowLeft;
  const Forward = ar ? ArrowLeft : ArrowRight;
  const name = ar ? doctor.nameAr : doctor.nameEn;
  const title = ar ? doctor.titleAr : doctor.titleEn;
  const bio = ar ? doctor.bioAr : doctor.bioEn;
  const languages = lines(ar ? doctor.languagesAr : doctor.languagesEn);
  const years =
    typeof doctor.yearsExperience === "number" && doctor.yearsExperience > 0
      ? doctor.yearsExperience
      : undefined;

  const sections = [
    {
      icon: GraduationCap,
      title: dict.doctorProfile.qualifications,
      items: lines(ar ? doctor.qualificationsAr : doctor.qualificationsEn),
    },
    {
      icon: Briefcase,
      title: dict.doctorProfile.experience,
      items: lines(ar ? doctor.experienceAr : doctor.experienceEn),
    },
    {
      icon: Trophy,
      title: dict.doctorProfile.achievements,
      items: lines(ar ? doctor.achievementsAr : doctor.achievementsEn),
    },
    {
      icon: Sparkles,
      title: dict.doctorProfile.services,
      items: lines(ar ? doctor.servicesAr : doctor.servicesEn),
    },
  ].filter((section) => section.items.length > 0);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 via-paper to-paper">
      <div
        className="bg-hero-grid absolute inset-x-0 top-0 h-96 opacity-40 [background-size:22px_22px]"
        aria-hidden="true"
      />
      <div className="container-x relative py-8 sm:py-10 lg:py-12">
        <Link
          href={`/${locale}/doctors`}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-primary-700 hover:text-primary-800"
        >
          <BackArrow className="h-4 w-4" />
          {dict.doctorProfile.back}
        </Link>

        <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          {/* Profile card */}
          <aside className="animate-fade-up opacity-0 lg:sticky lg:top-24">
            <div className="card overflow-hidden">
              <div className="p-3 pb-0">
                <DoctorPhoto
                  photoUrl={doctor.photoUrl}
                  name={name}
                  sizes="(min-width: 1024px) 22rem, 90vw"
                  priority
                  className="aspect-[4/5] w-full rounded-xl sm:aspect-[5/4] lg:aspect-[4/5]"
                />
              </div>
              <div className="p-6">
                <h1 className="text-2xl font-extrabold leading-snug text-ink-950">
                  {name}
                </h1>
                <p className="mt-1.5 font-bold text-primary-700">{title}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {department && (
                    <Link
                      href={`/${locale}/doctors?department=${department.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-700 hover:bg-primary-100"
                    >
                      <DepartmentIcon department={department} className="h-4 w-4" />
                      {ar ? department.nameAr : department.nameEn}
                    </Link>
                  )}
                  {years && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-100 px-3 py-1.5 text-xs font-bold text-ink-800">
                      <Clock className="h-3.5 w-3.5" />
                      {years}+ {dict.doctors.experienceLabel}
                    </span>
                  )}
                </div>

                {branches.length > 0 && (
                  <div className="mt-6 border-t border-ink-100 pt-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-ink-400">
                      {dict.doctorProfile.branches}
                    </p>
                    <ul className="mt-3 space-y-2">
                      {branches.map((branch) => (
                        <li key={branch.id}>
                          <a
                            href={branch.mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="-mx-2 flex items-start gap-2.5 rounded-lg p-2 hover:bg-primary-50"
                          >
                            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-600" />
                            <span className="text-sm">
                              <span className="block font-bold text-ink-900">
                                {ar ? branch.nameAr : branch.nameEn}
                              </span>
                              <span className="text-ink-500">
                                {ar ? branch.addressAr : branch.addressEn}
                              </span>
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {languages.length > 0 && (
                  <div className="mt-5 border-t border-ink-100 pt-5">
                    <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-400">
                      <Languages className="h-4 w-4" />
                      {dict.doctorProfile.languages}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {languages.map((language) => (
                        <span
                          key={language}
                          className="rounded-full bg-ink-50 px-3 py-1 text-xs font-bold text-ink-700"
                        >
                          {language}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <CallButton dict={dict} className="mt-6 w-full" />
              </div>
            </div>
          </aside>

          {/* CV */}
          <div className="space-y-6">
            {bio && (
              <Reveal>
                <section className="card p-6 sm:p-8">
                  <h2 className="text-lg font-bold text-ink-900">
                    {dict.doctorProfile.about}
                  </h2>
                  <p className="mt-3 whitespace-pre-line leading-loose text-ink-700">
                    {bio}
                  </p>
                </section>
              </Reveal>
            )}

            {sections.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2">
                {sections.map((section, i) => (
                  <CvSection
                    key={section.title}
                    icon={section.icon}
                    title={section.title}
                    items={section.items}
                    delay={i * 60}
                    // An odd last card spans both columns so the grid has
                    // no empty cell.
                    wide={sections.length % 2 === 1 && i === sections.length - 1}
                  />
                ))}
              </div>
            )}

            {department && (
              <Reveal delay={120}>
                <section className="card flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-500 text-white">
                    <DepartmentIcon department={department} className="h-8 w-8" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-ink-400">
                      {dict.doctorProfile.department}
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-ink-900">
                      {ar ? department.nameAr : department.nameEn}
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-ink-600">
                      {ar ? department.descriptionAr : department.descriptionEn}
                    </p>
                  </div>
                  <Link
                    href={`/${locale}/doctors?department=${department.id}`}
                    className="inline-flex flex-shrink-0 items-center gap-1.5 text-sm font-bold text-primary-700 hover:text-primary-800"
                  >
                    {dict.departments.viewDoctors}
                    <Forward className="h-4 w-4" />
                  </Link>
                </section>
              </Reveal>
            )}

            <Reveal delay={180}>
              <section className="relative overflow-hidden rounded-xl2 bg-gradient-to-br from-ink-900 to-ink-950 p-6 text-white shadow-soft sm:p-8">
                <div
                  className="absolute -bottom-16 -end-16 h-48 w-48 rounded-full bg-primary-500/25 blur-3xl"
                  aria-hidden="true"
                />
                <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold">
                      {dict.doctorProfile.bookTitle}
                    </h2>
                    <p className="mt-1 text-sm text-sand-200">
                      {dict.doctorProfile.bookBody}
                    </p>
                  </div>
                  <CallButton dict={dict} variant="accent" className="flex-shrink-0" />
                </div>
              </section>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
