# Phase 4A: Data Model + Goals CRUD — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the full Phase 4 database schema in one migration and implement Goals CRUD — create, view, edit, archive, unarchive, delete, and set active.

**Architecture:** All five new Prisma models are added in a single migration so Plan B can build on them without a second schema change. Goal management runs via typed server actions in `app/(app)/goals/actions.ts`. Pages are async server components; interactive controls are client components that call server actions and then call `router.refresh()` to re-fetch server data. The `Navbar` component is split into a server wrapper (fetches active goal) and a client component (handles `usePathname`, sign-out, etc.).

**Tech Stack:** Prisma 7 (PrismaPg adapter), Next.js 16 server actions + server components, react-markdown@9, Vitest.

---

## File Structure

**Create:**
- `lib/goals.ts` — pure functions: `computeRefKey`, `formatTopicName`
- `app/(app)/goals/actions.ts` — server actions for all goal + topic CRUD
- `app/(app)/goals/_components/new-goal-form.tsx` — client: collapsible inline create form
- `app/(app)/goals/_components/goal-card.tsx` — client: goal card with activate/archive buttons
- `app/(app)/goals/archived/page.tsx` — server: archived goals list
- `app/(app)/goals/archived/_components/archived-goal-card.tsx` — client: unarchive/delete buttons
- `app/(app)/goals/[goalId]/page.tsx` — server: goal detail page
- `app/(app)/goals/[goalId]/_components/goal-detail-client.tsx` — client: inline edit + topic/routine list
- `components/layout/navbar-client.tsx` — extracted client nav (current navbar.tsx content + `activeGoalTitle` prop)
- `__tests__/goals/lib.test.ts` — unit tests for `lib/goals.ts`
- `__tests__/goals/actions.test.ts` — unit tests for goal server actions

**Modify:**
- `prisma/schema.prisma` — add 3 enums + 5 models + relations on `User` and `Topic`
- `app/(app)/goals/page.tsx` — replace "coming soon" placeholder with real list page
- `components/layout/navbar.tsx` — convert to async server component that fetches active goal, renders `NavbarClient`

---

### Task 1: Install react-markdown

**Files:**
- Modify: `package.json` (via pnpm install)

- [ ] **Step 1: Install the dependency**

```bash
pnpm add react-markdown@9
```

Expected output: `dependencies: + react-markdown 9.x.x`

- [ ] **Step 2: Verify the import resolves**

```bash
node -e "require('./node_modules/react-markdown/index.js'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: install react-markdown for Phase 4 descriptions"
```

---

### Task 2: Update Prisma schema and run migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Replace the full contents of `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client"
  output   = "../lib/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

// ── Enums ─────────────────────────────────────────────────────────────────────

enum TopicKind {
  lesson
  scale
  chord
  triad
  arpeggio
  progression
  harmony
}

enum SectionType {
  warmup
  technique
  muscle_memory
  theory
  lessons
  songs
  free_practice
}

enum PracticeMode {
  chromatic_asc
  chromatic_desc
  circle_fifths_asc
  circle_fourths_desc
  random
}

// ── Phase 1–2 models (unchanged) ──────────────────────────────────────────────

model User {
  id           String   @id @default(cuid())
  name         String?
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  goals        Goal[]
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
  id          String      @id @default(cuid())
  title       String
  url         String      @unique
  slug        String
  order       Int         @default(0)
  category    Category    @relation(fields: [categoryId], references: [id])
  categoryId  String
  source      Source      @relation(fields: [sourceId], references: [id])
  sourceId    String
  createdAt   DateTime    @default(now())
  goalTopics  GoalTopic[]
}

// ── Phase 4 models ────────────────────────────────────────────────────────────

model Goal {
  id          String      @id @default(cuid())
  userId      String
  user        User        @relation(fields: [userId], references: [id])
  title       String
  description String      @default("")
  isActive    Boolean     @default(false)
  isArchived  Boolean     @default(false)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  topics      GoalTopic[]
  routines    Routine[]
}

model GoalTopic {
  id            String        @id @default(cuid())
  goalId        String
  goal          Goal          @relation(fields: [goalId], references: [id], onDelete: Cascade)
  kind          TopicKind
  subtype       String?
  lessonId      String?
  lesson        Topic?        @relation(fields: [lessonId], references: [id])
  defaultKey    String?
  refKey        String
  createdAt     DateTime      @default(now())
  sectionTopics SectionTopic[]

  @@unique([goalId, refKey])
}

model Routine {
  id              String    @id @default(cuid())
  goalId          String
  goal            Goal      @relation(fields: [goalId], references: [id], onDelete: Cascade)
  title           String
  description     String    @default("")
  durationMinutes Int
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  sections        Section[]
}

