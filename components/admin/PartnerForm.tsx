import Image from "next/image";
import type { Partner } from "@/lib/types";
import type { Dictionary } from "@/lib/dictionaries";
import { SubmitButton } from "./SubmitButton";

export function PartnerForm({
  action,
  dict,
  partner,
}: {
  action: (formData: FormData) => Promise<void>;
  dict: Dictionary;
  partner?: Partner;
}) {
  return (
    <form action={action} encType="multipart/form-data" className="space-y-5">
      {partner && <input type="hidden" name="id" value={partner.id} />}

      <div>
        <label className="label">{dict.admin.logo}</label>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-28 flex-shrink-0 items-center justify-center rounded-lg border border-ink-100 bg-white p-2">
            {partner?.logoUrl ? (
              <Image
                src={partner.logoUrl}
                alt=""
                width={200}
                height={100}
                className="max-h-12 w-auto object-contain"
              />
            ) : (
              <span className="text-xs text-ink-300">—</span>
            )}
          </div>
          <input
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            required={!partner}
            className="input"
          />
        </div>
        <p className="mt-1.5 text-xs text-ink-400">{dict.admin.logoHint}</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label">{dict.admin.nameEn}</label>
          <input name="nameEn" required defaultValue={partner?.nameEn} className="input" />
        </div>
        <div>
          <label className="label">{dict.admin.nameAr}</label>
          <input name="nameAr" required dir="rtl" defaultValue={partner?.nameAr} className="input" />
        </div>
      </div>

      <div>
        <label className="label">{dict.admin.websiteUrl}</label>
        <input
          name="websiteUrl"
          type="url"
          dir="ltr"
          placeholder="https://"
          defaultValue={partner?.websiteUrl}
          className="input"
        />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
        <input
          type="checkbox"
          name="active"
          defaultChecked={partner?.active ?? true}
          className="h-4 w-4 rounded border-ink-300"
        />
        {dict.admin.active}
      </label>

      <SubmitButton label={dict.admin.save} savedLabel={dict.admin.saved} />
    </form>
  );
}
