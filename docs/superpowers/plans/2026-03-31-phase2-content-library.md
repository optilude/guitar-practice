# Phase 2: Content Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browsable library of guitar learning topics seeded from HubGuitar's XML sitemap, organised into 7 categories, accessible as a category grid and per-category topic list.

**Architecture:** Three Prisma models (Source, Category, Topic) store link metadata. Pure helper functions in `lib/seed-helpers.ts` map HubGuitar URLs to app categories and derive titles from slugs. A seed script (`prisma/seed.ts`) parses the XML sitemap and populates the DB idempotently. Two async server-component pages replace the library placeholder and add a new dynamic route.

**Tech Stack:** Next.js 16 (App Router, async server components, params as Promise), Prisma 7 (generated client at `lib/generated/prisma`), PostgreSQL, Vitest + @testing-library/react, pnpm, tsx (seed script runner)

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add Source, Category, Topic models |
| `lib/seed-helpers.ts` | Create | Pure functions `urlToCategory` and `slugToTitle` — exported for testing |
| `prisma/seed.ts` | Create | Parses XML sitemap, upserts Source/Category/Topic rows |
| `package.json` | Modify | Add `prisma.seed` config; `tsx` devDependency |
| `__tests__/seed.test.ts` | Create | Unit tests for `urlToCategory` and `slugToTitle` |
| `app/(app)/library/page.tsx` | Modify | Replace placeholder with category grid |
| `app/(app)/library/[category]/page.tsx` | Create | Topic list for a single category |
| `__tests__/library.test.tsx` | Create | Component tests for both library pages |

---

### Task 1: Schema migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add Source, Category, Topic models to `prisma/schema.prisma`**

Replace the full contents of `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../lib/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

model User {
  id           String   @id @default(cuid())
  name         String?
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Source {
  id      String  @id @default(cuid())
  name    String  @unique
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

- [ ] **Step 2: Run the migration**

```bash
pnpm prisma migrate dev --name add-content-library
```

Expected: Migration file created under `prisma/migrations/`, applied to the database, and Prisma client regenerated at `lib/generated/prisma`.

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
pnpm tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add Source, Category, Topic schema for content library"
```

---

### Task 2: Seed helper functions (TDD)

**Files:**
- Create: `__tests__/seed.test.ts`
- Create: `lib/seed-helpers.ts`

The pure helper functions live in `lib/seed-helpers.ts` (not in `prisma/seed.ts`) so tests can import them without triggering the database connection that `prisma/seed.ts` establishes at module level.

- [ ] **Step 1: Write the failing tests in `__tests__/seed.test.ts`**

