"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { WeekSchedule } from "@/lib/types";
import { ScheduleEditor, type ScheduleLabels } from "./ScheduleEditor";

export type DoctorBranchOption = {
  id: string;
  name: string;
  /** Starting point for the doctor's hours: theirs if set, else the branch's. */
  initialHours: WeekSchedule;
  hasOwnHours: boolean;
  checked: boolean;
};

/**
 * "Works at" checkboxes; for each branch ticked, the doctor's own hours in
 * that branch can optionally be set (otherwise none are shown on the site).
 */
export function DoctorBranchesField({
  branches,
  locale,
  labels,
}: {
  branches: DoctorBranchOption[];
  locale: Locale;
  labels: {
    worksAt: string;
    setHours: string;
    hoursHint: string;
    schedule: ScheduleLabels;
  };
}) {
  const [checked, setChecked] = useState(
    () => new Set(branches.filter((b) => b.checked).map((b) => b.id))
  );
  const [withHours, setWithHours] = useState(
    () => new Set(branches.filter((b) => b.hasOwnHours).map((b) => b.id))
  );

  const toggle = (set: Set<string>, id: string, on: boolean) => {
    const next = new Set(set);
    if (on) next.add(id);
    else next.delete(id);
    return next;
  };

  return (
    <fieldset>
      <legend className="label">{labels.worksAt}</legend>
      <div className="flex flex-wrap gap-4">
        {branches.map((branch) => (
          <label key={branch.id} className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              name="branchIds"
              value={branch.id}
              checked={checked.has(branch.id)}
              onChange={(e) => setChecked((s) => toggle(s, branch.id, e.target.checked))}
              className="h-4 w-4 rounded border-ink-300"
            />
            {branch.name}
          </label>
        ))}
      </div>

      {branches
        .filter((b) => checked.has(b.id))
        .map((branch) => (
          <div key={branch.id} className="mt-3 rounded-xl border border-ink-100 p-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-ink-800">
              <input
                type="checkbox"
                name="hoursFor"
                value={branch.id}
                checked={withHours.has(branch.id)}
                onChange={(e) => setWithHours((s) => toggle(s, branch.id, e.target.checked))}
                className="h-4 w-4 rounded border-ink-300"
              />
              <Clock className="h-4 w-4 text-primary-600" />
              {labels.setHours} — {branch.name}
            </label>
            {withHours.has(branch.id) ? (
              <div className="mt-3">
                <ScheduleEditor
                  initial={branch.initialHours}
                  locale={locale}
                  labels={labels.schedule}
                  namePrefix={`hours_${branch.id}_`}
                />
              </div>
            ) : (
              <p className="mt-1 text-xs text-ink-400">{labels.hoursHint}</p>
            )}
          </div>
        ))}
    </fieldset>
  );
}