model Section {
  id              String        @id @default(cuid())
  routineId       String
  routine         Routine       @relation(fields: [routineId], references: [id], onDelete: Cascade)
  type            SectionType
  title           String
  description     String        @default("")
  durationMinutes Int
  order           Int
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  sectionTopics   SectionTopic[]
}

model SectionTopic {
  id           String        @id @default(cuid())
  sectionId    String
  section      Section       @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  goalTopicId  String
  goalTopic    GoalTopic     @relation(fields: [goalTopicId], references: [id], onDelete: Cascade)
  keys         String[]      @default([])
  practiceMode PracticeMode?

  @@unique([sectionId, goalTopicId])
}
```

- [ ] **Step 2: Run the migration**

```bash
npx prisma migrate dev --name phase4_goals_routines
```

Expected: `The following migration(s) have been created and applied: migrations/YYYYMMDDHHMMSS_phase4_goals_routines/`

This also regenerates the Prisma client. If it asks to reset the database, type `yes` only in a dev environment.

- [ ] **Step 3: Verify the generated client includes new models**

```bash
grep -l "Goal\|GoalTopic\|Routine\|Section\|SectionTopic" lib/generated/prisma/client.d.ts | head -1
```

Expected: `lib/generated/prisma/client.d.ts`

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add Phase 4 schema — Goal, GoalTopic, Routine, Section, SectionTopic"
```

---

### Task 3: Create lib/goals.ts with pure utility functions

**Files:**
- Create: `lib/goals.ts`
- Create: `__tests__/goals/lib.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/goals/lib.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { computeRefKey, formatTopicName } from "@/lib/goals"

describe("computeRefKey", () => {
  it("generates a lesson key from lessonId", () => {
    expect(computeRefKey({ kind: "lesson", lessonId: "abc123" })).toBe("lesson:abc123")
  })

  it("generates a reference key from kind, subtype, and defaultKey", () => {
    expect(computeRefKey({ kind: "scale", subtype: "major", defaultKey: "C" })).toBe("scale:major:C")
  })

  it("handles missing optional fields with empty strings", () => {
    expect(computeRefKey({ kind: "scale" })).toBe("scale::")
  })

  it("handles null optional fields", () => {
    expect(computeRefKey({ kind: "chord", subtype: null, defaultKey: null })).toBe("chord::")
  })
})

describe("formatTopicName", () => {
  it("formats lesson topics using the lesson title", () => {
    const topic = { kind: "lesson" as const, subtype: null, defaultKey: null, lesson: { title: "Let It Be" } }
    expect(formatTopicName(topic)).toBe("Let It Be")
  })

  it("returns Unknown lesson when lesson title is missing", () => {
    const topic = { kind: "lesson" as const, subtype: null, defaultKey: null, lesson: null }
    expect(formatTopicName(topic)).toBe("Unknown lesson")
  })

  it("formats scale topics", () => {
    const topic = { kind: "scale" as const, subtype: "major", defaultKey: "C", lesson: null }
    expect(formatTopicName(topic)).toBe("C major scale")
  })

  it("formats chord topics (no space between key and type)", () => {
    const topic = { kind: "chord" as const, subtype: "m7", defaultKey: "A", lesson: null }
    expect(formatTopicName(topic)).toBe("Am7 chord")
  })

  it("formats triad topics", () => {
    const topic = { kind: "triad" as const, subtype: "minor", defaultKey: "E", lesson: null }
    expect(formatTopicName(topic)).toBe("E minor triad")
  })

  it("formats arpeggio topics", () => {
    const topic = { kind: "arpeggio" as const, subtype: "maj7", defaultKey: "C", lesson: null }
    expect(formatTopicName(topic)).toBe("C maj7 arpeggio")
  })

  it("formats progression topics by looking up displayName in the theory library", () => {
    // "pop-standard" has displayName "Pop Axis" in lib/theory/progressions.ts
    const topic = { kind: "progression" as const, subtype: "pop-standard", defaultKey: null, lesson: null }
    expect(formatTopicName(topic)).toBe("Pop Axis")
  })

  it("falls back to subtype for unknown progression slugs", () => {
    const topic = { kind: "progression" as const, subtype: "unknown-slug", defaultKey: null, lesson: null }
    expect(formatTopicName(topic)).toBe("unknown-slug")
  })

  it("formats harmony topics", () => {
    const topic = { kind: "harmony" as const, subtype: "ionian", defaultKey: "C", lesson: null }
    expect(formatTopicName(topic)).toBe("C ionian")
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run __tests__/goals/lib.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/goals'`

- [ ] **Step 3: Create `lib/goals.ts`**

