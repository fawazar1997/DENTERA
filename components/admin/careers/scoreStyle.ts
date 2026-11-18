/** Score badge colours: tinted by how well an applicant matches (text stays dark). */
export function scoreStyle(score: number, fails: number): string {
  if (fails) return "bg-accent-100 text-accent-800 ring-accent-200";
  if (score >= 70) return "bg-primary-100 text-ink-950 ring-primary-200";
  if (score >= 45) return "bg-sand-100 text-ink-900 ring-sand-200";
  return "bg-ink-100 text-ink-700 ring-ink-200";
}
