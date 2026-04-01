# Guitar Practice

A personal guitar practice app. Features include:

- **Library** — curated lessons from Hub Guitar, organised by category (technique, music theory, fretboard knowledge, improvisation, sight reading, songs)
- **Reference** — interactive chord diagrams, scale/arpeggio fretboard views, triad voicings, and shell chord shapes
- **Practice tracker** — track sessions and progress (in development)

Built with Next.js 16, Tailwind CSS v4, Prisma 7, and PostgreSQL.

---

## Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL database

---

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Copy the example env file and fill in your database URL:

```bash
cp .env.example .env.local
# Edit .env.local and set DATABASE_URL=postgresql://...
```

### 3. Run database migrations

```bash
pnpm db:migrate
```

### 4. Seed the lesson library

The lesson data comes from the Hub Guitar sitemap, which is committed to the repo at `prisma/tmp/hubguitar-sitemap.xml`.

```bash
pnpm db:seed
```

This imports all Hub Guitar lessons into the database, grouped by category.

### 5. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

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
| `pnpm db:seed` | Import lessons from `prisma/tmp/hubguitar-sitemap.xml` |
| `pnpm db:fetch-content` | Re-download sitemap + topic order from Hub Guitar, then re-seed |

---

## Refreshing lesson content

Hub Guitar lessons are seeded from a local snapshot of their sitemap. To pull in new or reordered lessons:

```bash
pnpm db:fetch-content
pnpm db:seed
```

`db:fetch-content` re-downloads the sitemap from `https://hubguitar.com/sitemap.xml` and regenerates `prisma/tmp/topic-order.json` by scraping Hub Guitar's category pages for their curated lesson order.
