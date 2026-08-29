# Dentera — Dental Clinic Website & Control Panel

A bilingual (English / Arabic, full RTL support) marketing website for a
dental clinic, plus a password-protected control panel for managing the
doctors and departments shown on the site.

Built with Next.js 14 (App Router), TypeScript and Tailwind CSS.

## Features

- **Public site**: Home, About, Departments, Doctors (filterable by
  department), Contact — available at `/en/...` and `/ar/...`.
- **Arabic support**: full RTL layout, mirrored navigation, Arabic
  typography, and a language switcher that preserves the current page.
- **Control panel** (`/en/admin` or `/ar/admin`): password-protected
  dashboard to add, edit, delete and hide/show doctors and departments,
  upload a doctor photo, and set the homepage banner image. Changes are
  reflected on the public site immediately, in both languages — photos
  aren't per-language, the same upload shows on `/en` and `/ar`.
- Data is stored in a local JSON file (`data/db.local.json`, generated
  on first run from `data/seed.json`) — no external database required.
- Photo uploads (doctor photos, homepage banner) go to Vercel Blob
  storage — see the environment variables section below.

## Getting started

```bash
npm install
cp .env.example .env.local   # then edit the values below
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/en`.

### Environment variables (`.env.local`)

| Variable | Description |
| --- | --- |
| `ADMIN_PASSWORD` | Password required to sign in to `/admin`. Defaults to `dentera-admin` if unset — **change this before deploying**. |
| `SESSION_SECRET` | Random string used to sign the admin session cookie. Use a long, random value in production. |
| `BLOB_READ_WRITE_TOKEN` | Enables photo uploads (doctor photos, homepage banner). Provided automatically once you enable **Vercel Blob** for this project (Vercel dashboard → your project → Storage → Create Database → Blob). Without it, the rest of the admin panel still works — photo upload attempts are skipped gracefully (logged, not an error) and the form saves everything else. |

### Using the control panel

1. Go to `/en/admin` (or `/ar/admin`).
2. Sign in with `ADMIN_PASSWORD`.
3. Use the **Doctors** and **Departments** tabs to add, edit, delete, or
   toggle visibility (the "Active" checkbox) of entries. Every entry has
   separate English and Arabic fields, plus an optional photo (Doctors)
   which is not localized — one upload, shown on both languages.
4. Use the **Site Settings** tab to upload or remove the homepage banner
   image.

## Production

```bash
npm run build
npm run start
```

Deploy this as a standard Node.js server (e.g. a VPS, Docker container, or
any platform that runs `next start`). Serve it over HTTPS — the admin
session cookie is marked `Secure` automatically whenever the incoming
request (or `X-Forwarded-Proto` from a reverse proxy) is HTTPS.

Because data is written to a local JSON file, this works best as a single
persistent Node.js process with a writable filesystem (a VPS, Docker
container, Railway, Render, etc.) — data survives restarts there.

### Deploying to Vercel (or another serverless/read-only host)

The app **won't crash** on a read-only filesystem — it automatically falls
back to writing into the OS temp directory instead of the project folder.
But that temp directory is **not persistent or shared**: it can reset on
the next cold start, a new instance, or a redeploy, so admin changes are
not reliably saved long-term. The public site works fully regardless.

To make the admin panel's changes actually persist on Vercel, swap the
storage in `lib/db.ts` for a real database — Vercel Postgres or Vercel KV
are the least-setup options (add one from the Vercel dashboard's Storage
tab; it injects the connection env vars automatically).

## Known limitations

- `next@14.2.35` is the latest patch release on the Next.js 14 line and
  fixes the critical middleware authorization-bypass advisory, but two
  lower-severity advisories (a Server Actions endpoint-disclosure issue,
  and a PostCSS advisory affecting attacker-supplied CSS) are only fixed
  in the Next.js 16 major release, which involves breaking API changes.
  Upgrading is recommended when convenient.
- The contact form currently logs submissions to the server console; wire
  `app/api/contact/route.ts` up to an email service or CRM for production
  use.
