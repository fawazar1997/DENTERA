"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Copy, Check, X, EyeOff, Clock, ChevronDown } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { WeekSchedule } from "@/lib/types";
import { DAY_NAMES, WEEK_ORDER, formatPeriods, isOpenNow, saudiNow } from "@/lib/hours";
import { whatsappHref } from "@/lib/phone";
import { SOCIAL_ICON_PATHS } from "@/lib/socialIconPaths";
import { DoctorPhoto } from "./DoctorPhoto";

export type DirectoryDoctor = {
  id: string;
  nameEn: string;
  nameAr: string;
  titleEn: string;
  titleAr: string;
  /** Main department first. */
  departmentIds: string[];
  branchIds: string[];
  coordinationNumber?: string;
  photoUrl?: string;
  active: boolean;
  /** False when the doctor is set not to show in the staff directory. */
  inDirectory: boolean;
  /** The doctor's own working hours per branch (empty when none are set or they're hidden). */
  hours: { branchId: string; schedule: WeekSchedule }[];
  /** Control panel copy: the doctor's hours exist but are hidden from the directory. */
  hoursHidden?: boolean;
};

type Option = { id: string; nameEn: string; nameAr: string };

export type DirectoryLabels = {
  searchPlaceholder: string;
  allDepartments: string;
  allBranches: string;
  allStatuses: string;
  onlyWithNumber: string;
  onlyWithoutNumber: string;
  results: string;
  noResults: string;
  coordinationNumber: string;
  department: string;
  branches: string;
  callNumber: string;
  copyLink: string;
  copied: string;
  notSet: string;
  hiddenOnSite: string;
  notInDirectory: string;
  workingHours: string;
  today: string;
  availableNow: string;
  notAvailableNow: string;
  offDay: string;
  hoursHidden: string;
};

/**
 * A doctor's hours in one branch: today's periods and whether they're in now (Saudi time),
 * with the whole week on opening. "Now" is worked out in the browser after the page shows,
 * so the server's and the browser's first render are the same.
 */
