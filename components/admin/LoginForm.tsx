"use client";

import { localePath } from "@/lib/i18n";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Lock, LogIn } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";

const ERROR_KEYS = {
  invalid_credentials: "invalidPassword",
  too_many_attempts: "tooManyAttempts",
  not_configured: "loginNotConfigured",
} as const;

export function LoginForm({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    }).catch(() => null);
    if (res?.ok) {
      // Full page load, not router.push: the client router may hold a
      // prefetched copy of /admin from before sign-in (a redirect back to
      // this login page) and would replay it.
      window.location.assign(localePath(locale, `/admin`));
      return;
    }
    const body = await res?.json().catch(() => null);
    const key = ERROR_KEYS[body?.error as keyof typeof ERROR_KEYS] ?? "invalidPassword";
    setError(dict.admin[key]);
    setPassword("");
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="card w-full max-w-sm p-8">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-ink-900">
        <Lock className="h-6 w-6" />
      </div>
      <h1 className="mt-5 text-center text-xl font-extrabold text-ink-950">
        {dict.admin.loginTitle}
      </h1>
      <p className="mt-1.5 text-center text-sm text-ink-500">
        {dict.admin.loginSubtitle}
      </p>

      <div className="mt-6">
        <label className="label" htmlFor="username">
          {dict.admin.username}
        </label>
        <input
          id="username"
          name="username"
          type="text"
          dir="ltr"
          required
          autoFocus
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="input"
        />
      </div>

      <div className="mt-4">
        <label className="label" htmlFor="password">
          {dict.admin.password}
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            dir="ltr"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input pe-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? dict.admin.hidePassword : dict.admin.showPassword}
            title={showPassword ? dict.admin.hidePassword : dict.admin.showPassword}
            className="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-ink-400 hover:text-ink-900"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-accent-100 px-3 py-2 text-sm font-bold text-ink-900">
          {error}
        </p>
      )}

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
