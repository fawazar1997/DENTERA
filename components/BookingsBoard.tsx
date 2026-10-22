"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  Clock,
  Copy,
  History,
  Loader2,
  Phone,
  RefreshCw,
  Search,
  Stethoscope,
  UserRound,
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
  updatedAt?: string;
  history: { status: BookingStatus; at: string; agent?: string }[];
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

function BookingCard({
  booking,
  locale,
  labels,
  accessKey,
  agent,
  onSaved,
}: {
  booking: BoardBooking;
  locale: Locale;
  labels: BoardLabels;
  accessKey?: string;
  agent: string;
  onSaved: (b: BoardBooking) => void;
}) {
  const [status, setStatus] = useState<BookingStatus>(booking.status);
  const [note, setNote] = useState(booking.note ?? "");
  const [result, setResult] = useState<"saved" | "failed" | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const dirty = status !== booking.status || note !== (booking.note ?? "");

  // Pick up changes made by someone else, unless this card is being edited.
  useEffect(() => {
    if (!dirty) {
      setStatus(booking.status);
      setNote(booking.note ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.status, booking.note]);

  const save = () => {
    const form = new FormData();
    form.set("id", booking.id);
    form.set("status", status);
    form.set("note", note);
    form.set("agent", agent);
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
          updatedAt: at,
          history: [...booking.history, { status, at, agent: agent || undefined }],
        });
      }
      setTimeout(() => setResult(null), 2500);
    });
  };

  const style = STATUS_STYLE[booking.status];

  return (
    <li className={`card min-w-0 p-4 ${booking.status === "new" ? "ring-2 ring-primary-300" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-extrabold text-ink-950">{booking.name}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {labels.receivedAt} {formatWhen(booking.createdAt, locale)}
            </span>
            {booking.source && (
              <span>
                · {labels.fromPage} {booking.source}
              </span>
            )}
          </p>
        </div>
        <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${style.badge}`}>
          {labels.statuses[booking.status]}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-ink-50 px-3 py-2.5">
        <a href={telHref(booking.phone)} dir="ltr" className="basis-full text-start text-lg font-extrabold tabular-nums text-ink-950 hover:text-primary-700 rtl:text-end sm:me-auto sm:basis-auto">
          {booking.phone}
        </a>
        <a
          href={telHref(booking.phone)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink-900 px-3 text-xs font-bold text-white hover:bg-ink-800"
        >
          <Phone className="h-4 w-4" />
          {labels.call}
        </a>
        <a
          href={whatsappHref(booking.phone)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary-500 px-3 text-xs font-bold text-white hover:bg-primary-600"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4">
            <path d={SOCIAL_ICON_PATHS.whatsapp} />
          </svg>
          {labels.whatsapp}
        </a>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(booking.phone);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              // Clipboard blocked; the number is on screen anyway.
            }
          }}
          title={copied ? labels.copied : labels.copy}
          aria-label={copied ? labels.copied : labels.copy}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-white hover:text-primary-700"
        >
          {copied ? <Check className="h-4 w-4 text-primary-600" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
        <div className="flex items-center gap-1.5 text-ink-700">
          <Stethoscope className="h-4 w-4 flex-shrink-0 text-primary-600" />
          <dt className="sr-only">{labels.department}</dt>
          <dd className="truncate font-semibold">{booking.department}</dd>
        </div>
        {booking.doctor && (
          <div className="flex items-center gap-1.5 text-ink-700">
            <UserRound className="h-4 w-4 flex-shrink-0 text-primary-600" />
            <dt className="sr-only">{labels.doctor}</dt>
            <dd className="truncate">{booking.doctor}</dd>
          </div>
        )}
      </dl>

      <div className="mt-4 grid gap-2 border-t border-ink-100 pt-4 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as BookingStatus)}
          aria-label={labels.statuses[status]}
          className="input !py-2 text-sm font-semibold"
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {labels.statuses[s]}
            </option>
          ))}
        </select>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          placeholder={labels.notePlaceholder}
          aria-label={labels.note}
          className="input !py-2 text-sm"
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-ink-400">
          {booking.updatedAt && (
            <>
              {formatWhen(booking.updatedAt, locale)}
              {booking.agent && ` · ${labels.updatedBy} ${booking.agent}`}
            </>
          )}
        </span>
        <div className="flex items-center gap-2">
          {result && (
            <span className={`text-xs font-semibold ${result === "saved" ? "text-primary-700" : "rounded-md bg-accent-100 px-2 py-0.5 text-ink-900"}`}>
              {result === "saved" ? labels.saved : labels.saveFailed}
            </span>
          )}
          <button
            type="button"
            onClick={save}
            disabled={pending || !dirty}
            className="btn-primary !px-4 !py-2 text-sm disabled:opacity-40"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {labels.save}
          </button>
        </div>
      </div>

      {booking.history.length > 0 && (
        <details className="group mt-2">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-semibold text-ink-500 hover:text-primary-700 [&::-webkit-details-marker]:hidden">
            <History className="h-3.5 w-3.5" />
            {labels.history} ({booking.history.length})
            <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
          </summary>
          <ol className="mt-2 space-y-1 border-s-2 border-ink-100 ps-3 text-xs text-ink-600">
            {[...booking.history].reverse().map((h, i) => (
              <li key={i}>
                <span className="font-semibold">{labels.statuses[h.status]}</span> — {formatWhen(h.at, locale)}
                {h.agent && ` · ${h.agent}`}
              </li>
            ))}
          </ol>
        </details>
      )}
    </li>
  );
}

/** The call center's list of booking requests, with status updates. */
export function BookingsBoard({
  bookings: initial,
  departments,
  locale,
  labels,
  accessKey,
}: {
  bookings: BoardBooking[];
  departments: { id: string; name: string }[];
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
      if (period === "today" && riyadhDay(b.createdAt) !== today) return false;
      if (period === "week" && new Date(b.createdAt).getTime() < weekAgo) return false;
      const haystack = normalize(`${b.name} ${b.phone} ${b.phone.replace(/^0/, "966")}`);
      return terms.every((t) => haystack.includes(t));
    });
  }, [bookings, statusFilter, department, period, query]);

  return (
    <div>
      <div className="card p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter("")}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
              statusFilter === "" ? "bg-ink-950 text-white" : "bg-ink-50 text-ink-700 hover:bg-ink-100"
            }`}
          >
            {labels.all} <span className="opacity-70">({bookings.length})</span>
          </button>
          {STATUS_ORDER.map((s) => (
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
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
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
        <ul className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {results.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              locale={locale}
              labels={labels}
              accessKey={accessKey}
              agent={agent}
              onSaved={(updated) => setBookings((all) => all.map((x) => (x.id === updated.id ? updated : x)))}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
