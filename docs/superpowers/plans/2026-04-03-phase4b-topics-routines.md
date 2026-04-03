# Phase 4B: Topic Assignment + Routines & Sections — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Add to goal" buttons throughout Library and Reference, build the routine creation and section builder pages, and connect section topics to practice mode configuration.

**Architecture:** `AddToGoalButton` is a single client component used in both Library and all Reference panels. It opens a modal that fetches the user's goals via a server action, then calls `addTopicToGoal`. Routine and section CRUD are new server actions added to the existing `actions.ts`. The section builder uses `@dnd-kit/sortable` for drag-and-drop reordering; reordering calls `reorderSections` which writes all `order` integers in one Prisma transaction. Markdown descriptions in routines and sections render with `react-markdown` (already installed in Plan A).

**Prerequisites:** Plan A must be fully complete — schema migrated, `lib/goals.ts` and `app/(app)/goals/actions.ts` present.

**Tech Stack:** @dnd-kit/core, @dnd-kit/sortable, react-markdown (already installed), Prisma 7, Next.js 16 server actions.

---

## File Structure

**Create:**
- `components/add-to-goal-button.tsx` — client: "+" button + goal-selector modal
- `app/(app)/goals/[goalId]/routines/new/page.tsx` — server: create routine form
- `app/(app)/goals/[goalId]/routines/[routineId]/page.tsx` — server: routine shell (fetches data)
- `app/(app)/goals/[goalId]/routines/[routineId]/_components/section-list.tsx` — client: DnD section list
- `app/(app)/goals/[goalId]/routines/[routineId]/_components/section-card.tsx` — client: expandable section card
- `app/(app)/goals/[goalId]/routines/[routineId]/_components/add-section-form.tsx` — client: inline add-section form
- `__tests__/goals/routine-actions.test.ts` — unit tests for routine/section actions

**Modify:**
- `app/(app)/goals/actions.ts` — add `getUserGoals` + all routine/section server actions
- `app/(app)/library/[category]/page.tsx` — add `AddToGoalButton` per lesson row
- `app/(app)/reference/_components/scale-panel.tsx` — add `AddToGoalButton` next to type selector
- `app/(app)/reference/_components/chord-panel.tsx` — add `AddToGoalButton` next to type selector
- `app/(app)/reference/_components/triad-panel.tsx` — add `AddToGoalButton` next to type selector
- `app/(app)/reference/_components/arpeggio-panel.tsx` — add `AddToGoalButton` next to type selector
- `app/(app)/reference/_components/harmony-tab.tsx` — add `AddToGoalButton` next to mode selector
- `app/(app)/reference/_components/progressions-tab.tsx` — add `AddToGoalButton` next to progression selector

---

### Task 1: Install @dnd-kit packages

**Files:**
- Modify: `package.json` (via pnpm)

- [ ] **Step 1: Install the dependencies**

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected output: `dependencies: + @dnd-kit/core x.x.x, + @dnd-kit/sortable x.x.x, + @dnd-kit/utilities x.x.x`

- [ ] **Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: install @dnd-kit for drag-and-drop section reordering"
```

---

### Task 2: Add getUserGoals + routine/section server actions with tests

**Files:**
- Modify: `app/(app)/goals/actions.ts`
- Create: `__tests__/goals/routine-actions.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/goals/routine-actions.test.ts`:

```typescript
import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/db", () => ({
  db: {
    goal: { findUnique: vi.fn() },
    routine: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    section: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    sectionTopic: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    goal: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  getUserGoals,
  createRoutine,
  updateRoutine,
  deleteRoutine,
  createSection,
  updateSection,
  deleteSection,
  reorderSections,
  addTopicToSection,
  removeTopicFromSection,
} from "@/app/(app)/goals/actions"

const MOCK_SESSION = { user: { id: "user-1", email: "test@example.com", name: "Test" } }
const MOCK_GOAL = { id: "goal-1", userId: "user-1" }
const MOCK_ROUTINE = { id: "routine-1", goalId: "goal-1", goal: MOCK_GOAL }
const MOCK_SECTION = { id: "section-1", routineId: "routine-1", routine: { ...MOCK_ROUTINE }, order: 0 }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue(MOCK_SESSION as never)
})

describe("getUserGoals", () => {
  it("returns unarchived goals for the current user", async () => {
    const goals = [{ id: "g1", title: "Goal A", isActive: true }]
    vi.mocked(db.goal.findMany).mockResolvedValue(goals as never)
    const result = await getUserGoals()
    expect(result).toEqual(goals)
    expect(db.goal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-1", isArchived: false }),
      })
    )
  })

  it("returns empty array when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    const result = await getUserGoals()
    expect(result).toEqual([])
  })
})

describe("createRoutine", () => {
  it("creates a routine for the given goal", async () => {
    vi.mocked(db.goal.findUnique).mockResolvedValue(MOCK_GOAL as never)
    vi.mocked(db.routine.create).mockResolvedValue({ id: "r1" } as never)
    vi.mocked(db.$transaction).mockResolvedValue({ id: "r1" } as never)
    const result = await createRoutine("goal-1", { title: "My Routine", durationMinutes: 60 })
    expect(result).toEqual({ success: true, id: "r1" })
  })

  it("returns not found when goal belongs to another user", async () => {
    vi.mocked(db.goal.findUnique).mockResolvedValue({ id: "goal-1", userId: "other" } as never)
    const result = await createRoutine("goal-1", { title: "Test", durationMinutes: 30 })
    expect(result).toEqual({ error: "Not found" })
  })
})

