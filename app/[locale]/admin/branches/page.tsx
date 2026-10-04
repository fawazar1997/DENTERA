import { Plus, Pencil, MapPin, ExternalLink } from "lucide-react";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getBranches } from "@/lib/db";
import {
  createBranchAction,
  deleteBranchAction,
  updateBranchAction,
} from "@/lib/actions";
import { AdminNav } from "@/components/admin/AdminNav";
import { BranchForm } from "@/components/admin/BranchForm";
import { DeleteButton } from "@/components/admin/DeleteButton";

// Admin pages always need the current data, never a stale build-time or
// revalidation-cached snapshot, so render them fresh on every request.
export const dynamic = "force-dynamic";

export default async function AdminBranchesPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const dict = getDictionary(locale);
  const branches = await getBranches();
  const ar = locale === "ar";

  return (
    <>
      <AdminNav locale={locale} dict={dict} />
      <div className="container-x py-10">
        <h1 className="text-2xl font-extrabold text-ink-950">
          {dict.admin.branches}
        </h1>
        <p className="mt-1 text-ink-500">{dict.admin.branchesSubtitle}</p>

        <details className="card mt-6 p-6 open:pb-7">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-primary-700">
            <Plus className="h-4 w-4" />
            {dict.admin.addBranch}
          </summary>
          <div className="mt-6 max-w-3xl">
            <BranchForm action={createBranchAction} dict={dict} />
          </div>
        </details>

        <div className="mt-8 space-y-4">
          {branches.length === 0 && (
            <p className="text-ink-500">{dict.admin.noBranches}</p>
          )}
          {branches.map((branch) => (
            <div key={branch.id} className="card p-5">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-ink-900 text-white">
                  <MapPin className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink-900">
                    {ar ? branch.nameAr : branch.nameEn}
                  </p>
                  <p className="text-sm text-ink-500">
                    {ar ? branch.addressAr : branch.addressEn}
                  </p>
                </div>
                <a
                  href={branch.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {dict.admin.openMap}
                </a>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    branch.active
                      ? "bg-primary-100 text-primary-700"
                      : "bg-ink-100 text-ink-500"
                  }`}
                >
                  {branch.active ? dict.admin.statusActive : dict.admin.statusHidden}
                </span>
                <DeleteButton
                  action={deleteBranchAction}
                  id={branch.id}
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
                <div className="mt-5 max-w-3xl border-t border-ink-100 pt-5">
                  <BranchForm
                    action={updateBranchAction}
                    dict={dict}
                    branch={branch}
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
