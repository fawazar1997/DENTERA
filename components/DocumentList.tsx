"use client";

import { useMemo, useState } from "react";
import { ExternalLink, FileText, Search } from "lucide-react";
import { foldArabic } from "@/lib/arabicSearch";

export type ListedDocument = { id: string; title: string; subtitle?: string; kind: string; link: string };

/** A section's documents on the staff page, with a search box. */
export function DocumentList({
  documents,
  labels,
}: {
  documents: ListedDocument[];
  labels: { search: string; empty: string; noMatch: string; open: string };
}) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const words = foldArabic(query).split(" ").filter(Boolean);
    return documents.filter((d) => words.every((w) => foldArabic(`${d.title} ${d.subtitle ?? ""}`).includes(w)));
  }, [documents, query]);

  if (documents.length === 0) {
    return <p className="mt-6 rounded-xl bg-ink-50 px-4 py-6 text-center text-ink-500">{labels.empty}</p>;
  }
  return (
    <div>
      {documents.length > 5 && (
        <div className="relative mt-6">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.search}
            className="input ps-9"
          />
        </div>
      )}
      {shown.length === 0 ? (
        <p className="mt-6 rounded-xl bg-ink-50 px-4 py-6 text-center text-ink-500">{labels.noMatch}</p>
      ) : (
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {shown.map((d) => (
            <li key={d.id}>
              <a
                href={d.link}
                target="_blank"
                rel="noreferrer"
                className="card group flex h-full items-start gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-soft"
              >
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                  <FileText className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold text-ink-950">{d.title}</span>
                  {d.subtitle && <span className="mt-0.5 block text-xs text-ink-500">{d.subtitle}</span>}
                  {d.kind && (
                    <span dir="ltr" className="mt-2 inline-block rounded-full bg-ink-50 px-2 py-0.5 text-[11px] font-bold text-ink-500">
                      {d.kind}
                    </span>
                  )}
                </span>
                <span className="inline-flex flex-shrink-0 items-center gap-1 text-sm font-bold text-primary-700">
                  <ExternalLink className="h-4 w-4" />
                  {labels.open}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
