"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";
import { reassignBookingsAction } from "@/lib/bookingActions";

export type BulkReassignLabels = {
  title: string;
  hint: string;
  doctor: string;
  anyDoctor: string;
  from: string;
  anyExtension: string;
  branch: string;
  allBranches: string;
  to: string;
  openOnly: string;
  button: string;
  confirm: string;
  needFilter: string;
  done: string;
  failed: string;
};

/** Supervisor tool: move a doctor's (or an extension's) requests to another extension. */
export function BulkReassign({
  doctors,
  branches,
  extensions,
  accessKey,
  labels,
}: {
  doctors: { id: string; name: string }[];
  branches: { id: string; name: string }[];
  extensions: string[];
  accessKey?: string;
  labels: BulkReassignLabels;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!form.get("doctorId") && !form.get("from")) {
      setMessage({ text: labels.needFilter, error: true });
      return;
    }
    if (!window.confirm(labels.confirm.replace("{to}", String(form.get("to"))))) return;
    if (accessKey) form.set("key", accessKey);
    try {
      const agent = localStorage.getItem("dentera-agent-name");
      if (agent) form.set("agent", agent);
    } catch {
      // Storage blocked: the move is just recorded without a name.
    }
    setMessage(null);
    startTransition(async () => {
      const result = await reassignBookingsAction(form).catch(() => ({ ok: false, count: 0 }));
      if (!result.ok) {
        setMessage({ text: labels.failed, error: true });
        return;
      }
      setMessage({ text: `${labels.done} ${result.count ?? 0}` });
      router.refresh();
    });
  }

  return (
    <section className="card p-6">
      <h2 className="flex items-center gap-2 font-bold text-ink-900">
        <ArrowLeftRight className="h-5 w-5 text-primary-600" />
        {labels.title}
      </h2>
      <p className="mt-1 text-sm text-ink-500">{labels.hint}</p>
      <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="block">
          <span className="label">{labels.doctor}</span>
          <select name="doctorId" className="input" defaultValue="">
            <option value="">{labels.anyDoctor}</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">{labels.branch}</span>
          <select name="branchId" className="input" defaultValue="">
            <option value="">{labels.allBranches}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">{labels.from}</span>
          <select name="from" className="input" defaultValue="" dir="ltr">
            <option value="">{labels.anyExtension}</option>
            {extensions.map((ext) => (
              <option key={ext} value={ext}>
                {ext}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">{labels.to}</span>
          <select name="to" required className="input" defaultValue={extensions[0]} dir="ltr">
            {extensions.map((ext) => (
              <option key={ext} value={ext}>
                {ext}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-4 sm:col-span-2 xl:col-span-4">
          <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
            <input
              type="checkbox"
              name="openOnly"
              defaultChecked
              className="h-4 w-4 rounded border-ink-300"
            />
            {labels.openOnly}
          </label>
          <button type="submit" disabled={pending} className="btn-primary ms-auto disabled:opacity-60">
            {labels.button}
          </button>
        </div>
        {message && (
          <p
            role={message.error ? "alert" : "status"}
            className={`rounded-lg px-4 py-2 text-sm font-bold sm:col-span-2 xl:col-span-4 ${
              message.error ? "bg-accent-50 text-accent-800" : "bg-primary-100 text-ink-900"
            }`}
          >
            {message.text}
          </p>
        )}
      </form>
    </section>
  );
}
