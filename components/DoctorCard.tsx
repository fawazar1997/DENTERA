import Link from "next/link";
import { ArrowRight, ArrowLeft } from "lucide-react";
import type { Doctor, Department } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import { DoctorPhoto } from "./DoctorPhoto";
import { DepartmentIcon } from "./IconMap";

export function DoctorCard({
  doctor,
  department,
  locale,
  dict,
}: {
  doctor: Doctor;
  department?: Department;
  locale: Locale;
  dict: Dictionary;
}) {
  const name = locale === "ar" ? doctor.nameAr : doctor.nameEn;
  const bio = locale === "ar" ? doctor.bioAr : doctor.bioEn;
  const Arrow = locale === "ar" ? ArrowLeft : ArrowRight;

  return (
    <Link
      href={`/${locale}/doctors/${doctor.id}`}
      className="card group flex h-full flex-col overflow-hidden hover:-translate-y-1 hover:shadow-soft"
    >
      <div className="p-3 pb-0">
        <DoctorPhoto
          photoUrl={doctor.photoUrl}
          name={name}
          zoomOnHover
          className="aspect-[4/5] w-full rounded-xl"
        />
      </div>

      <div className="flex flex-1 flex-col p-6 pt-5">
        {department && (
          <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
            <DepartmentIcon department={department} className="h-4 w-4" />
            {locale === "ar" ? department.nameAr : department.nameEn}
          </span>
        )}
        <h3 className="mt-3 text-lg font-bold text-ink-900 group-hover:text-primary-700">
          {name}
        </h3>
        <p className="mt-1 text-sm text-primary-700">
          {locale === "ar" ? doctor.titleAr : doctor.titleEn}
        </p>

        {bio && (
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-600">
            {bio}
          </p>
        )}

        {typeof doctor.yearsExperience === "number" &&
          doctor.yearsExperience > 0 && (
            <p className="mt-3 text-xs font-bold text-accent-700">
              {doctor.yearsExperience}+ {dict.doctors.experienceLabel}
            </p>
          )}

        <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-bold text-primary-700">
          {dict.doctors.viewProfile}
          <Arrow className="h-4 w-4 transition group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
