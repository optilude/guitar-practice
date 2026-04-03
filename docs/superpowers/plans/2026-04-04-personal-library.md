# Personal Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a personal library of user-managed lesson links, with Standard/Personal tabs on category pages, a `/library/manage` page with drag-and-drop reordering, and full integration with the routine builder.

**Architecture:** Nine tasks in dependency order: schema first, then core logic, then server actions, then UI (overview → category → manage → routine). All client interactivity follows the DnD/inline-edit patterns established in the routine builder. The `computeRefKey` / `formatTopicName` helpers in `lib/goals.ts` are extended to handle personal lessons; `AddToGoalButton` gains a `userLessonId` prop; the routine page Prisma query gains `userLesson` includes.

**Tech Stack:** Next.js 16 App Router, Prisma 7, React useState/useEffect, @dnd-kit (already installed), native `<datalist>` for source autocomplete, Vitest + React Testing Library.

---

## File map

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `UserLesson` model; `description` on `Topic`; `userLessonId` on `GoalTopic`; back-relations on `User` + `Category` |
| `lib/goals.ts` | Extend `computeRefKey` and `formatTopicName` for personal lessons |
| `__tests__/goals/lib.test.ts` | Tests for updated `computeRefKey` and `formatTopicName` |
| `app/(app)/goals/actions.ts` | Add `userLessonId` to `addTopicToGoal` param |
| `components/add-to-goal-button.tsx` | Add `userLessonId` prop |
| `app/(app)/library/actions.ts` | New: CRUD + reorder for `UserLesson`; source list query |
| `app/(app)/library/page.tsx` | Add "Manage my library" link |
| `app/(app)/library/[category]/_components/category-tabs.tsx` | New: Standard/Personal tabs + unified lesson rows with expandable descriptions |
| `app/(app)/library/[category]/page.tsx` | Fetch personal lessons; render `CategoryTabs` |
| `app/(app)/library/manage/_components/user-lesson-list.tsx` | New: DnD-sortable list per category |
| `app/(app)/library/manage/_components/user-lesson-card.tsx` | New: inline-edit card with delete |
| `app/(app)/library/manage/_components/add-lesson-form.tsx` | New: collapsed add form |
| `app/(app)/library/manage/page.tsx` | New: manage page (server component) |
| `app/(app)/goals/[goalId]/routines/[routineId]/page.tsx` | Add `userLesson` includes to Prisma query |
| `app/(app)/goals/[goalId]/routines/[routineId]/_components/section-card.tsx` | Extend `GoalTopicForDisplay` type |
| `__tests__/library.test.tsx` | Update mocks; add tests for "Manage" link, tabs, personal lessons |

---

### Task 1: Schema — add `UserLesson`, `description` on `Topic`, `userLessonId` on `GoalTopic`

**Files:**
- Modify: `prisma/schema.prisma`

No unit tests cover the schema directly. Verification is running the migration and confirming the existing test suite still passes.

- [ ] **Step 1: Add back-relations and new fields to existing models**

In `prisma/schema.prisma`, make these four edits:

**In `User` model** — add after `goals Goal[]`:
```prisma
  userLessons  UserLesson[]
```

**In `Category` model** — add after `topics Topic[]`:
```prisma
  userLessons  UserLesson[]
```

**In `Topic` model** — add after `createdAt DateTime @default(now())`:
```prisma
  description  String      @default("")
```

**In `GoalTopic` model** — add after `lesson Topic? @relation(...)`:
```prisma
  userLessonId  String?
  userLesson    UserLesson? @relation(fields: [userLessonId], references: [id], onDelete: SetNull)
```

- [ ] **Step 2: Add the `UserLesson` model**

At the end of `prisma/schema.prisma`, after the `SectionTopic` model, add:

```prisma
model UserLesson {
  id          String      @id @default(cuid())
  userId      String
  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  categoryId  String
  category    Category    @relation(fields: [categoryId], references: [id])
  title       String
  url         String?
  description String      @default("")
  source      String      @default("")
  order       Int
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  goalTopics  GoalTopic[]

  @@index([userId, categoryId])
}
```

- [ ] **Step 3: Run migration**

```bash
npx prisma migrate dev --name add-user-lessons
```

Expected: migration file created and applied, no errors. If prompted for a migration name it is already provided.

- [ ] **Step 4: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: client regenerated with new types, no errors.

- [ ] **Step 5: Run test suite to confirm no regressions**

```bash
npm test
```

