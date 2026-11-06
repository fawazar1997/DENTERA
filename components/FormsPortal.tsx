"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Inbox,
  Loader2,
  MapPin,
  Search,
  Send,
} from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { FormsText } from "@/lib/formsText";
import {
  cancelArchiveUploadAction,
  finishArchiveUploadAction,
  startArchiveUploadAction,
  uploadArchiveFileAction,
} from "@/lib/archiveActions";

export type PortalBranch = {
  id: string;
  name: string;
  /** Next outgoing letter number, e.g. ABH-2026-0061. */
  nextNumber: string;
  ready: { outgoing: boolean; incoming: boolean };
};
export type PortalForm = { id: string; branch: string; nameAr: string; nameEn: string; docId: string };
export type PortalEntry = {
  id: string;
  kind: "outgoing" | "incoming";
  branch: string;
  number?: string;
  title: string;
  party?: string;
  letterNo?: string;
  department: string;
  letterDate: string;
  driveLink?: string;
};

type Tab = "forms" | "outgoing" | "incoming" | "log";

const BRANCH_KEY = "dentera-forms-branch";
const EMPLOYEE_KEY = "dentera-employee-no";
const SERVER_FALLBACK_LIMIT = 4 * 1024 * 1024;

/** File types by extension, for phones that send no type (e.g. HEIC photos). */
const TYPE_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

/** Today in Saudi time, YYYY-MM-DD. */
function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date());
}

function CopyButton({ value, t }: { value: string; t: FormsText }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          // Clipboard blocked: the number is on screen to copy by hand.
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-bold text-ink-800 hover:border-primary-400"
    >
      {done ? <Check className="h-4 w-4 text-primary-600" /> : <Copy className="h-4 w-4" />}
      {done ? t.copied : t.copy}
    </button>
  );
}

/** Sends a file to a Google upload session, reporting progress; resolves with the file id. */
function putToDrive(url: string, file: File, type: string, onProgress: (p: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      try {
        const id = JSON.parse(xhr.responseText)?.id;
        if (xhr.status >= 200 && xhr.status < 300 && id) resolve(id);
        else reject(new Error(`drive ${xhr.status}`));
      } catch {
        reject(new Error("drive response"));
      }
    };
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(file);
  });
}