describe("updateRoutine", () => {
  it("updates the routine when it belongs to the current user's goal", async () => {
    vi.mocked(db.routine.findUnique).mockResolvedValue(MOCK_ROUTINE as never)
    vi.mocked(db.routine.update).mockResolvedValue(MOCK_ROUTINE as never)
    const result = await updateRoutine("routine-1", { title: "New Title" })
    expect(result).toEqual({ success: true })
    expect(db.routine.update).toHaveBeenCalledWith({
      where: { id: "routine-1" },
      data: { title: "New Title" },
    })
  })

  it("returns not found when routine's goal belongs to another user", async () => {
    vi.mocked(db.routine.findUnique).mockResolvedValue({
      ...MOCK_ROUTINE,
      goal: { ...MOCK_GOAL, userId: "other" },
    } as never)
    const result = await updateRoutine("routine-1", { title: "X" })
    expect(result).toEqual({ error: "Not found" })
  })
})

describe("deleteRoutine", () => {
  it("deletes the routine when ownership is verified", async () => {
    vi.mocked(db.routine.findUnique).mockResolvedValue(MOCK_ROUTINE as never)
    vi.mocked(db.routine.delete).mockResolvedValue(MOCK_ROUTINE as never)
    const result = await deleteRoutine("routine-1")
    expect(result).toEqual({ success: true })
  })
})

describe("createSection", () => {
  it("creates a section appended to the end", async () => {
    vi.mocked(db.routine.findUnique).mockResolvedValue(MOCK_ROUTINE as never)
    vi.mocked(db.section.findMany).mockResolvedValue([{ order: 0 }, { order: 1 }] as never)
    vi.mocked(db.section.create).mockResolvedValue({ id: "s1" } as never)
    const result = await createSection("routine-1", {
      type: "warmup",
      title: "Warm Up",
      durationMinutes: 5,
    })
    expect(result).toEqual({ success: true, id: "s1" })
    expect(db.section.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ order: 2 }),
      })
    )
  })
})

describe("reorderSections", () => {
  it("writes new order values in a transaction", async () => {
    vi.mocked(db.routine.findUnique).mockResolvedValue(MOCK_ROUTINE as never)
    vi.mocked(db.$transaction).mockResolvedValue([undefined, undefined] as never)
    const result = await reorderSections("routine-1", ["s2", "s1"])
    expect(result).toEqual({ success: true })
    expect(db.$transaction).toHaveBeenCalled()
  })
})

describe("addTopicToSection", () => {
  it("creates a SectionTopic linking the topic to the section", async () => {
    vi.mocked(db.section.findUnique).mockResolvedValue({
      ...MOCK_SECTION,
      routine: { ...MOCK_ROUTINE },
    } as never)
    vi.mocked(db.sectionTopic.create).mockResolvedValue({ id: "st-1" } as never)
    const result = await addTopicToSection("section-1", "goal-topic-1")
    expect(result).toEqual({ success: true })
    expect(db.sectionTopic.create).toHaveBeenCalledWith({
      data: { sectionId: "section-1", goalTopicId: "goal-topic-1" },
    })
  })
})