```typescript
import type { TopicKind } from "@/lib/generated/prisma/client"
import { listProgressions } from "@/lib/theory/progressions"

export function computeRefKey(topicRef: {
  kind: TopicKind
  subtype?: string | null
  lessonId?: string | null
  defaultKey?: string | null
}): string {
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
}

export function formatTopicName(topic: GoalTopicForDisplay): string {
  switch (topic.kind) {
    case "lesson":
      return topic.lesson?.title ?? "Unknown lesson"
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

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run __tests__/goals/lib.test.ts
```

Expected: PASS — 10 tests, 0 failures

- [ ] **Step 5: Commit**

```bash
git add lib/goals.ts __tests__/goals/lib.test.ts
git commit -m "feat: add computeRefKey and formatTopicName utility functions"
```

---

### Task 4: Create goal server actions with tests

**Files:**
- Create: `app/(app)/goals/actions.ts`
- Create: `__tests__/goals/actions.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/goals/actions.test.ts`:

```typescript
import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  db: {
    goal: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    goalTopic: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  createGoal,
  updateGoal,
  setActiveGoal,
  archiveGoal,
  unarchiveGoal,
  deleteGoal,
  addTopicToGoal,
  removeTopicFromGoal,
} from "@/app/(app)/goals/actions"

const MOCK_SESSION = { user: { id: "user-1", email: "test@example.com", name: "Test" } }
const MOCK_GOAL = { id: "goal-1", userId: "user-1", title: "My Goal", description: "", isActive: false, isArchived: false, createdAt: new Date(), updatedAt: new Date() }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue(MOCK_SESSION as never)
})

describe("createGoal", () => {
  it("creates a goal for the current user and returns its id", async () => {
    vi.mocked(db.goal.create).mockResolvedValue({ ...MOCK_GOAL, id: "new-goal" } as never)
    const result = await createGoal({ title: "My Goal" })
    expect(result).toEqual({ success: true, id: "new-goal" })
    expect(db.goal.create).toHaveBeenCalledWith({
      data: { userId: "user-1", title: "My Goal", description: "" },
    })
  })

  it("returns an error when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    const result = await createGoal({ title: "My Goal" })
    expect(result).toEqual({ error: "Failed to create goal" })
  })

  it("trims whitespace from title and description", async () => {
    vi.mocked(db.goal.create).mockResolvedValue({ ...MOCK_GOAL, id: "g2" } as never)
    await createGoal({ title: "  Padded  ", description: "  Notes  " })
    expect(db.goal.create).toHaveBeenCalledWith({
      data: { userId: "user-1", title: "Padded", description: "Notes" },
    })
  })
})

describe("updateGoal", () => {
  it("updates the goal when it belongs to the current user", async () => {
    vi.mocked(db.goal.findUnique).mockResolvedValue(MOCK_GOAL as never)
    vi.mocked(db.goal.update).mockResolvedValue(MOCK_GOAL as never)
    const result = await updateGoal("goal-1", { title: "New Title" })
    expect(result).toEqual({ success: true })
    expect(db.goal.update).toHaveBeenCalledWith({
      where: { id: "goal-1" },
      data: { title: "New Title" },
    })
  })

  it("returns not found when goal belongs to another user", async () => {
    vi.mocked(db.goal.findUnique).mockResolvedValue({ ...MOCK_GOAL, userId: "other-user" } as never)
    const result = await updateGoal("goal-1", { title: "New Title" })
    expect(result).toEqual({ error: "Not found" })
    expect(db.goal.update).not.toHaveBeenCalled()
  })
})

describe("setActiveGoal", () => {
  it("runs a transaction to deactivate all then activate the target", async () => {
    vi.mocked(db.goal.findUnique).mockResolvedValue(MOCK_GOAL as never)
    vi.mocked(db.$transaction).mockResolvedValue([undefined, MOCK_GOAL] as never)
    const result = await setActiveGoal("goal-1")
    expect(result).toEqual({ success: true })
    expect(db.$transaction).toHaveBeenCalled()
  })

  it("returns not found for a goal owned by another user", async () => {
    vi.mocked(db.goal.findUnique).mockResolvedValue({ ...MOCK_GOAL, userId: "other-user" } as never)
    const result = await setActiveGoal("goal-1")
    expect(result).toEqual({ error: "Not found" })
    expect(db.$transaction).not.toHaveBeenCalled()
  })
})

describe("archiveGoal", () => {
  it("sets isArchived=true and isActive=false", async () => {
    vi.mocked(db.goal.findUnique).mockResolvedValue(MOCK_GOAL as never)
    vi.mocked(db.goal.update).mockResolvedValue(MOCK_GOAL as never)
    const result = await archiveGoal("goal-1")
    expect(result).toEqual({ success: true })
    expect(db.goal.update).toHaveBeenCalledWith({
      where: { id: "goal-1" },
      data: { isArchived: true, isActive: false },
    })
  })
})

describe("unarchiveGoal", () => {
  it("sets isArchived=false", async () => {
    vi.mocked(db.goal.findUnique).mockResolvedValue({ ...MOCK_GOAL, isArchived: true } as never)
    vi.mocked(db.goal.update).mockResolvedValue(MOCK_GOAL as never)
    const result = await unarchiveGoal("goal-1")
    expect(result).toEqual({ success: true })
    expect(db.goal.update).toHaveBeenCalledWith({
      where: { id: "goal-1" },
      data: { isArchived: false },
    })
  })
})

describe("deleteGoal", () => {
  it("deletes the goal when owned by current user", async () => {
    vi.mocked(db.goal.findUnique).mockResolvedValue(MOCK_GOAL as never)
    vi.mocked(db.goal.delete).mockResolvedValue(MOCK_GOAL as never)
    const result = await deleteGoal("goal-1")
    expect(result).toEqual({ success: true })
    expect(db.goal.delete).toHaveBeenCalledWith({ where: { id: "goal-1" } })
  })
})

describe("addTopicToGoal", () => {
  it("upserts a GoalTopic with the computed refKey", async () => {
    vi.mocked(db.goal.findUnique).mockResolvedValue(MOCK_GOAL as never)
    vi.mocked(db.goalTopic.upsert).mockResolvedValue({} as never)
    const result = await addTopicToGoal("goal-1", { kind: "scale", subtype: "major", defaultKey: "C" })
    expect(result).toEqual({ success: true })
    expect(db.goalTopic.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { goalId_refKey: { goalId: "goal-1", refKey: "scale:major:C" } },
        create: expect.objectContaining({ refKey: "scale:major:C", kind: "scale" }),
      })
    )
  })

  it("returns not found when goal belongs to another user", async () => {
    vi.mocked(db.goal.findUnique).mockResolvedValue({ ...MOCK_GOAL, userId: "other" } as never)
    const result = await addTopicToGoal("goal-1", { kind: "scale", subtype: "major", defaultKey: "C" })
    expect(result).toEqual({ error: "Not found" })
  })
})

describe("removeTopicFromGoal", () => {
  it("deletes the GoalTopic when the goal belongs to the current user", async () => {
    vi.mocked(db.goalTopic.findUnique).mockResolvedValue({
      id: "gt-1",
      goalId: "goal-1",
      goal: MOCK_GOAL,
    } as never)
    vi.mocked(db.goalTopic.delete).mockResolvedValue({} as never)
    const result = await removeTopicFromGoal("gt-1")
    expect(result).toEqual({ success: true })
    expect(db.goalTopic.delete).toHaveBeenCalledWith({ where: { id: "gt-1" } })
  })

  it("returns not found when the topic's goal belongs to another user", async () => {
    vi.mocked(db.goalTopic.findUnique).mockResolvedValue({
      id: "gt-1",
      goalId: "goal-1",
      goal: { ...MOCK_GOAL, userId: "other-user" },
    } as never)
    const result = await removeTopicFromGoal("gt-1")
    expect(result).toEqual({ error: "Not found" })
    expect(db.goalTopic.delete).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run __tests__/goals/actions.test.ts
```

