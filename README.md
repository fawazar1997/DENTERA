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
  dashboard to add, edit, delete and hide/show doctors and departments.
  Changes are reflected on the public site immediately.
- Data is stored in a local JSON file (`data/db.local.json`, generated
  on first run from `data/seed.json`) — no external database required.

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

### Using the control panel

1. Go to `/en/admin` (or `/ar/admin`).
2. Sign in with `ADMIN_PASSWORD`.
3. Use the **Doctors** and **Departments** tabs to add, edit, delete, or
   toggle visibility (the "Active" checkbox) of entries. Every entry has
   separate English and Arabic fields.

## Production

```bash
npm run build
npm run start
```

Deploy this as a standard Node.js server (e.g. a VPS, Docker container, or
any platform that runs `next start`). Serve it over HTTPS — the admin
session cookie is marked `Secure` automatically whenever the incoming
request (or `X-Forwarded-Proto` from a reverse proxy) is HTTPS.

Because data is written to a local JSON file, run this as a single
persistent Node.js process with a writable filesystem (not a stateless/
serverless deployment, where filesystem writes don't persist between
requests).

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