Expected: same passing count as before (302 tests), 0 failures.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add UserLesson model, description to Topic, userLessonId to GoalTopic"
```

---

### Task 2: Extend `computeRefKey` and `formatTopicName` for personal lessons

**Files:**
- Modify: `lib/goals.ts` (lines 1–13, 16–21, 23–44)
- Modify: `__tests__/goals/lib.test.ts`

- [ ] **Step 1: Write failing tests**

In `__tests__/goals/lib.test.ts`, add these tests inside the `describe("computeRefKey")` block:

```ts
  it("returns user_lesson:{id} for personal lessons", () => {
    expect(computeRefKey({ kind: "lesson", userLessonId: "ul-abc" })).toBe("user_lesson:ul-abc")
  })

  it("prefers userLessonId over lessonId when both are provided", () => {
    expect(computeRefKey({ kind: "lesson", userLessonId: "ul-abc", lessonId: "xyz" })).toBe("user_lesson:ul-abc")
  })
```

And inside the `describe("formatTopicName")` block:

```ts
  it("formats personal lesson topics using the userLesson title", () => {
    const topic = {
      kind: "lesson" as const,
      subtype: null,
      defaultKey: null,
      lesson: null,
      userLesson: { title: "My Custom Lesson", url: null },
    }
    expect(formatTopicName(topic)).toBe("My Custom Lesson")
  })

  it("prefers userLesson title over lesson title when both are present", () => {
    const topic = {
      kind: "lesson" as const,
      subtype: null,
      defaultKey: null,
      lesson: { title: "Standard Lesson" },
      userLesson: { title: "Personal Override", url: null },
    }
    expect(formatTopicName(topic)).toBe("Personal Override")
  })
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run __tests__/goals/lib.test.ts
```

Expected: 4 new tests fail, existing 12 tests pass.

- [ ] **Step 3: Update `lib/goals.ts`**

Replace the file content with:

```ts
import type { TopicKind } from "@/lib/generated/prisma/client"
import { listProgressions } from "@/lib/theory/progressions"

export function computeRefKey(topicRef: {
  kind: TopicKind
  subtype?: string | null
  lessonId?: string | null
  userLessonId?: string | null
  defaultKey?: string | null
}): string {
  if (topicRef.kind === "lesson" && topicRef.userLessonId) {
    return `user_lesson:${topicRef.userLessonId}`
  }
  if (topicRef.kind === "lesson" && topicRef.lessonId) {
    return `lesson:${topicRef.lessonId}`
  }
  return `${topicRef.kind}:${topicRef.subtype ?? ""}:${topicRef.defaultKey ?? ""}`
}

type GoalTopicForDisplay = {
  kind: TopicKind
  subtype: string | null
  defaultKey: string | null
  lesson?: { title: string } | null
  userLesson?: { title: string; url: string | null } | null
}

export function formatTopicName(topic: GoalTopicForDisplay): string {
  switch (topic.kind) {
    case "lesson":
      return topic.userLesson?.title ?? topic.lesson?.title ?? "Unknown lesson"
    case "scale":
      return `${topic.defaultKey ?? ""} ${topic.subtype ?? ""} scale`.trim()
    case "chord":
      return `${topic.defaultKey ?? ""}${topic.subtype ?? ""} chord`
    case "triad":
      return `${topic.defaultKey ?? ""} ${topic.subtype ?? ""} triad`.trim()
    case "arpeggio":
      return `${topic.defaultKey ?? ""} ${topic.subtype ?? ""} arpeggio`.trim()
    case "progression": {
      const prog = listProgressions().find((p) => p.name === topic.subtype)
      return prog?.displayName ?? topic.subtype ?? "Unknown progression"
    }
    case "harmony":
      return `${topic.defaultKey ?? ""} ${topic.subtype ?? ""}`.trim()
    default:
      return "Unknown topic"
  }
}
```

- [ ] **Step 4: Run tests to confirm all pass**

```bash
npx vitest run __tests__/goals/lib.test.ts
```

Expected: all 16 tests pass.

- [ ] **Step 5: Run full suite**

```bash
npm test
```

Expected: 306 tests pass, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add lib/goals.ts __tests__/goals/lib.test.ts
git commit -m "feat: extend computeRefKey and formatTopicName for personal lessons"
```

---

### Task 3: Extend `addTopicToGoal` and `AddToGoalButton` for personal lessons

**Files:**
- Modify: `app/(app)/goals/actions.ts` (lines 134–165)
- Modify: `components/add-to-goal-button.tsx` (lines 7–13, 60–68)

No new unit tests — server actions are verified by running the full test suite.

