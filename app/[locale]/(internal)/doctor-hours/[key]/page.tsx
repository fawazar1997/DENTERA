import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Lock } from "lucide-react";
import { isLocale, defaultLocale, type Locale, localePath } from "@/lib/i18n";
import { getBranches, getDoctors } from "@/lib/db";
import { getDictionary } from "@/lib/dictionaries";
import { supervisorText } from "@/lib/supervisorText";
import { supervisorMayEditHours } from "@/lib/supervisorAccess";
import { saveDoctorHoursSupervisorAction } from "@/lib/supervisorActions";
import { branchSchedule, defaultSchedule } from "@/lib/hours";
import { DoctorBranchesField } from "@/components/admin/DoctorBranchesField";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { DoctorHoursPicker } from "@/components/DoctorHoursPicker";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dentera — أوقات عمل الأطباء",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

/**
 * Doctors' working hours, through the supervisor link (when Control Panel → Supervisor link allows
 * it): pick a doctor, edit their hours in each of their branches. Branches and every other detail
 * stay the control panel's. A wrong key, or the permission turned off, gets a plain 404.
 */
export default async function SupervisorDoctorHoursPage({
  params,
  searchParams,
}: {
  params: { locale: string; key: string };
  searchParams: Record<string, string | undefined>;
}) {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  if (!(await supervisorMayEditHours(params.key))) notFound();
  const ar = locale === "ar";
  const dict = getDictionary(locale);
  const t = supervisorText(locale);
  const [doctors, branches] = await Promise.all([getDoctors(), getBranches()]);
  const branchName = new Map(branches.map((b) => [b.id, ar ? b.nameAr : b.nameEn]));
  const base = localePath(locale, `/doctor-hours/${params.key}`);
  const other = ar ? "en" : "ar";
  const Back = ar ? ArrowRight : ArrowLeft;

  const list = [...doctors]
    .sort((a, b) => (ar ? a.nameAr : a.nameEn).localeCompare(ar ? b.nameAr : b.nameEn, ar ? "ar" : "en"))
    .map((d) => ({
      id: d.id,
      name: ar ? d.nameAr : d.nameEn,
      other: ar ? d.nameEn : d.nameAr,
      branches: (d.branchIds ?? []).map((id) => branchName.get(id)).filter(Boolean).join("، ") || "—",
      ownHours: Object.keys(d.hours ?? {}).length > 0,
      href: `${base}?doctor=${encodeURIComponent(d.id)}`,
      current: d.id === searchParams.doctor,
    }));
  const doctor = doctors.find((d) => d.id === searchParams.doctor);
  const doctorBranches = doctor ? branches.filter((b) => doctor.branchIds?.includes(b.id)) : [];

  return (
    <div className="min-h-screen">
      <header className="bg-ink-950">
        <div className="container-x py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Logo className="h-8 w-auto flex-shrink-0 sm:h-9" />
              <span className="truncate text-base font-bold text-white sm:text-lg">{t.hoursTitle}</span>
            </div>
            <Link
              href={localePath(other, `/doctor-hours/${params.key}${doctor ? `?doctor=${encodeURIComponent(doctor.id)}` : ""}`)}
              className="flex-shrink-0 rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-ink-100 hover:border-primary-400 hover:text-white"
            >
              {other === "ar" ? "العربية" : "English"}
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-sand-200">
              <Lock className="h-3.5 w-3.5 flex-shrink-0" />
              {t.internal}
            </span>
            <Link href={localePath(locale, `/supervisor/${params.key}`)} className="inline-flex items-center gap-1 text-xs font-semibold text-sand-200 hover:text-white">
              <Back className="h-3.5 w-3.5" />
              {t.home}
            </Link>
          </div>
        </div>
      </header>

      <main className="container-x py-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          {/* On a phone the list shows until a doctor is chosen. */}
          <section className={`card min-w-0 p-4 ${doctor ? "hidden lg:block" : ""}`}>
            <h1 className="mb-3 font-extrabold text-ink-950">{t.hoursPick}</h1>
            <DoctorHoursPicker doctors={list} labels={{ search: t.hoursSearch, none: t.hoursNone, ownHours: t.hoursOwn }} />
          </section>

          <section className="min-w-0">
            {!doctor ? (
              <div className="card hidden p-10 text-center text-ink-500 lg:block">
                <Clock className="mx-auto h-10 w-10 text-primary-300" />
                <p className="mt-3">{t.hoursPick}</p>
              </div>
            ) : (
              <div className="card p-5 sm:p-6">
                <Link href={base} scroll={false} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:underline lg:hidden">
                  <Back className="h-4 w-4" />
                  {t.hoursBack}
                </Link>
                <h2 className="text-xl font-extrabold text-ink-950">{ar ? doctor.nameAr : doctor.nameEn}</h2>
                <p className="text-sm text-primary-700">{ar ? doctor.titleAr : doctor.titleEn}</p>
                {searchParams.saved === "1" && (
                  <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    {t.hoursSavedNote}
                  </p>
                )}
                <p className="mt-3 text-xs text-ink-500">{t.hoursBranchesNote}</p>
                {doctorBranches.length === 0 ? (
                  <p className="mt-4 rounded-xl bg-sand-50 p-3 text-sm text-ink-600 ring-1 ring-ink-100">{t.hoursNoBranches}</p>
                ) : (
                  <form action={saveDoctorHoursSupervisorAction} className="mt-4 space-y-4">
                    <input type="hidden" name="key" value={params.key} />
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="doctorId" value={doctor.id} />
                    <DoctorBranchesField
                      key={doctor.id}
                      locale={locale}
                      lockBranches
                      branches={doctorBranches.map((branch) => ({
                        id: branch.id,
                        name: ar ? branch.nameAr : branch.nameEn,
                        initialHours: doctor.hours?.[branch.id] ?? branchSchedule(branch) ?? defaultSchedule(),
                        hasOwnHours: !!doctor.hours?.[branch.id],
                        checked: true,
                      }))}
                      labels={{
                        worksAt: dict.admin.worksAt,
                        setHours: dict.admin.doctorHours,
                        hoursHint: dict.admin.doctorHoursHint,
                        schedule: {
                          open: dict.admin.dayOpen,
                          closed: dict.doctorProfile.offDay,
                          from: dict.admin.timeFrom,
                          to: dict.admin.timeTo,
                          addPeriod: dict.admin.addPeriod,
                          removePeriod: dict.admin.removePeriod,
                          copyToAll: dict.admin.copyToAllDays,
                        },
                      }}
                    />
                    <SubmitButton label={t.hoursSave} savedLabel={t.hoursSaved} />
                  </form>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
