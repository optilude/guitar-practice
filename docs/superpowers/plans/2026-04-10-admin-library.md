# Admin Library Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin landing page with two tiles (Users, Library) and a full CRUD interface for managing the standard library Topics, mirroring the "Manage my library" UX.

**Architecture:** New `/admin` landing page with tile grid (same pattern as Tools page); `/admin/library` page with per-category TopicList → TopicCard + AddTopicForm components, wiring to a new server actions file. Admin nav link changed from `/admin/users` to `/admin`. Source upserted by name on create/update. Admin layout at `app/(app)/admin/layout.tsx` already calls `requireAdmin()` so all routes under `/admin` are protected.

**Tech Stack:** React, Next.js 16 server components, Prisma 7, dnd-kit, Vitest + React Testing Library, Tailwind CSS v4

---

## Key Schema Facts

```prisma
model Topic {
  id          String      @id @default(cuid())
  title       String
  url         String      @unique   // required, unique
  slug        String
  order       Int         @default(0)
  categoryId  String
  category    Category    @relation(...)
  sourceId    String      // required FK
  source      Source      @relation(...)
  description String      @default("")
  createdAt   DateTime    @default(now())
  goalTopics  GoalTopic[]
}

model Source {
  id      String  @id @default(cuid())
  name    String  @unique
  baseUrl String
  topics  Topic[]
}
```

- Topics **require** `url` (unique) and `sourceId` (FK to Source)
- Sources are upserted by name on topic create/update
- `baseUrl` on Source is derived from the topic URL's origin (e.g., `https://hubguitar.com`)
- `slug` is auto-generated from title

## Existing Patterns to Follow

- **Admin layout protection**: `app/(app)/admin/layout.tsx` calls `requireAdmin()` — ALL routes under `/admin` are already protected
- **Admin check in server actions**: Use `getIsAdmin()` from `@/lib/get-user-id` (reads `x-is-admin` header)
- **Tile grid layout**: Same as Tools page — `grid grid-cols-2 gap-3` with Link cards
- **Page heading pattern**: `pt-6` outer div, `text-xs uppercase tracking-widest text-muted-foreground mb-1` label, `text-2xl font-semibold text-foreground mb-6` h1
- **UserLesson manage components** in `app/(app)/library/manage/_components/` are the exact template to mirror
- **Dialog pattern**: `@base-ui/react/dialog` with `data-starting-style:opacity-0 data-ending-style:opacity-0 transition duration-150` on both Backdrop and Popup (z-50 backdrop, z-[51] popup); `btn("destructive", "sm")` left, `Dialog.Close btn("standalone", "sm")` right
- **btn utility**: `btn("standalone"|"primary"|"destructive"|"secondary", "sm"|"md")` from `@/lib/button-styles`
- **Server actions**: `"use server"` at top; return `{ success: true } | { error: string }` union

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `app/(app)/admin/page.tsx` | Create | Admin landing page with two tiles |
| `app/(app)/admin/library/page.tsx` | Create | Fetch categories+topics; render TopicList per category |
| `app/(app)/admin/library/actions.ts` | Create | Admin-only CRUD server actions for Topic |
| `app/(app)/admin/library/_components/topic-list.tsx` | Create | Drag-and-drop topic list per category |
| `app/(app)/admin/library/_components/topic-card.tsx` | Create | Expandable topic card with edit/delete dialog |
| `app/(app)/admin/library/_components/add-topic-form.tsx` | Create | Collapsible form to add new topics |
| `components/layout/navbar-client.tsx` | Modify | Admin nav link: `/admin/users` → `/admin` |
| `__tests__/admin/library/actions.test.ts` | Create | Unit tests for topic CRUD server actions |

---

### Task 1: Admin landing page + update navbar

**Files:**
- Modify: `components/layout/navbar-client.tsx` (line 32)
- Create: `app/(app)/admin/page.tsx`
- Create: `__tests__/admin/page.test.tsx`

