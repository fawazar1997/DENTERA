import Link from "next/link";
import { ArrowRight, ArrowLeft } from "lucide-react";
import type { Department } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import { DepartmentIcon } from "./IconMap";

export function DepartmentCard({
  department,
  locale,
  dict,
}: {
  department: Department;
  locale: Locale;
  dict: Dictionary;
}) {
  const rtl = locale === "ar";
  const Arrow = rtl ? ArrowLeft : ArrowRight;

  return (
    <div className="card group flex flex-col p-7 hover:-translate-y-1 hover:shadow-soft">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-white transition group-hover:bg-accent-500">
        <DepartmentIcon name={department.icon} className="h-7 w-7" />
      </div>
      <h3 className="mt-5 text-lg font-bold text-ink-900">
        {locale === "ar" ? department.nameAr : department.nameEn}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">
        {locale === "ar" ? department.descriptionAr : department.descriptionEn}
      </p>
      <Link
        href={`/${locale}/doctors?department=${department.id}`}
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:text-primary-800"
      >
        {dict.departments.viewDoctors}
        <Arrow className="h-4 w-4" />
      </Link>
    </div>
  );
}