Expected: FAIL — `Cannot find module '@/app/(app)/goals/actions'`

- [ ] **Step 3: Create `app/(app)/goals/actions.ts`**

```typescript
"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { computeRefKey } from "@/lib/goals"
import type { TopicKind } from "@/lib/generated/prisma/client"

async function requireUserId(): Promise<string> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) throw new Error("Not authenticated")
  return userId
}

export async function createGoal(data: {
  title: string
  description?: string
}): Promise<{ success: true; id: string } | { error: string }> {
  try {
    const userId = await requireUserId()
    const goal = await db.goal.create({
      data: {
        userId,
        title: data.title.trim(),
        description: data.description?.trim() ?? "",
      },
    })
    revalidatePath("/goals")
    return { success: true, id: goal.id }
  } catch {
    return { error: "Failed to create goal" }
  }
}

export async function updateGoal(
  goalId: string,
  data: { title?: string; description?: string }
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const goal = await db.goal.findUnique({ where: { id: goalId } })
    if (!goal || goal.userId !== userId) return { error: "Not found" }
    await db.goal.update({
      where: { id: goalId },
      data: {
        ...(data.title !== undefined ? { title: data.title.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description.trim() } : {}),
      },
    })
    revalidatePath("/goals")
    revalidatePath(`/goals/${goalId}`)
    return { success: true }
  } catch {
    return { error: "Failed to update goal" }
  }
}

export async function setActiveGoal(
  goalId: string
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const goal = await db.goal.findUnique({ where: { id: goalId } })
    if (!goal || goal.userId !== userId) return { error: "Not found" }
    await db.$transaction([
      db.goal.updateMany({ where: { userId, isActive: true }, data: { isActive: false } }),
      db.goal.update({ where: { id: goalId }, data: { isActive: true } }),
    ])
    revalidatePath("/goals")
    return { success: true }
  } catch {
    return { error: "Failed to set active goal" }
  }
}

export async function archiveGoal(
  goalId: string
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const goal = await db.goal.findUnique({ where: { id: goalId } })
    if (!goal || goal.userId !== userId) return { error: "Not found" }
    await db.goal.update({
      where: { id: goalId },
      data: { isArchived: true, isActive: false },
    })
    revalidatePath("/goals")
    revalidatePath(`/goals/${goalId}`)
    return { success: true }
  } catch {
    return { error: "Failed to archive goal" }
  }
}

export async function unarchiveGoal(
  goalId: string
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const goal = await db.goal.findUnique({ where: { id: goalId } })
    if (!goal || goal.userId !== userId) return { error: "Not found" }
    await db.goal.update({
      where: { id: goalId },
      data: { isArchived: false },
    })
    revalidatePath("/goals/archived")
    return { success: true }
  } catch {
    return { error: "Failed to unarchive goal" }
  }
}

export async function deleteGoal(
  goalId: string
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const goal = await db.goal.findUnique({ where: { id: goalId } })
    if (!goal || goal.userId !== userId) return { error: "Not found" }
    await db.goal.delete({ where: { id: goalId } })
    revalidatePath("/goals")
    revalidatePath("/goals/archived")
    return { success: true }
  } catch {
    return { error: "Failed to delete goal" }
  }
}

export async function addTopicToGoal(
  goalId: string,
  topicRef: {
    kind: TopicKind
    subtype?: string
    lessonId?: string
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

export async function removeTopicFromGoal(
  goalTopicId: string
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const topic = await db.goalTopic.findUnique({
      where: { id: goalTopicId },
      include: { goal: true },
    })
    if (!topic || topic.goal.userId !== userId) return { error: "Not found" }
    await db.goalTopic.delete({ where: { id: goalTopicId } })
    revalidatePath(`/goals/${topic.goalId}`)
    return { success: true }
  } catch {
    return { error: "Failed to remove topic" }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run __tests__/goals/actions.test.ts
```

