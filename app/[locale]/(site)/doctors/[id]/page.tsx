import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  Briefcase,
  Sparkles,
  Languages,
  MapPin,
  Phone,
  CheckCircle2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getSiteDictionary } from "@/lib/content";
import { getActiveBranches, getDepartment, getDoctor } from "@/lib/db";
import { Avatar } from "@/components/Avatar";
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
}: {
  icon: LucideIcon;
  title: string;
  items: string[];
  delay: number;
}) {
  if (items.length === 0) return null;
  return (
    <Reveal delay={delay}>
      <section className="card p-7">
        <h2 className="flex items-center gap-3 text-lg font-semibold text-ink-900">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
            <Icon className="h-5 w-5" />
          </span>
          {title}
        </h2>
        <ul className="mt-5 space-y-3">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-ink-700">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-500" />
              <span className="leading-relaxed">{item}</span>
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
  const name = ar ? doctor.nameAr : doctor.nameEn;
  const title = ar ? doctor.titleAr : doctor.titleEn;
  const bio = ar ? doctor.bioAr : doctor.bioEn;
  const qualifications = lines(ar ? doctor.qualificationsAr : doctor.qualificationsEn);
  const experience = lines(ar ? doctor.experienceAr : doctor.experienceEn);
  const services = lines(ar ? doctor.servicesAr : doctor.servicesEn);
  const languages = lines(ar ? doctor.languagesAr : doctor.languagesEn);
  const years =
    typeof doctor.yearsExperience === "number" && doctor.yearsExperience > 0
      ? doctor.yearsExperience
      : undefined;

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 to-paper">
        <div
          className="bg-hero-grid absolute inset-0 opacity-40 [background-size:22px_22px]"
          aria-hidden="true"
        />
        <div className="container-x relative py-10 sm:py-14">
          <Link
            href={`/${locale}/doctors`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:text-primary-800"
          >
            <BackArrow className="h-4 w-4" />
            {dict.doctorProfile.back}
          </Link>

          <div className="mt-8 flex animate-fade-up flex-col items-center gap-8 text-center opacity-0 sm:flex-row sm:items-center sm:text-start">
            {doctor.photoUrl ? (
              <Image
                src={doctor.photoUrl}
                alt={name}
                width={320}
                height={320}
                priority
                className="h-40 w-40 flex-shrink-0 rounded-full object-cover shadow-soft ring-4 ring-white"
              />
            ) : (
              <Avatar
                name={name}
                className="h-40 w-40 flex-shrink-0 text-4xl shadow-soft ring-4 ring-white"
              />
            )}
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
                {name}
              </h1>
              <p className="mt-2 text-lg font-semibold text-primary-700">
                {title}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                {department && (
                  <Link
                    href={`/${locale}/doctors?department=${department.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-primary-700 shadow-card hover:bg-primary-50"
                  >
                    <DepartmentIcon department={department} className="h-4 w-4" />
                    {ar ? department.nameAr : department.nameEn}
                  </Link>
                )}
                {years && (
                  <span className="inline-flex items-center rounded-full bg-accent-100 px-3.5 py-1.5 text-sm font-medium text-ink-800">
                    {years}+ {dict.doctors.experienceLabel}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-y bg-white">
        <div className="container-x grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {bio && (
              <Reveal>
                <section className="card p-7">
                  <h2 className="text-lg font-semibold text-ink-900">
                    {dict.doctorProfile.about}
                  </h2>
                  <p className="mt-4 whitespace-pre-line leading-relaxed text-ink-700">
                    {bio}
                  </p>
                </section>
              </Reveal>
            )}
            <CvSection
              icon={GraduationCap}
              title={dict.doctorProfile.qualifications}
              items={qualifications}
              delay={60}
            />
            <CvSection
              icon={Briefcase}
              title={dict.doctorProfile.experience}
              items={experience}
              delay={120}
            />
            <CvSection
              icon={Sparkles}
              title={dict.doctorProfile.services}
              items={services}
              delay={180}
            />
          </div>

          <aside className="space-y-6">
            <Reveal>
              <div className="relative overflow-hidden rounded-xl2 bg-gradient-to-br from-ink-900 to-ink-950 p-7 text-white shadow-soft">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500">
                  <Phone className="h-6 w-6" />
                </div>
                <h2 className="mt-5 text-xl font-semibold">
                  {dict.doctorProfile.bookTitle}
                </h2>
                <p className="mt-2 text-sm text-sand-200">
                  {dict.doctorProfile.bookBody}
                </p>
                <CallButton
                  dict={dict}
                  variant="accent"
                  className="mt-6 w-full"
                />
              </div>
            </Reveal>

            {branches.length > 0 && (
              <Reveal delay={80}>
                <div className="card p-7">
                  <h2 className="text-lg font-semibold text-ink-900">
                    {dict.doctorProfile.branches}
                  </h2>
                  <ul className="mt-4 space-y-3">
                    {branches.map((branch) => (
                      <li key={branch.id}>
                        <a
                          href={branch.mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-3 rounded-lg p-2 -m-2 hover:bg-primary-50"
                        >
                          <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-600" />
                          <span>
                            <span className="block font-semibold text-ink-900">
                              {ar ? branch.nameAr : branch.nameEn}
                            </span>
                            <span className="text-sm text-ink-500">
                              {ar ? branch.addressAr : branch.addressEn}
                            </span>
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            )}

            {languages.length > 0 && (
              <Reveal delay={160}>
                <div className="card p-7">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-ink-900">
                    <Languages className="h-5 w-5 text-primary-600" />
                    {dict.doctorProfile.languages}
                  </h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {languages.map((language) => (
                      <span
                        key={language}
                        className="rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700"
                      >
                        {language}
                      </span>
                    ))}
                  </div>
                </div>
              </Reveal>
            )}
          </aside>
        </div>
      </section>
    </>
  );
}
