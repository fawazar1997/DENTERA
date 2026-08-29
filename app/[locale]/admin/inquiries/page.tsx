import { CheckCircle2, RotateCcw } from "lucide-react";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getDepartments, getInquiries } from "@/lib/db";
import {
  deleteInquiryAction,
  markInquiryContactedAction,
  markInquiryNewAction,
} from "@/lib/actions";
import { AdminNav } from "@/components/admin/AdminNav";
import { DeleteButton } from "@/components/admin/DeleteButton";

// Admin pages always need the current data, never a stale build-time or
// revalidation-cached snapshot, so render them fresh on every request.
export const dynamic = "force-dynamic";

export default function AdminInquiriesPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const dict = getDictionary(locale);
  const inquiries = getInquiries();
  const departments = getDepartments();
  const newInquiries = inquiries.filter((i) => i.status === "new").length;

  const dateFormatter = new Intl.DateTimeFormat(
    locale === "ar" ? "ar-SA" : "en-US",
    { dateStyle: "medium", timeStyle: "short" }
  );

  return (
    <>
      <AdminNav locale={locale} dict={dict} newInquiries={newInquiries} />
      <div className="container-x py-10">
        <h1 className="text-2xl font-extrabold text-ink-950">
          {dict.admin.inquiries}
        </h1>
        <p className="mt-1 text-ink-500">{dict.admin.inquiriesSubtitle}</p>

        <div className="mt-8 space-y-4">
          {inquiries.length === 0 && (
            <p className="text-ink-500">{dict.admin.noInquiries}</p>
          )}

          {inquiries.map((inquiry) => {
            const department = departments.find(
              (d) => d.id === inquiry.departmentId
            );
            return (
              <div key={inquiry.id} className="card p-5">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink-900">{inquiry.name}</p>
                    <p className="text-sm text-ink-500">
                      <span dir="ltr" className="inline-block">
                        {inquiry.mobile}
                      </span>
                      {" · "}
                      {department
                        ? locale === "ar"
                          ? department.nameAr
                          : department.nameEn
                        : "—"}
                    </p>
                    <p className="mt-1 text-xs text-ink-400">
                      {dict.admin.submittedAt}:{" "}
                      {dateFormatter.format(new Date(inquiry.createdAt))}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      inquiry.status === "new"
                        ? "bg-accent-100 text-accent-700"
                        : "bg-primary-100 text-primary-700"
                    }`}
                  >
                    {inquiry.status === "new"
                      ? dict.admin.statusNew
                      : dict.admin.statusContacted}
                  </span>

                  <form
                    action={
                      inquiry.status === "new"
                        ? markInquiryContactedAction
                        : markInquiryNewAction
                    }
                  >
                    <input type="hidden" name="id" value={inquiry.id} />
                    <input type="hidden" name="locale" value={locale} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-50"
                    >
                      {inquiry.status === "new" ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {dict.admin.markContacted}
                        </>
                      ) : (
                        <>
                          <RotateCcw className="h-3.5 w-3.5" />
                          {dict.admin.markNew}
                        </>
                      )}
                    </button>
                  </form>

                  <DeleteButton
                    action={deleteInquiryAction}
                    id={inquiry.id}
                    locale={locale}
                    label={dict.admin.delete}
                    confirmText={dict.admin.confirmDelete}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