```ts
import { describe, it, expect } from "vitest"
import { urlToCategory, slugToTitle } from "@/lib/seed-helpers"

describe("urlToCategory", () => {
  it("maps /technique/ prefix to technique", () => {
    expect(urlToCategory("https://hubguitar.com/technique/alternate-picking")).toBe("technique")
  })

  it("maps /rhythm/ prefix to technique", () => {
    expect(urlToCategory("https://hubguitar.com/rhythm/basic-strumming")).toBe("technique")
  })

  it("maps /fretboard/ prefix to fretboard-knowledge", () => {
    expect(urlToCategory("https://hubguitar.com/fretboard/five-pentatonic-patterns")).toBe("fretboard-knowledge")
  })

  it("maps /music-theory/ prefix to music-theory", () => {
    expect(urlToCategory("https://hubguitar.com/music-theory/circle-of-fifths")).toBe("music-theory")
  })

  it("maps /improvisation/ prefix to improvisation", () => {
    expect(urlToCategory("https://hubguitar.com/improvisation/blues-scale")).toBe("improvisation")
  })

  it("maps /ear-training/ prefix to ear-training", () => {
    expect(urlToCategory("https://hubguitar.com/ear-training/interval-recognition")).toBe("ear-training")
  })

  it("maps /sight-reading/ prefix to sight-reading", () => {
    expect(urlToCategory("https://hubguitar.com/sight-reading/treble-clef-basics")).toBe("sight-reading")
  })

  it("maps /pick/ prefix to songs", () => {
    expect(urlToCategory("https://hubguitar.com/pick/blue-bossa")).toBe("songs")
  })

  it("maps /fingerstyle/ prefix to songs", () => {
    expect(urlToCategory("https://hubguitar.com/fingerstyle/gymnopedie-no-1")).toBe("songs")
  })

  it("maps /songs/ prefix to songs", () => {
    expect(urlToCategory("https://hubguitar.com/songs/blackbird")).toBe("songs")
  })

  it("returns null for /boston/ prefix", () => {
    expect(urlToCategory("https://hubguitar.com/boston/gift-certificate")).toBeNull()
  })

  it("returns null for /articles/ prefix", () => {
    expect(urlToCategory("https://hubguitar.com/articles/how-long-to-learn-guitar")).toBeNull()
  })

  it("returns null for /recommended-products/ prefix", () => {
    expect(urlToCategory("https://hubguitar.com/recommended-products/all-reviews")).toBeNull()
  })

  it("returns null for root-level URLs with no second segment", () => {
    expect(urlToCategory("https://hubguitar.com/technique")).toBeNull()
  })
})

describe("slugToTitle", () => {
  it("converts a hyphenated slug to title case", () => {
    expect(slugToTitle("alternate-picking-exercise")).toBe("Alternate Picking Exercise")
  })

  it("handles a single-word slug", () => {
    expect(slugToTitle("blues")).toBe("Blues")
  })

  it("handles a slug with numbers", () => {
    expect(slugToTitle("gymnopedie-no-1")).toBe("Gymnopedie No 1")
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
pnpm test:run __tests__/seed.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/seed-helpers'`

- [ ] **Step 3: Create `lib/seed-helpers.ts`**

```ts
const CATEGORY_MAP: Record<string, string> = {
  technique: "technique",
  rhythm: "technique",
  fretboard: "fretboard-knowledge",
  "music-theory": "music-theory",
  improvisation: "improvisation",
  "ear-training": "ear-training",
  "sight-reading": "sight-reading",
  pick: "songs",
  fingerstyle: "songs",
  songs: "songs",
}

export function urlToCategory(urlString: string): string | null {
  const segments = new URL(urlString).pathname.split("/").filter(Boolean)
  if (segments.length !== 2) return null
  return CATEGORY_MAP[segments[0]] ?? null
}

export function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
pnpm test:run __tests__/seed.test.ts
```

Expected: All 14 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/seed-helpers.ts __tests__/seed.test.ts
git commit -m "feat: add seed helper functions urlToCategory and slugToTitle"
```

---

### Task 3: Seed script

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json`

- [ ] **Step 1: Install `tsx` as a dev dependency**

```bash
pnpm add -D tsx
```

Expected: `tsx` added to `devDependencies` in `package.json`.

- [ ] **Step 2: Add the `prisma.seed` config to `package.json`**

Add the following top-level key to `package.json` (after `"pnpm"`):

```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

- [ ] **Step 3: Create `prisma/seed.ts`**

```ts
import { readFileSync } from "fs"
import { join } from "path"
import { PrismaClient } from "@/lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import * as dotenv from "dotenv"
import { urlToCategory, slugToTitle } from "@/lib/seed-helpers"

dotenv.config({ path: ".env.local" })

