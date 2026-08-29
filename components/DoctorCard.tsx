import Image from "next/image";
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

  return (
    <div className="card flex flex-col items-center p-7 text-center hover:-translate-y-1 hover:shadow-soft">
      {doctor.photoUrl ? (
        <Image
          src={doctor.photoUrl}
          alt={name}
          width={160}
          height={160}
          className="h-20 w-20 rounded-full object-cover"
        />
      ) : (
        <Avatar name={name} className="h-20 w-20 text-xl" />
      )}
      <h3 className="mt-5 text-lg font-semibold text-ink-900">{name}</h3>
      <p className="mt-1 text-sm font-semibold text-primary-700">
        {locale === "ar" ? doctor.titleAr : doctor.titleEn}
      </p>

      {department && (
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
          <DepartmentIcon name={department.icon} className="h-3.5 w-3.5" />
          {locale === "ar" ? department.nameAr : department.nameEn}
        </span>
      )}

      {bio && (
        <p className="mt-4 text-sm leading-relaxed text-ink-600">{bio}</p>
      )}

      {typeof doctor.yearsExperience === "number" &&
        doctor.yearsExperience > 0 && (
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-accent-600">
            {doctor.yearsExperience}+ {dict.doctors.experienceLabel}
          </p>
        )}
    </div>
  );
}
