"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { CalendarCheck, CheckCircle2, Loader2, Phone } from "lucide-react";
import { submitBookingAction, type BookingFormState } from "@/lib/bookingActions";
import { telHref } from "@/lib/phone";

export type BookingFormLabels = {
  name: string;
  phone: string;
  phonePlaceholder: string;
  department: string;
  departmentAny: string;
  doctor: string;
  doctorAny: string;
  submit: string;
  sending: string;
  successTitle: string;
  successBody: string;
  another: string;
  errorName: string;
  errorPhone: string;
  errorServer: string;
  orCall: string;
  privacy: string;
  bookingPhone: string;
};

function Submit({ labels }: { labels: BookingFormLabels }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full justify-center py-3.5 text-base disabled:opacity-70">
      {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CalendarCheck className="h-5 w-5" />}
      {pending ? labels.sending : labels.submit}
    </button>
  );
}

type FormProps = {
  departments: { id: string; name: string }[];
  labels: BookingFormLabels;
  /** Page the form is on, saved with the request. */
  source: string;
  defaultDepartmentId?: string;
  /** On a doctor's page: doctors to choose from, with this one preselected. */
  doctors?: { id: string; name: string }[];
  defaultDoctorId?: string;
  className?: string;
};

/** Appointment request: name, Saudi mobile and department. */
export function BookingForm(props: FormProps) {
  // A new key gives a fresh, empty form for "send another request".
  const [round, setRound] = useState(0);
  return <BookingFormInner key={round} {...props} onAnother={() => setRound((r) => r + 1)} />;
}

function BookingFormInner({
  departments,
  labels,
  source,
  defaultDepartmentId = "",
  doctors,
  defaultDoctorId = "",
  className = "",
  onAnother,
}: FormProps & { onAnother: () => void }) {
  const [state, formAction] = useFormState<BookingFormState, FormData>(submitBookingAction, { ok: false });
  const [shownAt, setShownAt] = useState(0);

  // Set on the client so the spam timer starts when a person sees the form.
  useEffect(() => setShownAt(Date.now()), []);

  const error = !state.ok ? state.error : undefined;

  if (state.ok) {
    return (
      <div className={`card p-6 text-center sm:p-8 ${className}`} role="status">
        <CheckCircle2 className="mx-auto h-12 w-12 text-primary-500" />
        <p className="mt-4 text-xl font-extrabold text-ink-950">{labels.successTitle}</p>
        <p className="mt-2 text-ink-600">{labels.successBody}</p>
        <button type="button" onClick={onAnother} className="mt-5 text-sm font-semibold text-primary-700 hover:underline">
          {labels.another}
        </button>
      </div>
    );
  }

  const fieldError = (field: "name" | "phone") =>
    error === field ? (
      <p className="mt-1.5 text-xs font-semibold text-red-600">
        {field === "name" ? labels.errorName : labels.errorPhone}
      </p>
    ) : null;

  return (
    <form
      action={formAction}
      className={`card relative space-y-4 p-6 text-start sm:p-7 ${className}`}
      noValidate
    >
      <input type="hidden" name="t" value={shownAt > 0 ? shownAt : ""} />
      <input type="hidden" name="source" value={source} />
      {/* Left empty by people; bots tend to fill every field. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div>
        <label htmlFor={`bk-name-${source}`} className="label">{labels.name}</label>
        <input
          id={`bk-name-${source}`}
          name="name"
          required
          maxLength={80}
          autoComplete="name"
          className="input"
          aria-invalid={error === "name" || undefined}
        />
        {fieldError("name")}
      </div>

      <div>
        <label htmlFor={`bk-phone-${source}`} className="label">{labels.phone}</label>
        <input
          id={`bk-phone-${source}`}
          name="phone"
          type="tel"
          inputMode="tel"
          required
          maxLength={20}
          autoComplete="tel"
          dir="ltr"
          placeholder={labels.phonePlaceholder}
          className="input text-start rtl:text-end"
          aria-invalid={error === "phone" || undefined}
        />
        {fieldError("phone")}
      </div>

      <div>
        <label htmlFor={`bk-dept-${source}`} className="label">{labels.department}</label>
        <select
          id={`bk-dept-${source}`}
          name="departmentId"
          defaultValue={defaultDepartmentId}
          className="input"
        >
          <option value="">{labels.departmentAny}</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {doctors && doctors.length > 0 && (
        <div>
          <label htmlFor={`bk-doctor-${source}`} className="label">{labels.doctor}</label>
          <select
            id={`bk-doctor-${source}`}
            name="doctorId"
            defaultValue={defaultDoctorId}
            className="input"
          >
            <option value="">{labels.doctorAny}</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {error === "server" && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{labels.errorServer}</p>
      )}

      <Submit labels={labels} />

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-4 text-sm">
        <span className="text-ink-500">{labels.orCall}</span>
        <a href={telHref(labels.bookingPhone)} className="inline-flex items-center gap-1.5 font-bold text-primary-700 hover:text-primary-800">
          <Phone className="h-4 w-4" />
          <span dir="ltr">{labels.bookingPhone}</span>
        </a>
      </div>
      <p className="text-xs text-ink-400">{labels.privacy}</p>
    </form>
  );
}
