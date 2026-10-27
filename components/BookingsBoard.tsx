"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  Copy,
  History,
  Loader2,
  Phone,
  RefreshCw,
  Search,
} from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { BookingStatus } from "@/lib/types";
import { telHref, whatsappHref } from "@/lib/phone";
import { SOCIAL_ICON_PATHS } from "@/lib/socialIconPaths";
import { updateBookingAction } from "@/lib/bookingActions";

export type BoardBooking = {
  id: string;
  createdAt: string;
  name: string;
  phone: string;
  departmentId: string;
  department: string;
  doctor?: string;
  source?: string;
  status: BookingStatus;
  note?: string;
  agent?: string;
  /** Extension assigned to call the patient. */
  extension?: string;
  updatedAt?: string;
  history: { status: BookingStatus; at: string; agent?: string; extension?: string }[];
};

export type BoardLabels = {
  statuses: Record<BookingStatus, string>;
  all: string;
  search: string;
  allDepartments: string;
  department: string;
  periodAll: string;
  periodToday: string;
  periodWeek: string;
  agentName: string;
  agentPlaceholder: string;
  note: string;
  notePlaceholder: string;
  save: string;
  saved: string;
  saveFailed: string;
  empty: string;
  noMatches: string;
  receivedAt: string;
  updatedBy: string;
  history: string;
  fromPage: string;
  doctor: string;
  refresh: string;
  autoRefresh: string;
  call: string;
  whatsapp: string;
  copy: string;
  copied: string;
  results: string;
  newLabel: string;
  colTime: string;
  colName: string;
  colPhone: string;
  colStatus: string;
  colExtension: string;
  allExtensions: string;
  extensionShort: string;
  colActions: string;
};

const STATUS_ORDER: BookingStatus[] = ["new", "no_answer", "callback", "contacted", "booked", "cancelled"];

const STATUS_STYLE: Record<BookingStatus, { badge: string; dot: string }> = {
  new: { badge: "bg-primary-500 text-white", dot: "bg-primary-500" },
  no_answer: { badge: "bg-accent-200 text-ink-900", dot: "bg-accent-500" },
  callback: { badge: "bg-sand-200 text-ink-900", dot: "bg-sand-400" },
  contacted: { badge: "bg-primary-100 text-primary-800", dot: "bg-primary-300" },
  booked: { badge: "bg-ink-900 text-white", dot: "bg-ink-900" },
  cancelled: { badge: "bg-ink-100 text-ink-500", dot: "bg-ink-300" },
};

const REFRESH_MS = 30_000;
const AGENT_KEY = "dentera-agent-name";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .trim();
}

function formatWhen(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", {
    timeZone: "Asia/Riyadh",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function riyadhDay(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date(iso));
}

function formatTime(iso: string, locale: Locale): { day: string; time: string } {
  const opts = { timeZone: "Asia/Riyadh" } as const;
  const tag = locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB";
  const date = new Date(iso);
  return {
    day: new Intl.DateTimeFormat(tag, { ...opts, day: "numeric", month: "short" }).format(date),
    time: new Intl.DateTimeFormat(tag, { ...opts, hour: "numeric", minute: "2-digit" }).format(date),
  };
}

type RowProps = {
  booking: BoardBooking;
  extensions: string[];
  locale: Locale;
  labels: BoardLabels;
  accessKey?: string;
  agent: string;
  onSaved: (b: BoardBooking) => void;
};