const CATEGORIES = [
  { slug: "fretboard-knowledge", name: "Fretboard Knowledge", order: 1 },
  { slug: "music-theory",        name: "Music Theory",        order: 2 },
  { slug: "improvisation",       name: "Improvisation",       order: 3 },
  { slug: "technique",           name: "Technique",           order: 4 },
  { slug: "ear-training",        name: "Ear Training",        order: 5 },
  { slug: "sight-reading",       name: "Sight Reading",       order: 6 },
  { slug: "songs",               name: "Songs",               order: 7 },
]

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  const xml = readFileSync(join(__dirname, "../tmp/hubguitar-sitemap.xml"), "utf8")
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1])

  await prisma.$transaction(async (tx) => {
    const source = await tx.source.upsert({
      where: { name: "HubGuitar" },
      create: { name: "HubGuitar", baseUrl: "https://hubguitar.com" },
      update: {},
    })

    const categoryMap = new Map<string, string>()
    for (const cat of CATEGORIES) {
      const record = await tx.category.upsert({
        where: { slug: cat.slug },
        create: cat,
        update: { name: cat.name, order: cat.order },
      })
      categoryMap.set(cat.slug, record.id)
    }

    let count = 0
    for (const url of urls) {
      const catSlug = urlToCategory(url)
      if (!catSlug) continue
      const categoryId = categoryMap.get(catSlug)!
      const slug = new URL(url).pathname.split("/").filter(Boolean)[1]
      const title = slugToTitle(slug)
      await tx.topic.upsert({
        where: { url },
        create: { title, url, slug, categoryId, sourceId: source.id },
        update: { title },
      })
      count++
    }

    console.log(`Seeded ${count} topics across ${CATEGORIES.length} categories`)
  })

  await prisma.$disconnect()
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
```

- [ ] **Step 4: Run the seed script**

```bash
pnpm prisma db seed
```

Expected output contains: `Seeded N topics across 7 categories` (no error exit).

- [ ] **Step 5: Verify the data**

```bash
pnpm prisma studio
```

Open the browser URL shown. Confirm: Source table has 1 row (HubGuitar), Category table has 7 rows in order, Topic table has rows with correct titles and URLs. Close Prisma Studio (Ctrl+C).

- [ ] **Step 6: Commit**

```bash
git add prisma/seed.ts package.json
git commit -m "feat: seed HubGuitar topics from XML sitemap"
```

---

### Task 4: Library index page (category grid)

**Files:**
- Modify: `app/(app)/library/page.tsx`
- Create: `__tests__/library.test.tsx`

- [ ] **Step 1: Write the failing tests in `__tests__/library.test.tsx`**

```tsx
import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    category: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND")
  }),
}))

import LibraryPage from "@/app/(app)/library/page"
import { db } from "@/lib/db"
import { render, screen } from "@testing-library/react"

const mockCategories = [
  { id: "1", slug: "fretboard-knowledge", name: "Fretboard Knowledge", order: 1, _count: { topics: 18 } },
  { id: "2", slug: "music-theory",        name: "Music Theory",        order: 2, _count: { topics: 12 } },
  { id: "3", slug: "technique",           name: "Technique",           order: 4, _count: { topics: 24 } },
]

describe("LibraryPage", () => {
  beforeEach(() => vi.clearAllMocks())

  it("renders each category name", async () => {
    vi.mocked(db.category.findMany).mockResolvedValue(mockCategories as any)

    const jsx = await LibraryPage()
    render(jsx)

    expect(screen.getByText("Fretboard Knowledge")).toBeInTheDocument()
    expect(screen.getByText("Music Theory")).toBeInTheDocument()
    expect(screen.getByText("Technique")).toBeInTheDocument()
  })

  it("renders topic counts for each category", async () => {
    vi.mocked(db.category.findMany).mockResolvedValue(mockCategories as any)

    const jsx = await LibraryPage()
    render(jsx)

    expect(screen.getByText("18 links")).toBeInTheDocument()
    expect(screen.getByText("12 links")).toBeInTheDocument()
    expect(screen.getByText("24 links")).toBeInTheDocument()
  })

  it("renders each category as a link to its detail page", async () => {
    vi.mocked(db.category.findMany).mockResolvedValue(mockCategories as any)

    const jsx = await LibraryPage()
    render(jsx)

    expect(screen.getByRole("link", { name: /Fretboard Knowledge/ })).toHaveAttribute(
      "href",
      "/library/fretboard-knowledge"
    )
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
pnpm test:run __tests__/library.test.tsx
```

Expected: FAIL — component renders placeholder text, not category data.

- [ ] **Step 3: Replace `app/(app)/library/page.tsx`**

```tsx
import Link from "next/link"
import { db } from "@/lib/db"

export default async function LibraryPage() {
  const categories = await db.category.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { topics: true } } },
  })

  return (
    <div className="pt-6">
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
        Browse
      </p>
      <h1 className="text-2xl font-semibold text-foreground mb-6">Library</h1>
      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/library/${cat.slug}`}
            className="block rounded-lg border border-border p-4 hover:border-foreground transition-colors"
          >
            <p className="text-sm font-medium text-foreground">{cat.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {cat._count.topics} links
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
pnpm test:run __tests__/library.test.tsx
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Check TypeScript**

```bash
pnpm tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/library/page.tsx" __tests__/library.test.tsx
git commit -m "feat: library index page with category grid"
```

---

### Task 5: Library category page (topic list)

**Files:**
- Create: `app/(app)/library/[category]/page.tsx`
- Modify: `__tests__/library.test.tsx`

- [ ] **Step 1: Add failing tests to `__tests__/library.test.tsx`**

Add the following after the closing `})` of the `describe("LibraryPage", ...)` block. Also add the two new imports at the top of the file, directly below the existing `import LibraryPage` line:

```tsx
import CategoryPage from "@/app/(app)/library/[category]/page"
import { notFound } from "next/navigation"
```

Then add this describe block at the end of the file:

```tsx
const mockCategory = {
  id: "1",
  slug: "technique",
  name: "Technique",
  order: 4,
  topics: [
    {
      id: "t1",
      title: "Alternate Picking Basics",
      url: "https://hubguitar.com/technique/alternate-picking",
      slug: "alternate-picking",
      categoryId: "1",
      sourceId: "s1",
      createdAt: new Date(),
    },
    {
      id: "t2",
      title: "Economy Picking Guide",
      url: "https://hubguitar.com/technique/economy-picking",
      slug: "economy-picking",
      categoryId: "1",
      sourceId: "s1",
      createdAt: new Date(),
    },
  ],
}