The admin landing page has two tiles identical to the Tools page pattern. The `requireAdmin()` call is technically redundant (layout handles it) but added for clarity.

- [ ] **Step 1: Write test for admin landing page**

Create `__tests__/admin/page.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import AdminPage from "@/app/(app)/admin/page"

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: vi.fn().mockResolvedValue(undefined),
}))

describe("AdminPage", () => {
  it("renders two tiles: User Management and Library Management", async () => {
    const page = await AdminPage()
    render(page)
    expect(screen.getByText("User Management")).toBeInTheDocument()
    expect(screen.getByText("Library Management")).toBeInTheDocument()
  })

  it("Users tile links to /admin/users", async () => {
    const page = await AdminPage()
    render(page)
    const usersLink = screen.getByRole("link", { name: /user management/i })
    expect(usersLink).toHaveAttribute("href", "/admin/users")
  })

  it("Library tile links to /admin/library", async () => {
    const page = await AdminPage()
    render(page)
    const libraryLink = screen.getByRole("link", { name: /library management/i })
    expect(libraryLink).toHaveAttribute("href", "/admin/library")
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/admin/page.test.tsx`
Expected: FAIL — module not found for the admin page

- [ ] **Step 3: Create admin landing page**

Create `app/(app)/admin/page.tsx`:

```tsx
import Link from "next/link"
import { Users, BookOpen } from "lucide-react"
import { requireAdmin } from "@/lib/require-admin"
import { type ReactNode } from "react"

const ADMIN_TILES: { href: string; icon: ReactNode; name: string; description: string }[] = [
  {
    href: "/admin/users",
    icon: <Users size={36} strokeWidth={1.5} aria-hidden="true" />,
    name: "User Management",
    description: "Manage user accounts and admin permissions",
  },
  {
    href: "/admin/library",
    icon: <BookOpen size={36} strokeWidth={1.5} aria-hidden="true" />,
    name: "Library Management",
    description: "Add, edit, and reorder standard library topics",
  },
]

export default async function AdminPage() {
  await requireAdmin()
  return (
    <div className="pt-6">
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Admin</p>
      <h1 className="text-2xl font-semibold text-foreground mb-6">Administration</h1>
      <div className="grid grid-cols-2 gap-3">
        {ADMIN_TILES.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="block rounded-lg border border-border dark:border-neutral-600 bg-card dark:bg-neutral-800 p-4 hover:bg-muted dark:hover:bg-secondary transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">{tile.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{tile.description}</p>
              </div>
              <div className="text-foreground flex-shrink-0">{tile.icon}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update navbar admin link**

In `components/layout/navbar-client.tsx`, line 32, change:
```tsx
? [...BASE_NAV_ITEMS, { href: "/admin/users", label: "Admin" }]
```
to:
```tsx
? [...BASE_NAV_ITEMS, { href: "/admin", label: "Admin" }]
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run __tests__/admin/page.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add app/(app)/admin/page.tsx components/layout/navbar-client.tsx __tests__/admin/page.test.tsx
git commit -m "feat: add admin landing page with Users/Library tiles; update nav link"
```

---

### Task 2: Server actions for topic CRUD

**Files:**
- Create: `app/(app)/admin/library/actions.ts`
- Create: `__tests__/admin/library/actions.test.ts`

Key design:
- `requireAdminUser()` calls `getIsAdmin()` and throws `"Not authorized"` if false
- `slugify(title)`: lowercase, replace non-alphanumeric runs with `-`, trim dashes
- `extractBaseUrl(url)`: `new URL(url).origin`, defaults to `""` on error
- Source is upserted by name; on update, if both `sourceName` and `url` provided, baseUrl derived from new url; else from existing topic url
- `createTopic`: upsert source → find last order in category → create topic
- `updateTopic`: find topic → upsert source if sourceName given → update
- `deleteTopic`: delete → re-index remaining by order in transaction
- `reorderTopics`: validate IDs all exist in category → batch update order in transaction
- All return `{ success: true, ... } | { error: string }`

- [ ] **Step 1: Write tests**

Create `__tests__/admin/library/actions.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