- [ ] **Step 1: Update `addTopicToGoal` in `app/(app)/goals/actions.ts`**

Replace lines 134–165 with:

```ts
export async function addTopicToGoal(
  goalId: string,
  topicRef: {
    kind: TopicKind
    subtype?: string
    lessonId?: string
    userLessonId?: string
    defaultKey?: string
  }
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const goal = await db.goal.findUnique({ where: { id: goalId } })
    if (!goal || goal.userId !== userId) return { error: "Not found" }
    const refKey = computeRefKey(topicRef)
    await db.goalTopic.upsert({
      where: { goalId_refKey: { goalId, refKey } },
      create: {
        goalId,
        kind: topicRef.kind,
        subtype: topicRef.subtype ?? null,
        lessonId: topicRef.lessonId ?? null,
        userLessonId: topicRef.userLessonId ?? null,
        defaultKey: topicRef.defaultKey ?? null,
        refKey,
      },
      update: {},
    })
    revalidatePath(`/goals/${goalId}`)
    return { success: true }
  } catch {
    return { error: "Failed to add topic" }
  }
}
```

- [ ] **Step 2: Update `AddToGoalButton` in `components/add-to-goal-button.tsx`**

Replace lines 7–13 (the interface) with:

```tsx
interface AddToGoalButtonProps {
  kind: TopicKind
  subtype?: string
  defaultKey?: string
  lessonId?: string
  userLessonId?: string
  displayName: string
  popupAlign?: "left" | "right"
}
```

Replace lines 16–23 (the function signature destructuring) with:

```tsx
export function AddToGoalButton({
  kind,
  subtype,
  defaultKey,
  lessonId,
  userLessonId,
  displayName,
  popupAlign = "left",
}: AddToGoalButtonProps) {
```

Replace lines 63–68 (the `addTopicToGoal` call inside `handleAdd`) with:

```tsx
    const result = await addTopicToGoal(selectedGoalId, {
      kind,
      subtype,
      lessonId,
      userLessonId,
      defaultKey,
    })
```

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: 306 tests pass, 0 failures.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/goals/actions.ts components/add-to-goal-button.tsx
git commit -m "feat: extend addTopicToGoal and AddToGoalButton for personal lessons"
```

---

### Task 4: Create library server actions

**Files:**
- Create: `app/(app)/library/actions.ts`

- [ ] **Step 1: Create `app/(app)/library/actions.ts`**

```ts
"use server"

import { revalidatePath } from "next/cache"
import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"

async function requireUserId(): Promise<string> {
  const userId = await getUserId()
  if (!userId) throw new Error("Not authenticated")
  return userId
}

function revalidateLibraryPaths(categorySlug?: string) {
  revalidatePath("/library")
  revalidatePath("/library/manage")
  if (categorySlug) revalidatePath(`/library/${categorySlug}`)
}

export async function createUserLesson(
  categoryId: string,
  data: { title: string; url?: string; description?: string; source?: string }
): Promise<{ success: true; id: string } | { error: string }> {
  try {
    const userId = await requireUserId()
    const category = await db.category.findUnique({ where: { id: categoryId } })
    if (!category) return { error: "Category not found" }
    const last = await db.userLesson.findFirst({
      where: { userId, categoryId },
      orderBy: { order: "desc" },
    })
    const order = (last?.order ?? -1) + 1
    const lesson = await db.userLesson.create({
      data: {
        userId,
        categoryId,
        title: data.title,
        url: data.url?.trim() || null,
        description: data.description ?? "",
        source: data.source ?? "",
        order,
      },
    })
    revalidateLibraryPaths(category.slug)
    return { success: true, id: lesson.id }
  } catch {
    return { error: "Failed to create lesson" }
  }
}

export async function updateUserLesson(
  id: string,
  data: { title?: string; url?: string | null; description?: string; source?: string }
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const lesson = await db.userLesson.findUnique({
      where: { id },
      include: { category: true },
    })
    if (!lesson || lesson.userId !== userId) return { error: "Not found" }
    await db.userLesson.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.url !== undefined && { url: data.url }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.source !== undefined && { source: data.source }),
      },
    })
    revalidateLibraryPaths(lesson.category.slug)
    return { success: true }
  } catch {
    return { error: "Failed to update lesson" }
  }
}

