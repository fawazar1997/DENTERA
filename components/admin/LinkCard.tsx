import { ExternalLink, type LucideIcon } from "lucide-react";
import type { ComponentType } from "react";
import { CopyField } from "@/components/admin/CopyField";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import type { Dictionary } from "@/lib/dictionaries";

/** One private link: copy, create/replace, open. */
export function LinkCard({
  title,
  hint,
  icon: Icon,
  link,
  path,
  openLabel,
  action,
  dict,
}: {
  title: string;
  hint: string;
  icon: LucideIcon | ComponentType<{ className?: string }>;
  link: string;
  path: string;
  openLabel: string;
  action: () => Promise<void>;
  dict: Dictionary;
}) {
  return (
    <section className="card p-6">
      <h2 className="flex items-center gap-2 font-bold text-ink-900">
        <Icon className="h-5 w-5 text-primary-600" />
        {title}
      </h2>
      <p className="mt-1 text-sm text-ink-500">{hint}</p>
      <div className="mt-4">
        {link ? (
          <CopyField value={link} copyLabel={dict.admin.copyLink} copiedLabel={dict.admin.copied} />
        ) : (
          <p className="rounded-lg bg-ink-50 px-4 py-3 text-sm text-ink-500">{dict.admin.noLink}</p>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <form action={action}>
          <ConfirmSubmit
            label={link ? dict.admin.regenerateLink : dict.admin.createLink}
            confirmText={link ? dict.admin.regenerateConfirm : undefined}
            className={link ? "btn-outline" : "btn-primary"}
          />
        </form>
        {link && (
          <a
            href={path}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            {openLabel}
          </a>
        )}
      </div>
    </section>
  );
}