describe("removeTopicFromSection", () => {
  it("deletes the SectionTopic when ownership is verified", async () => {
    vi.mocked(db.sectionTopic.findUnique).mockResolvedValue({
      id: "st-1",
      section: {
        ...MOCK_SECTION,
        routine: { ...MOCK_ROUTINE },
      },
    } as never)
    vi.mocked(db.sectionTopic.delete).mockResolvedValue({} as never)
    const result = await removeTopicFromSection("st-1")
    expect(result).toEqual({ success: true })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run __tests__/goals/routine-actions.test.ts
```

Expected: FAIL — `getUserGoals is not exported from '@/app/(app)/goals/actions'`

- [ ] **Step 3: Append the new actions to `app/(app)/goals/actions.ts`**

Add the following to the end of the existing `app/(app)/goals/actions.ts` file (after `removeTopicFromGoal`):

```typescript
// ── Goal query (used by AddToGoalButton modal) ────────────────────────────────

export async function getUserGoals(): Promise<
  { id: string; title: string; isActive: boolean }[]
> {
  try {
    const userId = await requireUserId()
    return await db.goal.findMany({
      where: { userId, isArchived: false },
      select: { id: true, title: true, isActive: true },
      orderBy: { createdAt: "desc" },
    })
  } catch {
    return []
  }
}

// ── Routine actions ───────────────────────────────────────────────────────────

const DEFAULT_SECTIONS: {
  type: SectionType
  title: string
  durationMinutes: number
}[] = [
  { type: "warmup", title: "Warm Up", durationMinutes: 5 },
  { type: "technique", title: "Technique & Scales", durationMinutes: 15 },
  { type: "muscle_memory", title: "Muscle Memory", durationMinutes: 10 },
  { type: "songs", title: "Songs & Repertoire", durationMinutes: 20 },
  { type: "free_practice", title: "Free Practice", durationMinutes: 10 },
]

export async function createRoutine(
  goalId: string,
  data: {
    title: string
    durationMinutes: number
    description?: string
    useRecommended?: boolean
  }
): Promise<{ success: true; id: string } | { error: string }> {
  try {
    const userId = await requireUserId()
    const goal = await db.goal.findUnique({ where: { id: goalId } })
    if (!goal || goal.userId !== userId) return { error: "Not found" }

    const routine = await db.$transaction(async (tx) => {
      const r = await tx.routine.create({
        data: {
          goalId,
          title: data.title.trim(),
          description: data.description?.trim() ?? "",
          durationMinutes: data.durationMinutes,
        },
      })
      if (data.useRecommended) {
        await Promise.all(
          DEFAULT_SECTIONS.map((s, i) =>
            tx.section.create({
              data: {
                routineId: r.id,
                type: s.type,
                title: s.title,
                durationMinutes: s.durationMinutes,
                order: i,
              },
            })
          )
        )
      }
      return r
    })

    revalidatePath(`/goals/${goalId}`)
    return { success: true, id: routine.id }
  } catch {
    return { error: "Failed to create routine" }
  }
}

export async function updateRoutine(
  routineId: string,
  data: { title?: string; durationMinutes?: number; description?: string }
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const routine = await db.routine.findUnique({
      where: { id: routineId },
      include: { goal: true },
    })
    if (!routine || routine.goal.userId !== userId) return { error: "Not found" }
    await db.routine.update({
      where: { id: routineId },
      data: {
        ...(data.title !== undefined ? { title: data.title.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description.trim() } : {}),
        ...(data.durationMinutes !== undefined ? { durationMinutes: data.durationMinutes } : {}),
      },
    })
    revalidatePath(`/goals/${routine.goalId}/routines/${routineId}`)
    return { success: true }
  } catch {
    return { error: "Failed to update routine" }
  }
}

export async function deleteRoutine(
  routineId: string
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const routine = await db.routine.findUnique({
      where: { id: routineId },
      include: { goal: true },
    })
    if (!routine || routine.goal.userId !== userId) return { error: "Not found" }
    await db.routine.delete({ where: { id: routineId } })
    revalidatePath(`/goals/${routine.goalId}`)
    return { success: true }
  } catch {
    return { error: "Failed to delete routine" }
  }
}

// ── Section actions ───────────────────────────────────────────────────────────

async function requireSectionOwner(sectionId: string, userId: string) {
  const section = await db.section.findUnique({
    where: { id: sectionId },
    include: { routine: { include: { goal: true } } },
  })
  if (!section || section.routine.goal.userId !== userId) return null
  return section
}

export async function createSection(
  routineId: string,
  data: {
    type: SectionType
    title: string
    durationMinutes: number
    description?: string
  }
): Promise<{ success: true; id: string } | { error: string }> {
  try {
    const userId = await requireUserId()
    const routine = await db.routine.findUnique({
      where: { id: routineId },
      include: { goal: true },
    })
    if (!routine || routine.goal.userId !== userId) return { error: "Not found" }

    const existing = await db.section.findMany({
      where: { routineId },
      select: { order: true },
    })
    const maxOrder = existing.length > 0 ? Math.max(...existing.map((s) => s.order)) : -1

    const section = await db.section.create({
      data: {
        routineId,
        type: data.type,
        title: data.title.trim(),
        durationMinutes: data.durationMinutes,
        description: data.description?.trim() ?? "",
        order: maxOrder + 1,
      },
    })
    revalidatePath(`/goals/${routine.goalId}/routines/${routineId}`)
    return { success: true, id: section.id }
  } catch {
    return { error: "Failed to create section" }
  }
}

export async function updateSection(
  sectionId: string,
  data: { type?: SectionType; title?: string; durationMinutes?: number; description?: string }
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const section = await requireSectionOwner(sectionId, userId)
    if (!section) return { error: "Not found" }
    await db.section.update({
      where: { id: sectionId },
      data: {
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.title !== undefined ? { title: data.title.trim() } : {}),
        ...(data.durationMinutes !== undefined ? { durationMinutes: data.durationMinutes } : {}),
        ...(data.description !== undefined ? { description: data.description.trim() } : {}),
      },
    })
    revalidatePath(
      `/goals/${section.routine.goalId}/routines/${section.routineId}`
    )
    return { success: true }
  } catch {
    return { error: "Failed to update section" }
  }
}

export async function deleteSection(
  sectionId: string
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const section = await requireSectionOwner(sectionId, userId)
    if (!section) return { error: "Not found" }
    await db.section.delete({ where: { id: sectionId } })
    revalidatePath(
      `/goals/${section.routine.goalId}/routines/${section.routineId}`
    )
    return { success: true }
  } catch {
    return { error: "Failed to delete section" }
  }
}

export async function reorderSections(
  routineId: string,
  orderedIds: string[]
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const routine = await db.routine.findUnique({
      where: { id: routineId },
      include: { goal: true },
    })
    if (!routine || routine.goal.userId !== userId) return { error: "Not found" }
    await db.$transaction(
      orderedIds.map((id, index) =>
        db.section.update({ where: { id }, data: { order: index } })
      )
    )
    revalidatePath(`/goals/${routine.goalId}/routines/${routineId}`)
    return { success: true }
  } catch {
    return { error: "Failed to reorder sections" }
  }
}

// ── Section topic actions ─────────────────────────────────────────────────────

export async function addTopicToSection(
  sectionId: string,
  goalTopicId: string
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const section = await requireSectionOwner(sectionId, userId)
    if (!section) return { error: "Not found" }
    await db.sectionTopic.create({
      data: { sectionId, goalTopicId },
    })
    revalidatePath(
      `/goals/${section.routine.goalId}/routines/${section.routineId}`
    )
    return { success: true }
  } catch {
    return { error: "Failed to add topic to section" }
  }
}

