import type { Doctor, Department } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";

export function DoctorForm({
  action,
  locale,
  dict,
  departments,
  doctor,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  locale: Locale;
  dict: Dictionary;
  departments: Department[];
  doctor?: Doctor;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      {doctor && <input type="hidden" name="id" value={doctor.id} />}

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
        <div>
          <label className="label">{dict.admin.yearsExperience}</label>
          <input
            name="yearsExperience"
            type="number"
            min={0}
            max={60}
            required
            defaultValue={doctor?.yearsExperience ?? 5}
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="label">{dict.admin.bioEn}</label>
        <textarea
          name="bioEn"
          required
          rows={2}
          defaultValue={doctor?.bioEn}
          className="input"
        />
      </div>
      <div>
        <label className="label">{dict.admin.bioAr}</label>
        <textarea
          name="bioAr"
          required
          dir="rtl"
          rows={2}
          defaultValue={doctor?.bioAr}
          className="input"
        />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
        <input
          type="checkbox"
          name="active"
          defaultChecked={doctor?.active ?? true}
          className="h-4 w-4 rounded border-ink-300 text-primary-600 focus:ring-primary-500"
        />
        {dict.admin.active}
      </label>

      <button type="submit" className="btn-primary">
        {submitLabel}
      </button>
    </form>
  );
}
