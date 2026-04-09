# Custom Progressions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users create, edit, reorder, and delete their own chord progressions, which appear on the Reference page Progressions tab and can be added to practice goals.

**Architecture:** New `UserProgression` Prisma model stores `displayName`, `description` (markdown), `mode` (TonalJS mode name), `degrees` (roman numeral strings), and `order`. A new `userProgressionId` FK on `GoalTopic` mirrors the existing `userLessonId` pattern. A new `getUserProgressionChords()` pure function resolves stored degrees to actual chord names in any key, so transposition works identically to built-in progressions. The Reference page is split into a server component (fetches user progressions) + client wrapper (holds all existing state).

**Tech Stack:** Prisma 7, Next.js 16 App Router, dnd-kit, `analyzeProgression` / `transposeProgression` / `getDiatonicChords` from `lib/theory/`, `ChordInputRow` component (reused from Transposer/Key Finder), Vitest.

---

## File Map

| File | Status | Purpose |
|------|--------|---------|
| `prisma/schema.prisma` | Modify | Add `UserProgression` model + `GoalTopic.userProgressionId` FK |
| `lib/theory/user-progressions.ts` | Create | `getUserProgressionChords()` pure function |
| `lib/theory/user-progressions.test.ts` | Create | Unit tests for the above |
| `lib/goals.ts` | Modify | Extend `computeRefKey` + `formatTopicName` |
| `app/(app)/library/progressions/actions.ts` | Create | CRUD + reorder server actions |
| `app/(app)/library/progressions/page.tsx` | Create | List page (server component) |
| `app/(app)/library/progressions/_components/user-progression-list.tsx` | Create | dnd-kit sortable list |
| `app/(app)/library/progressions/_components/user-progression-card.tsx` | Create | Card with expand/edit/delete |
| `app/(app)/library/progressions/new/page.tsx` | Create | Create page (server wrapper) |
| `app/(app)/library/progressions/[id]/edit/page.tsx` | Create | Edit page (server wrapper) |
| `app/(app)/library/progressions/_components/progression-form.tsx` | Create | Chord entry + key/mode + fields form |
| `app/(app)/goals/actions.ts` | Modify | Extend `addTopicToGoal` for `userProgressionId` |
| `components/add-to-goal-button.tsx` | Modify | Add `userProgressionId` prop |
| `app/(app)/reference/page.tsx` | Modify | Convert to server component; fetch user progressions |
| `app/(app)/reference/_components/reference-page-client.tsx` | Create | Move current page client code here |
| `app/(app)/reference/_components/harmony-study.tsx` | Modify | Thread `userProgressions` prop |
| `app/(app)/reference/_components/progressions-tab.tsx` | Modify | User progression support + pencil link |

---

## Task 1: Prisma Schema — UserProgression + GoalTopic FK

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add UserProgression model and GoalTopic FK to schema**

Open `prisma/schema.prisma`. Add the `UserProgression` model after the `UserLesson` model (around line 172), and add the FK field to `GoalTopic` (after the existing `userLessonId` fields, around line 110):

In `model User`, add to the relations block:
```prisma
  userProgressions UserProgression[]
```

In `model GoalTopic`, add after the `userLesson` relation (after line 111):
```prisma
  userProgressionId String?
  userProgression   UserProgression? @relation(fields: [userProgressionId], references: [id], onDelete: SetNull)
```

Add the new model after `UserLesson`:
```prisma
model UserProgression {
  id          String      @id @default(cuid())
  userId      String
  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  displayName String
  description String      @default("")
  mode        String
  degrees     String[]
  order       Int
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  goalTopics  GoalTopic[]

  @@index([userId])
}
```

- [ ] **Step 2: Generate Prisma client and create migration**

```bash
cd /Users/maraspeli/Build/Claude/GuitarPractice
npx prisma migrate dev --name add_user_progression
```

Expected: Migration file created, client regenerated in `lib/generated/prisma/`.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors (or only pre-existing unrelated errors).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add UserProgression model and GoalTopic.userProgressionId FK"
```

---

## Task 2: Theory Helper — getUserProgressionChords

**Files:**
- Create: `lib/theory/user-progressions.ts`
- Create: `lib/theory/user-progressions.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/theory/user-progressions.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { getUserProgressionChords } from "./user-progressions"