export async function removeTopicFromSection(
  sectionTopicId: string
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const st = await db.sectionTopic.findUnique({
      where: { id: sectionTopicId },
      include: { section: { include: { routine: { include: { goal: true } } } } },
    })
    if (!st || st.section.routine.goal.userId !== userId) return { error: "Not found" }
    await db.sectionTopic.delete({ where: { id: sectionTopicId } })
    revalidatePath(
      `/goals/${st.section.routine.goalId}/routines/${st.section.routineId}`
    )
    return { success: true }
  } catch {
    return { error: "Failed to remove topic from section" }
  }
}

export async function updateSectionTopic(
  sectionTopicId: string,
  data: { keys?: string[]; practiceMode?: PracticeMode | null }
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const st = await db.sectionTopic.findUnique({
      where: { id: sectionTopicId },
      include: { section: { include: { routine: { include: { goal: true } } } } },
    })
    if (!st || st.section.routine.goal.userId !== userId) return { error: "Not found" }
    await db.sectionTopic.update({
      where: { id: sectionTopicId },
      data: {
        ...(data.keys !== undefined ? { keys: data.keys } : {}),
        ...(data.practiceMode !== undefined ? { practiceMode: data.practiceMode } : {}),
      },
    })
    revalidatePath(
      `/goals/${st.section.routine.goalId}/routines/${st.section.routineId}`
    )
    return { success: true }
  } catch {
    return { error: "Failed to update section topic" }
  }
}
```

Also add these imports at the top of `actions.ts` (the file already imports `TopicKind`; add `SectionType` and `PracticeMode` to that import):

```typescript
import type { TopicKind, SectionType, PracticeMode } from "@/lib/generated/prisma/client"
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run __tests__/goals/routine-actions.test.ts
```

Expected: PASS — all tests pass

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass, 0 failures

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/goals/actions.ts __tests__/goals/routine-actions.test.ts
git commit -m "feat: add routine and section server actions"
```

---

### Task 3: Build the /goals/[goalId]/routines/new page

**Files:**
- Create: `app/(app)/goals/[goalId]/routines/new/page.tsx`

- [ ] **Step 1: Create `app/(app)/goals/[goalId]/routines/new/page.tsx`**

```tsx
"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createRoutine } from "@/app/(app)/goals/actions"

export default function NewRoutinePage() {
  const { goalId } = useParams<{ goalId: string }>()
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    const fd = new FormData(e.currentTarget)
    const result = await createRoutine(goalId, {
      title: fd.get("title") as string,
      durationMinutes: Number(fd.get("durationMinutes")),
      description: (fd.get("description") as string) || undefined,
      useRecommended: fd.get("useRecommended") === "on",
    })
    setIsPending(false)
    if ("error" in result) {
      setError(result.error)
    } else {
      router.push(`/goals/${goalId}/routines/${result.id}`)
    }
  }

  return (
    <div className="pt-6 max-w-lg">
      <Link
        href={`/goals/${goalId}`}
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-1"
      >
        ← Goal
      </Link>
      <h1 className="text-2xl font-semibold text-foreground mb-6">New Routine</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="title"
            className="block text-xs uppercase tracking-widest text-muted-foreground mb-1"
          >
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            maxLength={120}
            placeholder="e.g. Morning Practice"
            className="w-full rounded border border-border bg-card px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div>
          <label
            htmlFor="durationMinutes"
            className="block text-xs uppercase tracking-widest text-muted-foreground mb-1"
          >
            Duration (minutes)
          </label>
          <input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            required
            min={1}
            max={480}
            defaultValue={60}
            className="w-full rounded border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-xs uppercase tracking-widest text-muted-foreground mb-1"
          >
            Description <span className="normal-case">(Markdown supported)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            placeholder="Optional notes about this routine…"
            className="w-full rounded border border-border bg-card px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="useRecommended"
            defaultChecked
            className="rounded border-border"
          />
          <span className="text-sm text-foreground">Start with recommended structure</span>
          <span className="text-xs text-muted-foreground">
            (Warmup 5 min · Technique 15 min · Muscle Memory 10 min · Songs 20 min · Free Practice 10 min)
          </span>
        </label>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="text-sm font-semibold bg-accent text-accent-foreground px-4 py-2 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending ? "Creating…" : "Create routine"}
          </button>
          <Link
            href={`/goals/${goalId}`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/goals/\[goalId\]/routines/
git commit -m "feat: add new routine creation page"
```

---

### Task 4: Build the AddToGoal modal button component

**Files:**
- Create: `components/add-to-goal-button.tsx`

- [ ] **Step 1: Create `components/add-to-goal-button.tsx`**

```tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { getUserGoals, addTopicToGoal } from "@/app/(app)/goals/actions"
import type { TopicKind } from "@/lib/generated/prisma/client"

interface AddToGoalButtonProps {
  kind: TopicKind
  subtype?: string
  defaultKey?: string
  lessonId?: string
  displayName: string
}

export function AddToGoalButton({
  kind,
  subtype,
  defaultKey,
  lessonId,
  displayName,
}: AddToGoalButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [goals, setGoals] = useState<{ id: string; title: string; isActive: boolean }[]>([])
  const [selectedGoalId, setSelectedGoalId] = useState<string>("")
  const [status, setStatus] = useState<"idle" | "loading" | "added" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    function handlePointerDown(e: PointerEvent) {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false)
    }
    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  async function handleOpen() {
    setIsOpen(true)
    setStatus("loading")
    setErrorMsg(null)
    const fetched = await getUserGoals()
    setGoals(fetched)
    const active = fetched.find((g) => g.isActive)
    setSelectedGoalId(active?.id ?? fetched[0]?.id ?? "")
    setStatus("idle")
  }

  async function handleAdd() {
    if (!selectedGoalId) return
    setStatus("loading")
    const result = await addTopicToGoal(selectedGoalId, {
      kind,
      subtype,
      lessonId,
      defaultKey,
    })
    if ("error" in result) {
      setStatus("error")
      setErrorMsg(result.error)
    } else {
      setStatus("added")
      setTimeout(() => {
        setIsOpen(false)
        setStatus("idle")
      }, 1200)
    }
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        aria-label="Add to goal"
        onClick={handleOpen}
        className="flex items-center justify-center w-6 h-6 rounded-full border border-border text-muted-foreground hover:text-accent hover:border-accent transition-colors text-sm font-semibold select-none"
      >
        +
      </button>

      {isOpen && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-label="Add to goal"
          className="absolute left-0 top-8 z-30 w-72 rounded-lg border border-border bg-card shadow-lg p-4 space-y-3"
        >
          <p className="text-xs font-semibold text-foreground truncate">{displayName}</p>

          {status === "added" ? (
            <p className="text-xs text-accent font-semibold">Added to goal!</p>
          ) : goals.length === 0 && status !== "loading" ? (
            <p className="text-xs text-muted-foreground">
              No goals yet.{" "}
              <a href="/goals" className="text-accent hover:underline">
                Create your first goal
              </a>
            </p>
          ) : (
            <>
              <div>
                <label
                  htmlFor="add-to-goal-select"
                  className="block text-xs uppercase tracking-widest text-muted-foreground mb-1"
                >
                  Goal
                </label>
                <select
                  id="add-to-goal-select"
                  value={selectedGoalId}
                  onChange={(e) => setSelectedGoalId(e.target.value)}
                  disabled={status === "loading"}
                  className="w-full rounded border border-border bg-card px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}{g.isActive ? " (active)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {defaultKey && (
                <p className="text-xs text-muted-foreground">Default key: {defaultKey}</p>
              )}

              {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}

              <button
                type="button"
                onClick={handleAdd}
                disabled={!selectedGoalId || status === "loading"}
                className="w-full text-xs font-semibold bg-accent text-accent-foreground px-3 py-1.5 rounded hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {status === "loading" ? "Adding…" : "Add to goal"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add components/add-to-goal-button.tsx
git commit -m "feat: add AddToGoalButton modal component"
```

---

### Task 5: Build the routine detail page and section builder

**Files:**
- Create: `app/(app)/goals/[goalId]/routines/[routineId]/page.tsx`
- Create: `app/(app)/goals/[goalId]/routines/[routineId]/_components/section-list.tsx`
- Create: `app/(app)/goals/[goalId]/routines/[routineId]/_components/section-card.tsx`
- Create: `app/(app)/goals/[goalId]/routines/[routineId]/_components/add-section-form.tsx`

- [ ] **Step 1: Create `add-section-form.tsx`**

```tsx
"use client"

import { useState } from "react"
import { createSection } from "@/app/(app)/goals/actions"
import type { SectionType } from "@/lib/generated/prisma/client"

const SECTION_TYPES: { value: SectionType; label: string }[] = [
  { value: "warmup", label: "Warm Up" },
  { value: "technique", label: "Technique" },
  { value: "muscle_memory", label: "Muscle Memory" },
  { value: "theory", label: "Theory" },
  { value: "lessons", label: "Lessons" },
  { value: "songs", label: "Songs" },
  { value: "free_practice", label: "Free Practice" },
]

interface AddSectionFormProps {
  routineId: string
  onAdded: () => void
}

export function AddSectionForm({ routineId, onAdded }: AddSectionFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [type, setType] = useState<SectionType>("warmup")
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const defaultTitle = SECTION_TYPES.find((t) => t.value === type)?.label ?? ""

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    const fd = new FormData(e.currentTarget)
    const result = await createSection(routineId, {
      type,
      title: (fd.get("title") as string) || defaultTitle,
      durationMinutes: Number(fd.get("durationMinutes")),
    })
    setIsPending(false)
    if ("error" in result) {
      setError(result.error)
    } else {
      setIsOpen(false)
      setError(null)
      onAdded()
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors border border-dashed border-border rounded px-3 py-2 w-full"
      >
        + Add section
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 rounded-lg border border-border p-3 space-y-2 bg-card">
      <div className="flex gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as SectionType)}
          className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        >
          {SECTION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <input
          name="title"
          placeholder={defaultTitle}
          maxLength={120}
          className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <input
          name="durationMinutes"
          type="number"
          required
          min={1}
          max={240}
          defaultValue={10}
          className="w-16 rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <span className="text-xs text-muted-foreground self-center">min</span>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="text-xs font-semibold bg-accent text-accent-foreground px-3 py-1 rounded hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Adding…" : "Add"}
        </button>
        <button
          type="button"
          onClick={() => { setIsOpen(false); setError(null) }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Create `section-card.tsx`**

```tsx
"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  updateSection,
  deleteSection,
  addTopicToSection,
  removeTopicFromSection,
  updateSectionTopic,
} from "@/app/(app)/goals/actions"
import { formatTopicName } from "@/lib/goals"
import type { Section, SectionTopic, GoalTopic, Topic, PracticeMode, SectionType } from "@/lib/generated/prisma/client"

const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  warmup: "Warm Up",
  technique: "Technique",
  muscle_memory: "Muscle Memory",
  theory: "Theory",
  lessons: "Lessons",
  songs: "Songs",
  free_practice: "Free Practice",
}

