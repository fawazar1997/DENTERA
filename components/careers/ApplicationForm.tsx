"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, Loader2, Paperclip, Send } from "lucide-react";
import { careersText } from "@/lib/careersText";
import type { Locale } from "@/lib/i18n";
import {
  CERTIFICATE_TYPES,
  CV_TYPES,
  LANGUAGES,
  MAX_CERTIFICATES_BYTES,
  MAX_CV_BYTES,
  NATIONALITIES,
  QUALIFICATIONS,
  SCFHS_STATUSES,
  isSaudi,
} from "@/lib/careersTypes";
import { finishApplicationAction, startApplicationAction, uploadApplicationFileAction } from "@/lib/careersActions";
import { putToDrive } from "@/lib/putToDrive";

type FieldOption = { id: string; name: string; clinical: boolean; specialty: boolean };

type Answers = {
  name: string;
  gender: string;
  nationality: string;
  nationalityOther: string;
  mobile: string;
  email: string;
  city: string;
  birthDate: string;
  fieldId: string;
  specialty: string;
  languages: string[];
  years: string;
  qualification: string;
  university: string;
  gradYear: string;
  scfhs: string;
  licenseNo: string;
  transfer: string;
  linkedin: string;
  note: string;
  consent: boolean;
};

const EMPTY: Answers = {
  name: "",
  gender: "",
  nationality: "",
  nationalityOther: "",
  mobile: "",
  email: "",
  city: "",
  birthDate: "",
  fieldId: "",
  specialty: "",
  languages: ["العربية"],
  years: "",
  qualification: "",
  university: "",
  gradYear: "",
  scfhs: "",
  licenseNo: "",
  transfer: "",
  linkedin: "",
  note: "",
  consent: false,
};

const SAUDI_MOBILE = /^(?:\+?966|0)?5\d{8}$/;