export async function deleteUserLesson(
  id: string
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const lesson = await db.userLesson.findUnique({
      where: { id },
      include: { category: true },
    })
    if (!lesson || lesson.userId !== userId) return { error: "Not found" }
    await db.$transaction(async (tx) => {
      await tx.userLesson.delete({ where: { id } })
      const remaining = await tx.userLesson.findMany({
        where: { userId, categoryId: lesson.categoryId },
        orderBy: { order: "asc" },
      })
      for (let i = 0; i < remaining.length; i++) {
        await tx.userLesson.update({ where: { id: remaining[i].id }, data: { order: i } })
      }
    })
    revalidateLibraryPaths(lesson.category.slug)
    return { success: true }
  } catch {
    return { error: "Failed to delete lesson" }
  }
}

export async function reorderUserLessons(
  categoryId: string,
  orderedIds: string[]
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    await db.$transaction(
      orderedIds.map((id, index) =>
        db.userLesson.update({
          where: { id, userId },
          data: { order: index },
        })
      )
    )
    revalidatePath("/library/manage")
    return { success: true }
  } catch {
    return { error: "Failed to reorder lessons" }
  }
}
```

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

Expected: 306 tests pass, 0 failures.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/library/actions.ts
git commit -m "feat: add library server actions for UserLesson CRUD and reordering"
```

---

### Task 5: Library overview page — add "Manage my library" link

**Files:**
- Modify: `app/(app)/library/page.tsx`
- Modify: `__tests__/library.test.tsx`

- [ ] **Step 1: Write a failing test**

In `__tests__/library.test.tsx`, inside the `describe("LibraryPage")` block, add:

```ts
  it("renders a 'Manage my library' link to /library/manage", async () => {
    render(await LibraryPage())
    const link = screen.getByRole("link", { name: /manage my library/i })
    expect(link).toHaveAttribute("href", "/library/manage")
  })
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npx vitest run __tests__/library.test.tsx
```

Expected: 1 new test fails, existing 3 tests pass.

- [ ] **Step 3: Update `app/(app)/library/page.tsx`**

Replace the file with:

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
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Browse
        </p>
        <Link
          href="/library/manage"
          className="text-xs text-accent hover:underline"
        >
          Manage my library ↗
        </Link>
      </div>
      <h1 className="text-2xl font-semibold text-foreground mb-6">Library</h1>
      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/library/${cat.slug}`}
            className="block rounded-lg border border-border dark:border-neutral-600 bg-card dark:bg-neutral-800 p-4 shadow-sm hover:shadow-md hover:border-foreground transition-all"
          >
            <p className="text-sm font-medium text-foreground">{cat.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {cat._count.topics} topics
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm all pass**

```bash
npx vitest run __tests__/library.test.tsx
```

Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/library/page.tsx __tests__/library.test.tsx
git commit -m "feat: add Manage my library link to library overview"
```

---

### Task 6: Library category page — Standard/Personal tabs, unified rows, expandable descriptions

**Files:**
- Create: `app/(app)/library/[category]/_components/category-tabs.tsx`
- Modify: `app/(app)/library/[category]/page.tsx`
- Modify: `__tests__/library.test.tsx`

- [ ] **Step 1: Update mocks in `__tests__/library.test.tsx`**

Replace the existing `vi.mock("@/lib/db", ...)` block at the top of the file with:

```ts
vi.mock("@/lib/db", () => ({
  db: {
    category: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    userLesson: {
      findMany: vi.fn(),
    },
  },
}))
```

Add a new mock below the existing mocks (before the imports):

```ts
vi.mock("@/lib/get-user-id", () => ({
  getUserId: vi.fn().mockResolvedValue(null),
}))
```

Add this import alongside the existing imports:

```ts
import { getUserId } from "@/lib/get-user-id"
```

In the `describe("CategoryPage")` `beforeEach`, add:

```ts
    vi.mocked(db.userLesson.findMany).mockResolvedValue([])
```

- [ ] **Step 2: Write failing tests for tab behaviour**

In `__tests__/library.test.tsx`, inside `describe("CategoryPage")`, add:

