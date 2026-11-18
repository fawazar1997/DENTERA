import { foldArabic } from "./arabicSearch";
import {
  liveApplications,
  matchApplication,
  repeatApplicants,
  type CareerApplication,
  type CareerField,
  type CareersFile,
} from "./careers";

// Filtering and sorting the applicants (the list in the panel and its
// Excel export use the same rules, from the page's query string).

export type CareersQuery = {
  q?: string;
  field?: string;
  stage?: string;
  city?: string;
  nationality?: string;
  gender?: string;
  minYears?: string;
  maxYears?: string;
  qualification?: string;
  scfhs?: string;
  match?: string;
  minRating?: string;
  tag?: string;
  from?: string;
  to?: string;
  excluded?: string;
  sort?: string;
};

export const QUERY_KEYS: (keyof CareersQuery)[] = [
  "q", "field", "stage", "city", "nationality", "gender", "minYears", "maxYears",
  "qualification", "scfhs", "match", "minRating", "tag", "from", "to", "excluded", "sort",
];

export type ApplicantRow = CareerApplication & {
  score: number;
  fails: string[];
  repeat: boolean;
  fieldName: { ar: string; en: string };
};

/** Every finished application with its match, newest first. */
export function applicantRows(file: CareersFile): ApplicantRow[] {
  const fields = new Map<string, CareerField>(file.fields.map((f) => [f.id, f]));
  const repeat = repeatApplicants(liveApplications(file));
  return liveApplications(file)
    .map((a) => {
      const field = fields.get(a.fieldId);
      const m = matchApplication(a, field);
      return {
        ...a,
        score: m.score,
        fails: m.fails,
        repeat: repeat.has(a.id),
        fieldName: { ar: field?.nameAr ?? a.fieldId, en: field?.nameEn ?? a.fieldId },
      };
    })
    .sort((x, y) => y.createdAt.localeCompare(x.createdAt));
}

const riyadhDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" });

export function filterApplicants(rows: ApplicantRow[], q: CareersQuery): ApplicantRow[] {
  const text = foldArabic(q.q ?? "").trim();
  const city = foldArabic(q.city ?? "").trim();
  const min = q.minYears ? Number(q.minYears) : undefined;
  const max = q.maxYears ? Number(q.maxYears) : undefined;
  const minRating = q.minRating ? Number(q.minRating) : undefined;
  const out = rows.filter((r) => {
    if (!q.excluded && r.excluded) return false;
    if (q.excluded === "only" && !r.excluded) return false;
    if (text) {
      const hay = foldArabic(`${r.name} ${r.mobile} ${r.email ?? ""} ${r.ref} ${r.specialty ?? ""}`);
      if (!hay.includes(text)) return false;
    }
    if (q.field && r.fieldId !== q.field) return false;
    if (q.stage && r.stage !== q.stage) return false;
    if (city && !foldArabic(r.city).includes(city)) return false;
    if (q.nationality && r.nationality !== q.nationality) return false;
    if (q.gender && r.gender !== q.gender) return false;
    if (min !== undefined && r.years < min) return false;
    if (max !== undefined && r.years > max) return false;
    if (q.qualification && r.qualification !== q.qualification) return false;
    if (q.scfhs && r.scfhs !== q.scfhs) return false;
    if (q.match === "ok" && r.fails.length) return false;
    if (q.match === "fail" && !r.fails.length) return false;
    if (minRating !== undefined && (r.rating ?? 0) < minRating) return false;
    if (q.tag && !r.tags.includes(q.tag)) return false;
    if (q.from && riyadhDay(r.createdAt) < q.from) return false;
    if (q.to && riyadhDay(r.createdAt) > q.to) return false;
    return true;
  });
  const sorters: Record<string, (a: ApplicantRow, b: ApplicantRow) => number> = {
    score: (a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt),
    years: (a, b) => b.years - a.years || b.score - a.score,
    rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.score - a.score,
  };
  return q.sort && sorters[q.sort] ? [...out].sort(sorters[q.sort]) : out;
}

/** The query from page search params (only known keys, trimmed). */
export function readQuery(params: Record<string, string | string[] | undefined>): CareersQuery {
  const q: CareersQuery = {};
  for (const key of QUERY_KEYS) {
    const v = params[key];
    const s = (Array.isArray(v) ? v[0] : v)?.trim().slice(0, 100);
    if (s) q[key] = s;
  }
  return q;
}

export function queryString(q: CareersQuery, extra: Record<string, string> = {}): string {
  const p = new URLSearchParams();
  for (const key of QUERY_KEYS) if (q[key]) p.set(key, q[key]!);
  for (const [k, v] of Object.entries(extra)) p.set(k, v);
  return p.toString();
}
