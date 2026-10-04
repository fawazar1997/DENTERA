# Dentera — Dental Clinic Website & Control Panel

A bilingual (English / Arabic, full RTL support) marketing website for a
dental clinic, plus a password-protected control panel for managing the
doctors and departments shown on the site.

Built with Next.js 14 (App Router), TypeScript and Tailwind CSS.

## Features

- **Public site**: Home, About, Departments, Doctors (filterable by
  department, each with its own profile/CV page at `/doctors/<id>`),
  Contact — available at `/en/...` and `/ar/...`.
- **Arabic support**: full RTL layout, mirrored navigation, Arabic
  typography, and a language switcher that preserves the current page.
- **Booking by phone**: every "book" button is a tap-to-call link to the
  booking number (800 301 2345 by default, editable). There is no
  booking form.
- **Branches** (Abha and Khamis Mushait): shown on the home and contact
  pages and in the footer; clicking one opens its Google Maps link.
- **Partners gallery**: partner logos scroll across the home page in an
  animated loop (hidden until at least one partner is added).
- **Control panel** (`/en/admin` or `/ar/admin`): password-protected.
  Manage doctors (including their CV page), departments, partners,
  branches, a banner image for each page, and **every text and number on
  the site** in both languages (Texts & Numbers). Changes show on the
  public site immediately; images are shared by both languages.
- **Department icons**: drawn dental icons, chosen automatically from the
  department name (or picked manually in the department form).
- Data is stored in a local JSON file (`data/db.local.json`, generated
  on first run from `data/seed.json`) — no external database required.
- Image uploads (doctor photos, partner logos, banners) go to Vercel Blob
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
| `BLOB_STORE_ID` / `BLOB_READ_WRITE_TOKEN` | Set automatically when you connect a **Vercel Blob** store to the project (Vercel dashboard → project → Storage → Blob). Newer stores set `BLOB_STORE_ID` and sign in with OIDC; older ones set `BLOB_READ_WRITE_TOKEN` — either works. With Blob connected, photo uploads work **and** all control-panel data (doctors, departments, partners, branches, banners, texts) is saved in the store, so it persists across deploys and serverless instances. Without it, data is kept in a local JSON file (fine for development, not persistent on Vercel). |

### Using the control panel

1. Go to `/en/admin` (or `/ar/admin`).
2. Sign in with `ADMIN_PASSWORD`.
3. Use the **Doctors** and **Departments** tabs to add, edit, delete, or
   toggle visibility (the "Active" checkbox) of entries. Every entry has
   separate English and Arabic fields, plus an optional photo (Doctors)
   which is not localized — one upload, shown on both languages.
4. **Partners** and **Branches**: add/edit/remove partner logos and
   branches (paste a Google Maps "Share" link for each branch).
5. **Banners**: upload or remove the banner image at the top of each page,
   show/hide the home page banner, and set the branch photo shown beside
   the home page headline.
6. **Social Media**: links to the clinic's accounts; each one shows as an
   icon in the footer and on the Contact page.
7. **Texts & Numbers**: edit any text or number on the site, side by side
   in English and Arabic. Clearing a field restores its original text;
   fields whose Arabic was edited without the English are flagged.

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
