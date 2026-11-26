// The PMS Appointments Report, stored for «الحضور والمواعيد» (attendance and no-show).
// The robot sends only the columns used here, with the patient's file number already
// replaced by a one-way code: no name, mobile, gender, nationality or notes reach the site.
// Stored per month (ops/appointments/<YYYY-MM>.json); a new export replaces the days and
// branch it covers.

import { readPrivateFile, putPrivateFile } from "./privateBlob";
import { readDate, isoDay, detectOrder } from "./dateParse";
import type { OpsBranch } from "./opsMetrics";

/** What became of an appointment. */
export type ApptState = "attended" | "noShow" | "cancelled" | "open";

export type StoredAppt = {
  /** Scheduled day and time (Riyadh), YYYY-MM-DDTHH:mm. */
  at: string;
  branch: OpsBranch;
  /** The doctor as the PMS writes it (shown as the official name, when allowed). */
  doctor: string;
  state: ApptState;
  /** The PMS status word as it came (for the mapping table in settings; no patient data). */
  status: string;
  /** New or returning patient, as the PMS marks the appointment. */
  newOld: "new" | "old" | "";
  confirmed: boolean;
  /** When the appointment was booked (YYYY-MM-DDTHH:mm), if the report gives it. */
  addedOn?: string;
  /** The patient, coded one way by the robot (counts distinct patients; can't be read back). */
  pcode: string;
  source: string;
  type: string;
  hasInvoice: boolean;
};

const key = (s: unknown) => String(s ?? "").toLowerCase().replace(/[\s_.\-/()]+/g, "");

/**
 * The PMS status → what became of the appointment. The PMS statuses: Yes (arrived), Inside Clinic,
 * Left, With surgical coordinator, Emergency → attended; Cancelled, Doctor Cancelled, Reschedule →
 * cancelled; No Show → no-show. No status (or a word not known) stays «open»: once its time has
 * passed it counts as no-show (no attendance recorded), and the status table shows how many.
 */
export function stateOf(status: string, hasInvoice: boolean): ApptState {
  const t = status.toLowerCase().trim();
  if (/no ?show|not ?show|absent|لم ?يحضر|غياب|غائب/.test(t)) return "noShow";
  if (/cancel|resched|delet|ملغ|إلغاء|الغاء|تأجيل/.test(t)) return "cancelled";
  if (/^yes$|arriv|attend|inside|left|surgical|emergenc|check.?in|done|complet|حضر|وصل|داخل|غادر|طوارئ/.test(t)) return "attended";
  if (hasInvoice) return "attended";
  return "open";
}

const time = (raw: string) => {
  const m = String(raw ?? "").match(/(\d{1,2}):(\d{2})\s*(am|pm|ص|م)?/i);
  if (!m) return "00:00";
  let h = Number(m[1]);
  const ap = m[3]?.toLowerCase();
  if ((ap === "pm" || ap === "م") && h < 12) h += 12;
  if ((ap === "am" || ap === "ص") && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
};

/** The robot's CSV of one branch and period, as appointments (rows without a date are skipped). */
export function parseAppointments(table: string[][], branch: OpsBranch): StoredAppt[] {
  const at = table.findIndex((r) => r.some((c) => key(c) === "date") && r.some((c) => key(c) === "appointmentstatus"));
  if (at < 0) return [];
  const head = table[at].map(key);
  const col = (...names: string[]) => head.findIndex((h) => names.includes(h));
  const c = {
    date: col("date"),
    time: col("time"),
    doctor: col("doctor"),
    status: col("appointmentstatus"),
    newOld: col("newold", "neworold"),
    confirmed: col("isconfirmed"),
    added: col("addedon"),
    pcode: col("fileno"),
    source: col("appointmentsource"),
    type: col("appointmenttype"),
    invoice: col("invoiceno"),
  };
  const body = table.slice(at + 1);
  const order = detectOrder(body.map((r) => r[c.date] ?? ""));
  const out: StoredAppt[] = [];
  for (const r of body) {
    const d = readDate(r[c.date] ?? "", order);
    if (!d) continue;
    const day = isoDay(d);
    const t = c.time >= 0 && r[c.time] ? time(r[c.time]) : d.time ? d.time.slice(0, 5) : "00:00";
    const added = c.added >= 0 ? readDate(r[c.added] ?? "", order) : null;
    const status = String(r[c.status] ?? "").trim().slice(0, 40);
    const hasInvoice = c.invoice >= 0 && /\d/.test(String(r[c.invoice] ?? ""));
    const no = key(r[c.newOld]);
    out.push({
      at: `${day}T${t}`,
      branch,
      doctor: String(r[c.doctor] ?? "").trim().slice(0, 80),
      state: stateOf(status, hasInvoice),
      status,
      newOld: /^(new|جديد)/.test(no) ? "new" : /^(old|قديم|returning|عائد)/.test(no) ? "old" : "",
      confirmed: /^(yes|true|1|confirmed|نعم|مؤكد)/i.test(String(r[c.confirmed] ?? "").trim()),
      addedOn: added ? `${isoDay(added)}T${(added.time ?? "00:00").slice(0, 5)}` : undefined,
      pcode: /^[0-9a-f]{16}$/.test(String(r[c.pcode] ?? "")) ? String(r[c.pcode]) : "",
      source: String(r[c.source] ?? "").trim().slice(0, 40),
      type: String(r[c.type] ?? "").trim().slice(0, 40),
      hasInvoice,
    });
  }
  return out;
}

const pathOf = (month: string) => `ops/appointments/${month}.json`;

export async function readAppointmentsMonth(month: string): Promise<StoredAppt[]> {
  try {
    const bytes = await readPrivateFile(pathOf(month));
    return bytes ? ((JSON.parse(new TextDecoder().decode(bytes)) as { rows: StoredAppt[] }).rows ?? []) : [];
  } catch {
    return [];
  }
}

/**
 * Stores one branch's appointments of from … to (inclusive), replacing what was stored for
 * those days and that branch. Returns how many rows are now stored for that span.
 */
export async function saveAppointments(branch: OpsBranch, from: string, to: string, rows: StoredAppt[]): Promise<number> {
  const months = new Set<string>();
  for (let d = from.slice(0, 7); d <= to.slice(0, 7); ) {
    months.add(d);
    const [y, m] = d.split("-").map(Number);
    d = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  }
  let stored = 0;
  for (const month of months) {
    const kept = (await readAppointmentsMonth(month)).filter((a) => a.branch !== branch || a.at.slice(0, 10) < from || a.at.slice(0, 10) > to);
    const added = rows.filter((a) => a.at.startsWith(month) && a.at.slice(0, 10) >= from && a.at.slice(0, 10) <= to);
    const all = [...kept, ...added].sort((a, b) => a.at.localeCompare(b.at));
    await putPrivateFile(pathOf(month), new TextEncoder().encode(JSON.stringify({ rows: all })), "application/json");
    stored += added.length;
  }
  return stored;
}