const SECTION_TYPE_COLORS: Record<SectionType, string> = {
  warmup: "text-amber-600 border-amber-600",
  technique: "text-blue-600 border-blue-600",
  muscle_memory: "text-purple-600 border-purple-600",
  theory: "text-teal-600 border-teal-600",
  lessons: "text-green-600 border-green-600",
  songs: "text-orange-600 border-orange-600",
  free_practice: "text-muted-foreground border-border",
}

const PRACTICE_MODE_LABELS: Record<PracticeMode, string> = {
  chromatic_asc: "Chromatic ascending",
  chromatic_desc: "Chromatic descending",
  circle_fifths_asc: "Circle of fifths (ascending)",
  circle_fourths_desc: "Circle of fourths (descending)",
  random: "Random",
}

type GoalTopicForDisplay = GoalTopic & { lesson: Pick<Topic, "title"> | null }
type SectionTopicWithGoalTopic = SectionTopic & { goalTopic: GoalTopicForDisplay }
type SectionWithTopics = Section & { sectionTopics: SectionTopicWithGoalTopic[] }

interface SectionCardProps {
  section: SectionWithTopics
  availableTopics: GoalTopicForDisplay[]
  routineGoalId: string
  onChanged: () => void
}

export function SectionCard({ section, availableTopics, routineGoalId, onChanged }: SectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [descValue, setDescValue] = useState(section.description)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  async function saveDesc() {
    setEditingDesc(false)
    if (descValue.trim() === section.description) return
    const result = await updateSection(section.id, { description: descValue })
    if ("error" in result) setError(result.error)
    else onChanged()
  }

  async function handleDelete() {
    const result = await deleteSection(section.id)
    if ("error" in result) setError(result.error)
    else onChanged()
  }

  async function handleAddTopic(goalTopicId: string) {
    const result = await addTopicToSection(section.id, goalTopicId)
    if ("error" in result) setError(result.error)
    else onChanged()
  }

  async function handleRemoveSectionTopic(sectionTopicId: string) {
    const result = await removeTopicFromSection(sectionTopicId)
    if ("error" in result) setError(result.error)
    else onChanged()
  }

  async function handleKeyChange(sectionTopicId: string, keys: string[]) {
    const result = await updateSectionTopic(sectionTopicId, { keys })
    if ("error" in result) setError(result.error)
    else onChanged()
  }

  async function handlePracticeModeChange(sectionTopicId: string, mode: PracticeMode | null) {
    const result = await updateSectionTopic(sectionTopicId, { practiceMode: mode })
    if ("error" in result) setError(result.error)
    else onChanged()
  }

  const colorClass = SECTION_TYPE_COLORS[section.type]
  const assignedTopicIds = new Set(section.sectionTopics.map((st) => st.goalTopicId))
  const unassignedTopics = availableTopics.filter((t) => !assignedTopicIds.has(t.id))

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border border-border bg-card">
      {/* Collapsed header */}
      <div className="flex items-center gap-2 p-3">
        {/* Drag handle */}
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>

        <span
          className={`text-xs border rounded px-1.5 py-0.5 flex-shrink-0 ${colorClass}`}
        >
          {SECTION_TYPE_LABELS[section.type]}
        </span>

        <span className="text-sm text-foreground flex-1 min-w-0 truncate">{section.title}</span>
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {section.durationMinutes} min
        </span>
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {section.sectionTopics.length} {section.sectionTopics.length === 1 ? "topic" : "topics"}
        </span>

        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          aria-label={isExpanded ? "Collapse section" : "Expand section"}
          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 text-xs"
        >
          {isExpanded ? "▲" : "▼"}
        </button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
          {/* Description */}
          {editingDesc ? (
            <textarea
              autoFocus
              value={descValue}
              onChange={(e) => setDescValue(e.target.value)}
              onBlur={saveDesc}
              rows={3}
              placeholder="Section notes (Markdown supported)"
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none"
            />
          ) : descValue ? (
            <div
              className="prose prose-sm max-w-none text-foreground text-sm cursor-pointer"
              onClick={() => setEditingDesc(true)}
              title="Click to edit"
            >
              <ReactMarkdown>{descValue}</ReactMarkdown>
            </div>
          ) : (
            <button
              onClick={() => setEditingDesc(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Add notes…
            </button>
          )}

          {/* Assigned topics */}
          {section.sectionTopics.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Topics</p>
              {section.sectionTopics.map((st) => {
                const isMultiKey = st.keys.length === 0
                  ? false
                  : st.keys.includes("*") || st.keys.length > 1
                return (
                  <div key={st.id} className="flex flex-col gap-1.5 rounded border border-border p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-foreground">{formatTopicName(st.goalTopic)}</span>
                      <button
                        onClick={() => handleRemoveSectionTopic(st.id)}
                        className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                    {st.goalTopic.kind !== "lesson" && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={
                            st.keys.length === 0
                              ? "default"
                              : st.keys.includes("*")
                              ? "all"
                              : "custom"
                          }
                          onChange={(e) => {
                            const val = e.target.value
                            if (val === "default") handleKeyChange(st.id, [])
                            else if (val === "all") handleKeyChange(st.id, ["*"])
                          }}
                          className="rounded border border-border bg-background px-1.5 py-0.5 text-xs text-foreground focus:outline-none"
                        >
                          <option value="default">
                            Default key ({st.goalTopic.defaultKey ?? "—"})
                          </option>
                          <option value="all">All 12 keys</option>
                        </select>
                        {isMultiKey && (
                          <select
                            value={st.practiceMode ?? ""}
                            onChange={(e) =>
                              handlePracticeModeChange(st.id, (e.target.value as PracticeMode) || null)
                            }
                            className="rounded border border-border bg-background px-1.5 py-0.5 text-xs text-foreground focus:outline-none"
                          >
                            <option value="">No practice mode</option>
                            {(Object.keys(PRACTICE_MODE_LABELS) as PracticeMode[]).map((m) => (
                              <option key={m} value={m}>{PRACTICE_MODE_LABELS[m]}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Add topic */}
          {unassignedTopics.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                Add topic
              </p>
              <div className="flex flex-wrap gap-1">
                {unassignedTopics.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleAddTopic(t.id)}
                    className="text-xs border border-border rounded px-2 py-0.5 text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                  >
                    {formatTopicName(t)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          {/* Delete */}
          <div className="pt-1">
            {confirmDelete ? (
              <span className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Remove this section?</span>
                <button
                  onClick={handleDelete}
                  className="text-xs text-red-500 hover:text-red-400 font-semibold transition-colors"
                >
                  Yes, remove
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
              >
                Remove section
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `section-list.tsx`**

```tsx
"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { reorderSections } from "@/app/(app)/goals/actions"
import { SectionCard } from "./section-card"
import { AddSectionForm } from "./add-section-form"
import type { Section, SectionTopic, GoalTopic, Topic } from "@/lib/generated/prisma/client"

type GoalTopicForDisplay = GoalTopic & { lesson: Pick<Topic, "title"> | null }
type SectionTopicWithGoalTopic = SectionTopic & { goalTopic: GoalTopicForDisplay }
type SectionWithTopics = Section & { sectionTopics: SectionTopicWithGoalTopic[] }

interface SectionListProps {
  routineId: string
  routineGoalId: string
  initialSections: SectionWithTopics[]
  availableTopics: GoalTopicForDisplay[]
}

export function SectionList({
  routineId,
  routineGoalId,
  initialSections,
  availableTopics,
}: SectionListProps) {
  const [sections, setSections] = useState(
    [...initialSections].sort((a, b) => a.order - b.order)
  )
  const router = useRouter()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = sections.findIndex((s) => s.id === active.id)
    const newIndex = sections.findIndex((s) => s.id === over.id)
    const reordered = arrayMove(sections, oldIndex, newIndex)
    setSections(reordered)
    reorderSections(routineId, reordered.map((s) => s.id))
  }

  const handleChanged = useCallback(() => {
    router.refresh()
  }, [router])

  return (
    <div className="space-y-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {sections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              availableTopics={availableTopics}
              routineGoalId={routineGoalId}
              onChanged={handleChanged}
            />
          ))}
        </SortableContext>
      </DndContext>

      {sections.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No sections yet. Add one below.
        </p>
      )}

      <AddSectionForm routineId={routineId} onAdded={handleChanged} />
    </div>
  )
}
```

- [ ] **Step 4: Create `app/(app)/goals/[goalId]/routines/[routineId]/page.tsx`**

```tsx
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import { SectionList } from "./_components/section-list"

export default async function RoutineDetailPage({
  params,
}: {
  params: Promise<{ goalId: string; routineId: string }>
}) {
  const { goalId, routineId } = await params
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const routine = await db.routine.findUnique({
    where: { id: routineId },
    include: {
      goal: {
        include: {
          topics: {
            include: { lesson: { select: { title: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      sections: {
        orderBy: { order: "asc" },
        include: {
          sectionTopics: {
            include: {
              goalTopic: { include: { lesson: { select: { title: true } } } },
            },
          },
        },
      },
    },
  })

  if (!routine || routine.goal.userId !== session.user.id || routine.goalId !== goalId) {
    notFound()
  }

  return (
    <div className="pt-6">
      <Link
        href={`/goals/${goalId}`}
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-1"
      >
        ← Goal
      </Link>

      <h1 className="text-2xl font-semibold text-foreground mb-1">{routine.title}</h1>
      <p className="text-xs text-muted-foreground mb-4">
        {routine.durationMinutes} minutes total
      </p>

      {routine.description && (
        <div className="prose prose-sm max-w-none text-foreground mb-6">
          <ReactMarkdown>{routine.description}</ReactMarkdown>
        </div>
      )}

      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Sections</p>

      <SectionList
        routineId={routineId}
        routineGoalId={goalId}
        initialSections={routine.sections}
        availableTopics={routine.goal.topics}
      />
    </div>
  )
}
```

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/goals/\[goalId\]/routines/
git commit -m "feat: build routine detail page with DnD section builder"
```

---

### Task 6: Add "+" button to Library lesson rows

**Files:**
- Modify: `app/(app)/library/[category]/page.tsx`

- [ ] **Step 1: Modify `app/(app)/library/[category]/page.tsx`**

The current page is a server component. Since `AddToGoalButton` is a client component, it can be imported and rendered inside the server page. Replace the file with:

```tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { AddToGoalButton } from "@/components/add-to-goal-button"

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

  return (
    <div className="pt-6">
      <Link
        href="/library"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-1"
      >
        ← Library
      </Link>
      <h1 className="text-2xl font-semibold text-foreground mb-6">{data.name}</h1>
      <ul className="space-y-1">
        {data.topics.map((topic) => (
          <li key={topic.id}>
            <div className="flex items-center justify-between py-2">
              <a
                href={topic.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 flex-1 min-w-0 text-base text-foreground hover:text-muted-foreground transition-colors"
              >
                <span className="truncate">{topic.title}</span>
                <span className="flex items-center gap-2 ml-2 flex-shrink-0">
                  <span className="text-xs text-muted-foreground border border-border px-1.5 py-0.5 rounded">
                    {topic.source.name}
                  </span>
                  <span className="text-muted-foreground">↗</span>
                </span>
              </a>
              <div className="ml-3 flex-shrink-0">
                <AddToGoalButton
                  kind="lesson"
                  lessonId={topic.id}
                  displayName={topic.title}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/library/
git commit -m "feat: add + button to library lesson rows for goal assignment"
```

---

### Task 7: Add "+" buttons to Reference panel type selectors

Each reference panel component needs a `+` button next to its type selector. The button renders `AddToGoalButton` with the current type and root as props.

**Files:**
- Modify: `app/(app)/reference/_components/scale-panel.tsx`
- Modify: `app/(app)/reference/_components/chord-panel.tsx`
- Modify: `app/(app)/reference/_components/triad-panel.tsx`
- Modify: `app/(app)/reference/_components/arpeggio-panel.tsx`
- Modify: `app/(app)/reference/_components/harmony-tab.tsx`
- Modify: `app/(app)/reference/_components/progressions-tab.tsx`

The pattern is the same for all six files:

1. Add the import at the top of each file:
```tsx
import { AddToGoalButton } from "@/components/add-to-goal-button"
```

2. Find the type `<select>` element and add `AddToGoalButton` immediately after it, inside the same `flex` container row.

The exact props for each file:

| File | kind | subtype variable | defaultKey variable | displayName example |
|------|------|-----------------|---------------------|---------------------|
| `scale-panel.tsx` | `"scale"` | `scaleType` | `root` | `` `${root} ${scaleType} scale` `` |
| `chord-panel.tsx` | `"chord"` | `chordType` | `root` | `` `${root}${chordType} chord` `` |
| `triad-panel.tsx` | `"triad"` | `triadType` | `root` | `` `${root} ${triadType} triad` `` |
| `arpeggio-panel.tsx` | `"arpeggio"` | `chordType` | `root` | `` `${root} ${chordType} arpeggio` `` |
| `harmony-tab.tsx` | `"harmony"` | `mode` | `tonic` | `` `${tonic} ${mode}` `` |
| `progressions-tab.tsx` | `"progression"` | `progressionName` | `tonic` | `prog.displayName` |

- [ ] **Step 1: Modify `scale-panel.tsx`**

Add the import at the top (after existing imports):
```tsx
import { AddToGoalButton } from "@/components/add-to-goal-button"
```

Find the scale type `<select>` element in the JSX. It has `value={scaleType}` and `onChange` that calls `setScaleType`. The `<select>` sits in a flex row with the root selector. After the scale type `<select>` closing tag, add:

```tsx
<AddToGoalButton
  kind="scale"
  subtype={scaleType}
  defaultKey={root}
  displayName={`${root} ${scaleType} scale`}
/>
```

- [ ] **Step 2: Modify `chord-panel.tsx`**

Add the import. Find the chord type `<select>` with `value={chordType}`. After it, add:

```tsx
<AddToGoalButton
  kind="chord"
  subtype={chordType}
  defaultKey={root}
  displayName={`${root}${chordType} chord`}
/>
```

- [ ] **Step 3: Modify `triad-panel.tsx`**

Add the import. Find the triad type `<select>` with `value={triadType}`. After it, add:

```tsx
<AddToGoalButton
  kind="triad"
  subtype={triadType}
  defaultKey={root}
  displayName={`${root} ${triadType} triad`}
/>
```

- [ ] **Step 4: Modify `arpeggio-panel.tsx`**

Add the import. Find the chord/arpeggio type `<select>` with `value={chordType}` (the state variable is named `chordType` in this panel). After it, add:

```tsx
<AddToGoalButton
  kind="arpeggio"
  subtype={chordType}
  defaultKey={root}
  displayName={`${root} ${chordType} arpeggio`}
/>
```

- [ ] **Step 5: Modify `harmony-tab.tsx`**

Add the import. The mode selector has `id="harmony-mode"` and `value={mode}`. After the mode `<select>`, add:

```tsx
<AddToGoalButton
  kind="harmony"
  subtype={mode}
  defaultKey={tonic}
  displayName={`${tonic} ${mode}`}
/>
```

- [ ] **Step 6: Modify `progressions-tab.tsx`**

Add the import. The progression `<select>` has `value={progressionName}`. The current code already has `const prog = progressions.find((p) => p.name === progressionName)!`. After the progression `<select>` (and before the `?` info button div), add:

```tsx
<AddToGoalButton
  kind="progression"
  subtype={progressionName}
  defaultKey={tonic}
  displayName={prog.displayName}
/>
```

- [ ] **Step 7: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 8: Commit**

```bash
git add app/\(app\)/reference/
git commit -m "feat: add + buttons to Reference panels for goal topic assignment"
```

---

### Task 8: Final check

- [ ] **Step 1: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass, 0 failures

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Manual verification**

```bash
pnpm dev
```

Visit and verify:
- `/library/[any-category]` — each lesson row has a `+` button; clicking opens the goal selector modal
- `/reference` (Scales tab) — type selector has a `+` button next to it; modal pre-selects active goal, shows current key
- `/reference` (Chords, Triads, Arpeggios tabs) — same pattern
- `/reference` Harmony/Progressions tab — `+` button works
- `/goals/[goalId]` — Topics section shows assigned topics with Remove button
- `/goals/[goalId]` → "Add routine" → `/goals/[goalId]/routines/new` — creates routine, redirects to section builder
- `/goals/[goalId]/routines/[routineId]` — sections listed; drag handles reorder them; expand a section; add/remove topics; configure keys and practice mode