const mockDb = {
  source: { upsert: vi.fn() },
  category: { findUnique: vi.fn() },
  topic: {
    findFirst: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
}

vi.mock("@/lib/db", () => ({ db: mockDb }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/get-user-id", () => ({
  getIsAdmin: vi.fn().mockResolvedValue(true),
}))

import { createTopic, updateTopic, deleteTopic, reorderTopics } from "@/app/(app)/admin/library/actions"

beforeEach(() => {
  vi.clearAllMocks()
  // Reset getIsAdmin to default (admin)
  vi.mocked((await import("@/lib/get-user-id")).getIsAdmin).mockResolvedValue(true)
})

describe("createTopic", () => {
  it("creates a topic with upserted source", async () => {
    mockDb.source.upsert.mockResolvedValue({ id: "src-1" })
    mockDb.category.findUnique.mockResolvedValue({ id: "cat-1", slug: "technique" })
    mockDb.topic.findFirst.mockResolvedValue({ order: 2 })
    mockDb.topic.create.mockResolvedValue({ id: "topic-1" })

    const result = await createTopic("cat-1", {
      title: "Pentatonic Scales",
      url: "https://www.hubguitar.com/pentatonic",
      sourceName: "HubGuitar",
    })

    expect(result).toEqual({ success: true, id: "topic-1" })
    expect(mockDb.source.upsert).toHaveBeenCalledWith({
      where: { name: "HubGuitar" },
      update: {},
      create: { name: "HubGuitar", baseUrl: "https://www.hubguitar.com" },
    })
    expect(mockDb.topic.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Pentatonic Scales",
        url: "https://www.hubguitar.com/pentatonic",
        slug: "pentatonic-scales",
        order: 3,
        categoryId: "cat-1",
        sourceId: "src-1",
        description: "",
      }),
    })
  })

  it("returns error when category not found", async () => {
    mockDb.source.upsert.mockResolvedValue({ id: "src-1" })
    mockDb.category.findUnique.mockResolvedValue(null)

    const result = await createTopic("bad-id", {
      title: "Test",
      url: "https://example.com/test",
      sourceName: "Example",
    })

    expect(result).toEqual({ error: "Category not found" })
  })

  it("returns error when not admin", async () => {
    const { getIsAdmin } = await import("@/lib/get-user-id")
    vi.mocked(getIsAdmin).mockResolvedValueOnce(false)

    const result = await createTopic("cat-1", {
      title: "Test",
      url: "https://example.com/test",
      sourceName: "Example",
    })

    expect(result).toEqual({ error: "Not authorized" })
  })

  it("uses order 0 when no existing topics", async () => {
    mockDb.source.upsert.mockResolvedValue({ id: "src-1" })
    mockDb.category.findUnique.mockResolvedValue({ id: "cat-1", slug: "technique" })
    mockDb.topic.findFirst.mockResolvedValue(null)
    mockDb.topic.create.mockResolvedValue({ id: "topic-1" })

    await createTopic("cat-1", {
      title: "First Topic",
      url: "https://example.com/first",
      sourceName: "Example",
    })

    expect(mockDb.topic.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ order: 0 }),
    })
  })
})

