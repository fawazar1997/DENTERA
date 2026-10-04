import type { Branch } from "@/lib/types";
import type { Dictionary } from "@/lib/dictionaries";
import { SubmitButton } from "./SubmitButton";

export function BranchForm({
  action,
  dict,
  branch,
}: {
  action: (formData: FormData) => Promise<void>;
  dict: Dictionary;
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

      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label className="label">{dict.admin.phone}</label>
          <input name="phone" dir="ltr" defaultValue={branch?.phone} className="input" />
        </div>
        <div>
          <label className="label">{dict.admin.hoursEn}</label>
          <input name="hoursEn" defaultValue={branch?.hoursEn} className="input" />
        </div>
        <div>
          <label className="label">{dict.admin.hoursAr}</label>
          <input name="hoursAr" dir="rtl" defaultValue={branch?.hoursAr} className="input" />
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
