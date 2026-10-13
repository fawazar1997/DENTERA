import { Clock, ChevronDown } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import type { Branch, WeekSchedule } from "@/lib/types";
import {
  DAY_NAMES,
  WEEK_ORDER,
  branchSchedule,
  defaultSchedule,
  formatPeriods,
  isOpenNow,
  saudiNow,
} from "@/lib/hours";

/**
 * A branch's working hours as a dropdown: the summary shows today's hours
 * and whether the branch is open now (Saudi time); opening it lists the
 * whole week. Branches still on the old free-text hours show that text.
 * With doctorSchedule it shows a doctor's own hours in the branch instead.
 */
export function BranchHours({
  branch,
  locale,
  dict,
  variant = "light",
  className = "",
  doctorSchedule,
}: {
  branch: Branch;
  locale: Locale;
  dict: Dictionary;
  variant?: "light" | "dark";
  className?: string;
  /** A doctor's own hours in this branch, shown instead of the branch's. */
  doctorSchedule?: WeekSchedule;
}) {
  const ar = locale === "ar";
  const dark = variant === "dark";
  const forDoctor = !!doctorSchedule;
  const note = forDoctor
    ? undefined
    : ar
      ? branch.hoursNoteAr || branch.hoursNoteEn
      : branch.hoursNoteEn || branch.hoursNoteAr;
  const legacy = forDoctor
    ? undefined
    : ar
      ? branch.hoursAr || branch.hoursEn
      : branch.hoursEn || branch.hoursAr;
  const own = doctorSchedule ?? branchSchedule(branch);
  const labels = forDoctor
    ? {
        openNow: dict.doctorProfile.availableNow,
        closedNow: dict.doctorProfile.notAvailableNow,
        closedDay: dict.doctorProfile.offDay,
      }
    : {
        openNow: dict.contact.openNow,
        closedNow: dict.contact.closedNow,
        closedDay: dict.contact.closedDay,
      };

  if (!own && legacy) {
    return (
      <p className={`flex items-center gap-1.5 text-sm ${dark ? "text-ink-400" : "text-ink-500"} ${className}`}>
        <Clock className="h-4 w-4 flex-shrink-0" />
        {legacy}
      </p>
    );
  }

  const schedule = own ?? defaultSchedule();
  const now = saudiNow();
  const open = isOpenNow(schedule, now);
  const todayPeriods = formatPeriods(schedule[now.day], locale);

  return (
    <details className={`group relative z-10 text-sm ${className}`}>
      <summary
        className={`flex cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-2 transition [&::-webkit-details-marker]:hidden ${
          dark
            ? "bg-white/5 text-ink-200 hover:bg-white/10"
            : "bg-ink-50 text-ink-700 hover:bg-primary-50"
        }`}
      >
        <Clock className={`h-4 w-4 flex-shrink-0 ${dark ? "text-primary-400" : "text-primary-600"}`} />
        <span className="min-w-0 flex-1">
          <span className="font-semibold">{dict.contact.hoursToday}:</span>{" "}
          {todayPeriods.length === 0
            ? labels.closedDay
            : todayPeriods.map((text, i) => (
                <span key={i} className="whitespace-nowrap tabular-nums">
                  {i > 0 && (ar ? "، " : ", ")}
                  {text}
                </span>
              ))}
        </span>
        <span
          className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
            open
              ? dark
                ? "bg-primary-500/20 text-primary-300"
                : "bg-primary-100 text-primary-700"
              : dark
                ? "bg-white/10 text-ink-300"
                : "bg-ink-100 text-ink-500"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${open ? "bg-primary-500" : "bg-ink-400"}`} />
          {open ? labels.openNow : labels.closedNow}
        </span>
        <ChevronDown className="h-4 w-4 flex-shrink-0 transition group-open:rotate-180" />
      </summary>

      <ul className={`mt-1.5 overflow-hidden rounded-xl border ${dark ? "border-white/10" : "border-ink-100 bg-white"}`}>
        {WEEK_ORDER.map((day) => {
          const periods = formatPeriods(schedule[day], locale);
          const today = day === now.day;
          return (
            <li
              key={day}
              className={`flex items-baseline justify-between gap-3 px-3 py-2 ${
                today ? (dark ? "bg-white/10" : "bg-primary-50") : ""
              } ${dark ? "border-white/5" : "border-ink-50"} [&:not(:first-child)]:border-t`}
            >
              <span className={`font-semibold ${today ? (dark ? "text-white" : "text-primary-800") : dark ? "text-ink-300" : "text-ink-800"}`}>
                {DAY_NAMES[locale][day]}
              </span>
              {periods.length > 0 ? (
                <span className={`flex flex-col items-end text-end tabular-nums ${dark ? "text-ink-200" : "text-ink-600"}`}>
                  {periods.map((text, i) => (
                    <span key={i} className="whitespace-nowrap">
                      {text}
                    </span>
                  ))}
                </span>
              ) : (
                <span className={dark ? "text-accent-300" : "font-semibold text-accent-700"}>
                  {labels.closedDay}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {note && (
        <p className={`mt-1.5 px-1 text-xs ${dark ? "text-ink-400" : "text-ink-500"}`}>{note}</p>
      )}
    </details>
  );
}
