import type { Branch, Doctor, Department } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import { DoctorPhoto } from "@/components/DoctorPhoto";
import { SubmitButton } from "./SubmitButton";
import { PhotoQualityBadge } from "./PhotoQualityBadge";
import { DoctorBranchesField } from "./DoctorBranchesField";
import { branchSchedule, defaultSchedule } from "@/lib/hours";
import { BOOKING_EXTENSIONS } from "@/lib/extensions";

export function DoctorForm({
  action,
  locale,
  dict,
  departments,
  branches,
  doctor,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  locale: Locale;
  dict: Dictionary;
  departments: Department[];
  branches: Branch[];
  doctor?: Doctor;
  submitLabel: string;
}) {
  return (
    <form
      action={action}
      encType="multipart/form-data"
      className="space-y-5"
    >
      {doctor && <input type="hidden" name="id" value={doctor.id} />}

      <div>
        <label className="label">{dict.admin.photo}</label>
        <div className="flex items-center gap-4">
          <DoctorPhoto
              photoUrl={doctor?.photoUrl}
              name={doctor?.nameEn || ""}
              sizes="64px"
              className="h-20 w-16 flex-shrink-0 rounded-lg"
            />
          <input
            name="photo"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="input"
          />
        </div>
        <p className="mt-1.5 text-xs text-ink-400">{dict.admin.photoQualityHint}</p>
        {doctor?.photoUrl && (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <PhotoQualityBadge src={doctor.photoUrl} label={dict.admin.lowResPhoto} />
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-accent-50 px-3 py-1.5 text-xs font-bold text-accent-800">
              <input
                type="checkbox"
                name="removePhoto"
                className="h-4 w-4 rounded border-ink-300"
              />
              {dict.admin.removePhoto}
            </label>
          </div>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label">{dict.admin.nameEn}</label>
          <input
            name="nameEn"
            required
            defaultValue={doctor?.nameEn}
            className="input"
          />
        </div>
        <div>
          <label className="label">{dict.admin.nameAr}</label>
          <input
            name="nameAr"
            required
            dir="rtl"
            defaultValue={doctor?.nameAr}
            className="input"
          />
        </div>
        <div>
          <label className="label">{dict.admin.titleEn}</label>
          <input
            name="titleEn"
            required
            defaultValue={doctor?.titleEn}
            className="input"
          />
        </div>
        <div>
          <label className="label">{dict.admin.titleAr}</label>
          <input
            name="titleAr"
            required
            dir="rtl"
            defaultValue={doctor?.titleAr}
            className="input"
          />
        </div>
        <div>
          <label className="label">{dict.admin.department}</label>
          <select
            name="departmentId"
            required
            defaultValue={doctor?.departmentId}
            className="input"
          >
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {locale === "ar" ? department.nameAr : department.nameEn}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="sm:col-span-2">
          <legend className="label">{dict.admin.extraDepartments}</legend>
          <p className="-mt-1 mb-2 text-xs text-ink-400">{dict.admin.extraDepartmentsHint}</p>
          <div className="flex flex-wrap gap-2">
            {departments.map((department) => (
              <label
                key={department.id}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-ink-200 px-3 py-1.5 text-sm text-ink-700 has-[:checked]:border-primary-400 has-[:checked]:bg-primary-50"
              >
                <input
                  type="checkbox"
                  name="extraDepartmentIds"
                  value={department.id}
                  defaultChecked={doctor?.extraDepartmentIds?.includes(department.id)}
                  className="h-4 w-4 rounded border-ink-300"
                />
                {locale === "ar" ? department.nameAr : department.nameEn}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label className="label">{dict.admin.coordinationNumber}</label>
          <input
            name="coordinationNumber"
            dir="ltr"
            inputMode="tel"
            defaultValue={doctor?.coordinationNumber}
            className="input"
          />
          <p className="mt-1 text-xs text-ink-400">{dict.admin.coordinationHint}</p>
        </div>
        <div>
          <label className="label">{dict.admin.yearsExperience}</label>
          <input
            name="yearsExperience"
            type="number"
            min={0}
            max={60}
            defaultValue={doctor?.yearsExperience ?? ""}
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="label">{dict.admin.bioEn}</label>
        <textarea
          name="bioEn"
          rows={3}
          defaultValue={doctor?.bioEn}
          className="input"
        />
      </div>
      <div>
        <label className="label">{dict.admin.bioAr}</label>
        <textarea
          name="bioAr"
          dir="rtl"
          rows={3}
          defaultValue={doctor?.bioAr}
          className="input"
        />
      </div>

      {branches.length > 0 && (
        <DoctorBranchesField
          locale={locale}
          branches={branches.map((branch) => ({
            id: branch.id,
            name: locale === "ar" ? branch.nameAr : branch.nameEn,
            initialHours:
              doctor?.hours?.[branch.id] ?? branchSchedule(branch) ?? defaultSchedule(),
            hasOwnHours: !!doctor?.hours?.[branch.id],
            checked: !!doctor?.branchIds?.includes(branch.id),
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
      )}

      {branches.length > 0 && (
        <div>
          <label className="label">{dict.admin.doctorExtensions}</label>
          <p className="-mt-1 mb-2 text-xs text-ink-400">{dict.admin.doctorExtensionsHint}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {branches.map((branch) => (
              <label key={branch.id} className="block">
                <span className="mb-1 block text-sm text-ink-600">
                  {locale === "ar" ? branch.nameAr : branch.nameEn}
                </span>
                <select
                  name={`extension_${branch.id}`}
                  defaultValue={doctor?.extensions?.[branch.id] ?? ""}
                  dir="ltr"
                  className="input"
                >
                  <option value="">—</option>
                  {BOOKING_EXTENSIONS.map((ext) => (
                    <option key={ext} value={ext}>
                      {ext}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>
      )}

      <fieldset className="space-y-5 rounded-xl2 border border-ink-100 bg-ink-50/50 p-5">
        <legend className="px-1 text-sm font-bold text-ink-900">
          {dict.admin.profileSection}
        </legend>
        <p className="-mt-2 text-xs text-ink-500">{dict.admin.profileHint}</p>
        {(
          [
            ["qualificationsEn", "qualificationsAr"],
            ["experienceEn", "experienceAr"],
            ["servicesEn", "servicesAr"],
            ["achievementsEn", "achievementsAr"],
            ["languagesEn", "languagesAr"],
          ] as const
        ).map(([en, ar]) => (
          <div key={en} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">{dict.admin[en]}</label>
              <textarea
                name={en}
                rows={en.startsWith("languages") ? 2 : 4}
                defaultValue={doctor?.[en]}
                className="input"
              />
            </div>
            <div>
              <label className="label">{dict.admin[ar]}</label>
              <textarea
                name={ar}
                dir="rtl"
                rows={ar.startsWith("languages") ? 2 : 4}
                defaultValue={doctor?.[ar]}
                className="input"
              />
            </div>
          </div>
        ))}
      </fieldset>

      <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
        <input
          type="checkbox"
          name="showInDirectory"
          defaultChecked={doctor?.showInDirectory ?? true}
          className="h-4 w-4 rounded border-ink-300"
        />
        {dict.admin.showInDirectory}
      </label>

      <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
        <input
          type="checkbox"
          name="showCoordinationOnSite"
          defaultChecked={doctor?.showCoordinationOnSite ?? true}
          className="h-4 w-4 rounded border-ink-300"
        />
        {dict.admin.showCoordinationOnSite}
      </label>

      <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
        <input
          type="checkbox"
          name="active"
          defaultChecked={doctor?.active ?? true}
          className="h-4 w-4 rounded border-ink-300 text-primary-600 focus:ring-primary-500"
        />
        {dict.admin.active}
      </label>

      <SubmitButton label={submitLabel} savedLabel={dict.admin.saved} />
    </form>
  );
}