describe("CategoryPage", () => {
  beforeEach(() => vi.clearAllMocks())

  it("renders the category name as a heading", async () => {
    vi.mocked(db.category.findUnique).mockResolvedValue(mockCategory as any)

    const jsx = await CategoryPage({ params: Promise.resolve({ category: "technique" }) })
    render(jsx)

    expect(screen.getByRole("heading", { name: "Technique" })).toBeInTheDocument()
  })

  it("renders each topic as an external link with correct href", async () => {
    vi.mocked(db.category.findUnique).mockResolvedValue(mockCategory as any)

    const jsx = await CategoryPage({ params: Promise.resolve({ category: "technique" }) })
    render(jsx)

    const link = screen.getByRole("link", { name: /Alternate Picking Basics/ })
    expect(link).toHaveAttribute("href", "https://hubguitar.com/technique/alternate-picking")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  it("calls notFound for an unknown category slug", async () => {
    vi.mocked(db.category.findUnique).mockResolvedValue(null)

    await expect(
      CategoryPage({ params: Promise.resolve({ category: "unknown-slug" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND")

    expect(notFound).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the tests to verify the new ones fail**

```bash
pnpm test:run __tests__/library.test.tsx
```

Expected: 3 existing tests PASS, 3 new CategoryPage tests FAIL — `Cannot find module '@/app/(app)/library/[category]/page'`

- [ ] **Step 3: Create `app/(app)/library/[category]/page.tsx`**

```tsx
import { notFound } from "next/navigation"
import { db } from "@/lib/db"

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params

  const data = await db.category.findUnique({
    where: { slug: category },
    include: { topics: { orderBy: { title: "asc" } } },
  })

  if (!data) notFound()

  return (
    <div className="pt-6">
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
        Library
      </p>
      <h1 className="text-2xl font-semibold text-foreground mb-6">{data.name}</h1>
      <ul className="space-y-1">
        {data.topics.map((topic) => (
          <li key={topic.id}>
            <a
              href={topic.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between py-2 text-base text-foreground hover:text-muted-foreground transition-colors"
            >
              <span>{topic.title}</span>
              <span className="text-muted-foreground ml-4 flex-shrink-0">↗</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4: Run all tests to verify everything passes**

```bash
pnpm test:run
```

Expected: All tests PASS — auth, register, seed, and library (6 tests total across both library describes).

- [ ] **Step 5: Check TypeScript**

```bash
pnpm tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/library/[category]/page.tsx" __tests__/library.test.tsx
git commit -m "feat: library category page with topic list and notFound handling"
```
