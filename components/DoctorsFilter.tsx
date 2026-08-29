"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Department } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";

export function DoctorsFilter({
  locale,
  dict,
  departments,
}: {
  locale: Locale;
  dict: Dictionary;
  departments: Department[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("department") || "";

  return (
    <select
      value={current}
      onChange={(e) => {
        const value = e.target.value;
        const url = value
          ? `/${locale}/doctors?department=${value}`
          : `/${locale}/doctors`;
        router.push(url);
      }}
      className="input max-w-xs"
    >
      <option value="">{dict.doctors.filterAll}</option>
      {departments.map((department) => (
        <option key={department.id} value={department.id}>
          {locale === "ar" ? department.nameAr : department.nameEn}
        </option>
      ))}
    </select>
  );
}
