import Image from "next/image";
import type { Doctor, Department } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import { Avatar } from "@/components/Avatar";

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
    <form
      action={action}
      encType="multipart/form-data"
      className="space-y-5"
    >
      <input type="hidden" name="locale" value={locale} />
      {doctor && <input type="hidden" name="id" value={doctor.id} />}

      <div>
        <label className="label">{dict.admin.photo}</label>
        <div className="flex items-center gap-4">
          {doctor?.photoUrl ? (
            <Image
              src={doctor.photoUrl}
              alt=""
              width={112}
              height={112}
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <Avatar
              name={doctor?.nameEn || "?"}
              className="h-14 w-14 text-base"
            />
          )}
          <input
            name="photo"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="input"
          />
        </div>
        <p className="mt-1.5 text-xs text-ink-400">{dict.admin.photoHint}</p>
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
          rows={2}
          defaultValue={doctor?.bioEn}
          className="input"
        />
      </div>
      <div>
        <label className="label">{dict.admin.bioAr}</label>
        <textarea
          name="bioAr"
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