/** A request's status/note being edited, and saving it. */
function useBookingEditor({ booking, accessKey, agent, onSaved }: RowProps) {
  const [status, setStatus] = useState<BookingStatus>(booking.status);
  const [note, setNote] = useState(booking.note ?? "");
  const [extension, setExtension] = useState(booking.extension ?? "");
  const [result, setResult] = useState<"saved" | "failed" | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty =
    status !== booking.status ||
    note !== (booking.note ?? "") ||
    extension !== (booking.extension ?? "");

  // Pick up changes made by someone else, unless this row is being edited.
  useEffect(() => {
    if (!dirty) {
      setStatus(booking.status);
      setNote(booking.note ?? "");
      setExtension(booking.extension ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.status, booking.note, booking.extension]);

  const save = () => {
    const form = new FormData();
    form.set("id", booking.id);
    form.set("status", status);
    form.set("note", note);
    form.set("agent", agent);
    form.set("extension", extension);
    if (accessKey) form.set("key", accessKey);
    startTransition(async () => {
      const { ok } = await updateBookingAction(form);
      setResult(ok ? "saved" : "failed");
      if (ok) {
        const at = new Date().toISOString();
        onSaved({
          ...booking,
          status,
          note: note || undefined,
          agent: agent || booking.agent,
          extension: extension || undefined,
          updatedAt: at,
          history: [
            ...booking.history,
            { status, at, agent: agent || undefined, extension: extension || undefined },
          ],
        });
      }
      setTimeout(() => setResult(null), 2500);
    });
  };

  return { status, setStatus, note, setNote, extension, setExtension, dirty, save, pending, result };
}

function PhoneActions({ phone, labels }: { phone: string; labels: BoardLabels }) {
  const [copied, setCopied] = useState(false);
  const icon = "flex h-8 w-8 items-center justify-center rounded-lg transition";
  return (
    <span className="flex items-center gap-1">
      <a href={telHref(phone)} title={labels.call} aria-label={labels.call} className={`${icon} bg-ink-900 text-white hover:bg-ink-800`}>
        <Phone className="h-4 w-4" />
      </a>
      <a
        href={whatsappHref(phone)}
        target="_blank"
        rel="noopener noreferrer"
        title={labels.whatsapp}
        aria-label={labels.whatsapp}
        className={`${icon} bg-primary-500 text-white hover:bg-primary-600`}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4">
          <path d={SOCIAL_ICON_PATHS.whatsapp} />
        </svg>
      </a>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(phone);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            // Clipboard blocked; the number is on screen anyway.
          }
        }}
        title={copied ? labels.copied : labels.copy}
        aria-label={copied ? labels.copied : labels.copy}
        className={`${icon} text-ink-500 hover:bg-ink-50 hover:text-ink-900`}
      >
        {copied ? <Check className="h-4 w-4 text-primary-600" /> : <Copy className="h-4 w-4" />}
      </button>
    </span>
  );
}

function StatusSelect({
  value,
  onChange,
  labels,
}: {
  value: BookingStatus;
  onChange: (s: BookingStatus) => void;
  labels: BoardLabels;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as BookingStatus)}
      aria-label={labels.colStatus}
      className={`w-full cursor-pointer rounded-lg border-0 px-2.5 py-1.5 text-xs font-bold ${STATUS_STYLE[value].badge}`}
    >
      {STATUS_ORDER.map((s) => (
        <option key={s} value={s} className="bg-white text-ink-900">
          {labels.statuses[s]}
        </option>
      ))}
    </select>
  );
}

function ExtensionSelect({
  value,
  onChange,
  extensions,
  labels,
}: {
  value: string;
  onChange: (e: string) => void;
  extensions: string[];
  labels: BoardLabels;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={labels.colExtension}
      dir="ltr"
      className={`w-full cursor-pointer rounded-lg border px-2 py-1.5 text-center text-xs font-bold tabular-nums ${
        value ? "border-ink-900 bg-white text-ink-950" : "border-ink-100 bg-white text-ink-400"
      }`}
    >
      <option value="">—</option>
      {extensions.map((x) => (
        <option key={x} value={x}>
          {x}
        </option>
      ))}
    </select>
  );
}

function SaveButton({
  editor,
  labels,
}: {
  editor: ReturnType<typeof useBookingEditor>;
  labels: BoardLabels;
}) {
  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        onClick={editor.save}
        disabled={editor.pending || !editor.dirty}
        className="btn-primary !px-3 !py-1.5 text-xs disabled:opacity-30"
      >
        {editor.pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        {labels.save}
      </button>
      {editor.result && (
        <span className={`text-xs font-semibold ${editor.result === "saved" ? "text-primary-700" : "rounded-md bg-accent-100 px-2 py-0.5 text-ink-900"}`}>
          {editor.result === "saved" ? labels.saved : labels.saveFailed}
        </span>
      )}
    </span>
  );
}

