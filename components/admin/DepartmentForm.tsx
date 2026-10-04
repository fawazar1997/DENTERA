import type { Department } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import { dentalIconOptions } from "@/components/IconMap";
import { SubmitButton } from "./SubmitButton";

export function DepartmentForm({
  action,
  locale,
  dict,
  department,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  locale: Locale;
  dict: Dictionary;
  department?: Department;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-5">
      {department && <input type="hidden" name="id" value={department.id} />}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label">{dict.admin.nameEn}</label>
          <input
            name="nameEn"
            required
            defaultValue={department?.nameEn}
            className="input"
          />
        </div>
        <div>
          <label className="label">{dict.admin.nameAr}</label>
          <input
            name="nameAr"
            required
            dir="rtl"
            defaultValue={department?.nameAr}
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="label">{dict.admin.descriptionEn}</label>
        <textarea
          name="descriptionEn"
          required
          rows={2}
          defaultValue={department?.descriptionEn}
          className="input"
        />
      </div>
      <div>
        <label className="label">{dict.admin.descriptionAr}</label>
        <textarea
          name="descriptionAr"
          required
          dir="rtl"
          rows={2}
          defaultValue={department?.descriptionAr}
          className="input"
        />
      </div>

      <div>
        <label className="label">{dict.admin.icon}</label>
        <select
          name="icon"
          defaultValue={
            dentalIconOptions.some((o) => o.key === department?.icon)
              ? department?.icon
              : "auto"
          }
          className="input"
        >
          <option value="auto">{dict.admin.iconAuto}</option>
          {dentalIconOptions.map((option) => (
            <option key={option.key} value={option.key}>
              {locale === "ar" ? option.ar : option.en}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
        <input
          type="checkbox"
          name="active"
          defaultChecked={department?.active ?? true}
          className="h-4 w-4 rounded border-ink-300 text-primary-600 focus:ring-primary-500"
        />
        {dict.admin.active}
      </label>

      <SubmitButton label={submitLabel} savedLabel={dict.admin.saved} />
    </form>
  );
}
