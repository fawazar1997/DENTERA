import Link from "next/link";

// A single-series horizontal bar chart in plain HTML (no chart library):
// one brand hue, thin bars with a rounded end, the value at the tip, a
// hover title, and each bar a link to the applicants it counts.

export type Bar = { label: string; value: number; href?: string; display?: string };

export function BarList({ title, bars, empty, max }: { title: string; bars: Bar[]; empty: string; max?: number }) {
  const top = max ?? Math.max(1, ...bars.map((b) => b.value));
  return (
    <section className="card p-5">
      <h3 className="text-sm font-bold text-ink-900">{title}</h3>
      {bars.length === 0 ? (
        <p className="mt-3 text-sm text-ink-400">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {bars.map((b) => {
            const width = b.value > 0 ? `${Math.max(2, (b.value / top) * 100)}%` : "0%";
            const row = (
              <>
                <span className="w-28 flex-shrink-0 truncate text-xs font-semibold text-ink-700" title={b.label}>
                  {b.label}
                </span>
                <span className="relative flex h-4 flex-1 items-center">
                  <span className="h-3 rounded-e bg-primary-500 transition-[width] group-hover:bg-primary-600" style={{ width }} />
                  <span className="ms-2 text-xs font-bold tabular-nums text-ink-900">{b.display ?? b.value}</span>
                </span>
              </>
            );
            return (
              <li key={b.label}>
                {b.href ? (
                  <Link href={b.href} title={`${b.label}: ${b.display ?? b.value}`} className="group flex items-center gap-3 rounded-md hover:bg-ink-50">
                    {row}
                  </Link>
                ) : (
                  <div title={`${b.label}: ${b.display ?? b.value}`} className="group flex items-center gap-3">
                    {row}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Applications per week as columns (oldest to newest), the count on each cap. */
export function WeekColumns({ title, weeks, empty }: { title: string; weeks: { label: string; value: number }[]; empty: string }) {
  const top = Math.max(1, ...weeks.map((w) => w.value));
  const any = weeks.some((w) => w.value > 0);
  return (
    <section className="card p-5">
      <h3 className="text-sm font-bold text-ink-900">{title}</h3>
      {!any ? (
        <p className="mt-3 text-sm text-ink-400">{empty}</p>
      ) : (
        <div className="mt-4 flex h-40 items-end gap-1.5 border-b border-ink-100" dir="ltr">
          {weeks.map((w) => (
            <div key={w.label} className="flex h-full flex-1 flex-col items-center justify-end" title={`${w.label}: ${w.value}`}>
              {w.value > 0 && <span className="mb-1 text-[0.65rem] font-bold tabular-nums text-ink-700">{w.value}</span>}
              <span className="w-full max-w-[24px] rounded-t bg-primary-500" style={{ height: `${(w.value / top) * 80}%`, minHeight: w.value ? 4 : 0 }} />
            </div>
          ))}
        </div>
      )}
      {any && (
        <div className="mt-1.5 flex justify-between text-[0.65rem] text-ink-400" dir="ltr">
          <span>{weeks[0]?.label}</span>
          <span>{weeks[weeks.length - 1]?.label}</span>
        </div>
      )}
    </section>
  );
}
