import { Plus, Pencil } from "lucide-react";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getDepartments, getInquiries } from "@/lib/db";
import {
  createDepartmentAction,
  deleteDepartmentAction,
  updateDepartmentAction,
} from "@/lib/actions";
import { AdminNav } from "@/components/admin/AdminNav";
import { DepartmentForm } from "@/components/admin/DepartmentForm";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { DepartmentIcon } from "@/components/IconMap";

// Admin pages always need the current data, never a stale build-time or
// revalidation-cached snapshot, so render them fresh on every request.
export const dynamic = "force-dynamic";

export default function AdminDepartmentsPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const dict = getDictionary(locale);
  const departments = getDepartments();
  const newInquiries = getInquiries().filter((i) => i.status === "new").length;

  return (
    <>
      <AdminNav locale={locale} dict={dict} newInquiries={newInquiries} />
      <div className="container-x py-10">
        <h1 className="text-2xl font-extrabold text-ink-950">
          {dict.admin.departments}
        </h1>

        <details className="card mt-6 p-6 open:pb-7">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-primary-700">
            <Plus className="h-4 w-4" />
            {dict.admin.addDepartment}
          </summary>
          <div className="mt-6 max-w-2xl">
            <DepartmentForm
              action={createDepartmentAction}
              locale={locale}
              dict={dict}
              submitLabel={dict.admin.save}
            />
          </div>
        </details>

        <div className="mt-8 space-y-4">
          {departments.length === 0 && (
            <p className="text-ink-500">{dict.admin.noDepartments}</p>
          )}

          {departments.map((department) => (
            <div key={department.id} className="card p-5">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white">
                  <DepartmentIcon name={department.icon} className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink-900">
                    {department.nameEn}{" "}
                    <span className="font-normal text-ink-400">
                      / {department.nameAr}
                    </span>
                  </p>
                  <p className="truncate text-sm text-ink-500">
                    {department.descriptionEn}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    department.active
                      ? "bg-primary-100 text-primary-700"
                      : "bg-ink-100 text-ink-500"
                  }`}
                >
                  {department.active
                    ? dict.admin.statusActive
                    : dict.admin.statusHidden}
                </span>
                <DeleteButton
                  action={deleteDepartmentAction}
                  id={department.id}
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
                  <DepartmentForm
                    action={updateDepartmentAction}
                    locale={locale}
                    dict={dict}
                    department={department}
                    submitLabel={dict.admin.save}
                  />
                </div>
              </details>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
