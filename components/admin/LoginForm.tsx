"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Lock, LogIn } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";

export function LoginForm({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push(`/${locale}/admin`);
    } else {
      setError(true);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card w-full max-w-sm p-8">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-700">
        <Lock className="h-6 w-6" />
      </div>
      <h1 className="mt-5 text-center text-xl font-extrabold text-ink-950">
        {dict.admin.loginTitle}
      </h1>
      <p className="mt-1.5 text-center text-sm text-ink-500">
        {dict.admin.loginSubtitle}
      </p>

      <div className="mt-6">
        <label className="label" htmlFor="password">
          {dict.admin.password}
        </label>
        <input
          id="password"
          type="password"
          required
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
        />
        {error && (
          <p className="mt-2 text-sm font-medium text-red-600">
            {dict.admin.invalidPassword}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary mt-6 w-full disabled:opacity-60"
      >
        <LogIn className="h-4 w-4" />
        {dict.admin.signIn}
      </button>
    </form>
  );
}
