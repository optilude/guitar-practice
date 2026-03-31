# Phase 2: Content Library — Design

## Overview

A browsable reference library of guitar learning topics, seeded from HubGuitar's public sitemap. Each topic is a title + external link — no content is copied or stored locally. Users browse by category; links open HubGuitar in a new tab.

Phase 2 is read-only. No user interaction beyond navigation. Topic progress tracking (not started / in progress / done) is deferred to a later phase.

---

## Data Model

Three new Prisma models added to `schema.prisma`.

```prisma
model Source {
  id      String  @id @default(cuid())
  name    String
  baseUrl String
  topics  Topic[]
}

model Category {
  id     String  @id @default(cuid())
  slug   String  @unique
  name   String
  order  Int     @unique
  topics Topic[]
}

model Topic {
  id         String   @id @default(cuid())
  title      String
  url        String   @unique
  slug       String
  category   Category @relation(fields: [categoryId], references: [id])
  categoryId String
  source     Source   @relation(fields: [sourceId], references: [id])
  sourceId   String
  createdAt  DateTime @default(now())
}
```

### Categories (seeded in display order)

| order | slug | name |
|---|---|---|
| 1 | `fretboard-knowledge` | Fretboard Knowledge |
| 2 | `music-theory` | Music Theory |
| 3 | `improvisation` | Improvisation |
| 4 | `technique` | Technique |
| 5 | `ear-training` | Ear Training |
| 6 | `sight-reading` | Sight Reading |
| 7 | `songs` | Songs |

### Future: topic progress tracking

A `UserTopicProgress` table will be added in a later phase:
- `userId` (relation to `User`)
- `topicId` (relation to `Topic`)
- `status`: `NOT_STARTED | IN_PROGRESS | DONE`

The current schema supports this cleanly — no changes to `Topic` will be needed.

---

## Seeding

**Script:** `prisma/seed.ts`, run via `npx prisma db seed`.

**Source:** `tmp/hubguitar-sitemap.xml` — a standard XML sitemap with `<loc>` URLs.

**Logic:**
1. Parse XML and extract all `<loc>` URLs
2. Filter to URLs with exactly two path segments (e.g. `/technique/alternate-picking-exercise`) where the first segment is a key in the category mapping table below. This implicitly excludes category index pages, `/boston/*`, `/recommended-products/*`, `/articles/*`, and any other unknown prefixes
3. Map the first path segment to one of our 7 categories:

| HubGuitar prefix | Our category |
|---|---|
| `/technique/` | `technique` |
| `/rhythm/` | `technique` |
| `/fretboard/` | `fretboard-knowledge` |
| `/music-theory/` | `music-theory` |
| `/improvisation/` | `improvisation` |
| `/ear-training/` | `ear-training` |
| `/sight-reading/` | `sight-reading` |
| `/pick/` | `songs` |
| `/fingerstyle/` | `songs` |
| `/songs/` | `songs` |

4. Derive topic title from the slug: replace `-` with spaces, capitalise each word (e.g. `alternate-picking-exercise` → `Alternate Picking Exercise`)
5. Upsert one `Source` row (HubGuitar, `https://hubguitar.com`), all 7 `Category` rows, then all `Topic` rows in a single transaction

The script is idempotent — safe to re-run without creating duplicates.

---

## Routes and UI

### `/library` — Category grid

Replaces the current placeholder page. Server component.

Renders a 2-column grid of category cards. Each card shows:
- Category name
- Topic count (e.g. "24 links")

Cards are ordered by `category.order`. Tapping a card navigates to `/library/[category]`.

Data query:
```ts
db.category.findMany({
  orderBy: { order: 'asc' },
  include: { _count: { select: { topics: true } } }
})
```

### `/library/[category]` — Topic list

New dynamic route. Server component.

Shows the category name as a page heading and all topics as a scrollable list. Each row is the topic title as an external link (`target="_blank" rel="noopener noreferrer"`) that opens HubGuitar in a new tab.

Topics are sorted alphabetically. Unknown category slugs call `notFound()`.

Data query:
```ts
db.category.findUnique({
  where: { slug: params.category },
  include: {
    topics: { orderBy: { title: 'asc' } }
  }
})
```

---

## Testing

### Seed script — unit tests (`prisma/seed.test.ts`)

Test the two pure functions extracted from the seed script:

- **URL-to-category mapping**: given a URL string, returns the correct category slug or `null` for excluded prefixes. Cover all 10 HubGuitar prefixes plus excluded cases (`/boston/`, `/articles/`, `/recommended-products/`, root-level URLs)
- **Slug-to-title conversion**: `alternate-picking-exercise` → `Alternate Picking Exercise`, single-word slug, already-capitalised slug

### Library pages — component tests

- Category grid renders all 7 categories in the correct display order
- Topic count is shown per category card
- Topic list page renders topics sorted alphabetically
- Unknown category slug triggers `notFound()`

No E2E tests in this phase — pages have no client-side interactivity.
