"use client";

import { useState } from "react";
import { Plus, X, CopyCheck } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { WeekSchedule } from "@/lib/types";
import { DAY_NAMES, MAX_PERIODS, WEEK_ORDER } from "@/lib/hours";

export type ScheduleLabels = {
  open: string;
  closed: string;
  from: string;
  to: string;
  addPeriod: string;
  removePeriod: string;
  copyToAll: string;
};

/** Day-by-day working hours: open/closed toggle and up to two periods a day. */
export function ScheduleEditor({
  initial,
  locale,
  labels,
}: {
  initial: WeekSchedule;
  locale: Locale;
  labels: ScheduleLabels;
}) {
  const [days, setDays] = useState(() =>
    initial.map((d) => ({
      closed: d.closed,
      periods: d.periods.length > 0 ? d.periods : [{ from: "09:00", to: "21:00" }],
    }))
  );

  const update = (day: number, change: (d: (typeof days)[number]) => (typeof days)[number]) =>
    setDays((all) => all.map((d, i) => (i === day ? change(d) : d)));

  return (
    <div className="divide-y divide-ink-100 rounded-2xl border border-ink-100">
      {WEEK_ORDER.map((day) => {
        const d = days[day];
        return (
          <div
            key={day}
            className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 ${
              d.closed ? "bg-ink-50/60" : ""
            }`}
          >
            <label className="flex w-36 flex-shrink-0 items-center gap-2 text-sm font-bold text-ink-900">
              <input
                type="checkbox"
                name={`day${day}Open`}
                checked={!d.closed}
                onChange={(e) => update(day, (x) => ({ ...x, closed: !e.target.checked }))}
                className="h-4 w-4 rounded border-ink-300"
              />
              {DAY_NAMES[locale][day]}
            </label>

            {d.closed ? (
              <span className="text-sm font-semibold text-ink-400">{labels.closed}</span>
            ) : null}

            {/* Times stay in the form while closed so re-opening keeps them. */}
            <div className={`flex flex-1 flex-wrap items-center gap-2 ${d.closed ? "hidden" : ""}`}>
              {d.periods.map((p, n) => (
                <div key={n} className="flex items-center gap-1.5">
                  <input
                    type="time"
                    name={`day${day}From${n + 1}`}
                    value={p.from}
                    aria-label={`${DAY_NAMES[locale][day]} ${labels.from}`}
                    onChange={(e) =>
                      update(day, (x) => ({
                        ...x,
                        periods: x.periods.map((q, i) => (i === n ? { ...q, from: e.target.value } : q)),
                      }))
                    }
                    className="input !w-auto !px-2.5 !py-1.5 text-sm"
                    dir="ltr"
                  />
                  <span className="text-ink-400">–</span>
                  <input
                    type="time"
                    name={`day${day}To${n + 1}`}
                    value={p.to}
                    aria-label={`${DAY_NAMES[locale][day]} ${labels.to}`}
                    onChange={(e) =>
                      update(day, (x) => ({
                        ...x,
                        periods: x.periods.map((q, i) => (i === n ? { ...q, to: e.target.value } : q)),
                      }))
                    }
                    className="input !w-auto !px-2.5 !py-1.5 text-sm"
                    dir="ltr"
                  />
                  {n > 0 && (
                    <button
                      type="button"
                      title={labels.removePeriod}
                      aria-label={labels.removePeriod}
                      onClick={() =>
                        update(day, (x) => ({ ...x, periods: x.periods.filter((_, i) => i !== n) }))
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {d.periods.length < MAX_PERIODS && (
                <button
                  type="button"
                  onClick={() =>
                    update(day, (x) => ({
                      ...x,
                      periods: [...x.periods, { from: "16:00", to: "22:00" }],
                    }))
                  }
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {labels.addPeriod}
                </button>
              )}
            </div>

            {!d.closed && (
              <button
                type="button"
                onClick={() =>
                  setDays((all) =>
                    all.map((x) =>
                      x.closed ? x : { ...x, periods: d.periods.map((p) => ({ ...p })) }
                    )
                  )
                }
                title={labels.copyToAll}
                className="ms-auto inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-ink-500 hover:bg-ink-100 hover:text-ink-800"
              >
                <CopyCheck className="h-3.5 w-3.5" />
                {labels.copyToAll}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
