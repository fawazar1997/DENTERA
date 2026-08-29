import Image from "next/image";
import { Plus, Pencil } from "lucide-react";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getDepartments, getDoctors } from "@/lib/db";
import {
  createDoctorAction,
  deleteDoctorAction,
  updateDoctorAction,
} from "@/lib/actions";
import { AdminNav } from "@/components/admin/AdminNav";
import { DoctorForm } from "@/components/admin/DoctorForm";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { Avatar } from "@/components/Avatar";

export default function AdminDoctorsPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const dict = getDictionary(locale);
  const doctors = getDoctors();
  const departments = getDepartments();

  return (
    <>
      <AdminNav locale={locale} dict={dict} />
      <div className="container-x py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-ink-950">
            {dict.admin.doctors}
          </h1>
        </div>

        <details className="card mt-6 p-6 open:pb-7">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-primary-700">
            <Plus className="h-4 w-4" />
            {dict.admin.addDoctor}
          </summary>
          <div className="mt-6 max-w-2xl">
            {departments.length === 0 ? (
              <p className="text-sm text-ink-500">
                {dict.admin.noDepartments}
              </p>
            ) : (
              <DoctorForm
                action={createDoctorAction}
                locale={locale}
                dict={dict}
                departments={departments}
                submitLabel={dict.admin.save}
              />
            )}
          </div>
        </details>

        <div className="mt-8 space-y-4">
          {doctors.length === 0 && (
            <p className="text-ink-500">{dict.admin.noDoctors}</p>
          )}

          {doctors.map((doctor) => {
            const department = departments.find(
              (d) => d.id === doctor.departmentId
            );
            return (
              <div key={doctor.id} className="card p-5">
                <div className="flex flex-wrap items-center gap-4">
                  {doctor.photoUrl ? (
                    <Image
                      src={doctor.photoUrl}
                      alt=""
                      width={96}
                      height={96}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <Avatar name={doctor.nameEn} className="h-12 w-12 text-sm" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink-900">
                      {doctor.nameEn}{" "}
                      <span className="font-normal text-ink-400">
                        / {doctor.nameAr}
                      </span>
                    </p>
                    <p className="text-sm text-ink-500">
                      {doctor.titleEn} ·{" "}
                      {department ? department.nameEn : "—"}
                      {typeof doctor.yearsExperience === "number" &&
                        doctor.yearsExperience > 0 &&
                        ` · ${doctor.yearsExperience}y`}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      doctor.active
                        ? "bg-primary-100 text-primary-700"
                        : "bg-ink-100 text-ink-500"
                    }`}
                  >
                    {doctor.active
                      ? dict.admin.statusActive
                      : dict.admin.statusHidden}
                  </span>
                  <DeleteButton
                    action={deleteDoctorAction}
                    id={doctor.id}
                    locale={locale}
                    label={dict.admin.delete}
                    confirmText={dict.admin.confirmDelete}
                  />
                </div>

                <details className="mt-3">
                  <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-primary-700">
                    <Pencil className="h-3.5 w-3.5" />
                    {dict.admin.edit}
                  </summary>
                  <div className="mt-5 max-w-2xl border-t border-ink-100 pt-5">
                    <DoctorForm
                      action={updateDoctorAction}
                      locale={locale}
                      dict={dict}
                      departments={departments}
                      doctor={doctor}
                      submitLabel={dict.admin.save}
                    />
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