```ts
  it("shows no tabs when user has no personal lessons", async () => {
    vi.mocked(db.category.findUnique).mockResolvedValue(mockCategory as any)
    vi.mocked(db.userLesson.findMany).mockResolvedValue([])
    render(await CategoryPage({ params: Promise.resolve({ category: "technique" }) }))
    expect(screen.queryByText("Standard")).not.toBeInTheDocument()
    expect(screen.queryByText("Personal")).not.toBeInTheDocument()
  })

  it("shows Standard and Personal tabs when user has personal lessons", async () => {
    vi.mocked(getUserId).mockResolvedValueOnce("user-1")
    vi.mocked(db.category.findUnique).mockResolvedValue(mockCategory as any)
    vi.mocked(db.userLesson.findMany).mockResolvedValue([
      {
        id: "ul1",
        title: "My Custom Lesson",
        url: "https://example.com",
        description: "",
        source: "YouTube",
        order: 0,
        userId: "user-1",
        categoryId: "1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any)
    render(await CategoryPage({ params: Promise.resolve({ category: "technique" }) }))
    expect(screen.getByText("Standard")).toBeInTheDocument()
    expect(screen.getByText("Personal")).toBeInTheDocument()
  })

  it("renders a Manage my library link with correct href", async () => {
    vi.mocked(db.category.findUnique).mockResolvedValue(mockCategory as any)
    vi.mocked(db.userLesson.findMany).mockResolvedValue([])
    render(await CategoryPage({ params: Promise.resolve({ category: "technique" }) }))
    const link = screen.getByRole("link", { name: /manage my library/i })
    expect(link).toHaveAttribute("href", "/library/manage#technique")
  })
```

- [ ] **Step 3: Run to confirm new tests fail, existing pass**

```bash
npx vitest run __tests__/library.test.tsx
```

Expected: 3 new tests fail, existing 4 tests pass.

- [ ] **Step 4: Create `app/(app)/library/[category]/_components/category-tabs.tsx`**

```tsx
"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"
import { cn } from "@/lib/utils"
import { AddToGoalButton } from "@/components/add-to-goal-button"

type StandardTopic = {
  id: string
  title: string
  url: string
  description: string
  source: { name: string }
}

type UserLesson = {
  id: string
  title: string
  url: string | null
  description: string
  source: string
}

function LessonRow({
  title,
  url,
  source,
  description,
  addToGoalProps,
}: {
  title: string
  url?: string | null
  source: string
  description: string
  addToGoalProps: {
    kind: "lesson"
    lessonId?: string
    userLessonId?: string
    displayName: string
  }
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasDescription = Boolean(description)

  return (
    <li>
      <div className="flex items-center gap-2 py-2 min-w-0">
        <div className="flex flex-1 items-center gap-2 min-w-0">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-foreground hover:text-muted-foreground transition-colors truncate"
            >
              {title}
            </a>
          ) : (
            <span className="text-sm text-foreground truncate">{title}</span>
          )}
          {source && (
            <span className="text-xs text-muted-foreground border border-border px-1.5 py-0.5 rounded flex-shrink-0">
              {source}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasDescription ? (
            <button
              onClick={() => setIsExpanded((v) => !v)}
              className="w-5 text-center text-muted-foreground hover:text-foreground transition-colors text-xs"
              aria-label={isExpanded ? "Collapse description" : "Expand description"}
            >
              {isExpanded ? "▾" : "▸"}
            </button>
          ) : (
            <span className="w-5 flex-shrink-0" />
          )}
          <AddToGoalButton {...addToGoalProps} />
        </div>
      </div>
      {isExpanded && hasDescription && (
        <div className="pb-2 pl-0 prose prose-sm max-w-none text-muted-foreground text-xs">
          <ReactMarkdown>{description}</ReactMarkdown>
        </div>
      )}
    </li>
  )
}

interface CategoryTabsProps {
  standardTopics: StandardTopic[]
  userLessons: UserLesson[]
}

export function CategoryTabs({ standardTopics, userLessons }: CategoryTabsProps) {
  const [activeTab, setActiveTab] = useState<"standard" | "personal">("standard")
  const hasPersonal = userLessons.length > 0

  return (
    <>
      {hasPersonal && (
        <div className="flex border-b border-border mb-4">
          {(["standard", "personal"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize",
                activeTab === tab
                  ? "border-accent text-accent"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === "standard" ? "Standard" : "Personal"}
            </button>
          ))}
        </div>
      )}

      {(!hasPersonal || activeTab === "standard") && (
        <ul className="space-y-0">
          {standardTopics.map((topic) => (
            <LessonRow
              key={topic.id}
              title={topic.title}
              url={topic.url}
              source={topic.source.name}
              description={topic.description}
              addToGoalProps={{ kind: "lesson", lessonId: topic.id, displayName: topic.title }}
            />
          ))}
        </ul>
      )}

      {hasPersonal && activeTab === "personal" && (
        <ul className="space-y-0">
          {userLessons.map((lesson) => (
            <LessonRow
              key={lesson.id}
              title={lesson.title}
              url={lesson.url}
              source={lesson.source}
              description={lesson.description}
              addToGoalProps={{ kind: "lesson", userLessonId: lesson.id, displayName: lesson.title }}
            />
          ))}
        </ul>
      )}
    </>
  )
}
```

