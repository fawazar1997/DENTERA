"use client";

import { useState, type FormEvent } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import type { Department } from "@/lib/types";

export function ContactForm({
  dict,
  locale,
  departments,
}: {
  dict: Dictionary;
  locale: Locale;
  departments: Department[];
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData)),
      });
      if (!res.ok) throw new Error("request failed");
      setStatus("sent");
      e.currentTarget.reset();
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="card flex flex-col items-center gap-3 p-10 text-center">
        <CheckCircle2 className="h-10 w-10 text-primary-600" />
        <p className="font-semibold text-ink-900">
          {dict.contact.formSuccessMessage}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5 p-7">
      <div>
        <label className="label" htmlFor="name">
          {dict.contact.formName}
        </label>
        <input id="name" name="name" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="mobile">
          {dict.contact.formMobile}
        </label>
        <input
          id="mobile"
          name="mobile"
          type="tel"
          dir="ltr"
          required
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="departmentId">
          {dict.contact.formDepartment}
        </label>
        <select id="departmentId" name="departmentId" required className="input">
          <option value="">{dict.contact.formDepartmentPlaceholder}</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {locale === "ar" ? department.nameAr : department.nameEn}
            </option>
          ))}
        </select>
      </div>
      {status === "error" && (
        <p className="text-sm font-medium text-red-600">
          {dict.common.errorTryAgain}
        </p>
      )}
      <button
        type="submit"
        disabled={status === "sending"}
        className="btn-primary w-full disabled:opacity-60"
      >
        <Send className="h-4 w-4" />
        {dict.contact.formSubmit}
      </button>
    </form>
  );
}