describe("updateTopic", () => {
  it("updates topic fields and upserts source", async () => {
    mockDb.topic.findUnique.mockResolvedValue({
      id: "topic-1",
      categoryId: "cat-1",
      url: "https://www.hubguitar.com/old",
      category: { slug: "technique" },
    })
    mockDb.source.upsert.mockResolvedValue({ id: "src-1" })
    mockDb.topic.update.mockResolvedValue({})

    const result = await updateTopic("topic-1", {
      title: "Updated Title",
      sourceName: "HubGuitar",
    })

    expect(result).toEqual({ success: true })
    expect(mockDb.topic.update).toHaveBeenCalledWith({
      where: { id: "topic-1" },
      data: expect.objectContaining({ title: "Updated Title", slug: "updated-title", sourceId: "src-1" }),
    })
  })

  it("returns error when topic not found", async () => {
    mockDb.topic.findUnique.mockResolvedValue(null)
    const result = await updateTopic("bad-id", { title: "X" })
    expect(result).toEqual({ error: "Not found" })
  })

  it("updates without source when sourceName not provided", async () => {
    mockDb.topic.findUnique.mockResolvedValue({
      id: "topic-1",
      categoryId: "cat-1",
      url: "https://example.com/test",
      category: { slug: "technique" },
    })
    mockDb.topic.update.mockResolvedValue({})

    await updateTopic("topic-1", { description: "New description" })

    expect(mockDb.source.upsert).not.toHaveBeenCalled()
    expect(mockDb.topic.update).toHaveBeenCalledWith({
      where: { id: "topic-1" },
      data: expect.objectContaining({ description: "New description" }),
    })
  })
})

describe("deleteTopic", () => {
  it("deletes topic and re-indexes remaining", async () => {
    mockDb.topic.findUnique.mockResolvedValue({
      id: "topic-1",
      categoryId: "cat-1",
      category: { slug: "technique" },
    })
    const mockTx = {
      topic: {
        delete: vi.fn().mockResolvedValue({}),
        findMany: vi.fn().mockResolvedValue([{ id: "topic-2" }, { id: "topic-3" }]),
        update: vi.fn().mockResolvedValue({}),
      },
    }
    mockDb.$transaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<void>) => fn(mockTx))

    const result = await deleteTopic("topic-1")

    expect(result).toEqual({ success: true })
    expect(mockTx.topic.delete).toHaveBeenCalledWith({ where: { id: "topic-1" } })
    expect(mockTx.topic.update).toHaveBeenCalledTimes(2)
  })

  it("returns error when topic not found", async () => {
    mockDb.topic.findUnique.mockResolvedValue(null)
    const result = await deleteTopic("bad-id")
    expect(result).toEqual({ error: "Not found" })
  })
})