/** The careers application form, in steps; files go straight to Google Drive. */
export function ApplicationForm({ locale, fields }: { locale: Locale; fields: FieldOption[] }) {
  const t = careersText(locale);
  const ar = locale === "ar";
  const Next = ar ? ArrowLeft : ArrowRight;
  const Prev = ar ? ArrowRight : ArrowLeft;
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>(EMPTY);
  const [cv, setCv] = useState<File | null>(null);
  const [cert, setCert] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [failure, setFailure] = useState("");
  const [done, setDone] = useState<{ ref: string } | null>(null);
  const shownAt = useRef(Date.now());
  const top = useRef<HTMLDivElement>(null);
  const field = fields.find((f) => f.id === a.fieldId);
  const nationality = a.nationality === "other" ? a.nationalityOther.trim() : a.nationality;
  const saudi = isSaudi(nationality);

  const set = <K extends keyof Answers>(key: K, value: Answers[K]) => {
    setA((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  function check(s: number): Record<string, string> {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (a.name.trim().split(/\s+/).length < 2) e.name = t.errors.name;
      if (!a.gender) e.gender = t.errors.gender;
      if (!nationality) e.nationality = t.errors.nationality;
      if (!SAUDI_MOBILE.test(a.mobile.replace(/[\s-]/g, "").replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)))) e.mobile = t.errors.mobile;
      if (a.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a.email.trim())) e.email = t.errors.email;
      if (!a.city.trim()) e.city = t.errors.city;
    }
    if (s === 1 && !a.fieldId) e.fieldId = t.errors.field;
    if (s === 2) {
      if (a.years === "" || !(Number(a.years) >= 0 && Number(a.years) <= 60)) e.years = t.errors.years;
      if (!a.qualification) e.qualification = t.errors.qualification;
      if (field?.clinical && !a.scfhs) e.scfhs = t.errors.scfhs;
    }
    if (s === 3) {
      if (!cv || !CV_TYPES[cv.type] || cv.size > MAX_CV_BYTES) e.cv = t.errors.cv;
      if (cert && (!CERTIFICATE_TYPES[cert.type] || cert.size > MAX_CERTIFICATES_BYTES)) e.certificates = t.errors.certificates;
    }
    if (s === 4 && !a.consent) e.consent = t.errors.consent;
    return e;
  }

  function go(to: number) {
    if (to > step) {
      const e = check(step);
      if (Object.keys(e).length) return setErrors(e);
    }
    setStep(to);
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function sendFile(id: string, url: string, file: File, kind: "cv" | "certificates", from: number, share: number) {
    try {
      return await putToDrive(url, file, file.type, (p) => setBusy(`${t.uploading} ${Math.round((from + p * share) * 100)}%`));
    } catch {
      // The browser couldn't reach Google: through the site instead (small files).
      const form = new FormData();
      form.set("id", id);
      form.set("kind", kind);
      form.set("file", file);
      const r = await uploadApplicationFileAction(form);
      if (!r.ok) throw new Error("upload");
      return r.fileId;
    }
  }

  async function submit() {
    const e = check(4);
    if (Object.keys(e).length) return setErrors(e);
    setFailure("");
    setBusy(t.sending);
    try {
      const start = await startApplicationAction({
        name: a.name,
        gender: a.gender,
        nationality,
        mobile: a.mobile,
        email: a.email,
        city: a.city,
        birthDate: a.birthDate,
        fieldId: a.fieldId,
        specialty: a.specialty,
        languages: a.languages,
        years: a.years,
        qualification: a.qualification,
        university: a.university,
        gradYear: a.gradYear,
        scfhs: a.scfhs,
        licenseNo: a.licenseNo,
        transfer: a.transfer,
        linkedin: a.linkedin,
        note: a.note,
        consent: a.consent,
        cv: { name: cv!.name, type: cv!.type, size: cv!.size },
        certificates: cert ? { name: cert.name, type: cert.type, size: cert.size } : null,
        website: (document.getElementById("careers-website") as HTMLInputElement | null)?.value,
        shownAt: shownAt.current,
      });
      if (!start.ok) {
        const msg = (t.errors as Record<string, string>)[start.error] ?? t.errors.server;
        setBusy("");
        setFailure(msg);
        if (start.field) {
          setErrors({ [start.field]: msg });
          const fieldStep: Record<string, number> = { name: 0, gender: 0, nationality: 0, mobile: 0, email: 0, city: 0, fieldId: 1, years: 2, qualification: 2, scfhs: 2, cv: 3, certificates: 3, consent: 4 };
          setStep(fieldStep[start.field] ?? step);
        }
        return;
      }
      if (!start.id) {
        setDone({ ref: "" });
        return;
      }
      const share = cert ? 0.5 : 1;
      const cvId = await sendFile(start.id, start.uploads.cv, cv!, "cv", 0, share);
      const certId = cert && start.uploads.certificates ? await sendFile(start.id, start.uploads.certificates, cert, "certificates", 0.5, 0.5) : undefined;
      const finished = await finishApplicationAction({ id: start.id, cv: cvId, certificates: certId });
      if (!finished.ok) throw new Error("finish");
      setDone({ ref: finished.ref });
      top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      setBusy("");
      setFailure(t.errors.server);
    }
  }

  if (done) {
    return (
      <div ref={top} className="card p-8 text-center sm:p-10">
        <CheckCircle2 className="mx-auto h-14 w-14 text-primary-500" />
        <h2 className="mt-4 text-2xl font-extrabold text-ink-950">{t.doneTitle}</h2>
        <p className="mx-auto mt-3 max-w-lg leading-relaxed text-ink-600">{t.doneBody}</p>
        {done.ref && (
          <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-2 text-sm font-bold text-ink-900">
            {t.doneRef}: <span dir="ltr">{done.ref}</span>
          </p>
        )}
      </div>
    );
  }

  const label = (text: string, optional = false) => (
    <span className="label">
      {text}
      {optional ? <span className="ms-1 text-xs font-normal text-ink-400">({t.optional})</span> : <span className="ms-0.5 text-accent-700">*</span>}
    </span>
  );
  const err = (key: string) =>
    errors[key] ? (
      <span role="alert" className="mt-1 block text-xs font-bold text-accent-800">
        {errors[key]}
      </span>
    ) : null;
  const choice = (key: keyof Answers, value: string, text: string) => (
    <button
      key={value}
      type="button"
      onClick={() => set(key, value as never)}
      aria-pressed={a[key] === value}
      className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
        a[key] === value ? "border-primary-500 bg-primary-50 text-ink-950" : "border-ink-200 bg-white text-ink-600 hover:border-primary-300"
      }`}
    >
      {text}
    </button>
  );

  return (
    <div ref={top} className="card scroll-mt-24 overflow-hidden">
      <div className="bg-ink-950 px-6 py-5 text-white sm:px-8">
        <h2 className="text-xl font-extrabold">{t.formTitle}</h2>
        <p className="mt-1 text-sm text-sand-200">
          {t.step} {step + 1} {t.of} {t.steps.length}: {t.steps[step]}
        </p>
        <div className="mt-4 grid grid-cols-5 gap-1.5" aria-hidden="true">
          {t.steps.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full ${i <= step ? "bg-primary-400" : "bg-white/15"}`} />
          ))}
        </div>
      </div>

      <div className="space-y-5 p-6 sm:p-8">
        {/* Honeypot: hidden from people, filled by bots. */}
        <input id="careers-website" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

        {step === 0 && (
          <>
            <label className="block">
              {label(t.name)}
              <input value={a.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" maxLength={80} className="input" />
              {err("name")}
            </label>
            <div>
              {label(t.gender)}
              <div className="flex flex-wrap gap-2">
                {choice("gender", "male", t.male)}
                {choice("gender", "female", t.female)}
              </div>
              {err("gender")}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                {label(t.nationality)}
                <select value={a.nationality} onChange={(e) => set("nationality", e.target.value)} className="input">
                  <option value="">—</option>
                  {NATIONALITIES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                  <option value="other">{t.otherNationality}</option>
                </select>
                {a.nationality === "other" && (
                  <input
                    value={a.nationalityOther}
                    onChange={(e) => set("nationalityOther", e.target.value)}
                    placeholder={t.nationalityOther}
                    aria-label={t.nationalityOther}
                    maxLength={40}
                    className="input mt-2"
                  />
                )}
                {err("nationality")}
              </label>
              <label className="block">
                {label(t.city)}
                <input value={a.city} onChange={(e) => set("city", e.target.value)} maxLength={60} className="input" />
                {err("city")}
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                {label(t.mobile)}
                <input
                  value={a.mobile}
                  onChange={(e) => set("mobile", e.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
                  dir="ltr"
                  placeholder={t.mobileHint}
                  className="input text-start"
                />
                {err("mobile")}
              </label>
              <label className="block">
                {label(t.email, true)}
                <input value={a.email} onChange={(e) => set("email", e.target.value)} type="email" autoComplete="email" dir="ltr" className="input text-start" />
                {err("email")}
              </label>
            </div>
            <label className="block sm:w-1/2">
              {label(t.birthDate, true)}
              <input value={a.birthDate} onChange={(e) => set("birthDate", e.target.value)} type="date" className="input" />
            </label>
          </>
        )}

        {step === 1 && (
          <>
            <div>
              {label(t.field)}
              <div className="grid gap-2 sm:grid-cols-2">
                {fields.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => set("fieldId", f.id)}
                    aria-pressed={a.fieldId === f.id}
                    className={`rounded-xl border px-4 py-3 text-start text-sm font-bold transition ${
                      a.fieldId === f.id ? "border-primary-500 bg-primary-50 text-ink-950" : "border-ink-200 bg-white text-ink-700 hover:border-primary-300"
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
              {err("fieldId")}
            </div>
            {field?.specialty && (
              <label className="block">
                {label(t.specialty, true)}
                <input value={a.specialty} onChange={(e) => set("specialty", e.target.value)} placeholder={t.specialtyPh} maxLength={80} className="input" />
              </label>
            )}
            <div>
              {label(t.languages, true)}
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((l) => {
                  const on = a.languages.includes(l);
                  return (
                    <button
                      key={l}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set("languages", on ? a.languages.filter((x) => x !== l) : [...a.languages, l])}
                      className={`rounded-full border px-3 py-1.5 text-sm font-bold transition ${
                        on ? "border-primary-500 bg-primary-50 text-ink-950" : "border-ink-200 text-ink-600"
                      }`}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                {label(t.years)}
                <input value={a.years} onChange={(e) => set("years", e.target.value.replace(/[^\d]/g, "").slice(0, 2))} inputMode="numeric" className="input" />
                {err("years")}
              </label>
              <label className="block">
                {label(t.qualification)}
                <select value={a.qualification} onChange={(e) => set("qualification", e.target.value)} className="input">
                  <option value="">—</option>
                  {QUALIFICATIONS.map((q) => (
                    <option key={q} value={q}>
                      {t.qualifications[q]}
                    </option>
                  ))}
                </select>
                {err("qualification")}
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                {label(t.university, true)}
                <input value={a.university} onChange={(e) => set("university", e.target.value)} maxLength={100} className="input" />
              </label>
              <label className="block">
                {label(t.gradYear, true)}
                <input value={a.gradYear} onChange={(e) => set("gradYear", e.target.value.replace(/[^\d]/g, "").slice(0, 4))} inputMode="numeric" className="input" />
              </label>
            </div>
            {field?.clinical && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  {label(t.scfhs)}
                  <select value={a.scfhs} onChange={(e) => set("scfhs", e.target.value)} className="input">
                    <option value="">—</option>
                    {SCFHS_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {t.scfhsStatuses[s]}
                      </option>
                    ))}
                  </select>
                  {err("scfhs")}
                </label>
                <label className="block">
                  {label(t.licenseNo, true)}
                  <input value={a.licenseNo} onChange={(e) => set("licenseNo", e.target.value)} dir="ltr" maxLength={40} className="input text-start" />
                </label>
              </div>
            )}
            {nationality && !saudi && (
              <div>
                {label(t.transfer, true)}
                <div className="flex gap-2">
                  {choice("transfer", "yes", t.yes)}
                  {choice("transfer", "no", t.no)}
                </div>
              </div>
            )}
            <label className="block">
              {label(t.linkedin, true)}
              <input value={a.linkedin} onChange={(e) => set("linkedin", e.target.value)} dir="ltr" placeholder="https://linkedin.com/in/…" className="input text-start" />
            </label>
            <label className="block">
              {label(t.note, true)}
              <textarea value={a.note} onChange={(e) => set("note", e.target.value)} rows={4} maxLength={1500} className="input" />
            </label>
          </>
        )}

        {step === 3 && (
          <>
            <FilePick
              label={label(t.cv)}
              hint={t.cvHint}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
              file={cv}
              onPick={(f) => (setCv(f), setErrors((p) => ({ ...p, cv: "" })))}
              choose={t.chooseFile}
            />
            {err("cv")}
            <FilePick
              label={label(t.certificates, true)}
              hint={t.certificatesHint}
              accept=".pdf,application/pdf"
              file={cert}
              onPick={(f) => (setCert(f), setErrors((p) => ({ ...p, certificates: "" })))}
              choose={t.chooseFile}
            />
            {err("certificates")}
          </>
        )}

        {step === 4 && (
          <>
            <dl className="grid gap-x-6 gap-y-3 rounded-xl bg-ink-50 p-5 text-sm sm:grid-cols-2">
              {[
                [t.name, a.name],
                [t.mobile, a.mobile],
                [t.nationality, nationality],
                [t.city, a.city],
                [t.field, field?.name ?? ""],
                [t.years, a.years],
                [t.qualification, a.qualification ? t.qualifications[a.qualification as keyof typeof t.qualifications] : ""],
                ...(field?.clinical ? [[t.scfhs, a.scfhs ? t.scfhsStatuses[a.scfhs as keyof typeof t.scfhsStatuses] : ""]] : []),
                [t.cv, cv?.name ?? ""],
                ...(cert ? [[t.certificates, cert.name]] : []),
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs font-bold text-ink-500">{k}</dt>
                  <dd className="mt-0.5 font-bold text-ink-900" dir="auto">
                    {v || "—"}
                  </dd>
                </div>
              ))}
            </dl>
            <label className="flex items-start gap-2.5 text-sm text-ink-700">
              <input type="checkbox" checked={a.consent} onChange={(e) => set("consent", e.target.checked)} className="mt-0.5 h-4 w-4 flex-shrink-0 accent-primary-600" />
              {t.consent}
            </label>
            {err("consent")}
          </>
        )}

        {failure && (
          <p role="alert" className="rounded-lg bg-accent-100 px-4 py-3 text-sm font-bold text-ink-900">
            {failure}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-ink-100 pt-5">
          {step > 0 ? (
            <button type="button" onClick={() => go(step - 1)} disabled={Boolean(busy)} className="btn-outline">
              <Prev className="h-4 w-4" /> {t.back}
            </button>
          ) : (
            <span />
          )}
          {step < 4 ? (
            <button type="button" onClick={() => go(step + 1)} className="btn-primary">
              {t.next} <Next className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={Boolean(busy)} className="btn-primary">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {busy || t.submit}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FilePick({
  label,
  hint,
  accept,
  file,
  onPick,
  choose,
}: {
  label: React.ReactNode;
  hint: string;
  accept: string;
  file: File | null;
  onPick: (f: File | null) => void;
  choose: string;
}) {
  return (
    <div>
      {label}
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-ink-200 bg-ink-50/50 px-4 py-6 text-center transition hover:border-primary-400">
        {file ? <FileText className="h-7 w-7 text-primary-600" /> : <Paperclip className="h-7 w-7 text-ink-400" />}
        <span className="text-sm font-bold text-ink-900">{file ? file.name : choose}</span>
        {file && <span className="text-xs text-ink-500" dir="ltr">{(file.size / 1024 / 1024).toFixed(1)} MB</span>}
        <span className="text-xs text-ink-500">{hint}</span>
        <input type="file" accept={accept} className="sr-only" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
      </label>
    </div>
  );
}
