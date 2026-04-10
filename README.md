# Guitar Practice

A personal guitar practice app. Features include:

- **Library** — curated lessons from Hub Guitar, organised by category (technique, music theory, fretboard knowledge, improvisation, sight reading, songs)
- **Reference** — interactive chord diagrams, scale/arpeggio fretboard views, triad voicings, and shell chord shapes
- **Goals & Routines** — define practice goals, build routines, and track sessions
- **Progression Analyser** — analyse chord progressions with substitutions and scale recommendations
- **Practice tracker** — track sessions and progress

Built with Next.js 16, Tailwind CSS v4, Prisma 7, and PostgreSQL.

---

## Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL database
- Mailpit (for local email): `brew install mailpit`

---

## First-time setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Copy the example env file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and configure:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://user:pass@localhost:5432/guitarapp` |
| `AUTH_SECRET` | Secret for NextAuth JWT signing. Generate with: `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Base URL of the app. Use `http://localhost:3000` for local dev |
| `SMTP_HOST` | SMTP host. Use `localhost` for Mailpit in dev |
| `SMTP_PORT` | SMTP port. Use `1025` for Mailpit in dev |
| `SMTP_USER` | SMTP username. Leave blank for Mailpit |
| `SMTP_PASSWORD` | SMTP password. Leave blank for Mailpit |
| `SMTP_FROM` | From address for outgoing email |
| `SEED_ADMIN_EMAIL` | Email for the default admin account (created on first `db:seed`) |
| `SEED_ADMIN_PASSWORD` | Temporary password for the default admin (must be changed on first login) |

### 3. Run database migrations

```bash
pnpm db:migrate
```

### 4. Seed the database

This imports Hub Guitar lessons **and** creates the default admin account:

```bash
pnpm db:seed
```

The default admin is created using `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` from `.env.local`. The account is flagged as `mustChangePassword=true` — the admin must set a new password on their first login.

> **Note:** The seed is idempotent. If the admin account already exists, it is left unchanged. Re-running the seed only updates lesson data.

To reset the admin password (e.g. if you are locked out), update `SEED_ADMIN_PASSWORD` in `.env.local` and run:

```bash
pnpm db:reset-admin-password
```

This sets the new password and re-flags the account as `mustChangePassword=true`.

### 5. Start the dev server

```bash
pnpm dev
```

In a separate terminal, start Mailpit (for password reset emails):

```bash
mailpit
```

Open [http://localhost:3000](http://localhost:3000).  
View emails at [http://localhost:8025](http://localhost:8025).

---

## Email in production (Resend)

Sign up at [resend.com](https://resend.com) (free tier: 3,000 emails/month). Verify your sending domain, then set these Vercel environment variables:

| Variable | Value |
|----------|-------|
| `SMTP_HOST` | `smtp.resend.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `resend` |
| `SMTP_PASSWORD` | your Resend API key |
| `SMTP_FROM` | `noreply@yourdomain.com` (must be your verified domain) |

---

## User management

- Log in as admin and navigate to **Admin → Users** to promote or demote users.
- Admins cannot remove their own admin status.
- New users registered via `/register` are normal users by default.
- To create additional admins, promote them via the admin UI.

---

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm test` | Run tests in watch mode |
| `pnpm test:run` | Run tests once |
| `pnpm lint` | Run ESLint |
| `pnpm db:migrate` | Apply database migrations |
| `pnpm db:seed` | Import lessons and create default admin |
| `pnpm db:reset-admin-password` | Reset admin password (uses `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`) |

---

## Vendored data files

Static music theory datasets are committed to the repo under `data/` rather than fetched at runtime.

| File | Source | Notes |
|------|--------|-------|
| `data/chords-db.json` | [`tombatossals/chords-db`](https://github.com/tombatossals/chords-db) `lib/guitar.json` | Guitar chord voicing database. Vendored from GitHub master (Oct 2024) rather than the stale npm release (v0.5.1, Nov 2019). To update: download `https://raw.githubusercontent.com/tombatossals/chords-db/master/lib/guitar.json` and replace this file, then re-apply any local custom voicings. |
| `data/triads.json` | Custom | Triad voicings across all string sets and inversions, generated for this project. |

---

## Lesson content

Hub Guitar lessons are stored as a committed static file at `prisma/data/lessons.json`. This file is the source of truth for what gets seeded into the database — no network requests or scraping required.

To add or update lessons, edit `prisma/data/lessons.json` directly and re-run `pnpm db:seed`. Each entry has the shape:

```json
{ "url": "https://hubguitar.com/technique/alternate-picking", "slug": "alternate-picking", "title": "Alternate Picking", "category": "technique", "order": 12 }
```
