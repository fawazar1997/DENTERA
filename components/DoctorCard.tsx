import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowLeft } from "lucide-react";
import type { Doctor, Department } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import { Avatar } from "./Avatar";
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
      className="card group flex h-full flex-col items-center p-7 text-center hover:-translate-y-1 hover:shadow-soft"
    >
      {doctor.photoUrl ? (
        <Image
          src={doctor.photoUrl}
          alt={name}
          width={192}
          height={192}
          className="h-24 w-24 rounded-full object-cover ring-4 ring-primary-50 transition group-hover:ring-primary-100"
        />
      ) : (
        <Avatar name={name} className="h-24 w-24 text-2xl" />
      )}
      <h3 className="mt-5 text-lg font-semibold text-ink-900 group-hover:text-primary-700">
        {name}
      </h3>
      <p className="mt-1 text-sm font-semibold text-primary-700">
        {locale === "ar" ? doctor.titleAr : doctor.titleEn}
      </p>

      {department && (
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
          <DepartmentIcon department={department} className="h-4 w-4" />
          {locale === "ar" ? department.nameAr : department.nameEn}
        </span>
      )}

      {bio && (
        <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-ink-600">
          {bio}
        </p>
      )}

      {typeof doctor.yearsExperience === "number" &&
        doctor.yearsExperience > 0 && (
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-accent-700">
            {doctor.yearsExperience}+ {dict.doctors.experienceLabel}
          </p>
        )}

      <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-primary-700">
        {dict.doctors.viewProfile}
        <Arrow className="h-4 w-4 transition group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
      </span>
    </Link>
  );
}
