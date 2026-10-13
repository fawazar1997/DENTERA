import type { Branch } from "@/lib/types";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import { branchSchedule, defaultSchedule } from "@/lib/hours";
import { ScheduleEditor } from "./ScheduleEditor";
import { SubmitButton } from "./SubmitButton";

export function BranchForm({
  action,
  dict,
  locale,
  branch,
}: {
  action: (formData: FormData) => Promise<void>;
  dict: Dictionary;
  locale: Locale;
  branch?: Branch;
}) {
  return (
    <form action={action} className="space-y-5">
      {branch && <input type="hidden" name="id" value={branch.id} />}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label">{dict.admin.nameEn}</label>
          <input name="nameEn" required defaultValue={branch?.nameEn} className="input" />
        </div>
        <div>
          <label className="label">{dict.admin.nameAr}</label>
          <input name="nameAr" required dir="rtl" defaultValue={branch?.nameAr} className="input" />
        </div>
        <div>
          <label className="label">{dict.admin.addressEn}</label>
          <input name="addressEn" required defaultValue={branch?.addressEn} className="input" />
        </div>
        <div>
          <label className="label">{dict.admin.addressAr}</label>
          <input name="addressAr" required dir="rtl" defaultValue={branch?.addressAr} className="input" />
        </div>
      </div>

      <div>
        <label className="label">{dict.admin.mapUrl}</label>
        <input
          name="mapUrl"
          type="url"
          dir="ltr"
          placeholder="https://maps.app.goo.gl/…"
          defaultValue={branch?.mapUrl}
          className="input"
        />
        <p className="mt-1.5 text-xs text-ink-400">{dict.admin.mapUrlHint}</p>
      </div>

      <div className="max-w-xs">
        <label className="label">{dict.admin.phone}</label>
        <input name="phone" dir="ltr" defaultValue={branch?.phone} className="input" />
      </div>

      <div>
        <label className="label">{dict.admin.workingHours}</label>
        <p className="mb-3 text-xs text-ink-400">{dict.admin.workingHoursHint}</p>
        <ScheduleEditor
          initial={(branch && branchSchedule(branch)) ?? defaultSchedule()}
          locale={locale}
          labels={{
            open: dict.admin.dayOpen,
            closed: dict.admin.dayClosed,
            from: dict.admin.timeFrom,
            to: dict.admin.timeTo,
            addPeriod: dict.admin.addPeriod,
            removePeriod: dict.admin.removePeriod,
            copyToAll: dict.admin.copyToAllDays,
          }}
        />
        {branch && !branchSchedule(branch) && (branch.hoursAr || branch.hoursEn) && (
          <p className="mt-2 rounded-xl bg-accent-100 px-3 py-2 text-xs text-ink-800">
            {dict.admin.oldHoursNotice}{" "}
            <span className="font-semibold">{locale === "ar" ? branch.hoursAr || branch.hoursEn : branch.hoursEn || branch.hoursAr}</span>
          </p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label">{dict.admin.hoursNoteEn}</label>
          <input name="hoursNoteEn" defaultValue={branch?.hoursNoteEn} className="input" />
        </div>
        <div>
          <label className="label">{dict.admin.hoursNoteAr}</label>
          <input name="hoursNoteAr" dir="rtl" defaultValue={branch?.hoursNoteAr} className="input" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
        <input
          type="checkbox"
          name="active"
          defaultChecked={branch?.active ?? true}
          className="h-4 w-4 rounded border-ink-300"
        />
        {dict.admin.active}
      </label>

      <SubmitButton label={dict.admin.save} savedLabel={dict.admin.saved} />
    </form>
  );
}
