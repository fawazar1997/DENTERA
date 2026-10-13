import type { Locale } from "./i18n";
import type { Branch, DayHours, WeekSchedule } from "./types";

// Weekly working hours per branch. A schedule holds 7 days indexed like
// Date.getDay() (0 = Sunday … 6 = Saturday); times are "HH:MM" (24h).

/** Display order: the Saudi week starts on Saturday. */
export const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5] as const;

export const DAY_NAMES: Record<Locale, string[]> = {
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  ar: ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
};

/** At most this many periods a day (e.g. a morning and an evening shift). */
export const MAX_PERIODS = 2;

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isTime(value: string | undefined | null): value is string {
  return !!value && TIME.test(value);
}

/** Used until a branch's hours are set: Sat–Thu 9 AM–9 PM, Friday closed. */
export function defaultSchedule(): WeekSchedule {
  return Array.from({ length: 7 }, (_, day) =>
    day === 5
      ? { closed: true, periods: [] }
      : { closed: false, periods: [{ from: "09:00", to: "21:00" }] }
  );
}

/** The branch's own schedule, if one has been set and is well formed. */
export function branchSchedule(branch: Branch): WeekSchedule | undefined {
  return branch.schedule?.length === 7 ? branch.schedule : undefined;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** "21:30" → "9:30 م" / "9:30 PM". */
export function formatTime(time: string, locale: Locale): string {
  const [h, m] = time.split(":").map(Number);
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const pm = h >= 12;
  const suffix = locale === "ar" ? (pm ? "م" : "ص") : pm ? "PM" : "AM";
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Each open period as text ("9:00 ص – 1:00 م"); empty when closed. */
export function formatPeriods(day: DayHours, locale: Locale): string[] {
  if (day.closed) return [];
  return day.periods.map((p) => `${formatTime(p.from, locale)} – ${formatTime(p.to, locale)}`);
}

/** Current weekday and minute of the day in Saudi Arabia. */
export function saudiNow(date = new Date()): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Riyadh",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { day, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

/** Whether the branch is open at the given moment (handles after-midnight closing). */
export function isOpenNow(schedule: WeekSchedule, now = saudiNow()): boolean {
  const open = (d: DayHours) => !d.closed;
  const today = schedule[now.day];
  if (open(today)) {
    for (const p of today.periods) {
      const from = toMinutes(p.from);
      const to = toMinutes(p.to);
      if (to > from ? now.minutes >= from && now.minutes < to : now.minutes >= from) {
        return true;
      }
    }
  }
  // A period that ran past midnight yesterday, e.g. 16:00 – 01:00.
  const yesterday = schedule[(now.day + 6) % 7];
  if (open(yesterday)) {
    for (const p of yesterday.periods) {
      if (toMinutes(p.to) <= toMinutes(p.from) && now.minutes < toMinutes(p.to)) {
        return true;
      }
    }
  }
  return false;
}

/** Reads the schedule editor's fields (day{d}Open, day{d}From{n}, day{d}To{n}). */
export function scheduleFromForm(formData: FormData): WeekSchedule {
  return Array.from({ length: 7 }, (_, day) => {
    const periods = [];
    for (let n = 1; n <= MAX_PERIODS; n++) {
      const from = formData.get(`day${day}From${n}`);
      const to = formData.get(`day${day}To${n}`);
      if (typeof from === "string" && typeof to === "string" && isTime(from) && isTime(to) && from !== to) {
        periods.push({ from, to });
      }
    }
    const closed = formData.get(`day${day}Open`) !== "on" || periods.length === 0;
    return { closed, periods };
  });
}