- [ ] **Step 5: Update `app/(app)/library/[category]/page.tsx`**

Replace the file with:

```tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { getUserId } from "@/lib/get-user-id"
import { CategoryTabs } from "./_components/category-tabs"

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params

  const data = await db.category.findUnique({
    where: { slug: category },
    include: { topics: { orderBy: { order: "asc" }, include: { source: true } } },
  })

  if (!data) return notFound()

  const userId = await getUserId()
  const userLessons = userId
    ? await db.userLesson.findMany({
        where: { userId, categoryId: data.id },
        orderBy: { order: "asc" },
      })
    : []

  // Add empty description for topics that predate this field (TypeScript safety)
  const standardTopics = data.topics.map((t) => ({
    ...t,
    description: (t as any).description ?? "",
  }))

  return (
    <div className="pt-6">
      <Link
        href="/library"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-1"
      >
        ← Library
      </Link>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-foreground">{data.name}</h1>
        <Link
          href={`/library/manage#${data.slug}`}
          className="text-xs text-accent hover:underline"
        >
          Manage my library ↗
        </Link>
      </div>
      <CategoryTabs standardTopics={standardTopics} userLessons={userLessons} />
    </div>
  )
}
```

- [ ] **Step 6: Run tests to confirm all pass**

```bash
npx vitest run __tests__/library.test.tsx
```

Expected: all 7 tests pass.

- [ ] **Step 7: Run full suite**

```bash
npm test
```

Expected: 309 tests pass, 0 failures.

- [ ] **Step 8: Commit**

```bash
git add app/\(app\)/library/\[category\]/ __tests__/library.test.tsx
git commit -m "feat: add Standard/Personal tabs and expandable descriptions to library category page"
```

---

### Task 7: Manage page — components

**Files:**
- Create: `app/(app)/library/manage/_components/user-lesson-list.tsx`
- Create: `app/(app)/library/manage/_components/user-lesson-card.tsx`
- Create: `app/(app)/library/manage/_components/add-lesson-form.tsx`

No unit tests — UI components are verified by browser testing in Task 8.

- [ ] **Step 1: Create `app/(app)/library/manage/_components/user-lesson-list.tsx`**

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
import { reorderUserLessons } from "@/app/(app)/library/actions"
import { UserLessonCard } from "./user-lesson-card"
import { AddLessonForm } from "./add-lesson-form"

export type UserLessonItem = {
  id: string
  title: string
  url: string | null
  description: string
  source: string
  order: number
}

interface UserLessonListProps {
  categoryId: string
  categoryName: string
  initialLessons: UserLessonItem[]
  sourceOptions: string[]
}

export function UserLessonList({
  categoryId,
  categoryName,
  initialLessons,
  sourceOptions,
}: UserLessonListProps) {
  const [lessons, setLessons] = useState(initialLessons)
  const router = useRouter()

  useEffect(() => {
    setLessons(initialLessons)
  }, [initialLessons])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = lessons.findIndex((l) => l.id === active.id)
    const newIndex = lessons.findIndex((l) => l.id === over.id)
    const reordered = arrayMove(lessons, oldIndex, newIndex)
    setLessons(reordered)
    await reorderUserLessons(categoryId, reordered.map((l) => l.id))
  }

  function handleChanged() {
    router.refresh()
  }

  return (
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={lessons.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {lessons.map((lesson) => (
              <UserLessonCard
                key={lesson.id}
                lesson={lesson}
                sourceOptions={sourceOptions}
                onChanged={handleChanged}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <AddLessonForm
        categoryId={categoryId}
        categoryName={categoryName}
        sourceOptions={sourceOptions}
        onCreated={handleChanged}
      />
    </div>
  )
}
```

- [ ] **Step 2: Create `app/(app)/library/manage/_components/user-lesson-card.tsx`**