function HistoryList({ booking, locale, labels }: { booking: BoardBooking; locale: Locale; labels: BoardLabels }) {
  return (
    <ol className="space-y-1 border-s-2 border-ink-100 ps-3 text-xs text-ink-600">
      {[...booking.history].reverse().map((h, i) => (
        <li key={i}>
          <span className="font-semibold">{labels.statuses[h.status]}</span> — {formatWhen(h.at, locale)}
          {h.agent && ` · ${h.agent}`}
          {h.extension && ` · ${labels.extensionShort} ${h.extension}`}
        </li>
      ))}
    </ol>
  );
}

function HistoryToggle({ count, open, onClick, labels }: { count: number; open: boolean; onClick: () => void; labels: BoardLabels }) {
  if (count === 0) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      title={labels.history}
      className="inline-flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-ink-900"
    >
      <History className="h-3.5 w-3.5" />
      {count}
      <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
    </button>
  );
}

/** One request as a table row (computer). */
function BookingRow(props: RowProps) {
  const { booking, locale, labels } = props;
  const editor = useBookingEditor(props);
  const [open, setOpen] = useState(false);
  const isNew = booking.status === "new";
  const when = formatTime(booking.createdAt, locale);
  const cell = "px-2.5 py-3 align-middle";

  return (
    <tbody className="border-b border-ink-100 last:border-b-0">
      <tr className={isNew ? "bg-primary-50" : "hover:bg-paper"}>
        <td className={`${cell} border-s-4 ${isNew ? "border-primary-500" : "border-transparent"} whitespace-nowrap`}>
          <span className="block font-bold text-ink-900">{when.day}</span>
          <span className="block text-xs text-ink-500">{when.time}</span>
        </td>
        <td className={`${cell} min-w-[8rem]`}>
          <span className="block font-bold text-ink-950">{booking.name}</span>
          {booking.source && (
            <span className="block text-xs text-ink-500">
              {labels.fromPage} {booking.source}
            </span>
          )}
        </td>
        <td className={cell}>
          <span className="flex flex-col items-start gap-1.5 2xl:flex-row 2xl:items-center 2xl:gap-2">
            <a href={telHref(booking.phone)} dir="ltr" className="whitespace-nowrap font-bold tabular-nums text-ink-950 hover:text-primary-700">
              {booking.phone}
            </a>
            <PhoneActions phone={booking.phone} labels={labels} />
          </span>
        </td>
        <td className={`${cell} min-w-[8rem]`}>
          <span className="block text-ink-900">{booking.department}</span>
          {booking.doctor && <span className="block text-xs text-ink-500">{booking.doctor}</span>}
        </td>
        <td className={`${cell} w-40 min-w-[9.5rem]`}>
          <StatusSelect value={editor.status} onChange={editor.setStatus} labels={labels} />
        </td>
        <td className={`${cell} w-20 min-w-[5rem]`}>
          <ExtensionSelect value={editor.extension} onChange={editor.setExtension} extensions={props.extensions} labels={labels} />
        </td>
        <td className={`${cell} min-w-[9rem]`}>
          <input
            value={editor.note}
            onChange={(e) => editor.setNote(e.target.value)}
            maxLength={500}
            placeholder={labels.notePlaceholder}
            aria-label={labels.note}
            className="input !py-1.5 text-xs"
          />
          {booking.updatedAt && (
            <span className="mt-1 block max-w-[10rem] text-[11px] leading-snug text-ink-400">
              {formatWhen(booking.updatedAt, locale)}
              {booking.agent && ` · ${labels.updatedBy} ${booking.agent}`}
            </span>
          )}
        </td>
        <td className={`${cell} whitespace-nowrap`}>
          <span className="flex flex-col items-start gap-1.5">
            <SaveButton editor={editor} labels={labels} />
            <HistoryToggle count={booking.history.length} open={open} onClick={() => setOpen(!open)} labels={labels} />
          </span>
        </td>
      </tr>
      {open && (
        <tr className="bg-paper">
          <td colSpan={8} className="px-6 py-3">
            <HistoryList booking={booking} locale={locale} labels={labels} />
          </td>
        </tr>
      )}
    </tbody>
  );
}

