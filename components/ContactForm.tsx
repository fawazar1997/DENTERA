"use client";

import { useState, type FormEvent } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import type { Dictionary } from "@/lib/dictionaries";

export function ContactForm({ dict }: { dict: Dictionary }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const formData = new FormData(e.currentTarget);
    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData)),
      });
    } finally {
      setStatus("sent");
      e.currentTarget.reset();
    }
  }

  if (status === "sent") {
    return (
      <div className="card flex flex-col items-center gap-3 p-10 text-center">
        <CheckCircle2 className="h-10 w-10 text-primary-600" />
        <p className="font-semibold text-ink-900">{dict.contact.formSubmit}</p>
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
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="phone">
            {dict.contact.formPhone}
          </label>
          <input id="phone" name="phone" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="email">
            {dict.contact.formEmail}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="input"
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="message">
          {dict.contact.formMessage}
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={4}
          className="input"
        />
      </div>
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