Expected: PASS — 12 tests, 0 failures

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/goals/actions.ts __tests__/goals/actions.test.ts
git commit -m "feat: add goal server actions with ownership checks"
```

---

### Task 5: Build the /goals list page

**Files:**
- Modify: `app/(app)/goals/page.tsx`
- Create: `app/(app)/goals/_components/new-goal-form.tsx`
- Create: `app/(app)/goals/_components/goal-card.tsx`

- [ ] **Step 1: Create `app/(app)/goals/_components/new-goal-form.tsx`**

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createGoal } from "@/app/(app)/goals/actions"

export function NewGoalForm({ showOpenByDefault }: { showOpenByDefault: boolean }) {
  const [isOpen, setIsOpen] = useState(showOpenByDefault)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    const fd = new FormData(e.currentTarget)
    const result = await createGoal({
      title: fd.get("title") as string,
      description: (fd.get("description") as string) || undefined,
    })
    setIsPending(false)
    if ("error" in result) {
      setError(result.error)
    } else {
      setIsOpen(false)
      setError(null)
      ;(e.target as HTMLFormElement).reset()
      router.refresh()
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-xs font-semibold bg-accent text-accent-foreground px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity"
      >
        New goal
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-2 mt-4">
      <input
        name="title"
        placeholder="Goal title"
        required
        maxLength={120}
        className="w-full rounded border border-border bg-card px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <textarea
        name="description"
        placeholder="Description (Markdown supported)"
        rows={3}
        className="w-full rounded border border-border bg-card px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="text-xs font-semibold bg-accent text-accent-foreground px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? "Creating…" : "Create goal"}
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

- [ ] **Step 2: Create `app/(app)/goals/_components/goal-card.tsx`**

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import { setActiveGoal, archiveGoal } from "@/app/(app)/goals/actions"

interface GoalCardProps {
  goal: { id: string; title: string; description: string; isActive: boolean }
  topicCount: number
  routineCount: number
}

export function GoalCard({ goal, topicCount, routineCount }: GoalCardProps) {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSetActive() {
    setIsPending(true)
    const result = await setActiveGoal(goal.id)
    setIsPending(false)
    if ("error" in result) setError(result.error)
    else router.refresh()
  }

  async function handleArchive() {
    setIsPending(true)
    const result = await archiveGoal(goal.id)
    setIsPending(false)
    if ("error" in result) setError(result.error)
    else router.refresh()
  }

  const firstLine = goal.description.split("\n")[0]

  return (
    <li
      className={`rounded-lg border p-4 ${
        goal.isActive ? "border-accent" : "border-border dark:border-neutral-600"
      } bg-card dark:bg-neutral-800`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/goals/${goal.id}`}
              className="text-sm font-semibold text-foreground hover:text-accent transition-colors"
            >
              {goal.title}
            </Link>
            {goal.isActive && (
              <span className="text-xs text-accent border border-accent px-1.5 py-0.5 rounded">
                Active
              </span>
            )}
          </div>
          {firstLine && (
            <div className="text-xs text-muted-foreground mt-1 line-clamp-1 prose prose-sm max-w-none [&>*]:text-xs [&>*]:text-muted-foreground [&>*]:m-0">
              <ReactMarkdown>{firstLine}</ReactMarkdown>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {topicCount} {topicCount === 1 ? "topic" : "topics"} · {routineCount}{" "}
            {routineCount === 1 ? "routine" : "routines"}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {!goal.isActive && (
            <button
              onClick={handleSetActive}
              disabled={isPending}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              Make active
            </button>
          )}
          <button
            onClick={handleArchive}
            disabled={isPending}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Archive
          </button>
          <Link
            href={`/goals/${goal.id}`}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View →
          </Link>
        </div>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </li>
  )
}
```

- [ ] **Step 3: Replace `app/(app)/goals/page.tsx`**

```tsx
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { GoalCard } from "./_components/goal-card"
import { NewGoalForm } from "./_components/new-goal-form"