```tsx
"use client"

import { useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { updateUserLesson, deleteUserLesson } from "@/app/(app)/library/actions"
import type { UserLessonItem } from "./user-lesson-list"

interface UserLessonCardProps {
  lesson: UserLessonItem
  sourceOptions: string[]
  onChanged: () => void
}

export function UserLessonCard({ lesson, sourceOptions, onChanged }: UserLessonCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [title, setTitle] = useState(lesson.title)
  const [url, setUrl] = useState(lesson.url ?? "")
  const [source, setSource] = useState(lesson.source)
  const [description, setDescription] = useState(lesson.description)
  const [error, setError] = useState<string | null>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lesson.id, disabled: isEditing })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  async function handleSave() {
    if (!title.trim()) { setError("Title is required"); return }
    setIsSaving(true)
    const result = await updateUserLesson(lesson.id, {
      title: title.trim(),
      url: url.trim() || null,
      source: source.trim(),
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
    const result = await deleteUserLesson(lesson.id)
    if ("error" in result) {
      setError(result.error)
      setIsDeleting(false)
      setShowDeleteModal(false)
    } else {
      onChanged()
    }
  }

  return (
    <>
      <div ref={setNodeRef} style={style} className="rounded-lg border border-border bg-card overflow-hidden">
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
          <div className="flex flex-1 items-center gap-2 min-w-0">
            {lesson.url ? (
              <a
                href={lesson.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent font-medium truncate"
              >
                {lesson.title}
              </a>
            ) : (
              <span className="text-sm text-foreground font-medium truncate">{lesson.title}</span>
            )}
            {lesson.source && (
              <span className="text-xs text-muted-foreground border border-border px-1.5 py-0.5 rounded flex-shrink-0">
                {lesson.source}
              </span>
            )}
          </div>
          {isEditing ? (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="text-xs text-accent border border-accent px-2 py-1 rounded flex-shrink-0 disabled:opacity-50"
            >
              {isSaving ? "Saving…" : "Done"}
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-muted-foreground border border-border px-2 py-1 rounded flex-shrink-0 hover:text-foreground transition-colors"
            >
              Edit
            </button>
          )}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="text-xs text-muted-foreground border border-border px-2 py-1 rounded flex-shrink-0 hover:text-foreground transition-colors"
          >
            Delete
          </button>
        </div>

        {isEditing && (
          <div className="px-3 pb-3 border-t border-border pt-3 space-y-3">
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
                <label className="block text-xs text-muted-foreground mb-1">URL (optional)</label>
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
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  list={`sources-${lesson.id}`}
                  className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <datalist id={`sources-${lesson.id}`}>
                  {sourceOptions.map((s) => <option key={s} value={s} />)}
                </datalist>
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Description (Markdown)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-y"
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        )}
      </div>

      {showDeleteModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false) }}
        >
          <div className="w-full max-w-sm bg-card border border-border rounded-lg shadow-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Remove lesson?</h2>
            <p className="text-sm text-muted-foreground">
              This will permanently remove &ldquo;{lesson.title}&rdquo; from your library.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-xs font-semibold bg-destructive text-white px-4 py-2 rounded-md hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Removing…" : "Confirm"}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 3: Create `app/(app)/library/manage/_components/add-lesson-form.tsx`**

```tsx
"use client"

import { useState } from "react"
import { createUserLesson } from "@/app/(app)/library/actions"

interface AddLessonFormProps {
  categoryId: string
  categoryName: string
  sourceOptions: string[]
  onCreated: () => void
}