/** One request as a compact list item (phone and tablet). */
function BookingItem(props: RowProps) {
  const { booking, locale, labels } = props;
  const editor = useBookingEditor(props);
  const [open, setOpen] = useState(false);
  const isNew = booking.status === "new";

  return (
    <li className={`border-s-4 px-4 py-3 ${isNew ? "border-primary-500 bg-primary-50" : "border-transparent bg-white"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-extrabold text-ink-950">{booking.name}</p>
          <p className="truncate text-xs text-ink-500">
            {formatWhen(booking.createdAt, locale)} · {booking.department}
            {booking.doctor && ` · ${booking.doctor}`}
          </p>
        </div>
        <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[booking.status].badge}`}>
          {labels.statuses[booking.status]}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <a href={telHref(booking.phone)} dir="ltr" className="font-bold tabular-nums text-ink-950">
          {booking.phone}
        </a>
        <PhoneActions phone={booking.phone} labels={labels} />
      </div>
      <div className="mt-2 grid grid-cols-[minmax(0,8.5rem)_4.75rem_minmax(0,1fr)] gap-2">
        <StatusSelect value={editor.status} onChange={editor.setStatus} labels={labels} />
        <ExtensionSelect value={editor.extension} onChange={editor.setExtension} extensions={props.extensions} labels={labels} />
        <input
          value={editor.note}
          onChange={(e) => editor.setNote(e.target.value)}
          maxLength={500}
          placeholder={labels.notePlaceholder}
          aria-label={labels.note}
          className="input !py-1.5 text-xs"
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <HistoryToggle count={booking.history.length} open={open} onClick={() => setOpen(!open)} labels={labels} />
        <SaveButton editor={editor} labels={labels} />
      </div>
      {open && (
        <div className="mt-2">
          <HistoryList booking={booking} locale={locale} labels={labels} />
        </div>
      )}
    </li>
  );
}

