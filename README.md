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
- **Appointment / contact requests**: the public Contact page collects
  name, mobile number and department, and saves each submission to the
  **Contact Requests** tab in the control panel (with an unread-count
  badge) so staff can see and follow up with patients — mark as
  contacted, or delete.
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
| `BLOB_STORE_ID` / `BLOB_READ_WRITE_TOKEN` | Set automatically when you connect a **Vercel Blob** store to the project (Vercel dashboard → project → Storage → Blob). Newer stores set `BLOB_STORE_ID` and sign in with OIDC; older ones set `BLOB_READ_WRITE_TOKEN` — either works. With Blob connected, photo uploads work **and** all control-panel data (doctors, departments, banner, contact requests) is saved in the store, so it persists across deploys and serverless instances. Without it, data is kept in a local JSON file (fine for development, not persistent on Vercel). |

### Using the control panel

1. Go to `/en/admin` (or `/ar/admin`).
2. Sign in with `ADMIN_PASSWORD`.
3. Use the **Doctors** and **Departments** tabs to add, edit, delete, or
   toggle visibility (the "Active" checkbox) of entries. Every entry has
   separate English and Arabic fields, plus an optional photo (Doctors)
   which is not localized — one upload, shown on both languages.
4. Use the **Site Settings** tab to upload or remove the homepage banner
   image (shown as a full-width strip at the top of the homepage).
5. Use the **Contact Requests** tab to see appointment/contact form
   submissions and mark them as contacted.

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

Connect a **Vercel Blob** store to the project (Storage → Blob). With it
connected, `lib/db.ts` saves all control-panel data as a JSON document in
the store (plus the uploaded photos), so changes persist across deploys and
are shared by every serverless instance. Page renders read it through
Next's data cache, which is invalidated on each save.

Without Blob, the app still runs (it falls back to the OS temp directory),
but changes made in the control panel are lost on the next cold start or
redeploy.

## Known limitations

- `next@14.2.35` is the latest patch release on the Next.js 14 line and
  fixes the critical middleware authorization-bypass advisory, but two
  lower-severity advisories (a Server Actions endpoint-disclosure issue,
  and a PostCSS advisory affecting attacker-supplied CSS) are only fixed
  in the Next.js 16 major release, which involves breaking API changes.
  Upgrading is recommended when convenient.
- All data is one JSON document, saved whole on every change; two saves
  at the exact same moment can overwrite each other. That's fine for a
  clinic's admin traffic; move to a database if that ever changes.
- Consider wiring `app/api/contact/route.ts`
  up to an email/SMS notification so staff don't have to keep checking
  the control panel.