export function AddLessonForm({
  categoryId,
  categoryName,
  sourceOptions,
  onCreated,
}: AddLessonFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")
  const [source, setSource] = useState("")
  const [description, setDescription] = useState("")
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!title.trim()) { setError("Title is required"); return }
    setIsPending(true)
    const result = await createUserLesson(categoryId, {
      title: title.trim(),
      url: url.trim() || undefined,
      source: source.trim(),
      description,
    })
    setIsPending(false)
    if ("error" in result) { setError(result.error); return }
    setTitle(""); setUrl(""); setSource(""); setDescription(""); setError(null)
    setIsOpen(false)
    onCreated()
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="mt-2 w-full text-sm text-accent border border-dashed border-border rounded-lg py-2 hover:border-accent transition-colors"
      >
        + Add a lesson to {categoryName}
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
          <label className="block text-xs text-muted-foreground mb-1">URL (optional)</label>
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
            value={source}
            onChange={(e) => setSource(e.target.value)}
            list="add-lesson-sources"
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <datalist id="add-lesson-sources">
            {sourceOptions.map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Description (Markdown)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-y"
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="text-xs font-semibold bg-accent text-accent-foreground px-3 py-1.5 rounded hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? "Adding…" : "Add lesson"}
        </button>
        <button
          onClick={() => { setIsOpen(false); setError(null) }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run full test suite**

```bash
npm test
```

Expected: 309 tests pass, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/library/manage/
git commit -m "feat: add UserLessonList, UserLessonCard, AddLessonForm components for manage page"
```

---

### Task 8: Manage page

**Files:**
- Create: `app/(app)/library/manage/page.tsx`

- [ ] **Step 1: Create `app/(app)/library/manage/page.tsx`**

```tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"
import { UserLessonList } from "./_components/user-lesson-list"

export default async function ManageLibraryPage() {
  const userId = await getUserId()
  if (!userId) notFound()

  const [categories, sourceRows] = await Promise.all([
    db.category.findMany({
      orderBy: { order: "asc" },
      include: {
        userLessons: {
          where: { userId },
          orderBy: { order: "asc" },
        },
      },
    }),
    db.userLesson.findMany({
      where: { userId, NOT: { source: "" } },
      select: { source: true },
      distinct: ["source"],
      orderBy: { source: "asc" },
    }),
  ])

  const sourceOptions = sourceRows.map((r) => r.source)

  return (
    <div className="pt-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
            Library
          </p>
          <h1 className="text-2xl font-semibold text-foreground">Manage my library</h1>
        </div>
        <Link
          href="/library"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to library
        </Link>
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
                Browse standard ↗
              </Link>
            </div>
            <UserLessonList
              categoryId={cat.id}
              categoryName={cat.name}
              initialLessons={cat.userLessons}
              sourceOptions={sourceOptions}
            />
          </section>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

Expected: 309 tests pass, 0 failures.

- [ ] **Step 3: Verify in browser**

Run `npm run dev` and navigate to `/library/manage`.

Check:
1. All categories appear with their names and "Browse standard ↗" links
2. "Back to library" link navigates to `/library`
3. Each category shows the "+ Add a lesson to {Category}" dashed button
4. Clicking the add button expands the form with Title, URL, Source (datalist), Description fields
5. Adding a lesson with only a title creates it and collapses the form
6. Adding a lesson with a source string — next time you add a lesson, that source appears in the autocomplete
7. Clicking Edit on a lesson expands inline edit; clicking Done saves
8. Dragging a lesson reorders it within its category (persists after page refresh)
9. Delete shows a confirmation modal; confirming removes the lesson
10. Navigate to `/library/technique` — the "Manage my library ↗" link anchors to `#technique`

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/library/manage/page.tsx
git commit -m "feat: add /library/manage page for personal lesson management"
```

---

### Task 9: Routine builder — surface personal lessons as topics

**Files:**
- Modify: `app/(app)/goals/[goalId]/routines/[routineId]/page.tsx` (lines 18–39)
- Modify: `app/(app)/goals/[goalId]/routines/[routineId]/_components/section-card.tsx` (lines 57–62)

- [ ] **Step 1: Update Prisma query in the routine page**

In `app/(app)/goals/[goalId]/routines/[routineId]/page.tsx`, replace lines 18–39 with:

```ts
  const routine = await db.routine.findUnique({
    where: { id: routineId },
    include: {
      goal: {
        include: {
          topics: {
            include: {
              lesson: { select: { title: true } },
              userLesson: { select: { title: true, url: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      sections: {
        orderBy: { order: "asc" },
        include: {
          sectionTopics: {
            include: {
              goalTopic: {
                include: {
                  lesson: { select: { title: true } },
                  userLesson: { select: { title: true, url: true } },
                },
              },
            },
          },
        },
      },
    },
  })
```

- [ ] **Step 2: Extend `GoalTopicForDisplay` in `section-card.tsx`**

In `app/(app)/goals/[goalId]/routines/[routineId]/_components/section-card.tsx`, replace lines 57–62 with:

```ts
type GoalTopicForDisplay = {
  id: string
  kind: string
  subtype: string | null
  defaultKey: string | null
  lesson?: { title: string } | null
  userLesson?: { title: string; url: string | null } | null
}
```

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: 309 tests pass, 0 failures.

- [ ] **Step 4: Verify in browser**

1. Navigate to `/library/technique` Personal tab (add a lesson first if needed)
2. Click "+ Add to Goal" on a personal lesson and add it to an active goal
3. Navigate to the goal → open a routine → expand a section
4. In the Topic dropdown, find the personal lesson under "Lessons" group — it shows the lesson title
5. Select it; confirm the section saves and shows the lesson name
6. If the personal lesson had a URL: confirm the lesson name appears correctly in the topic dropdown

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/goals/\[goalId\]/routines/\[routineId\]/page.tsx app/\(app\)/goals/\[goalId\]/routines/\[routineId\]/_components/section-card.tsx
git commit -m "feat: surface personal lessons as selectable topics in routine builder"
```
