# Guitar Practice

A personal guitar practice web app with interactive reference tools, structured practice routines, and progress tracking.

## Features

- **Library** — curated lessons from Hub Guitar, organised by category (technique, theory, fretboard, improvisation, sight reading, songs)
- **Goals & Routines** — define practice goals, build timed routines with typed sections and topic assignments, run sessions as flashcards
- **History** — session log with streak tracking
- **Reference** — interactive chord diagrams, scale and arpeggio fretboard views, triad voicings, shell chords, modes/harmony, and chord substitution and soloing scale recommendations
- **Custom Progressions** — build, save and analyse chord progressions
- **Tools** — chord finder, scale finder, key finder, transposer, metronome, and progression analyser

Built with Next.js 16, React 19, Tailwind CSS v4, Prisma 7, and PostgreSQL.

---

## Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL database
- SMTP server (e.g. Mailpit for local testing: `brew install mailpit`)

---

## Local installation

```bash
git clone <repo-url>
cd GuitarPractice
pnpm install
```

---

## First-time setup

### 1. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://user:pass@localhost:5432/guitarapp` |
| `AUTH_SECRET` | NextAuth JWT signing secret. Generate with: `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Base URL of the app. Use `http://localhost:3000` for local dev |
| `SMTP_HOST` | SMTP host. Use `localhost` for Mailpit in dev |
| `SMTP_PORT` | SMTP port. Use `1025` for Mailpit in dev |
| `SMTP_USER` | SMTP username. Leave blank for Mailpit |
| `SMTP_PASSWORD` | SMTP password. Leave blank for Mailpit |
| `SMTP_FROM` | From address for outgoing email |
| `SEED_ADMIN_EMAIL` | Email for the default admin account |
| `SEED_ADMIN_PASSWORD` | Temporary password for the default admin (must be changed on first login) |

### 2. Run database migrations

```bash
pnpm db:migrate
```

### 3. Seed the database

Imports Hub Guitar lessons and creates the default admin account:

```bash
pnpm db:seed
```

The admin is created with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` and flagged `mustChangePassword=true`. The seed is idempotent — re-running only updates lesson data.

To reset the admin password (e.g. if locked out):

```bash
pnpm db:reset-admin-password
```

### 4. Start the dev server

```bash
pnpm dev
```

In a separate terminal, start Mailpit (for password reset emails):

```bash
mailpit
```

Open [http://localhost:3000](http://localhost:3000). View emails at [http://localhost:8025](http://localhost:8025).

---

## Development

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

## Deployment

### Vercel (recommended)

1. Push the repo to GitHub/GitLab and import it in [Vercel](https://vercel.com).
2. Provision a PostgreSQL database — [Neon](https://neon.tech) and [Supabase](https://supabase.com) both work well and have free tiers.
3. Set all environment variables from `.env.local` in the Vercel project settings (use production values: your real DB URL, a strong `AUTH_SECRET`, your actual `NEXT_PUBLIC_APP_URL`, and SMTP credentials — see **Email** below).
4. No custom build command is needed. Vercel picks up `pnpm build` from `package.json`, which already runs `prisma generate` before `next build`.
5. **Before deploying**, run migrations and seed from your local machine pointing at the production database — the app will fail at runtime without them:

```bash
DATABASE_URL=<production-url> pnpm db:migrate
DATABASE_URL=<production-url> pnpm db:seed
```

6. Deploy (or trigger a redeploy). Subsequent deployments are automatic on push.

> **Note:** Re-run `DATABASE_URL=<production-url> pnpm db:migrate` after any schema changes before deploying.

### Other Node.js hosts (Render, Railway, Fly.io, etc.)

1. Provision a PostgreSQL database and a Node.js service.
2. Set environment variables (same list as above).
3. Set the build command to `pnpm build` and the start command to `pnpm start`. The build script already includes `prisma generate`.
4. Run migrations and seed from local before the first deploy (or via the host's shell/console access):

```bash
DATABASE_URL=<production-url> pnpm db:migrate
DATABASE_URL=<production-url> pnpm db:seed
```

### Email in production

> **Important:** Vercel (and most serverless platforms) block outbound SMTP connections. The app uses Resend's **HTTP API** in production, not SMTP.

[Resend](https://resend.com) has a free tier (3,000 emails/month). Verify your sending domain, then set two environment variables:

| Variable | Value |
|----------|-------|
| `RESEND_API_KEY` | your Resend API key |
| `SMTP_FROM` | `noreply@yourdomain.com` (must be your verified domain) |

The `SMTP_*` variables are only used for local dev (Mailpit). Leave them unset in production.

---

## User management

Log in as admin and navigate to **Admin → Users** to promote or demote users. New registrations are normal users by default. Admins cannot remove their own admin status.

---

## Vendored data

Static datasets are committed under `data/` rather than fetched at runtime:

| File | Source | Notes |
|------|--------|-------|
| `data/chords-db.json` | [`tombatossals/chords-db`](https://github.com/tombatossals/chords-db) | Guitar chord voicing database. Vendored from GitHub master (Oct 2024). To update: replace with the latest `lib/guitar.json` from that repo and re-apply any local custom voicings. |
| `data/triads.json` | Custom | Triad voicings across all string sets and inversions, generated for this project. |

Hub Guitar lessons are stored at `prisma/data/lessons.json` and seeded into the database. To add or update lessons, edit that file and re-run `pnpm db:seed`.

---

## Acknowledgements

- **[Fretboard.js](https://github.com/moonwave99/fretboard.js)** (`@moonwave99/fretboard.js`) — interactive fretboard diagrams for scales and arpeggios
- **[SVGuitar](https://github.com/omnibrain/svguitar)** — SVG chord diagram rendering
- **[Hub Guitar](https://hubguitar.com)** — lesson content source
- **[chords-db](https://github.com/tombatossals/chords-db)** — guitar chord voicing database
- **[Tonal](https://github.com/tonaljs/tonal)** — music theory library
- **[VexFlow](https://www.vexflow.com)** — music notation rendering
