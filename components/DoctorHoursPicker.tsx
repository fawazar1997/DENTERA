"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Clock, Search } from "lucide-react";

export type PickerDoctor = { id: string; name: string; other: string; branches: string; ownHours: boolean; href: string; current: boolean };

/** The supervisor's list of doctors, searchable by name (either language). */
export function DoctorHoursPicker({ doctors, labels }: { doctors: PickerDoctor[]; labels: { search: string; none: string; ownHours: string } }) {
  const [query, setQuery] = useState("");
  const fold = (t: string) =>
    t
      .toLowerCase()
      .replace(/[ً-ْـ]/g, "")
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي");
  const shown = useMemo(() => {
    const q = fold(query.trim());
    return q ? doctors.filter((d) => fold(`${d.name} ${d.other}`).includes(q)) : doctors;
  }, [doctors, query]);
  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={labels.search} aria-label={labels.search} className="input !ps-10" />
      </div>
      {shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-500">{labels.none}</p>
      ) : (
        <ul className="mt-3 max-h-[60vh] divide-y divide-ink-100 overflow-y-auto rounded-xl ring-1 ring-ink-100">
          {shown.map((d) => (
            <li key={d.id}>
              <Link
                href={d.href}
                scroll={false}
                aria-current={d.current ? "page" : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm transition ${d.current ? "bg-primary-50" : "bg-white hover:bg-ink-50"}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-ink-900">{d.name}</span>
                  <span className="block truncate text-xs text-ink-500">{d.branches}</span>
                </span>
                {d.ownHours && (
                  <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                    <Clock className="h-3 w-3" />
                    {labels.ownHours}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
