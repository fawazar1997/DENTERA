import { Plus, Pencil, ExternalLink } from "lucide-react";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getBranches, getDepartments, getDoctors } from "@/lib/db";
import {
  createDoctorAction,
  deleteDoctorAction,
  updateDoctorAction,
} from "@/lib/actions";
import { AdminNav } from "@/components/admin/AdminNav";
import { DoctorForm } from "@/components/admin/DoctorForm";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { BlobConfigNotice } from "@/components/admin/BlobConfigNotice";
import { DoctorPhoto } from "@/components/DoctorPhoto";

// Admin pages always need the current data, never a stale build-time or
// revalidation-cached snapshot, so render them fresh on every request.
export const dynamic = "force-dynamic";

export default async function AdminDoctorsPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const dict = getDictionary(locale);
  const doctors = await getDoctors();
  const departments = await getDepartments();
  const branches = await getBranches();

  return (
    <>
      <AdminNav locale={locale} dict={dict} />
      <div className="container-x py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-ink-950">
            {dict.admin.doctors}
          </h1>
        </div>

        <div className="mt-6">
          <BlobConfigNotice text={dict.admin.blobNotEnabled} />
        </div>

        <details className="card p-6 open:pb-7">
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
                branches={branches}
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
                  <DoctorPhoto
              photoUrl={doctor.photoUrl}
              name={doctor.nameEn}
              sizes="52px"
              className="h-16 w-[3.25rem] flex-shrink-0 rounded-lg"
            />
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
                  <a
                    href={`/${locale}/doctors/${doctor.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {dict.admin.viewProfile}
                  </a>
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
                      branches={branches}
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
