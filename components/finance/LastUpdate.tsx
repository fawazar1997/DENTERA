/** «آخر تحديث: [التاريخ والساعة]» — the robot's last successful run (Riyadh time). */
export function LastUpdate({ at, locale }: { at?: string; locale: string }) {
  const ar = locale === "ar";
  const when = at
    ? new Intl.DateTimeFormat(ar ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh" }).format(new Date(at))
    : ar
      ? "لم يتم بعد"
      : "Not yet";
  const stale = !at || Date.now() - Date.parse(at) > 36 * 3600_000;
  return (
    <p className="inline-flex items-center gap-2 rounded-full bg-sand-50 px-3 py-1 text-xs font-bold text-ink-600 ring-1 ring-ink-100">
      <span className={`h-2 w-2 rounded-full ${stale ? "bg-red-600" : "bg-emerald-600"}`} aria-hidden="true" />
      {ar ? "آخر تحديث" : "Last update"}: {when}
    </p>
  );
}