function LetterForm({
  kind,
  branch,
  accessKey,
  departments,
  t,
  onDone,
}: {
  kind: "outgoing" | "incoming";
  branch: PortalBranch;
  accessKey: string;
  departments: string[];
  t: FormsText;
  onDone: () => void;
}) {
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  // `expected`: the number shown when the form was sent (the page's next
  // number moves on as soon as the letter is saved).
  const [result, setResult] = useState<{ number?: string; link?: string; expected?: string } | null>(null);
  const [employeeNo, setEmployeeNo] = useState("");
  const [formKey, setFormKey] = useState(0);
  const sending = progress !== null;

  useEffect(() => {
    try {
      setEmployeeNo(localStorage.getItem(EMPLOYEE_KEY) ?? "");
    } catch {
      // No storage: typed each time.
    }
  }, []);

  if (!branch.ready[kind]) {
    return <p className="rounded-xl bg-accent-50 px-4 py-4 text-sm font-semibold text-ink-800">{t.errNotSetUp}</p>;
  }

  if (result) {
    return (
      <div className="card p-6 text-center" role="status">
        <Check className="mx-auto h-10 w-10 text-primary-600" />
        <p className="mt-3 text-lg font-extrabold text-ink-950">{kind === "outgoing" ? t.doneOutgoing : t.doneIncoming}</p>
        {result.number && (
          <>
            <p dir="ltr" className="mt-2 text-3xl font-extrabold tracking-wide text-primary-700">
              {result.number}
            </p>
            {result.expected && result.number !== result.expected && (
              <p className="mx-auto mt-2 max-w-md rounded-lg bg-accent-50 px-3 py-2 text-sm text-ink-800">{t.numberChanged}</p>
            )}
            <div className="mt-3 flex justify-center">
              <CopyButton value={result.number} t={t} />
            </div>
          </>
        )}
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {result.link && (
            <a href={result.link} target="_blank" rel="noreferrer" className="btn-outline">
              <ExternalLink className="h-4 w-4" />
              {t.openFile}
            </a>
          )}
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setResult(null);
              setFormKey((k) => k + 1);
              onDone();
            }}
          >
            {t.another}
          </button>
        </div>
      </div>
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return setError(t.errFields);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const type = file.type || TYPE_BY_EXT[ext] || "";
    form.delete("file");
    form.set("key", accessKey);
    form.set("kind", kind);
    form.set("branch", branch.id);
    form.set("fileName", file.name);
    form.set("mimeType", type);
    form.set("size", String(file.size));
    if (kind === "outgoing") {
      try {
        localStorage.setItem(EMPLOYEE_KEY, String(form.get("employeeNo") ?? ""));
      } catch {
        // Not remembered.
      }
    }

    const expected = branch.nextNumber;
    setProgress(0);
    const start = await startArchiveUploadAction(form).catch(() => ({ ok: false as const, error: "drive" as const }));
    if (!start.ok) {
      setProgress(null);
      const messages = { key: t.errKey, fields: t.errFields, file: t.errFile, "not-set-up": t.errNotSetUp, drive: t.errDrive, busy: t.errBusy };
      return setError(messages[start.error]);
    }
    let saved: { number?: string; link?: string } | null = null;
    try {
      // Straight to Google, so big scans don't pass through the site.
      const driveFileId = await putToDrive(start.uploadUrl, file, type, setProgress);
      const done = await finishArchiveUploadAction({ key: accessKey, entryId: start.entryId, driveFileId });
      if (done.ok) saved = done;
    } catch {
      // Browser couldn't reach Google directly: let the server forward it.
      if (file.size <= SERVER_FALLBACK_LIMIT) {
        const fallback = new FormData();
        fallback.set("key", accessKey);
        fallback.set("entryId", start.entryId);
        fallback.set("file", file);
        const done = await uploadArchiveFileAction(fallback).catch(() => ({ ok: false as const }));
        if (done.ok) saved = done;
      }
    }
    setProgress(null);
    if (!saved) {
      await cancelArchiveUploadAction({ key: accessKey, entryId: start.entryId }).catch(() => undefined);
      return setError(t.errDrive);
    }
    setResult({ number: saved.number ?? start.number, link: saved.link, expected: kind === "outgoing" ? expected : undefined });
  }

  const field = "block";
  const req = <span className="text-accent-700"> *</span>;

  return (
    <form key={formKey} onSubmit={submit} className="card space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-extrabold text-ink-950">{kind === "outgoing" ? t.outgoingTitle : t.incomingTitle}</h2>
        <p className="mt-1 text-sm text-ink-500">{t.formHint}</p>
      </div>

      {kind === "outgoing" && (
        <div className="rounded-xl2 border border-primary-200 bg-primary-50/60 p-4">
          <p className="text-sm font-bold text-ink-700">{t.letterNumber} — {t.nextNumber}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <input
              readOnly
              value={branch.nextNumber}
              dir="ltr"
              aria-label={t.letterNumber}
              className="input max-w-[14rem] cursor-default text-center text-xl font-extrabold tracking-wide text-primary-700"
            />
            <CopyButton value={branch.nextNumber} t={t} />
          </div>
          <p className="mt-2 text-xs text-ink-500">{t.numberHint}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {kind === "incoming" && (
          <label className={field}>
            <span className="label">{t.party}{req}</span>
            <input name="party" required maxLength={200} className="input" />
          </label>
        )}
        {kind === "incoming" && (
          <label className={field}>
            <span className="label">{t.letterNumber}{req}</span>
            <input name="letterNo" required maxLength={60} className="input" />
          </label>
        )}
        <label className={field}>
          <span className="label">{kind === "outgoing" ? t.department : t.departmentIn}{req}</span>
          <select name="department" required defaultValue="" className="input">
            <option value="" disabled>
              {t.choose}
            </option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        {kind === "outgoing" && (
          <label className={field}>
            <span className="label">{t.employeeNo}{req}</span>
            <input
              name="employeeNo"
              required
              maxLength={40}
              value={employeeNo}
              onChange={(e) => setEmployeeNo(e.target.value)}
              dir="ltr"
              className="input"
            />
          </label>
        )}
        <label className={`${field} sm:col-span-2`}>
          <span className="label">{t.letterTitle}{req}</span>
          <input name="title" required maxLength={200} className="input" />
        </label>
        {kind === "outgoing" && (
          <label className={field}>
            <span className="label">{t.letterType}{req}</span>
            <input name="letterType" required maxLength={100} className="input" />
          </label>
        )}
        <label className={field}>
          <span className="label">{t.letterDate}{req}</span>
          <input name="letterDate" type="date" required defaultValue={today()} dir="ltr" className="input" />
        </label>
      </div>

      <label className="block">
        <span className="label">{t.attachment}{req}</span>
        <input
          name="file"
          type="file"
          required
          accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.doc,.docx,application/pdf,image/*"
          className="input"
        />
        <span className="mt-1 block text-xs text-ink-400">{t.attachmentHint}</span>
      </label>

      {error && (
        <p role="alert" className="rounded-lg bg-accent-100 px-3 py-2 text-sm font-bold text-ink-900">
          {error}
        </p>
      )}

      <button type="submit" disabled={sending} className="btn-primary w-full justify-center py-3 disabled:opacity-70">
        {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        {sending ? `${t.sending} ${Math.round((progress ?? 0) * 100)}%` : t.send}
      </button>
    </form>
  );
}

/** The staff forms page: branch → forms, outgoing/incoming letter forms, and the log. */
export function FormsPortal({
  accessKey,
  locale,
  branches,
  forms,
  entries,
  departmentsOut,
  departmentsIn,
  t,
}: {
  accessKey: string;
  locale: Locale;
  branches: PortalBranch[];
  forms: PortalForm[];
  entries: PortalEntry[];
  departmentsOut: string[];
  departmentsIn: string[];
  t: FormsText;
}) {
  const router = useRouter();
  const ar = locale === "ar";
  const [branchId, setBranchId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("forms");
  const [query, setQuery] = useState("");
  const [logKind, setLogKind] = useState<"outgoing" | "incoming">("outgoing");
  const [logQuery, setLogQuery] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(BRANCH_KEY);
      if (saved && branches.some((b) => b.id === saved)) setBranchId(saved);
    } catch {
      // Chosen each visit.
    }
  }, [branches]);

  const choose = (id: string | null) => {
    setBranchId(id);
    try {
      if (id) localStorage.setItem(BRANCH_KEY, id);
      else localStorage.removeItem(BRANCH_KEY);
    } catch {
      // Not remembered.
    }
  };

  const branch = branches.find((b) => b.id === branchId);

  const shownForms = useMemo(() => {
    const terms = normalize(query).split(" ").filter(Boolean);
    return forms
      .filter((f) => branch && (f.branch === branch.id || f.branch === "both"))
      .filter((f) => terms.every((w) => normalize(`${f.nameAr} ${f.nameEn}`).includes(w)));
  }, [forms, branch, query]);

  const shownLog = useMemo(() => {
    const terms = normalize(logQuery).split(" ").filter(Boolean);
    return entries
      .filter((e) => branch && e.branch === branch.id && e.kind === logKind)
      .filter((e) =>
        terms.every((w) =>
          normalize(`${e.number ?? ""} ${e.title} ${e.party ?? ""} ${e.letterNo ?? ""} ${e.department}`).includes(w)
        )
      );
  }, [entries, branch, logKind, logQuery]);

  if (!branch) {
    return (
      <div className="mx-auto max-w-xl">
        <h1 className="text-center text-xl font-extrabold text-ink-950">{t.chooseBranch}</h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {branches.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => choose(b.id)}
              className="card flex flex-col items-center gap-3 p-8 text-lg font-extrabold text-ink-950 transition hover:-translate-y-0.5 hover:border-primary-300"
            >
              <MapPin className="h-8 w-8 text-primary-600" />
              {b.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof FileText }[] = [
    { id: "forms", label: t.tabForms, icon: FileText },
    { id: "outgoing", label: t.tabOutgoing, icon: Send },
    { id: "incoming", label: t.tabIncoming, icon: Inbox },
    { id: "log", label: t.tabLog, icon: Search },
  ];
  const doc = (id: string, path: string) => `https://docs.google.com/document/d/${id}/${path}`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink-950">
          <MapPin className="h-5 w-5 text-primary-600" />
          {branch.name}
        </h1>
        <button type="button" onClick={() => choose(null)} className="text-sm font-semibold text-primary-700 hover:underline">
          {t.changeBranch}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
              tab === id ? "bg-ink-950 text-white" : "bg-white text-ink-700 ring-1 ring-ink-100 hover:bg-ink-50"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {!branch.ready.outgoing && !branch.ready.incoming && tab === "forms" && (
        <p className="mt-4 rounded-xl bg-ink-50 px-4 py-3 text-xs text-ink-500">{t.notSetUpBanner}</p>
      )}

      <div className="mt-5">
        {tab === "forms" && (
          <div>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400 ltr:left-3 rtl:right-3" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.searchForms}
                className="input ltr:pl-10 rtl:pr-10"
              />
            </div>
            {shownForms.length === 0 ? (
              <p className="mt-6 rounded-xl bg-ink-50 px-4 py-6 text-center text-ink-500">{t.noForms}</p>
            ) : (
              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {shownForms.map((f) => (
                  <li key={f.id} className="card flex flex-col gap-3 p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                        <FileText className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-extrabold text-ink-950">{ar ? f.nameAr : f.nameEn || f.nameAr}</p>
                        <p className="text-xs text-ink-500">{ar ? f.nameEn : f.nameAr}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a href={doc(f.docId, "copy")} target="_blank" rel="noreferrer" className="btn-primary px-4 py-2 text-sm">
                        <Copy className="h-4 w-4" />
                        {t.fillCopy}
                      </a>
                      <a href={doc(f.docId, "export?format=docx")} className="btn-outline px-3 py-2 text-sm">
                        <Download className="h-4 w-4" />
                        {t.word}
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {(tab === "outgoing" || tab === "incoming") && (
          <LetterForm
            key={`${branch.id}-${tab}`}
            kind={tab}
            branch={branch}
            accessKey={accessKey}
            departments={tab === "outgoing" ? departmentsOut : departmentsIn}
            t={t}
            onDone={() => router.refresh()}
          />
        )}

        {tab === "log" && (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {(["outgoing", "incoming"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setLogKind(k)}
                  className={`rounded-full px-4 py-1.5 text-sm font-bold ${
                    logKind === k ? "bg-ink-950 text-white" : "bg-ink-50 text-ink-700 hover:bg-ink-100"
                  }`}
                >
                  {k === "outgoing" ? t.logOutgoing : t.logIncoming}
                </button>
              ))}
            </div>
            <input
              type="search"
              value={logQuery}
              onChange={(e) => setLogQuery(e.target.value)}
              placeholder={t.searchLog}
              className="input mt-3"
            />
            {shownLog.length === 0 ? (
              <p className="mt-6 rounded-xl bg-ink-50 px-4 py-6 text-center text-ink-500">{t.noLog}</p>
            ) : (
              <ul className="card mt-4 divide-y divide-ink-100 overflow-hidden">
                {shownLog.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-ink-900">
                        {e.number && (
                          <span dir="ltr" className="me-2 text-primary-700">
                            {e.number}
                          </span>
                        )}
                        {e.title}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-500">
                        {[e.party, e.letterNo, e.department, e.letterDate].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    {e.driveLink && (
                      <a
                        href={e.driveLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex flex-shrink-0 items-center gap-1 text-sm font-semibold text-primary-700 hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Drive
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