/** The call center's list of booking requests, with status updates. */
export function BookingsBoard({
  bookings: initial,
  departments,
  extensions,
  locale,
  labels,
  accessKey,
}: {
  bookings: BoardBooking[];
  departments: { id: string; name: string }[];
  /** Extensions a request can be assigned to. */
  extensions: string[];
  locale: Locale;
  labels: BoardLabels;
  /** The private link's key (call-center page); omitted in the control panel. */
  accessKey?: string;
}) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initial);
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "">("");
  const [department, setDepartment] = useState("");
  const [period, setPeriod] = useState<"" | "today" | "week">("");
  const [extensionFilter, setExtensionFilter] = useState("");
  const [query, setQuery] = useState("");
  const [agent, setAgent] = useState("");
  const [refreshing, startRefresh] = useTransition();

  useEffect(() => setBookings(initial), [initial]);

  useEffect(() => {
    try {
      setAgent(localStorage.getItem(AGENT_KEY) ?? "");
    } catch {
      // Storage blocked: the name just isn't remembered.
    }
  }, []);

  // New requests show up without reloading the page.
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") startRefresh(() => router.refresh());
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [router]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<BookingStatus, number>;
    for (const b of bookings) c[b.status] += 1;
    return c;
  }, [bookings]);

  const results = useMemo(() => {
    const today = riyadhDay(new Date().toISOString());
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    return bookings.filter((b) => {
      if (statusFilter && b.status !== statusFilter) return false;
      if (department && b.departmentId !== department) return false;
      if (extensionFilter && b.extension !== extensionFilter) return false;
      if (period === "today" && riyadhDay(b.createdAt) !== today) return false;
      if (period === "week" && new Date(b.createdAt).getTime() < weekAgo) return false;
      const haystack = normalize(`${b.name} ${b.phone} ${b.phone.replace(/^0/, "966")}`);
      return terms.every((t) => haystack.includes(t));
    });
  }, [bookings, statusFilter, department, period, extensionFilter, query]);

  return (
    <div>
      <div className="card p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          {/* "New" first, then "All", then the other statuses. */}
          {(["new", "", ...STATUS_ORDER.filter((x) => x !== "new")] as (BookingStatus | "")[]).map((s) =>
            s === "" ? (
              <button
                key="all"
                type="button"
                onClick={() => setStatusFilter("")}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  statusFilter === "" ? "bg-ink-950 text-white" : "bg-ink-50 text-ink-700 hover:bg-ink-100"
                }`}
              >
                {labels.all} <span className="opacity-70">({bookings.length})</span>
              </button>
            ) : (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(statusFilter === s ? "" : s)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  statusFilter === s ? STATUS_STYLE[s].badge : "bg-ink-50 text-ink-700 hover:bg-ink-100"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${STATUS_STYLE[s].dot}`} />
                {labels.statuses[s]} <span className="opacity-70">({counts[s]})</span>
              </button>
            )
          )}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={labels.search}
              aria-label={labels.search}
              className="input !ps-10"
            />
          </div>
          <select value={department} onChange={(e) => setDepartment(e.target.value)} aria-label={labels.department} className="input">
            <option value="">{labels.allDepartments}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as "" | "today" | "week")}
            aria-label={labels.periodAll}
            className="input"
          >
            <option value="">{labels.periodAll}</option>
            <option value="today">{labels.periodToday}</option>
            <option value="week">{labels.periodWeek}</option>
          </select>
          <select
            value={extensionFilter}
            onChange={(e) => setExtensionFilter(e.target.value)}
            aria-label={labels.colExtension}
            className="input"
          >
            <option value="">{labels.allExtensions}</option>
            {extensions.map((x) => (
              <option key={x} value={x}>
                {labels.extensionShort} {x}
              </option>
            ))}
          </select>
          <input
            value={agent}
            onChange={(e) => {
              setAgent(e.target.value);
              try {
                localStorage.setItem(AGENT_KEY, e.target.value);
              } catch {
                // Not remembered; still used for this session.
              }
            }}
            maxLength={60}
            placeholder={labels.agentPlaceholder}
            aria-label={labels.agentName}
            className="input"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-ink-500">
          <span>
            <span className="font-bold text-ink-900">{results.length}</span> {labels.results}
            {counts.new > 0 && (
              <span className="ms-2 rounded-full bg-primary-500 px-2 py-0.5 text-xs font-bold text-white">
                {counts.new} {labels.newLabel}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => startRefresh(() => router.refresh())}
            title={labels.autoRefresh}
            className="inline-flex items-center gap-1.5 font-semibold text-primary-700 hover:underline"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {labels.refresh}
          </button>
        </div>
      </div>

      {bookings.length === 0 ? (
        <p className="py-16 text-center text-ink-500">{labels.empty}</p>
      ) : results.length === 0 ? (
        <p className="py-16 text-center text-ink-500">{labels.noMatches}</p>
      ) : (
        <>
          {/* Computer: one row per request. */}
          <div className="card mt-5 hidden overflow-x-auto xl:block">
            <table className="w-full min-w-[56rem] text-start text-sm">
              <thead className="border-b border-ink-100 bg-ink-50 text-xs font-bold text-ink-500">
                <tr>
                  {[labels.colTime, labels.colName, labels.colPhone, labels.department, labels.colStatus, labels.colExtension, labels.note, labels.colActions].map((h, i) => (
                    <th key={i} scope="col" className={`px-2.5 py-3 text-start ${i === 0 ? "border-s-4 border-transparent" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              {results.map((b) => (
                <BookingRow
                  key={b.id}
                  booking={b}
                  extensions={extensions}
                  locale={locale}
                  labels={labels}
                  accessKey={accessKey}
                  agent={agent}
                  onSaved={(updated) => setBookings((all) => all.map((x) => (x.id === updated.id ? updated : x)))}
                />
              ))}
            </table>
          </div>
          {/* Phone, tablet and small laptops: a compact list. */}
          <ul className="card mt-5 divide-y divide-ink-100 overflow-hidden xl:hidden">
            {results.map((b) => (
              <BookingItem
                key={b.id}
                booking={b}
                extensions={extensions}
                locale={locale}
                labels={labels}
                accessKey={accessKey}
                agent={agent}
                onSaved={(updated) => setBookings((all) => all.map((x) => (x.id === updated.id ? updated : x)))}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