describe("getUserProgressionChords", () => {
  it("resolves diatonic I-V-vi-IV in C major to C G Am F", () => {
    const chords = getUserProgressionChords(["I", "V", "vi", "IV"], "major", "C")
    expect(chords.map(c => c.tonic)).toEqual(["C", "G", "A", "F"])
    expect(chords.map(c => c.quality)).toEqual(["major", "major", "minor", "major"])
  })

  it("resolves degrees in G major by transposing", () => {
    const chords = getUserProgressionChords(["I", "V", "vi", "IV"], "major", "G")
    expect(chords.map(c => c.tonic)).toEqual(["G", "D", "E", "C"])
  })

  it("resolves i-VII-VI-VII in C minor (aeolian) to Cm Bb Ab Bb", () => {
    const chords = getUserProgressionChords(["i", "VII", "VI", "VII"], "minor", "C")
    expect(chords.map(c => c.tonic)).toEqual(["C", "Bb", "Ab", "Bb"])
  })

  it("resolves borrowed ♭VII in C major to Bb", () => {
    // ♭VII borrowed in ionian context: baseDegree=7 (B), accidental=-1 → Bb
    const chords = getUserProgressionChords(["I", "♭VII", "IV"], "major", "C")
    expect(chords[1].tonic).toBe("Bb")
    expect(chords[1].quality).toBe("major")
  })

  it("resolves borrowed ♭VII in G major to F", () => {
    const chords = getUserProgressionChords(["I", "♭VII", "IV"], "major", "G")
    expect(chords[1].tonic).toBe("F")
  })

  it("uses the roman field from the stored degrees for display", () => {
    const chords = getUserProgressionChords(["I", "♭VII", "IV"], "major", "C")
    expect(chords[0].roman).toBe("I")
    expect(chords[1].roman).toBe("♭VII")
    expect(chords[2].roman).toBe("IV")
  })

  it("returns empty array for empty degrees", () => {
    expect(getUserProgressionChords([], "major", "C")).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run lib/theory/user-progressions.test.ts
```

Expected: FAIL — `getUserProgressionChords` not found.

- [ ] **Step 3: Implement getUserProgressionChords**

Create `lib/theory/user-progressions.ts`:

```typescript
import { Note } from "tonal"
import { getDiatonicChords } from "@/lib/theory/harmony"
import { keyPrefersSharps } from "@/lib/theory/transposer"
import type { ProgressionChord } from "@/lib/theory/types"

// ---------------------------------------------------------------------------
// Roman numeral base (uppercase) → scale degree 1–7
// ---------------------------------------------------------------------------
const ROMAN_BASE_TO_DEGREE: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7,
}

const FLAT_ROOTS  = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
const SHARP_ROOTS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

// Parse a roman numeral string (as produced by analyzeProgression) into parts.
// Examples: "I" → {acc:0, base:"I", deg:1, quality:"major"}
//           "♭VII" → {acc:-1, base:"VII", deg:7, quality:"major"}
//           "♭vii" → {acc:-1, base:"VII", deg:7, quality:"minor"}
//           "ii°"  → {acc:0,  base:"II",  deg:2, quality:"diminished"}
function parseRoman(roman: string): {
  accidentals: number
  baseDegree: number
  quality: string
  type: string
} {
  let s = roman
  let accidentals = 0
  while (s.startsWith("♭")) { accidentals -= 1; s = s.slice(1) }
  while (s.startsWith("#")) { accidentals += 1; s = s.slice(1) }

  const hasDim     = s.includes("°")
  const hasAug     = s.includes("+")
  const hasHalfDim = s.includes("ø")
  // Strip suffix decorators — keep only the letter(s)
  const letters = s.replace(/[°+ø0-9bmaj]/g, "")
  const isLower = letters === letters.toLowerCase() && letters !== ""

  const baseDegree = ROMAN_BASE_TO_DEGREE[letters.toUpperCase()] ?? 1
  const quality    = hasHalfDim ? "half-dim"
    : hasDim    ? "diminished"
    : hasAug    ? "augmented"
    : isLower   ? "minor"
    : "major"
  const type       = hasHalfDim ? "m7b5"
    : hasDim    ? "dim"
    : hasAug    ? "aug"
    : isLower   ? "m"
    : ""

  return { accidentals, baseDegree, quality, type }
}

// ---------------------------------------------------------------------------
// getUserProgressionChords
// Resolves an array of roman numeral degree strings (as stored in
// UserProgression.degrees) to ProgressionChord[] in the given tonic.
//
// For diatonic chords (no accidentals): uses the full diatonic chord type
// (including 7th extensions) from getDiatonicChords().
// For borrowed/non-diatonic chords (with accidentals): shifts the diatonic
// root by the accidental semitones and uses the quality from the roman case.
// ---------------------------------------------------------------------------
export function getUserProgressionChords(
  degrees: string[],
  mode: string,
  tonic: string,
): ProgressionChord[] {
  const diatonic = getDiatonicChords(tonic, mode)
  const byDegree = new Map(diatonic.map(dc => [dc.degree, dc]))

  const preferSharps = keyPrefersSharps(tonic, mode)
  const roots = preferSharps ? SHARP_ROOTS : FLAT_ROOTS

  return degrees.map(roman => {
    const { accidentals, baseDegree, quality, type } = parseRoman(roman)
    const baseDc = byDegree.get(baseDegree)

    if (!baseDc) {
      // Fallback: return tonic with major quality
      return { roman, nashville: String(baseDegree), tonic, type: "", quality: "major", degree: baseDegree }
    }

    if (accidentals === 0) {
      // Diatonic chord — use full type from getDiatonicChords (preserves maj7, m7, etc.)
      return {
        roman,
        nashville: baseDc.nashville,
        tonic: baseDc.tonic,
        type:  baseDc.type,
        quality: baseDc.quality,
        degree: baseDc.degree,
      }
    }

    // Non-diatonic: shift the diatonic root by accidental semitones
    const baseChroma = Note.chroma(baseDc.tonic)
    if (typeof baseChroma !== "number") {
      return { roman, nashville: baseDc.nashville, tonic: baseDc.tonic, type: baseDc.type, quality: baseDc.quality, degree: baseDc.degree }
    }
    const newChroma  = (baseChroma + accidentals + 12) % 12
    const chordTonic = roots[newChroma]

    return {
      roman,
      nashville: String(baseDegree),
      tonic:     chordTonic,
      type,
      quality,
      degree:    baseDegree,
    }
  })
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run lib/theory/user-progressions.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/theory/user-progressions.ts lib/theory/user-progressions.test.ts
git commit -m "feat: add getUserProgressionChords theory helper"
```

---

## Task 3: lib/goals.ts Extensions

**Files:**
- Modify: `lib/goals.ts`

- [ ] **Step 1: Extend computeRefKey and formatTopicName**

Read `lib/goals.ts` (it is short — 51 lines). Replace the entire file content with:

```typescript
import type { TopicKind } from "@/lib/generated/prisma/client"
import { listProgressions } from "@/lib/theory/progressions"

export function computeRefKey(topicRef: {
  kind: TopicKind
  subtype?: string | null
  lessonId?: string | null
  userLessonId?: string | null
  userProgressionId?: string | null
  defaultKey?: string | null
}): string {
  if (topicRef.kind === "lesson" && topicRef.userLessonId) {
    return `user_lesson:${topicRef.userLessonId}`
  }
  if (topicRef.kind === "lesson" && topicRef.lessonId) {
    return `lesson:${topicRef.lessonId}`
  }
  if (topicRef.kind === "progression" && topicRef.userProgressionId) {
    return `user_progression:${topicRef.userProgressionId}:${topicRef.defaultKey ?? ""}`
  }
  return `${topicRef.kind}:${topicRef.subtype ?? ""}:${topicRef.defaultKey ?? ""}`
}

type GoalTopicForDisplay = {
  kind: TopicKind
  subtype: string | null
  defaultKey: string | null
  lesson?: { title: string } | null
  userLesson?: { title: string; url: string | null } | null
  userProgression?: { displayName: string } | null
}

export function formatTopicName(topic: GoalTopicForDisplay): string {
  switch (topic.kind) {
    case "lesson":
      if (topic.userLesson) return topic.userLesson.title
      if (topic.lesson) return topic.lesson.title
      return "(lesson removed)"
    case "scale":
      return `${topic.defaultKey ?? ""} ${topic.subtype ?? ""} scale`.trim()
    case "chord":
      return `${topic.defaultKey ?? ""}${topic.subtype ?? ""} chord`
    case "inversion":
      return `${topic.defaultKey ?? ""} ${topic.subtype ?? ""} inversion`.trim()
    case "arpeggio":
      return `${topic.defaultKey ?? ""} ${topic.subtype ?? ""} arpeggio`.trim()
    case "progression": {
      if (topic.userProgression) return topic.userProgression.displayName
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

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/goals.ts
git commit -m "feat: extend computeRefKey and formatTopicName for user progressions"
```

---

## Task 4: Library Progression Server Actions

**Files:**
- Create: `app/(app)/library/progressions/actions.ts`

- [ ] **Step 1: Create the actions file**

```bash
mkdir -p /Users/maraspeli/Build/Claude/GuitarPractice/app/\(app\)/library/progressions
```

Create `app/(app)/library/progressions/actions.ts`:

```typescript
"use server"

import { revalidatePath } from "next/cache"
import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"

async function requireUserId(): Promise<string> {
  const userId = await getUserId()
  if (!userId) throw new Error("Not authenticated")
  return userId
}

function revalidate() {
  revalidatePath("/library/progressions")
  revalidatePath("/reference")
}

export async function createUserProgression(data: {
  displayName: string
  description: string
  mode: string
  degrees: string[]
}): Promise<{ success: true; id: string } | { error: string }> {
  try {
    const userId = await requireUserId()
    const last = await db.userProgression.findFirst({
      where: { userId },
      orderBy: { order: "desc" },
      select: { order: true },
    })
    const order = (last?.order ?? -1) + 1
    const prog = await db.userProgression.create({
      data: {
        userId,
        displayName: data.displayName.trim(),
        description: data.description,
        mode: data.mode,
        degrees: data.degrees,
        order,
      },
    })
    revalidate()
    return { success: true, id: prog.id }
  } catch {
    return { error: "Failed to create progression" }
  }
}

export async function updateUserProgression(
  id: string,
  data: {
    displayName?: string
    description?: string
    mode?: string
    degrees?: string[]
  }
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const prog = await db.userProgression.findUnique({ where: { id } })
    if (!prog || prog.userId !== userId) return { error: "Not found" }
    await db.userProgression.update({
      where: { id },
      data: {
        ...(data.displayName !== undefined && { displayName: data.displayName.trim() }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.mode       !== undefined && { mode: data.mode }),
        ...(data.degrees    !== undefined && { degrees: data.degrees }),
      },
    })
    revalidate()
    return { success: true }
  } catch {
    return { error: "Failed to update progression" }
  }
}

export async function deleteUserProgression(
  id: string
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const prog = await db.userProgression.findUnique({ where: { id } })
    if (!prog || prog.userId !== userId) return { error: "Not found" }
    await db.$transaction(async (tx) => {
      await tx.userProgression.delete({ where: { id } })
      const remaining = await tx.userProgression.findMany({
        where: { userId },
        orderBy: { order: "asc" },
        select: { id: true },
      })
      for (let i = 0; i < remaining.length; i++) {
        await tx.userProgression.update({ where: { id: remaining[i].id }, data: { order: i } })
      }
    })
    revalidate()
    return { success: true }
  } catch {
    return { error: "Failed to delete progression" }
  }
}

export async function reorderUserProgressions(
  orderedIds: string[]
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const progs = await db.userProgression.findMany({
      where: { userId, id: { in: orderedIds } },
      select: { id: true },
    })
    if (progs.length !== orderedIds.length) return { error: "Invalid progressions" }
    await db.$transaction(
      orderedIds.map((id, index) =>
        db.userProgression.update({ where: { id }, data: { order: index } })
      )
    )
    revalidatePath("/library/progressions")
    return { success: true }
  } catch {
    return { error: "Failed to reorder progressions" }
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/library/progressions/actions.ts
git commit -m "feat: add user progression CRUD server actions"
```

---

## Task 5: AddToGoalButton + addTopicToGoal Extensions

**Files:**
- Modify: `components/add-to-goal-button.tsx`
- Modify: `app/(app)/goals/actions.ts`

- [ ] **Step 1: Extend AddToGoalButton with userProgressionId prop**

Read `components/add-to-goal-button.tsx`. Change the `AddToGoalButtonProps` interface (around line 9) to add `userProgressionId`:

```typescript
interface AddToGoalButtonProps {
  kind: TopicKind
  subtype?: string
  defaultKey?: string
  lessonId?: string
  userLessonId?: string
  userProgressionId?: string
  displayName: string
  popupAlign?: "left" | "right"
}
```

Update the destructuring (around line 19):
```typescript
export function AddToGoalButton({
  kind,
  subtype,
  defaultKey,
  lessonId,
  userLessonId,
  userProgressionId,
  displayName,
  popupAlign = "left",
}: AddToGoalButtonProps) {
```

Update the `refKey` computation (line 28):
```typescript
  const refKey = computeRefKey({ kind, subtype, lessonId, userLessonId, userProgressionId, defaultKey })
```

Update the `addTopicToGoal` call (around line 73):
```typescript
    const result = await addTopicToGoal(selectedGoalId, {
      kind,
      subtype,
      lessonId,
      userLessonId,
      userProgressionId,
      defaultKey,
    })
```

- [ ] **Step 2: Extend addTopicToGoal in goals/actions.ts**

Read `app/(app)/goals/actions.ts`. Find the `addTopicToGoal` function (around line 134). Change its `topicRef` parameter type to add `userProgressionId`:

```typescript
export async function addTopicToGoal(
  goalId: string,
  topicRef: {
    kind: TopicKind
    subtype?: string
    lessonId?: string
    userLessonId?: string
    userProgressionId?: string
    defaultKey?: string
  }
): Promise<{ success: true } | { error: string }> {
```

Update the `computeRefKey` call (it already passes the full object, so `userProgressionId` will flow through since `computeRefKey` now accepts it):
```typescript
    const refKey = computeRefKey(topicRef)
```

Update the `db.goalTopic.upsert` call to include `userProgressionId` in `create`:
```typescript
    await db.goalTopic.upsert({
      where: { goalId_refKey: { goalId, refKey } },
      create: {
        goalId,
        kind: topicRef.kind,
        subtype: topicRef.subtype ?? null,
        lessonId: topicRef.lessonId ?? null,
        userLessonId: topicRef.userLessonId ?? null,
        userProgressionId: topicRef.userProgressionId ?? null,
        defaultKey: topicRef.defaultKey ?? null,
        refKey,
      },
      update: {},
    })
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add components/add-to-goal-button.tsx app/\(app\)/goals/actions.ts
git commit -m "feat: extend AddToGoalButton and addTopicToGoal for user progressions"
```

---

## Task 6: Library List Page + UserProgressionList + UserProgressionCard

**Files:**
- Create: `app/(app)/library/progressions/page.tsx`
- Create: `app/(app)/library/progressions/_components/user-progression-list.tsx`
- Create: `app/(app)/library/progressions/_components/user-progression-card.tsx`

- [ ] **Step 1: Create the list page (server component)**

Create `app/(app)/library/progressions/page.tsx`:

```typescript
import Link from "next/link"
import { notFound } from "next/navigation"
import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"
import { btn } from "@/lib/button-styles"
import { UserProgressionList } from "./_components/user-progression-list"

export default async function UserProgressionsPage() {
  const userId = await getUserId()
  if (!userId) notFound()

  const progressions = await db.userProgression.findMany({
    where: { userId },
    orderBy: { order: "asc" },
  })

  return (
    <div className="pt-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/reference"
            className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-1"
          >
            ← Reference
          </Link>
          <h1 className="text-2xl font-semibold text-foreground">My Progressions</h1>
        </div>
        <Link href="/library/progressions/new" className={btn("primary")}>
          New progression
        </Link>
      </div>

      <UserProgressionList initialProgressions={progressions} />
    </div>
  )
}
```

- [ ] **Step 2: Create UserProgressionList**

```bash
mkdir -p /Users/maraspeli/Build/Claude/GuitarPractice/app/\(app\)/library/progressions/_components
```

Create `app/(app)/library/progressions/_components/user-progression-list.tsx`:

```typescript
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
import { reorderUserProgressions } from "@/app/(app)/library/progressions/actions"
import { UserProgressionCard } from "./user-progression-card"

export type UserProgressionItem = {
  id: string
  displayName: string
  description: string
  mode: string
  degrees: string[]
  order: number
}

interface UserProgressionListProps {
  initialProgressions: UserProgressionItem[]
}

export function UserProgressionList({ initialProgressions }: UserProgressionListProps) {
  const [progressions, setProgressions] = useState(
    [...initialProgressions].sort((a, b) => a.order - b.order)
  )
  const router = useRouter()

  useEffect(() => {
    setProgressions([...initialProgressions].sort((a, b) => a.order - b.order))
  }, [initialProgressions])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = progressions.findIndex((p) => p.id === active.id)
    const newIndex = progressions.findIndex((p) => p.id === over.id)
    const prev = progressions
    const reordered = arrayMove(progressions, oldIndex, newIndex)
    setProgressions(reordered)
    const result = await reorderUserProgressions(reordered.map((p) => p.id))
    if ("error" in result) setProgressions(prev)
  }

  if (progressions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No custom progressions yet.
      </p>
    )
  }

  return (
    <DndContext
      id="progression-list"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={progressions.map((p) => p.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-2">
          {progressions.map((prog) => (
            <UserProgressionCard
              key={prog.id}
              progression={prog}
              onChanged={() => router.refresh()}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
```

- [ ] **Step 3: Create UserProgressionCard**

Create `app/(app)/library/progressions/_components/user-progression-card.tsx`:

```typescript
"use client"

import { useState } from "react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { deleteUserProgression } from "@/app/(app)/library/progressions/actions"
import type { UserProgressionItem } from "./user-progression-list"
import { btn } from "@/lib/button-styles"

interface UserProgressionCardProps {
  progression: UserProgressionItem
  onChanged: () => void
}

export function UserProgressionCard({ progression, onChanged }: UserProgressionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: progression.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const romanDisplay = progression.degrees.join(" – ")

  async function handleDelete() {
    setIsDeleting(true)
    const result = await deleteUserProgression(progression.id)
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
            className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
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
            <span className="text-sm text-foreground font-medium truncate">{progression.displayName}</span>
            <span className="text-xs text-muted-foreground font-mono truncate">{romanDisplay}</span>
          </div>

          <Link
            href={`/library/progressions/${progression.id}/edit`}
            className={btn("standalone", "sm")}
          >
            Edit
          </Link>
          <button
            onClick={() => setShowDeleteModal(true)}
            className={btn("destructive", "sm")}
          >
            Delete
          </button>
        </div>

        {isExpanded && progression.description && (
          <div className="px-3 pb-3 border-t border-border pt-3">
            <div className="prose prose-sm max-w-none text-foreground text-sm">
              <ReactMarkdown>{progression.description}</ReactMarkdown>
            </div>
          </div>
        )}

        {error && <p className="px-3 pb-2 text-xs text-red-500">{error}</p>}
      </div>

      {showDeleteModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false) }}
        >
          <div className="w-full max-w-sm bg-card border border-border rounded-lg shadow-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Delete progression?</h2>
            <p className="text-sm text-muted-foreground">
              This will permanently delete &ldquo;{progression.displayName}&rdquo;. Any goals that include it will show &ldquo;(progression removed)&rdquo;.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={btn("destructive")}
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className={btn("secondary")}
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

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No new errors.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/library/progressions/
git commit -m "feat: add custom progressions library list page and card components"
```

---

## Task 7: ProgressionForm + Create/Edit Pages

**Files:**
- Create: `app/(app)/library/progressions/_components/progression-form.tsx`
- Create: `app/(app)/library/progressions/new/page.tsx`
- Create: `app/(app)/library/progressions/[id]/edit/page.tsx`

- [ ] **Step 1: Create the ProgressionForm client component**

Create `app/(app)/library/progressions/_components/progression-form.tsx`:

```typescript
"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { nanoid } from "nanoid"
import { parseChord } from "@/lib/theory/key-finder"
import { analyzeProgression } from "@/lib/theory/transposer"
import { getUserProgressionChords } from "@/lib/theory/user-progressions"
import { ALL_KEY_MODES } from "@/lib/theory/commonality-tiers"
import { ChordInputRow } from "@/app/(app)/tools/_components/chord-input-row"
import { createUserProgression, updateUserProgression } from "@/app/(app)/library/progressions/actions"
import { btn } from "@/lib/button-styles"

const ROOT_NOTES = [
  "Ab", "A", "A#", "Bb", "B", "C", "C#", "Db", "D", "D#", "Eb", "E",
  "F", "F#", "Gb", "G", "G#",
] as const

const MODE_GROUPS = [
  { label: "Common",   modes: ALL_KEY_MODES.filter(m => m.tier === 1) },
  { label: "Modal",    modes: ALL_KEY_MODES.filter(m => m.tier === 2 || m.tier === 3) },
  { label: "Advanced", modes: ALL_KEY_MODES.filter(m => m.tier >= 4) },
]

const SELECT_CLASS =
  "bg-card border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent w-fit"

type ChordEntry = { id: string; symbol: string }

interface ProgressionFormProps {
  initialData?: {
    id: string
    displayName: string
    description: string
    mode: string
    degrees: string[]
  }
}

export function ProgressionForm({ initialData }: ProgressionFormProps) {
  const router = useRouter()
  const isEdit = !!initialData

  // Resolve initial chords from stored degrees (edit mode) or start empty
  const [key, setKey]    = useState("C")
  const defaultModeIdx   = ALL_KEY_MODES.findIndex(m => m.modeName === (initialData?.mode ?? "major"))
  const [modeIdx, setModeIdx] = useState(defaultModeIdx >= 0 ? defaultModeIdx : 0)
  const mode = ALL_KEY_MODES[modeIdx]!

  const initialChords: ChordEntry[] = useMemo(() => {
    if (!initialData?.degrees?.length) return []
    const resolved = getUserProgressionChords(initialData.degrees, initialData.mode, key)
    return resolved.map(c => ({ id: nanoid(), symbol: `${c.tonic}${c.type}` }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // only on mount

  const [chords, setChords]       = useState<ChordEntry[]>(initialChords)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState(initialData?.displayName ?? "")
  const [description, setDescription] = useState(initialData?.description ?? "")
  const [isSaving, setIsSaving]   = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const parsedChords = useMemo(
    () => chords.map(c => parseChord(c.symbol)).filter((c): c is NonNullable<typeof c> => c !== null),
    [chords],
  )

  const chordAnalyses = useMemo(
    () => parsedChords.length > 0
      ? analyzeProgression(parsedChords, key, mode.modeName)
      : null,
    [parsedChords, key, mode.modeName],
  )

  // When key or mode changes, re-derive chord symbols from current degrees
  function handleKeyOrModeChange(newKey: string, newModeIdx: number) {
    const newMode = ALL_KEY_MODES[newModeIdx]!
    if (parsedChords.length > 0) {
      const analyses  = analyzeProgression(parsedChords, key, mode.modeName)
      const degrees   = analyses.map(a => a.roman)
      const resolved  = getUserProgressionChords(degrees, newMode.modeName, newKey)
      setChords(prev => prev.map((c, i) => {
        const rc = resolved[i]
        return rc ? { ...c, symbol: `${rc.tonic}${rc.type}` } : c
      }))
    }
    setKey(newKey)
    setModeIdx(newModeIdx)
  }

  const handleChordChange = useCallback((updated: ChordEntry[]) => setChords(updated), [])
  const handleCommit      = useCallback((id: string, symbol: string) => {
    setChords(prev => prev.map(c => c.id === id ? { ...c, symbol } : c))
    setEditingId(null)
  }, [])
  const handleRemove      = useCallback((id: string) => setChords(prev => prev.filter(c => c.id !== id)), [])
  const handleStartEdit   = useCallback((id: string) => setEditingId(id), [])
  const handleAdd         = useCallback(() => {
    const id = nanoid()
    setChords(prev => [...prev, { id, symbol: "" }])
    setEditingId(id)
  }, [])

  async function handleSave() {
    if (!displayName.trim()) { setError("Name is required"); return }
    setIsSaving(true)
    setError(null)

    // Extract final degrees from current chord state
    const analyses = parsedChords.length > 0
      ? analyzeProgression(parsedChords, key, mode.modeName)
      : []
    const degrees = analyses.map(a => a.roman)

    const result = isEdit
      ? await updateUserProgression(initialData.id, {
          displayName: displayName.trim(),
          description,
          mode: mode.modeName,
          degrees,
        })
      : await createUserProgression({
          displayName: displayName.trim(),
          description,
          mode: mode.modeName,
          degrees,
        })

    if ("error" in result) {
      setError(result.error)
      setIsSaving(false)
    } else {
      router.push("/library/progressions")
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      {/* Name */}
      <div>
        <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1">
          Name
        </label>
        <input
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder="My progression"
          className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      {/* Key + Mode */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1">Key</label>
          <select
            value={key}
            onChange={e => handleKeyOrModeChange(e.target.value, modeIdx)}
            className={SELECT_CLASS}
          >
            {ROOT_NOTES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1">Scale / Mode</label>
          <select
            value={modeIdx}
            onChange={e => handleKeyOrModeChange(key, Number(e.target.value))}
            className={SELECT_CLASS}
          >
            {MODE_GROUPS.map(g => (
              <optgroup key={g.label} label={g.label}>
                {g.modes.map(m => {
                  const idx = ALL_KEY_MODES.indexOf(m)
                  return <option key={idx} value={idx}>{m.displayName}</option>
                })}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {/* Chord entry */}
      <div>
        <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">
          Chords
        </label>
        <ChordInputRow
          chords={chords}
          editingId={editingId}
          chordAnalyses={chordAnalyses}
          onChordChange={handleChordChange}
          onCommit={handleCommit}
          onRemove={handleRemove}
          onStartEdit={handleStartEdit}
          onAdd={handleAdd}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={4}
          placeholder="Describe this progression…"
          className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-y"
        />
        <p className="text-xs text-muted-foreground mt-1">Supports markdown.</p>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={handleSave} disabled={isSaving} className={btn("primary")}>
          {isSaving ? "Saving…" : isEdit ? "Save changes" : "Create"}
        </button>
        <button
          onClick={() => router.push("/library/progressions")}
          disabled={isSaving}
          className={btn("standalone")}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create new-progression page**

```bash
mkdir -p /Users/maraspeli/Build/Claude/GuitarPractice/app/\(app\)/library/progressions/new
```

Create `app/(app)/library/progressions/new/page.tsx`:

```typescript
import Link from "next/link"
import { notFound } from "next/navigation"
import { getUserId } from "@/lib/get-user-id"
import { ProgressionForm } from "../_components/progression-form"

export default async function NewProgressionPage() {
  const userId = await getUserId()
  if (!userId) notFound()

  return (
    <div className="pt-6">
      <Link
        href="/library/progressions"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-1"
      >
        ← My Progressions
      </Link>
      <h1 className="text-2xl font-semibold text-foreground mb-6">New progression</h1>
      <ProgressionForm />
    </div>
  )
}
```

- [ ] **Step 3: Create edit-progression page**

```bash
mkdir -p "/Users/maraspeli/Build/Claude/GuitarPractice/app/(app)/library/progressions/[id]/edit"
```

Create `app/(app)/library/progressions/[id]/edit/page.tsx`:

```typescript
import Link from "next/link"
import { notFound } from "next/navigation"
import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"
import { ProgressionForm } from "../../_components/progression-form"

interface EditProgressionPageProps {
  params: Promise<{ id: string }>
}

export default async function EditProgressionPage({ params }: EditProgressionPageProps) {
  const { id } = await params
  const userId = await getUserId()
  if (!userId) notFound()

  const prog = await db.userProgression.findUnique({ where: { id } })
  if (!prog || prog.userId !== userId) notFound()

  return (
    <div className="pt-6">
      <Link
        href="/library/progressions"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-1"
      >
        ← My Progressions
      </Link>
      <h1 className="text-2xl font-semibold text-foreground mb-6">Edit progression</h1>
      <ProgressionForm
        initialData={{
          id: prog.id,
          displayName: prog.displayName,
          description: prog.description,
          mode: prog.mode,
          degrees: prog.degrees,
        }}
      />
    </div>
  )
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No new errors.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/library/progressions/
git commit -m "feat: add progression create/edit form and pages"
```

---

## Task 8: Reference Page Refactor + HarmonyStudy + ProgressionsTab Integration

**Files:**
- Modify: `app/(app)/reference/page.tsx`
- Create: `app/(app)/reference/_components/reference-page-client.tsx`
- Modify: `app/(app)/reference/_components/harmony-study.tsx`
- Modify: `app/(app)/reference/_components/progressions-tab.tsx`

**Context:** `reference/page.tsx` is currently `"use client"` with `useState` hooks. We split it: the page becomes a server component that fetches user progressions and renders `<ReferencePageClient>`, which holds all the existing client state.

- [ ] **Step 1: Create ReferencePageClient (extract current page code)**

Create `app/(app)/reference/_components/reference-page-client.tsx` by copying the current content of `reference/page.tsx` and changing:
1. The `"use client"` directive is kept
2. `export default function ReferencePage()` becomes `export function ReferencePageClient({ userProgressions }: ReferencePageClientProps)`
3. Add the prop type at the top (after imports)

```typescript
"use client"

import { useState } from "react"
import { CircleOfFifths } from "./circle-of-fifths"
import { HarmonyStudy } from "./harmony-study"
import { ScalePanel } from "./scale-panel"
import { ArpeggioPanel } from "./arpeggio-panel"
import { ChordPanel } from "./chord-panel"
import { InversionPanel } from "./inversion-panel"
import { cn } from "@/lib/utils"

// Minimal shape we need from UserProgression (serializable for server→client)
export type UserProgressionForTab = {
  id: string
  displayName: string
  mode: string
  degrees: string[]
  description: string
}

type PanelTab = "scales" | "arpeggios" | "chords" | "inversions"

const TABS: { id: PanelTab; label: string }[] = [
  { id: "scales",     label: "Scales" },
  { id: "arpeggios",  label: "Arpeggios" },
  { id: "chords",     label: "Chords" },
  { id: "inversions", label: "Inversions" },
]

const QUALITY_TO_INVERSION_TYPE: Record<string, string> = {
  major:      "major",
  minor:      "minor",
  dominant:   "major",
  diminished: "dim",
  augmented:  "aug",
}

const SOLO_SCALE_TO_PANEL_TYPE: Record<string, string> = {
  "Ionian (major)":          "Major",
  "Dorian":                  "Dorian",
  "Phrygian":                "Phrygian",
  "Lydian":                  "Lydian",
  "Mixolydian":              "Mixolydian",
  "Aeolian (natural minor)": "Aeolian",
  "Locrian":                 "Locrian",
  "Major Pentatonic":        "Pentatonic Major",
  "Minor Pentatonic":        "Pentatonic Minor",
  "Blues Scale":             "Blues",
  "Locrian #2":              "Locrian #2",
  "Altered":                 "Altered",
  "Lydian Dominant":         "Lydian Dominant",
  "Lydian Augmented":        "Lydian Augmented",
  "Phrygian Dominant":       "Phrygian Dominant",
  "Bebop Dominant":          "Bebop Dominant",
  "Melodic Minor":           "Melodic Minor",
  "Harmonic Minor":          "Harmonic Minor",
  "Diminished Half-Whole":   "Diminished Half-Whole",
  "Dorian b2":               "Dorian b2",
  "Mixolydian b6":           "Mixolydian b6",
  "Locrian #6":              "Locrian #6",
  "Ionian #5":               "Ionian #5",
  "Dorian #4":               "Dorian #4",
  "Lydian #2":               "Lydian #2",
  "Altered Diminished":      "Altered Diminished",
}

interface ReferencePageClientProps {
  userProgressions: UserProgressionForTab[]
}

export function ReferencePageClient({ userProgressions }: ReferencePageClientProps) {
  const [selectedKey, setSelectedKey] = useState("C")
  const [activeTab, setActiveTab] = useState<PanelTab>("scales")
  const [panelRoot, setPanelRoot] = useState("C")
  const [panelScaleTypeTrigger, setPanelScaleTypeTrigger] = useState<{ type: string } | null>(null)
  const [panelChordTypeTrigger, setPanelChordTypeTrigger] = useState<{ type: string } | null>(null)
  const [panelArpeggioTypeTrigger, setPanelArpeggioTypeTrigger] = useState<{ type: string } | null>(null)
  const [panelInversionTypeTrigger, setPanelInversionTypeTrigger] = useState<{ type: string } | null>(null)

  function handleKeySelect(key: string) {
    setSelectedKey(key)
    setPanelRoot(key)
  }

  function handleChordSelect(chordTonic: string, type: string, quality: string, primaryScaleName: string) {
    setPanelRoot(chordTonic)
    setPanelChordTypeTrigger({ type })
    setPanelArpeggioTypeTrigger({ type })
    const inversionType = QUALITY_TO_INVERSION_TYPE[quality]
    if (inversionType) setPanelInversionTypeTrigger({ type: inversionType })
    const panelScaleType = SOLO_SCALE_TO_PANEL_TYPE[primaryScaleName]
    if (panelScaleType) setPanelScaleTypeTrigger({ type: panelScaleType })
  }

  function handleScaleSelect(scaleTonic: string, scaleName: string) {
    setPanelRoot(scaleTonic)
    const panelType = SOLO_SCALE_TO_PANEL_TYPE[scaleName]
    if (panelType) setPanelScaleTypeTrigger({ type: panelType })
    setActiveTab("scales")
  }

  const TAB_IDS = TABS.map((t) => t.id)

  return (
    <div className="pt-6 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
          Music Theory
        </p>
        <h1 className="text-2xl font-semibold text-foreground mb-2">Reference</h1>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <section
          aria-label="Circle of Fifths key picker"
          className="lg:sticky lg:top-6 lg:w-[400px] lg:shrink-0"
        >
          <CircleOfFifths selectedKey={selectedKey} onKeySelect={handleKeySelect} />
        </section>

        <div className="flex-1 min-w-0">
          <HarmonyStudy
            tonic={selectedKey}
            onChordSelect={handleChordSelect}
            onScaleSelect={handleScaleSelect}
            userProgressions={userProgressions}
          />
        </div>
      </div>

      <section aria-label="Study tools">
        <div
          role="tablist"
          aria-label="Reference panels"
          className="flex border-b border-border"
          onKeyDown={(e) => {
            const current = TAB_IDS.indexOf(activeTab)
            if (e.key === "ArrowRight") setActiveTab(TAB_IDS[(current + 1) % TAB_IDS.length])
            if (e.key === "ArrowLeft") setActiveTab(TAB_IDS[(current - 1 + TAB_IDS.length) % TAB_IDS.length])
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeTab === tab.id
                  ? "border-accent text-accent"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          className="pt-6"
        >
          {activeTab === "scales"    && <ScalePanel    root={panelRoot} onRootChange={setPanelRoot} scaleTypeTrigger={panelScaleTypeTrigger} />}
          {activeTab === "arpeggios" && <ArpeggioPanel root={panelRoot} onRootChange={setPanelRoot} chordTypeTrigger={panelArpeggioTypeTrigger} />}
          {activeTab === "chords"    && <ChordPanel    root={panelRoot} onRootChange={setPanelRoot} chordTypeTrigger={panelChordTypeTrigger} onScaleSelect={handleScaleSelect} />}
          {activeTab === "inversions" && <InversionPanel root={panelRoot} onRootChange={setPanelRoot} inversionTypeTrigger={panelInversionTypeTrigger} onScaleSelect={handleScaleSelect} />}
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Replace reference/page.tsx with server component**

Replace the entire content of `app/(app)/reference/page.tsx` with:

```typescript
import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"
import { ReferencePageClient } from "./_components/reference-page-client"
import type { UserProgressionForTab } from "./_components/reference-page-client"

export default async function ReferencePage() {
  const userId = await getUserId()

  const userProgressions: UserProgressionForTab[] = userId
    ? await db.userProgression.findMany({
        where: { userId },
        select: { id: true, displayName: true, mode: true, degrees: true, description: true },
        orderBy: { order: "asc" },
      })
    : []

  return <ReferencePageClient userProgressions={userProgressions} />
}
```

- [ ] **Step 3: Update HarmonyStudy to thread userProgressions**

Read `app/(app)/reference/_components/harmony-study.tsx`. Make the following changes:

1. Add `UserProgressionForTab` import:
```typescript
import type { UserProgressionForTab } from "./reference-page-client"
```

2. Add to `HarmonyStudyProps`:
```typescript
interface HarmonyStudyProps {
  tonic: string
  onChordSelect?: (tonic: string, type: string, quality: string, primaryScaleName: string) => void
  onScaleSelect?: (tonic: string, scaleName: string) => void
  userProgressions: UserProgressionForTab[]
}
```

3. Destructure and pass to `ProgressionsTab`:
```typescript
export function HarmonyStudy({ tonic, onChordSelect, onScaleSelect, userProgressions }: HarmonyStudyProps) {
```

4. In the JSX, update the `ProgressionsTab` render:
```typescript
{tab === "progressions" && (
  <ProgressionsTab
    tonic={tonic}
    onChordSelect={onChordSelect}
    onScaleSelect={onScaleSelect}
    userProgressions={userProgressions}
  />
)}
```

- [ ] **Step 4: Replace progressions-tab.tsx with full implementation**

Read `app/(app)/reference/_components/progressions-tab.tsx` (the current 211-line file). Replace the entire file with the updated version that supports user progressions, adds the pencil link, and shows user progressions in the selector:

```typescript
"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import { listProgressions, getProgression, getSoloScales } from "@/lib/theory"
import { getUserProgressionChords } from "@/lib/theory/user-progressions"
import { ChordQualityBlock } from "./chord-quality-block"
import { SoloScalesPanel } from "./solo-scales-panel"
import { AddToGoalButton } from "@/components/add-to-goal-button"
import type { UserProgressionForTab } from "./reference-page-client"

const CATEGORY_ORDER = ["Pop", "Blues", "Jazz", "Rock", "Folk / Country", "Classical / Modal"]

// Map TonalJS mode names to a human-readable "X Scale" label for the
// "Over the whole progression" recommendation on user progressions.
const MODE_TO_SCALE_TYPE: Record<string, string> = {
  major:              "Major Scale",
  minor:              "Natural Minor Scale",
  dorian:             "Dorian Scale",
  phrygian:           "Phrygian Scale",
  lydian:             "Lydian Scale",
  mixolydian:         "Mixolydian Scale",
  locrian:            "Locrian Scale",
  "melodic minor":    "Melodic Minor Scale",
  "harmonic minor":   "Harmonic Minor Scale",
  "dorian b2":        "Dorian b2 Scale",
  "lydian augmented": "Lydian Augmented Scale",
  "lydian dominant":  "Lydian Dominant Scale",
  "mixolydian b6":    "Mixolydian b6 Scale",
  "locrian #2":       "Locrian #2 Scale",
  altered:            "Altered Scale",
}

function modeToScaleType(mode: string): string {
  return MODE_TO_SCALE_TYPE[mode]
    ?? `${mode.charAt(0).toUpperCase()}${mode.slice(1)} Scale`
}

interface ProgressionsTabProps {
  tonic: string
  defaultProgressionName?: string
  onChordSelect?: (tonic: string, type: string, quality: string, primaryScaleName: string) => void
  onScaleSelect?: (tonic: string, scaleName: string) => void
  userProgressions: UserProgressionForTab[]
}

export function ProgressionsTab({
  tonic,
  defaultProgressionName,
  onChordSelect,
  onScaleSelect,
  userProgressions,
}: ProgressionsTabProps) {
  // selected is either a built-in slug (e.g. "pop-standard") or a user progression id
  const [selected, setSelected] = useState(defaultProgressionName ?? "pop-standard")
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0)
  const [infoOpen, setInfoOpen] = useState(false)
  const infoRef = useRef<HTMLDivElement>(null)

  const builtinProgressions = listProgressions()
  const builtinProg = builtinProgressions.find(p => p.name === selected)
  const userProg    = userProgressions.find(p => p.id === selected)

  // Resolve chords based on which type is selected
  const chords = userProg
    ? getUserProgressionChords(userProg.degrees, userProg.mode, tonic)
    : getProgression(selected, tonic)

  // Display info derived from whichever is selected
  const romanDisplay          = userProg
    ? userProg.degrees.join(" – ")
    : builtinProg?.romanDisplay ?? ""
  const recommendedScaleType  = userProg
    ? modeToScaleType(userProg.mode)
    : builtinProg?.recommendedScaleType ?? ""
  const mode                  = userProg?.mode ?? builtinProg?.mode ?? "major"

  const selectedChord = selectedIndex !== null ? chords[selectedIndex] ?? null : null

  // Close popover on click-outside
  useEffect(() => {
    if (!infoOpen) return
    function handlePointerDown(e: PointerEvent) {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) {
        setInfoOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setInfoOpen(false)
    }
    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [infoOpen])

  // Notify parent of the initial auto-selected chord on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const chord = chords[0]
    if (chord) {
      const soloScales = getSoloScales({ tonic: chord.tonic, type: chord.type, degree: chord.degree }, mode)
      onChordSelect?.(chord.tonic, chord.type, chord.quality, soloScales.primary.scaleName)
    }
  }, []) // intentionally empty: only on mount

  const scales = selectedChord
    ? getSoloScales(
        { tonic: selectedChord.tonic, type: selectedChord.type, degree: selectedChord.degree },
        mode
      )
    : null

  function handleIndexClick(index: number) {
    if (selectedIndex !== index) {
      const chord = chords[index]
      if (chord) {
        const soloScales = getSoloScales({ tonic: chord.tonic, type: chord.type, degree: chord.degree }, mode)
        onChordSelect?.(chord.tonic, chord.type, chord.quality, soloScales.primary.scaleName)
      }
    }
    setSelectedIndex(prev => prev === index ? null : index)
  }

  function handleSelectionChange(newSelected: string) {
    setSelected(newSelected)
    setSelectedIndex(0)
    setInfoOpen(false)

    const newUserProg = userProgressions.find(p => p.id === newSelected)
    const newChords = newUserProg
      ? getUserProgressionChords(newUserProg.degrees, newUserProg.mode, tonic)
      : getProgression(newSelected, tonic)
    const newMode = newUserProg?.mode ?? builtinProgressions.find(p => p.name === newSelected)?.mode ?? "major"

    const chord0 = newChords[0]
    if (chord0) {
      const soloScales = getSoloScales({ tonic: chord0.tonic, type: chord0.type, degree: chord0.degree }, newMode)
      onChordSelect?.(chord0.tonic, chord0.type, chord0.quality, soloScales.primary.scaleName)
    }
  }

  const grouped = CATEGORY_ORDER.map(cat => ({
    category: cat,
    items: builtinProgressions.filter(p => p.category === cat),
  })).filter(g => g.items.length > 0)

  return (
    <div className="space-y-4">
      {/* Progression selector + buttons */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="progression-select"
          className="text-xs uppercase tracking-widest text-muted-foreground whitespace-nowrap"
        >
          Progression
        </label>
        <select
          id="progression-select"
          aria-label="Progression"
          value={selected}
          onChange={e => handleSelectionChange(e.target.value)}
          className="bg-card border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent w-fit"
        >
          {grouped.map(({ category, items }) => (
            <optgroup key={category} label={category}>
              {items.map(p => (
                <option key={p.name} value={p.name}>
                  {p.romanDisplay.length <= 25
                    ? `${p.displayName} · ${p.romanDisplay}`
                    : p.displayName}
                </option>
              ))}
            </optgroup>
          ))}
          {userProgressions.length > 0 && (
            <optgroup label="My Progressions">
              {userProgressions.map(p => (
                <option key={p.id} value={p.id}>
                  {p.displayName}
                </option>
              ))}
            </optgroup>
          )}
        </select>

        {/* Add to goal */}
        {userProg ? (
          <AddToGoalButton
            kind="progression"
            userProgressionId={userProg.id}
            defaultKey={tonic}
            displayName={userProg.displayName}
            popupAlign="right"
          />
        ) : (
          <AddToGoalButton
            kind="progression"
            subtype={selected}
            defaultKey={tonic}
            displayName={builtinProg?.displayName ?? selected}
            popupAlign="right"
          />
        )}

        {/* Info popover */}
        <div ref={infoRef} className="relative">
          <button
            type="button"
            aria-label="Progression info"
            aria-expanded={infoOpen}
            onClick={() => setInfoOpen(o => !o)}
            className="flex items-center justify-center w-6 h-6 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors text-xs font-semibold select-none"
          >
            ?
          </button>

          {infoOpen && (
            <div
              role="dialog"
              aria-label="Progression details"
              className="absolute right-0 top-8 z-20 w-72 rounded-lg border border-border bg-card shadow-lg p-4 space-y-3"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {userProg?.displayName ?? builtinProg?.displayName}
                </p>
                <p className="text-xs text-accent font-mono mt-0.5">{romanDisplay}</p>
              </div>
              {userProg ? (
                userProg.description ? (
                  <div className="prose prose-sm max-w-none text-foreground text-xs">
                    <ReactMarkdown>{userProg.description}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No description.</p>
                )
              ) : (
                <div className="space-y-1.5">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground mb-0.5">Examples</p>
                    <p className="text-xs text-foreground">{builtinProg?.examples}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground mb-0.5">Notes</p>
                    <p className="text-xs text-foreground">{builtinProg?.notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pencil link — opens custom progressions manager */}
        <Link
          href="/library/progressions"
          aria-label="Manage custom progressions"
          className="flex items-center justify-center w-6 h-6 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors text-xs select-none"
        >
          ✏
        </Link>
      </div>

      {/* Chord blocks */}
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          Chords in {tonic} · {romanDisplay}
        </p>
        <div role="group" aria-label="Progression chords" className="flex flex-wrap items-center gap-1">
          {chords.map((chord, i) => (
            <div key={i} className="flex items-center gap-1 flex-shrink-0">
              {i > 0 && <span className="text-muted-foreground text-sm flex-shrink-0">→</span>}
              <ChordQualityBlock
                roman={chord.roman}
                chordName={`${chord.tonic}${chord.type}`}
                degree={chord.degree}
                isSelected={selectedIndex === i}
                onClick={() => handleIndexClick(i)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Per-chord scale recommendation */}
      {scales && selectedChord && (
        <SoloScalesPanel
          scales={scales}
          chordName={`${selectedChord.tonic}${selectedChord.type}`}
          onScaleSelect={onScaleSelect}
        />
      )}

      {/* Progression-wide recommendation */}
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
          Over the whole progression
        </p>
        <p className="text-sm font-semibold text-foreground">
          {tonic} {recommendedScaleType}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No new errors.

- [ ] **Step 6: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 7: Commit and merge**

```bash
git add app/\(app\)/reference/
git commit -m "feat: integrate custom progressions into Reference page Progressions tab"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Custom progressions CRUD + reorder | Tasks 4, 6, 7 |
| Saved per-user, userId scoped | Task 4 (all actions use `requireUserId`) |
| Name, description (markdown), chords | Task 7 (ProgressionForm) |
| Same chord editor as Key Finder / Transposer | Task 7 (`ChordInputRow`, `analyzeProgression`) |
| Choose key + mode, enter chords in that key | Task 7 |
| Store as roman numerals | Task 7 (`analyzeProgression` → `degrees`) |
| Real-time transposition on key/mode change | Task 7 (`handleKeyOrModeChange`) |
| Pencil link in Progressions tab | Task 8 |
| Editor page based on Manage my Library UX | Tasks 6, 7 (dnd, card, separate pages) |
| Reference page: own category at bottom | Task 8 (`<optgroup label="My Progressions">`) |
| Hidden if no custom progressions | Task 8 (`userProgressions.length > 0` guard) |
| Available as study topic | Task 5 (AddToGoalButton + addTopicToGoal) |
| formatTopicName works for user progressions | Task 3 |
| computeRefKey handles userProgressionId | Task 3 |
| SoloScalesPanel + scale recommendation in tab | Task 8 (`getUserProgressionChords` → same ProgressionChord type) |
| Info popover shows description (markdown) | Task 8 |
| Session history (SnapshotSectionTopic) | No change needed — `displayName` copied at snapshot time |
| Deletion cascade → "(progression removed)" | Task 3 (`formatTopicName` returns null-safe fallback) |

All requirements covered. No gaps found.