describe("reorderTopics", () => {
  it("reorders topics in category", async () => {
    mockDb.topic.findMany.mockResolvedValue([
      { id: "topic-1" },
      { id: "topic-2" },
    ])
    mockDb.$transaction.mockResolvedValue(undefined)

    const result = await reorderTopics("cat-1", ["topic-2", "topic-1"])

    expect(result).toEqual({ success: true })
  })

  it("returns error when IDs mismatch (wrong category or nonexistent)", async () => {
    mockDb.topic.findMany.mockResolvedValue([{ id: "topic-1" }])
    const result = await reorderTopics("cat-1", ["topic-1", "topic-99"])
    expect(result).toEqual({ error: "Invalid topics provided" })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/admin/library/actions.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement topic server actions**

Create `app/(app)/admin/library/actions.ts`:

```typescript
"use server"

import { revalidatePath } from "next/cache"
import { getIsAdmin } from "@/lib/get-user-id"
import { db } from "@/lib/db"

async function requireAdminUser(): Promise<void> {
  const isAdmin = await getIsAdmin()
  if (!isAdmin) throw new Error("Not authorized")
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function extractBaseUrl(url: string): string {
  try {
    return new URL(url).origin
  } catch {
    return ""
  }
}

function revalidateLibraryPaths(categorySlug?: string) {
  revalidatePath("/admin/library")
  revalidatePath("/library")
  if (categorySlug) revalidatePath(`/library/${categorySlug}`)
}

export async function createTopic(
  categoryId: string,
  data: { title: string; url: string; description?: string; sourceName: string }
): Promise<{ success: true; id: string } | { error: string }> {
  try {
    await requireAdminUser()
    const category = await db.category.findUnique({ where: { id: categoryId } })
    if (!category) return { error: "Category not found" }

    const source = await db.source.upsert({
      where: { name: data.sourceName },
      update: {},
      create: { name: data.sourceName, baseUrl: extractBaseUrl(data.url) },
    })

    const last = await db.topic.findFirst({
      where: { categoryId },
      orderBy: { order: "desc" },
    })
    const order = (last?.order ?? -1) + 1

    const topic = await db.topic.create({
      data: {
        title: data.title,
        url: data.url,
        slug: slugify(data.title),
        order,
        categoryId,
        sourceId: source.id,
        description: data.description ?? "",
      },
    })
    revalidateLibraryPaths(category.slug)
    return { success: true, id: topic.id }
  } catch (e) {
    if (e instanceof Error && e.message === "Not authorized") return { error: "Not authorized" }
    return { error: "Failed to create topic" }
  }
}

export async function updateTopic(
  id: string,
  data: { title?: string; url?: string; description?: string; sourceName?: string }
): Promise<{ success: true } | { error: string }> {
  try {
    await requireAdminUser()
    const topic = await db.topic.findUnique({
      where: { id },
      include: { category: true },
    })
    if (!topic) return { error: "Not found" }

    let sourceId: string | undefined
    if (data.sourceName !== undefined) {
      const source = await db.source.upsert({
        where: { name: data.sourceName },
        update: {},
        create: {
          name: data.sourceName,
          baseUrl: data.url ? extractBaseUrl(data.url) : extractBaseUrl(topic.url),
        },
      })
      sourceId = source.id
    }

    await db.topic.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title, slug: slugify(data.title) }),
        ...(data.url !== undefined && { url: data.url }),
        ...(data.description !== undefined && { description: data.description }),
        ...(sourceId !== undefined && { sourceId }),
      },
    })
    revalidateLibraryPaths(topic.category.slug)
    return { success: true }
  } catch (e) {
    if (e instanceof Error && e.message === "Not authorized") return { error: "Not authorized" }
    return { error: "Failed to update topic" }
  }
}

export async function deleteTopic(
  id: string
): Promise<{ success: true } | { error: string }> {
  try {
    await requireAdminUser()
    const topic = await db.topic.findUnique({
      where: { id },
      include: { category: true },
    })
    if (!topic) return { error: "Not found" }

    await db.$transaction(async (tx) => {
      await tx.topic.delete({ where: { id } })
      const remaining = await tx.topic.findMany({
        where: { categoryId: topic.categoryId },
        orderBy: { order: "asc" },
      })
      for (let i = 0; i < remaining.length; i++) {
        await tx.topic.update({ where: { id: remaining[i].id }, data: { order: i } })
      }
    })
    revalidateLibraryPaths(topic.category.slug)
    return { success: true }
  } catch (e) {
    if (e instanceof Error && e.message === "Not authorized") return { error: "Not authorized" }
    return { error: "Failed to delete topic" }
  }
}

export async function reorderTopics(
  categoryId: string,
  orderedIds: string[]
): Promise<{ success: true } | { error: string }> {
  try {
    await requireAdminUser()
    const topics = await db.topic.findMany({
      where: { categoryId, id: { in: orderedIds } },
    })
    if (topics.length !== orderedIds.length) {
      return { error: "Invalid topics provided" }
    }
    await db.$transaction(
      orderedIds.map((id, index) =>
        db.topic.update({ where: { id }, data: { order: index } })
      )
    )
    revalidatePath("/admin/library")
    revalidatePath("/library")
    return { success: true }
  } catch (e) {
    if (e instanceof Error && e.message === "Not authorized") return { error: "Not authorized" }
    return { error: "Failed to reorder topics" }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/admin/library/actions.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add app/(app)/admin/library/actions.ts __tests__/admin/library/actions.test.ts
git commit -m "feat: add admin library server actions for topic CRUD"
```

---

### Task 3: Admin library UI components

**Files:**
- Create: `app/(app)/admin/library/_components/add-topic-form.tsx`
- Create: `app/(app)/admin/library/_components/topic-card.tsx`
- Create: `app/(app)/admin/library/_components/topic-list.tsx`

These mirror `UserLessonList`, `UserLessonCard`, `AddLessonForm` from `app/(app)/library/manage/_components/`. Key differences from UserLesson components:
- `url` is required (not optional) — Topics must have a URL
- `sourceName` text field (no datalist, sources are upserted on demand)
- Delete modal uses `@base-ui/react` Dialog (matching `DeleteUserForm` pattern) instead of the custom fixed overlay used in `UserLessonCard`
- No tests needed for UI components (testing dnd-kit in unit tests is complex; actions are tested separately)

- [ ] **Step 1: Create AddTopicForm**

Create `app/(app)/admin/library/_components/add-topic-form.tsx`:

```tsx
"use client"

import { useState } from "react"
import { btn } from "@/lib/button-styles"
import { createTopic } from "@/app/(app)/admin/library/actions"

interface AddTopicFormProps {
  categoryId: string
  categoryName: string
  onCreated: () => void
}

export function AddTopicForm({ categoryId, categoryName, onCreated }: AddTopicFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")
  const [sourceName, setSourceName] = useState("")
  const [description, setDescription] = useState("")
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!title.trim()) { setError("Title is required"); return }
    if (!url.trim()) { setError("URL is required"); return }
    if (!sourceName.trim()) { setError("Source is required"); return }
    setIsPending(true)
    const result = await createTopic(categoryId, {
      title: title.trim(),
      url: url.trim(),
      sourceName: sourceName.trim(),
      description,
    })
    setIsPending(false)
    if ("error" in result) { setError(result.error); return }
    setTitle(""); setUrl(""); setSourceName(""); setDescription(""); setError(null)
    setIsOpen(false)
    onCreated()
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="mt-2 w-full text-sm text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg py-2 hover:border-foreground/40 transition-colors cursor-pointer"
      >
        + Add topic to {categoryName}
      </button>
    )
  }

  return (
    <div className="mt-2 rounded-lg border border-accent bg-card p-3 space-y-3">
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Title</label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">URL</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Source</label>
          <input
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            placeholder="e.g. HubGuitar"
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Add a description (supports Markdown)"
          className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-y"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={isPending} className={btn("primary", "sm")}>
          {isPending ? "Adding…" : "Add topic"}
        </button>
        <button
          onClick={() => { setIsOpen(false); setError(null) }}
          className={btn("standalone", "sm")}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create TopicCard**

Create `app/(app)/admin/library/_components/topic-card.tsx`:

```tsx
"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Dialog } from "@base-ui/react/dialog"
import { btn } from "@/lib/button-styles"
import { updateTopic, deleteTopic } from "@/app/(app)/admin/library/actions"

export type TopicItem = {
  id: string
  title: string
  url: string
  slug: string
  description: string
  order: number
  source: { name: string }
}

interface TopicCardProps {
  topic: TopicItem
  onChanged: () => void
}

export function TopicCard({ topic, onChanged }: TopicCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [title, setTitle] = useState(topic.title)
  const [url, setUrl] = useState(topic.url)
  const [sourceName, setSourceName] = useState(topic.source.name)
  const [description, setDescription] = useState(topic.description)
  const [error, setError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: topic.id, disabled: isEditing })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  async function handleSave() {
    if (!title.trim()) { setError("Title is required"); return }
    if (!url.trim()) { setError("URL is required"); return }
    if (!sourceName.trim()) { setError("Source is required"); return }
    setIsSaving(true)
    const result = await updateTopic(topic.id, {
      title: title.trim(),
      url: url.trim(),
      sourceName: sourceName.trim(),
      description,
    })
    setIsSaving(false)
    if ("error" in result) { setError(result.error); return }
    setIsEditing(false)
    setError(null)
    onChanged()
  }

  async function handleDelete() {
    setIsDeleting(true)
    setDeleteError(null)
    const result = await deleteTopic(topic.id)
    if ("error" in result) {
      setDeleteError(result.error)
      setIsDeleting(false)
    } else {
      setShowDeleteModal(false)
      onChanged()
    }
  }

  return (
    <>
      <div ref={setNodeRef} style={style} className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center gap-2 p-3">
          <button
            type="button"
            className={`text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none flex-shrink-0 ${isEditing ? "opacity-30 pointer-events-none" : ""}`}
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            ⠿
          </button>

          <div
            className="flex flex-1 items-center gap-2 min-w-0 cursor-pointer"
            onClick={() => setIsExpanded((v) => !v)}
          >
            <span className="text-sm text-foreground font-medium truncate">{topic.title}</span>
            <span className="text-xs text-muted-foreground border border-border px-1.5 py-0.5 rounded flex-shrink-0">
              {topic.source.name}
            </span>
            <span className="flex-1" />
          </div>

          {isEditing ? (
            <>
              <button onClick={handleSave} disabled={isSaving} className={btn("primary", "sm")}>
                {isSaving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => {
                  setTitle(topic.title)
                  setUrl(topic.url)
                  setSourceName(topic.source.name)
                  setDescription(topic.description)
                  setIsEditing(false)
                  setError(null)
                }}
                disabled={isSaving}
                className={btn("standalone", "sm")}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => { setIsExpanded(true); setIsEditing(true) }}
              className={btn("standalone", "sm")}
            >
              Edit
            </button>
          )}

          <button
            onClick={() => { setShowDeleteModal(true); setDeleteError(null) }}
            className={btn("destructive", "sm")}
          >
            Delete
          </button>
        </div>

        {/* Expanded panel */}
        {isExpanded && (
          <div className="px-3 pb-3 border-t border-border pt-3 space-y-3">
            {isEditing ? (
              <>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Title</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">URL</label>
                    <input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Source</label>
                    <input
                      value={sourceName}
                      onChange={(e) => setSourceName(e.target.value)}
                      placeholder="e.g. HubGuitar"
                      className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Add a description (supports Markdown)"
                    className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-y"
                  />
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
              </>
            ) : (
              <>
                {topic.url && (
                  <p className="text-sm">
                    <a
                      href={topic.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                    >
                      {topic.url}
                    </a>
                  </p>
                )}
                {topic.description && (
                  <div className="prose prose-sm max-w-none text-foreground text-sm">
                    <ReactMarkdown>{topic.description}</ReactMarkdown>
                  </div>
                )}
                {!topic.url && !topic.description && (
                  <p className="text-xs text-muted-foreground italic">No details added.</p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog.Root
        open={showDeleteModal}
        onOpenChange={(open) => { if (!open) { setShowDeleteModal(false); setDeleteError(null) } }}
        disablePointerDismissal={isDeleting}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-[51] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-xl transition duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0">
            <div className="space-y-4">
              <Dialog.Title className="text-sm font-semibold">Remove topic?</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{topic.title}</span> will be permanently removed from the standard library. This cannot be undone.
              </Dialog.Description>
              {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className={btn("destructive", "sm")}
                >
                  {isDeleting ? "Removing…" : "Remove topic"}
                </button>
                <Dialog.Close disabled={isDeleting} className={btn("standalone", "sm")}>
                  Cancel
                </Dialog.Close>
              </div>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
```

- [ ] **Step 3: Create TopicList**

Create `app/(app)/admin/library/_components/topic-list.tsx`:

```tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import type { DragEndEvent } from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { reorderTopics } from "@/app/(app)/admin/library/actions"
import { TopicCard } from "./topic-card"
import { AddTopicForm } from "./add-topic-form"
import type { TopicItem } from "./topic-card"

interface TopicListProps {
  categoryId: string
  categoryName: string
  initialTopics: TopicItem[]
}

export function TopicList({ categoryId, categoryName, initialTopics }: TopicListProps) {
  const [topics, setTopics] = useState([...initialTopics].sort((a, b) => a.order - b.order))
  const router = useRouter()

  useEffect(() => {
    setTopics([...initialTopics].sort((a, b) => a.order - b.order))
  }, [initialTopics])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = topics.findIndex((t) => t.id === active.id)
    const newIndex = topics.findIndex((t) => t.id === over.id)
    const reordered = arrayMove(topics, oldIndex, newIndex)
    setTopics(reordered)
    const result = await reorderTopics(categoryId, reordered.map((t) => t.id))
    if ("error" in result) {
      setTopics(topics)
    }
  }

  function handleChanged() {
    router.refresh()
  }

  return (
    <div>
      <DndContext
        id={`topic-list-${categoryId}`}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={topics.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {topics.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                onChanged={handleChanged}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <AddTopicForm
        categoryId={categoryId}
        categoryName={categoryName}
        onCreated={handleChanged}
      />
    </div>
  )
}
```

- [ ] **Step 4: Run existing tests to confirm no regressions**

Run: `npx vitest run __tests__/admin/library/actions.test.ts __tests__/admin/page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/(app)/admin/library/_components/
git commit -m "feat: add TopicList, TopicCard, AddTopicForm for admin library management"
```

---

### Task 4: Admin library page

**Files:**
- Create: `app/(app)/admin/library/page.tsx`

Fetch all categories with their topics (ordered, including source), render TopicList for each. Pattern mirrors `app/(app)/library/manage/page.tsx`.

- [ ] **Step 1: Create the admin library page**

Create `app/(app)/admin/library/page.tsx`:

```tsx
import Link from "next/link"
import { requireAdmin } from "@/lib/require-admin"
import { db } from "@/lib/db"
import { TopicList } from "./_components/topic-list"

export default async function AdminLibraryPage() {
  await requireAdmin()

  const categories = await db.category.findMany({
    orderBy: { order: "asc" },
    include: {
      topics: {
        orderBy: { order: "asc" },
        include: { source: true },
      },
    },
  })

  return (
    <div className="pt-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-1"
        >
          ← Admin
        </Link>
        <h1 className="text-2xl font-semibold text-foreground mb-6">Manage standard library</h1>
      </div>

      <div className="space-y-10">
        {categories.map((cat) => (
          <section key={cat.id} id={cat.slug}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-foreground">{cat.name}</h2>
              <Link
                href={`/library/${cat.slug}`}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View public →
              </Link>
            </div>
            <TopicList
              categoryId={cat.id}
              categoryName={cat.name}
              initialTopics={cat.topics}
            />
          </section>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add app/(app)/admin/library/page.tsx
git commit -m "feat: admin library page to manage standard library topics"
```

---

## Verification

1. **Dev server:** `npm run dev` — navigate to `/admin`
2. **Admin landing page:** Two tiles — "User Management" (→ /admin/users) and "Library Management" (→ /admin/library)
3. **Navbar:** Admin link points to `/admin` (not `/admin/users`)
4. **Admin library:** Shows all categories with their topics, each with a drag handle, Edit, and Delete button
5. **Add topic:** Click `+ Add topic to X`, fill in Title (required), URL (required), Source (required); saves to DB and refreshes
6. **Edit topic:** Click Edit on a card, modify fields, save — slug auto-regenerated from title
7. **Delete topic:** Click Delete, Dialog modal appears with topic name, "Remove topic" (destructive, left) and Cancel (right); confirm removes topic
8. **Non-admin redirect:** Visiting `/admin/library` as a non-admin redirects to `/` (admin layout protection)
9. **Full test suite:** `npx vitest run` — all pass
