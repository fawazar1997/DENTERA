import Image from "next/image";
import type { Branch, Department, Offer } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import { SubmitButton } from "./SubmitButton";

export function OfferForm({
  action,
  locale,
  dict,
  departments,
  branches,
  offer,
}: {
  action: (formData: FormData) => Promise<void>;
  locale: Locale;
  dict: Dictionary;
  departments: Department[];
  branches: Branch[];
  offer?: Offer;
}) {
  const pairs = [
    ["summaryEn", "summaryAr", 2],
    ["detailsEn", "detailsAr", 4],
    ["termsEn", "termsAr", 3],
  ] as const;
  const labels = {
    summaryEn: dict.admin.offerSummaryEn,
    summaryAr: dict.admin.offerSummaryAr,
    detailsEn: dict.admin.offerDetailsEn,
    detailsAr: dict.admin.offerDetailsAr,
    termsEn: dict.admin.offerTermsEn,
    termsAr: dict.admin.offerTermsAr,
  };

  return (
    <form action={action} encType="multipart/form-data" className="space-y-5">
      {offer && <input type="hidden" name="id" value={offer.id} />}

      <div>
        <label className="label">{dict.admin.offerImage}</label>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-20 w-48 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-ink-100 bg-ink-50">
            {offer?.imageUrl ? (
              <Image
                src={offer.imageUrl}
                alt=""
                width={384}
                height={160}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xs text-ink-300">—</span>
            )}
          </div>
          <input
            name="image"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="input min-w-0 flex-1"
          />
        </div>
        <p className="mt-1.5 text-xs text-ink-400">{dict.admin.offerImageHint}</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label">{dict.admin.offerTitleEn}</label>
          <input name="titleEn" required defaultValue={offer?.titleEn} className="input" />
        </div>
        <div>
          <label className="label">{dict.admin.offerTitleAr}</label>
          <input name="titleAr" required dir="rtl" defaultValue={offer?.titleAr} className="input" />
        </div>
        {pairs.map(([en, ar, rows]) => (
          <div key={en} className="contents">
            <div>
              <label className="label">{labels[en]}</label>
              <textarea name={en} rows={rows} defaultValue={offer?.[en]} className="input" />
            </div>
            <div>
              <label className="label">{labels[ar]}</label>
              <textarea
                name={ar}
                rows={rows}
                dir="rtl"
                defaultValue={offer?.[ar]}
                className="input"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label className="label">{dict.admin.priceNow}</label>
          <input
            name="priceNow"
            type="number"
            min={0}
            step="any"
            dir="ltr"
            defaultValue={offer?.priceNow ?? ""}
            className="input"
          />
        </div>
        <div>
          <label className="label">{dict.admin.priceWas}</label>
          <input
            name="priceWas"
            type="number"
            min={0}
            step="any"
            dir="ltr"
            defaultValue={offer?.priceWas ?? ""}
            className="input"
          />
        </div>
        <div>
          <label className="label">{dict.admin.endsAt}</label>
          <input
            name="endsAt"
            type="date"
            dir="ltr"
            defaultValue={offer?.endsAt ?? ""}
            className="input"
          />
        </div>
      </div>
      <p className="-mt-3 text-xs text-ink-400">{dict.admin.endsAtHint}</p>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="label">{dict.admin.department}</label>
          <select
            name="departmentId"
            defaultValue={offer?.departmentId ?? ""}
            className="input"
          >
            <option value="">—</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {locale === "ar" ? department.nameAr : department.nameEn}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{dict.admin.order}</label>
          <input
            name="order"
            type="number"
            dir="ltr"
            defaultValue={offer?.order ?? ""}
            className="input"
          />
        </div>
      </div>

      {branches.length > 0 && (
        <fieldset>
          <legend className="label">{dict.offers.branches}</legend>
          <div className="flex flex-wrap gap-4">
            {branches.map((branch) => (
              <label key={branch.id} className="flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  name="branchIds"
                  value={branch.id}
                  defaultChecked={offer ? offer.branchIds?.includes(branch.id) : true}
                  className="h-4 w-4 rounded border-ink-300"
                />
                {locale === "ar" ? branch.nameAr : branch.nameEn}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
        <input
          type="checkbox"
          name="active"
          defaultChecked={offer?.active ?? true}
          className="h-4 w-4 rounded border-ink-300"
        />
        {dict.admin.active}
      </label>

      <SubmitButton label={dict.admin.save} savedLabel={dict.admin.saved} />
    </form>
  );
}
