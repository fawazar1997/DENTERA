import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getContentOverrides } from "@/lib/db";
import { CONTENT_SECTIONS, defaultText, isLongField } from "@/lib/content";
import { saveContentAction } from "@/lib/actions";
import { AdminNav } from "@/components/admin/AdminNav";
import { SubmitButton } from "@/components/admin/SubmitButton";

// Phone numbers and emails read left-to-right in both languages.
const LTR_FIELDS = new Set(["booking.phone", "contact.emailValue"]);

// Admin pages always need the current data, never a stale build-time or
// revalidation-cached snapshot, so render them fresh on every request.
export const dynamic = "force-dynamic";

export default async function AdminTextsPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const dict = getDictionary(locale);
  const overrides = await getContentOverrides();

  return (
    <>
      <AdminNav locale={locale} dict={dict} />
      <div className="container-x py-10">
        <h1 className="text-2xl font-extrabold text-ink-950">
          {dict.admin.texts}
        </h1>
        <p className="mt-1 max-w-3xl text-ink-500">{dict.admin.textsSubtitle}</p>

        <nav className="sticky top-0 z-10 -mx-4 mt-6 overflow-x-auto bg-ink-50/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl2 sm:border sm:border-ink-100 sm:bg-white/95">
          <ul className="flex gap-2 whitespace-nowrap">
            {CONTENT_SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="inline-block rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-700 shadow-card hover:bg-primary-50 hover:text-primary-700 sm:bg-ink-50"
                >
                  {section.label[locale]}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-8 space-y-8">
          {CONTENT_SECTIONS.map((section) => (
            <form
              key={section.id}
              id={section.id}
              action={saveContentAction}
              className="card scroll-mt-24 p-6 sm:p-8"
            >
              <input type="hidden" name="section" value={section.id} />
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-100 pb-5">
                <div>
                  <h2 className="text-lg font-bold text-ink-900">
                    {section.label[locale]}
                  </h2>
                  {section.hint && (
                    <p className="mt-1 text-sm text-ink-500">
                      {section.hint[locale]}
                    </p>
                  )}
                </div>
                <SubmitButton
                  label={dict.admin.save}
                  savedLabel={dict.admin.saved}
                />
              </div>

              <div className="mt-2 hidden grid-cols-[minmax(0,14rem)_1fr_1fr] gap-4 pt-3 text-xs font-semibold uppercase tracking-wide text-ink-400 lg:grid">
                <span />
                <span>{dict.admin.english}</span>
                <span>{dict.admin.arabic}</span>
              </div>

              <div className="divide-y divide-ink-100">
                {section.fields.map((field) => {
                  const key = `${section.id}.${field.key}`;
                  const long = isLongField(key);
                  const edited = Boolean(
                    overrides.en?.[key] || overrides.ar?.[key]
                  );
                  // Arabic was changed but the English still shows the
                  // original text — flag it so it gets translated too.
                  const needsEnglish = Boolean(
                    overrides.ar?.[key] && !overrides.en?.[key]
                  );
                  return (
                    <div
                      key={key}
                      className="grid gap-3 py-4 lg:grid-cols-[minmax(0,14rem)_1fr_1fr] lg:gap-4"
                    >
                      <div className="flex flex-wrap items-start gap-2 pt-2">
                        <span className="text-sm font-semibold text-ink-800">
                          {field.label[locale]}
                        </span>
                        {edited && (
                          <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-bold text-ink-800">
                            {dict.admin.changed}
                          </span>
                        )}
                        {needsEnglish && (
                          <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-bold text-primary-800">
                            {dict.admin.needsTranslation}
                          </span>
                        )}
                      </div>
                      {(["en", "ar"] as const).map((lang) => {
                        const fallback = defaultText(lang, key);
                        const props = {
                          name: `${lang}:${key}`,
                          dir:
                            lang === "ar" && !LTR_FIELDS.has(key) ? "rtl" : "ltr",
                          defaultValue: overrides[lang]?.[key] ?? fallback,
                          placeholder: fallback,
                          "aria-label": `${field.label[locale]} — ${
                            lang === "ar" ? dict.admin.arabic : dict.admin.english
                          }`,
                          className: "input",
                        } as const;
                        return (
                          <div key={lang}>
                            <span className="mb-1 block text-xs font-medium text-ink-400 lg:hidden">
                              {lang === "ar" ? dict.admin.arabic : dict.admin.english}
                            </span>
                            {long ? (
                              <textarea rows={3} {...props} />
                            ) : (
                              <input {...props} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex justify-end">
                <SubmitButton
                  label={dict.admin.save}
                  savedLabel={dict.admin.saved}
                />
              </div>
            </form>
          ))}
        </div>
      </div>
    </>
  );
}