export default async function GoalsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const goals = await db.goal.findMany({
    where: { userId: session.user.id, isArchived: false },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { topics: true, routines: true } } },
  })

  return (
    <div className="pt-6">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
            Your goals
          </p>
          <h1 className="text-2xl font-semibold text-foreground">Goals</h1>
        </div>
        <NewGoalForm showOpenByDefault={goals.length === 0} />
      </div>

      {goals.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You don&apos;t have any goals yet. Goals help you stay focused — create your first one
          above!
        </p>
      ) : (
        <ul className="space-y-3">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              topicCount={goal._count.topics}
              routineCount={goal._count.routines}
            />
          ))}
        </ul>
      )}

      <div className="mt-8">
        <Link
          href="/goals/archived"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View archived goals →
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run all tests to make sure nothing is broken**

```bash
npx vitest run
```

Expected: all existing tests pass plus the new ones

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/goals/
git commit -m "feat: build /goals list page with create form and goal cards"
```

---

### Task 6: Build the /goals/archived page

**Files:**
- Create: `app/(app)/goals/archived/page.tsx`
- Create: `app/(app)/goals/archived/_components/archived-goal-card.tsx`

- [ ] **Step 1: Create `app/(app)/goals/archived/_components/archived-goal-card.tsx`**

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { unarchiveGoal, deleteGoal } from "@/app/(app)/goals/actions"

interface ArchivedGoalCardProps {
  goal: { id: string; title: string; description: string }
}

export function ArchivedGoalCard({ goal }: ArchivedGoalCardProps) {
  const [isPending, setIsPending] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleUnarchive() {
    setIsPending(true)
    const result = await unarchiveGoal(goal.id)
    setIsPending(false)
    if ("error" in result) setError(result.error)
    else router.refresh()
  }

  async function handleDelete() {
    setIsPending(true)
    const result = await deleteGoal(goal.id)
    setIsPending(false)
    if ("error" in result) setError(result.error)
    else router.refresh()
  }

  return (
    <li className="rounded-lg border border-border dark:border-neutral-600 bg-card dark:bg-neutral-800 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{goal.title}</p>
          {goal.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {goal.description.split("\n")[0]}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={handleUnarchive}
            disabled={isPending}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Unarchive
          </button>
          {confirmDelete ? (
            <span className="flex items-center gap-2">
              <span className="text-xs text-red-500">Delete everything?</span>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="text-xs text-red-500 hover:text-red-400 transition-colors font-semibold disabled:opacity-50"
              >
                Yes, delete
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
              disabled={isPending}
              className="text-xs text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </li>
  )
}
```

- [ ] **Step 2: Create `app/(app)/goals/archived/page.tsx`**