function HoursRow({ branchName, schedule, locale, labels }: { branchName: string; schedule: WeekSchedule; locale: Locale; labels: DirectoryLabels }) {
  const [now, setNow] = useState<{ day: number; minutes: number } | null>(null);
  useEffect(() => {
    setNow(saudiNow());
    const id = setInterval(() => setNow(saudiNow()), 60_000);
    return () => clearInterval(id);
  }, []);
  const periods = (day: number) => {
    const list = formatPeriods(schedule[day], locale);
    return list.length ? list.join(" · ") : labels.offDay;
  };
  const open = now ? isOpenNow(schedule, now) : null;
  return (
    <details className="group rounded-xl bg-white ring-1 ring-ink-100">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 text-xs [&::-webkit-details-marker]:hidden">
        <Clock className="h-3.5 w-3.5 flex-shrink-0 text-primary-600" aria-hidden="true" />
        <span className="font-bold text-ink-900">{branchName}</span>
        {now && (
          <>
            <span className="text-ink-500">
              {labels.today}: <span className="font-semibold text-ink-800">{periods(now.day)}</span>
            </span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${open ? "bg-emerald-50 text-emerald-700" : "bg-ink-100 text-ink-500"}`}
            >
              {open ? labels.availableNow : labels.notAvailableNow}
            </span>
          </>
        )}
        <ChevronDown className="ms-auto h-4 w-4 flex-shrink-0 text-ink-400 transition group-open:rotate-180" aria-hidden="true" />
      </summary>
      <ul className="border-t border-ink-100 px-3 py-2 text-xs">
        {WEEK_ORDER.map((day) => (
          <li key={day} className={`flex justify-between gap-3 py-0.5 ${now?.day === day ? "font-bold text-ink-950" : "text-ink-600"}`}>
            <span>{DAY_NAMES[locale][day]}</span>
            <span className={`text-end ${schedule[day].closed ? "text-ink-400" : ""}`}>{periods(day)}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

/**
 * Loosens Arabic/English text for matching: lower-case, no diacritics or
 * tatweel, and the common letter variants folded together (أ/إ/آ → ا,
 * ة → ه, ى → ي) so "احمد" finds "أحمد".
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

function CopyButton({ value, labels }: { value: string; labels: DirectoryLabels }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard blocked (e.g. insecure context) — nothing to do.
        }
      }}
      title={copied ? labels.copied : labels.copyLink}
      aria-label={copied ? labels.copied : labels.copyLink}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition hover:bg-primary-50 hover:text-primary-700"
    >
      {copied ? <Check className="h-4 w-4 text-primary-600" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

/** Staff directory: every doctor with their coordination number. */
export function DoctorDirectory({
  doctors,
  departments,
  branches,
  locale,
  labels,
  autoFocus = false,
}: {
  doctors: DirectoryDoctor[];
  departments: Option[];
  branches: Option[];
  locale: Locale;
  labels: DirectoryLabels;
  autoFocus?: boolean;
}) {
  const ar = locale === "ar";
  const nameOf = (o: { nameEn: string; nameAr: string }) => (ar ? o.nameAr : o.nameEn);
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [branch, setBranch] = useState("");
  const [numberFilter, setNumberFilter] = useState<"" | "with" | "without">("");

  const departmentName = useMemo(
    () => new Map(departments.map((d) => [d.id, nameOf(d)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [departments, locale]
  );
  const branchName = useMemo(
    () => new Map(branches.map((b) => [b.id, nameOf(b)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [branches, locale]
  );

  // Pre-build one search string per doctor (both languages + number).
  const indexed = useMemo(
    () =>
      doctors
        .map((doctor) => ({
          doctor,
          haystack: normalize(
            [
              doctor.nameAr,
              doctor.nameEn,
              doctor.titleAr,
              doctor.titleEn,
              doctor.coordinationNumber ?? "",
              ...departments
                .filter((d) => doctor.departmentIds.includes(d.id))
                .flatMap((d) => [d.nameAr, d.nameEn]),
            ].join(" ")
          ),
        }))
        .sort((a, b) =>
          nameOf(a.doctor).localeCompare(nameOf(b.doctor), ar ? "ar" : "en")
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doctors, departments, locale]
  );

  const results = useMemo(() => {
    const terms = normalize(query).split(" ").filter(Boolean);
    return indexed
      .filter(({ doctor, haystack }) => {
        if (department && !doctor.departmentIds.includes(department)) return false;
        if (branch && !doctor.branchIds.includes(branch)) return false;
        if (numberFilter === "with" && !doctor.coordinationNumber) return false;
        if (numberFilter === "without" && doctor.coordinationNumber) return false;
        return terms.every((term) => haystack.includes(term));
      })
      .map(({ doctor }) => doctor);
  }, [indexed, query, department, branch, numberFilter]);

  const filtersActive = Boolean(query || department || branch || numberFilter);

  return (
    <div>
      <div className="card z-10 p-4 sm:p-5 md:sticky md:top-0">
        <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={labels.searchPlaceholder}
              aria-label={labels.searchPlaceholder}
              className="input !ps-10"
              autoFocus={autoFocus}
            />
          </div>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            aria-label={labels.department}
            className="input"
          >
            <option value="">{labels.allDepartments}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {nameOf(d)}
              </option>
            ))}
          </select>
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            aria-label={labels.branches}
            className="input"
          >
            <option value="">{labels.allBranches}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {nameOf(b)}
              </option>
            ))}
          </select>
          <select
            value={numberFilter}
            onChange={(e) => setNumberFilter(e.target.value as "" | "with" | "without")}
            aria-label={labels.coordinationNumber}
            className="input"
          >
            <option value="">{labels.allStatuses}</option>
            <option value="with">{labels.onlyWithNumber}</option>
            <option value="without">{labels.onlyWithoutNumber}</option>
          </select>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm text-ink-500">
          <span>
            <span className="font-bold text-ink-900">{results.length}</span> {labels.results}
          </span>
          {filtersActive && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setDepartment("");
                setBranch("");
                setNumberFilter("");
              }}
              className="inline-flex items-center gap-1 font-semibold text-primary-700 hover:underline"
            >
              <X className="h-4 w-4" />
              {labels.allStatuses}
            </button>
          )}
        </div>
      </div>

      {results.length === 0 ? (
        <p className="py-16 text-center text-ink-500">{labels.noResults}</p>
      ) : (
        <ul className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {results.map((doctor) => (
            <li key={doctor.id} className="card min-w-0 p-4">
              <div className="flex items-start gap-3">
                <DoctorPhoto
                  photoUrl={doctor.photoUrl}
                  name={nameOf(doctor)}
                  sizes="56px"
                  className="h-[4.5rem] w-14 flex-shrink-0 rounded-lg"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink-900">{nameOf(doctor)}</p>
                  <p className="truncate text-xs text-ink-500 ltr:text-left rtl:text-right" dir={ar ? "ltr" : "rtl"}>
                    {ar ? doctor.nameEn : doctor.nameAr}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-primary-700">
                    {ar ? doctor.titleAr : doctor.titleEn}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-500">
                    <span>
                      {doctor.departmentIds
                        .map((id) => departmentName.get(id))
                        .filter(Boolean)
                        .join("، ") || labels.notSet}
                    </span>
                    {doctor.branchIds.length > 0 && (
                      <span>
                        ·{" "}
                        {doctor.branchIds
                          .map((id) => branchName.get(id))
                          .filter(Boolean)
                          .join("، ")}
                      </span>
                    )}
                    {!doctor.inDirectory && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-accent-100 px-1.5 py-0.5 font-semibold text-ink-800">
                        <EyeOff className="h-3 w-3" />
                        {labels.notInDirectory}
                      </span>
                    )}
                    {!doctor.active && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-ink-100 px-1.5 py-0.5 font-semibold">
                        <EyeOff className="h-3 w-3" />
                        {labels.hiddenOnSite}
                      </span>
                    )}
                    {doctor.hoursHidden && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-ink-100 px-1.5 py-0.5 font-semibold">
                        <Clock className="h-3 w-3" />
                        {labels.hoursHidden}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* The doctor's own working hours, one row per branch. */}
              {doctor.hours.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-[10px] font-bold text-ink-400">{labels.workingHours}</p>
                  {doctor.hours.map((h) => (
                    <HoursRow key={h.branchId} branchName={branchName.get(h.branchId) ?? ""} schedule={h.schedule} locale={locale} labels={labels} />
                  ))}
                </div>
              )}

              {/* Number row: always its own line, so it fits any phone. */}
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-ink-50 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-ink-400">
                    {labels.coordinationNumber}
                  </p>
                  {doctor.coordinationNumber ? (
                    <p dir="ltr" className="truncate text-start text-lg font-extrabold tabular-nums text-ink-950 rtl:text-end">
                      {doctor.coordinationNumber}
                    </p>
                  ) : (
                    <p className="text-lg font-bold text-ink-300">{labels.notSet}</p>
                  )}
                </div>
                {doctor.coordinationNumber && (
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <a
                      href={whatsappHref(doctor.coordinationNumber)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={labels.callNumber}
                      aria-label={`${labels.callNumber} ${doctor.coordinationNumber}`}
                      className="flex h-9 items-center gap-1.5 rounded-lg bg-primary-500 px-3 text-xs font-bold text-white transition hover:bg-primary-600"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4">
                        <path d={SOCIAL_ICON_PATHS.whatsapp} />
                      </svg>
                      {labels.callNumber}
                    </a>
                    <CopyButton value={doctor.coordinationNumber} labels={labels} />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
