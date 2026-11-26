/** Shown while a tab's figures load (the tab bar above is already there). */
export function TabSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-6" role="status" aria-live="polite" aria-label={label}>
      <div className="rounded-[28px] border border-ink-100 bg-white p-6 shadow-card">
        <div className="h-4 w-40 animate-pulse rounded-full bg-ink-100" />
        <div className="mt-3 h-7 w-64 max-w-full animate-pulse rounded-full bg-ink-100" />
        <div className="mt-4 h-6 w-48 animate-pulse rounded-full bg-sand-100" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-3xl bg-white shadow-card ring-1 ring-ink-100" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-3xl bg-white shadow-card ring-1 ring-ink-100" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