```tsx
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArchivedGoalCard } from "./_components/archived-goal-card"

export default async function ArchivedGoalsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const goals = await db.goal.findMany({
    where: { userId: session.user.id, isArchived: true },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, description: true },
  })

  return (
    <div className="pt-6">
      <Link
        href="/goals"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-1"
      >
        ← Goals
      </Link>
      <h1 className="text-2xl font-semibold text-foreground mb-6">Archived Goals</h1>

      {goals.length === 0 ? (
        <p className="text-sm text-muted-foreground">No archived goals.</p>
      ) : (
        <ul className="space-y-3">
          {goals.map((goal) => (
            <ArchivedGoalCard key={goal.id} goal={goal} />
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/goals/archived/
git commit -m "feat: build /goals/archived page with unarchive and delete"
```

---

### Task 7: Build the /goals/[goalId] detail page

**Files:**
- Create: `app/(app)/goals/[goalId]/page.tsx`
- Create: `app/(app)/goals/[goalId]/_components/goal-detail-client.tsx`

- [ ] **Step 1: Create `app/(app)/goals/[goalId]/_components/goal-detail-client.tsx`**

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import { updateGoal, archiveGoal, removeTopicFromGoal } from "@/app/(app)/goals/actions"
import { formatTopicName } from "@/lib/goals"
import type { Goal, GoalTopic, Routine, Topic } from "@/lib/generated/prisma/client"

type GoalTopicWithLesson = GoalTopic & { lesson: Pick<Topic, "title"> | null }
type RoutineWithCount = Routine & { _count: { sections: number } }

interface GoalDetailClientProps {
  goal: Goal & { topics: GoalTopicWithLesson[]; routines: RoutineWithCount[] }
}

export function GoalDetailClient({ goal }: GoalDetailClientProps) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [titleValue, setTitleValue] = useState(goal.title)
  const [descValue, setDescValue] = useState(goal.description)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function saveTitle() {
    setEditingTitle(false)
    if (titleValue.trim() === goal.title) return
    const result = await updateGoal(goal.id, { title: titleValue })
    if ("error" in result) setError(result.error)
    else router.refresh()
  }

  async function saveDesc() {
    setEditingDesc(false)
    if (descValue.trim() === goal.description) return
    const result = await updateGoal(goal.id, { description: descValue })
    if ("error" in result) setError(result.error)
    else router.refresh()
  }

  async function handleArchive() {
    const result = await archiveGoal(goal.id)
    if ("error" in result) setError(result.error)
    else router.push("/goals")
  }

  async function handleRemoveTopic(goalTopicId: string) {
    const result = await removeTopicFromGoal(goalTopicId)
    if ("error" in result) setError(result.error)
    else router.refresh()
  }

  return (
    <div className="pt-6">
      <Link
        href="/goals"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-1"
      >
        ← Goals
      </Link>

      {/* Title */}
      <div className="flex items-start justify-between gap-2 mb-4">
        {editingTitle ? (
          <input
            autoFocus
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === "Enter") saveTitle() }}
            className="text-2xl font-semibold text-foreground bg-transparent border-b border-accent focus:outline-none w-full"
          />
        ) : (
          <h1
            className="text-2xl font-semibold text-foreground cursor-pointer hover:text-accent transition-colors"
            onClick={() => setEditingTitle(true)}
            title="Click to edit"
          >
            {titleValue}
          </h1>
        )}
        {goal.isActive && (
          <span className="text-xs text-accent border border-accent px-1.5 py-0.5 rounded flex-shrink-0 mt-1.5">
            Active
          </span>
        )}
      </div>

      {/* Description */}
      <div className="mb-6">
        {editingDesc ? (
          <textarea
            autoFocus
            value={descValue}
            onChange={(e) => setDescValue(e.target.value)}
            onBlur={saveDesc}
            rows={4}
            placeholder="Description (Markdown supported)"
            className="w-full rounded border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none"
          />
        ) : descValue ? (
          <div
            className="prose prose-sm max-w-none text-foreground cursor-pointer"
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
            Add description…
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-500 mb-4">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Topics */}
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Topics</p>
          {goal.topics.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No topics yet. Use the + button in Library or Reference to add topics to this goal.
            </p>
          ) : (
            <ul className="space-y-2">
              {goal.topics.map((topic) => (
                <li key={topic.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground w-16 flex-shrink-0">
                      {topic.kind}
                    </span>
                    <span className="text-sm text-foreground truncate">
                      {formatTopicName(topic)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveTopic(topic.id)}
                    className="text-xs text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Routines */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Routines</p>
            <Link
              href={`/goals/${goal.id}/routines/new`}
              className="text-xs font-semibold bg-accent text-accent-foreground px-2.5 py-1 rounded hover:opacity-90 transition-opacity"
            >
              Add routine
            </Link>
          </div>
          {goal.routines.length === 0 ? (
            <p className="text-sm text-muted-foreground">No routines yet.</p>
          ) : (
            <ul className="space-y-2">
              {goal.routines.map((routine) => (
                <li key={routine.id}>
                  <Link
                    href={`/goals/${goal.id}/routines/${routine.id}`}
                    className="flex items-center justify-between py-2 hover:bg-card rounded px-2 -mx-2 transition-colors"
                  >
                    <span className="text-sm text-foreground">{routine.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {routine.durationMinutes} min · {routine._count.sections}{" "}
                      {routine._count.sections === 1 ? "section" : "sections"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Archive */}
      <div className="mt-10 pt-6 border-t border-border">
        <button
          onClick={handleArchive}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Archive this goal
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `app/(app)/goals/[goalId]/page.tsx`**

```tsx
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import { GoalDetailClient } from "./_components/goal-detail-client"

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ goalId: string }>
}) {
  const { goalId } = await params
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const goal = await db.goal.findUnique({
    where: { id: goalId },
    include: {
      topics: {
        include: { lesson: { select: { title: true } } },
        orderBy: { createdAt: "asc" },
      },
      routines: {
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { sections: true } } },
      },
    },
  })

  if (!goal || goal.userId !== session.user.id) notFound()

  return <GoalDetailClient goal={goal} />
}
```

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/goals/\[goalId\]/
git commit -m "feat: build /goals/[goalId] detail page with inline editing"
```

---

### Task 8: Refactor Navbar to show active goal title

**Files:**
- Create: `components/layout/navbar-client.tsx`
- Modify: `components/layout/navbar.tsx`

- [ ] **Step 1: Create `components/layout/navbar-client.tsx`**

This is the current `navbar.tsx` content, converted to accept an `activeGoalTitle` prop and render it below the Goals nav link:

```tsx
"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { MobileMenu } from "@/components/layout/mobile-menu"

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/goals", label: "Goals" },
  { href: "/library", label: "Library" },
  { href: "/reference", label: "Reference" },
  { href: "/history", label: "History" },
]

interface NavbarClientProps {
  activeGoalTitle: string | null
}

export function NavbarClient({ activeGoalTitle }: NavbarClientProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await signOut({ redirect: false })
    router.push("/login")
    router.refresh()
  }

  return (
    <nav className="sticky top-0 z-50 h-11 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="flex h-full items-center gap-5 px-5">
        <div className="md:hidden">
          <MobileMenu items={NAV_ITEMS} />
        </div>

        <span className="text-sm font-medium text-foreground/85 md:mr-3">Guitar Practice</span>

        <div className="hidden md:flex items-center gap-5">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <div key={item.href} className="flex flex-col items-center justify-center">
                <Link
                  href={item.href}
                  className={cn(
                    "text-[13px] transition-colors pb-px",
                    isActive
                      ? "text-accent border-b-[1.5px] border-accent"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
                {item.href === "/goals" && activeGoalTitle && (
                  <span className="text-[10px] text-muted-foreground truncate max-w-[80px] leading-none">
                    {activeGoalTitle}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={handleSignOut}
            className="hidden md:block text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>
          <Link
            href="/"
            className="bg-accent text-accent-foreground text-xs font-semibold px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            <span className="hidden md:inline">Start Practice</span>
            <span className="md:hidden">▶</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Replace `components/layout/navbar.tsx` with a server component**

```tsx
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NavbarClient } from "./navbar-client"

export async function Navbar() {
  const session = await auth()
  let activeGoalTitle: string | null = null

  if (session?.user?.id) {
    const goal = await db.goal.findFirst({
      where: { userId: session.user.id, isActive: true, isArchived: false },
      select: { title: true },
    })
    activeGoalTitle = goal?.title ?? null
  }

  return <NavbarClient activeGoalTitle={activeGoalTitle} />
}
```

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add components/layout/navbar.tsx components/layout/navbar-client.tsx
git commit -m "feat: show active goal title in navbar"
```

---

### Task 9: Final check

- [ ] **Step 1: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass, 0 failures

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Start the dev server and manually verify**

```bash
pnpm dev
```

Visit:
- `/goals` — should show the goals list with "New goal" button
- Create a goal — form should collapse, goal should appear in the list
- Click "Make active" — accent border and "Active" badge appear; navbar shows goal title
- Click "View →" or goal title — opens `/goals/[goalId]`
- Edit title inline (click it) — saves on Enter/blur
- Add description, toggle to Markdown view
- Click "Archive this goal" — redirects to `/goals`
- Visit `/goals/archived` — archived goal appears; Unarchive returns it; Delete removes it
