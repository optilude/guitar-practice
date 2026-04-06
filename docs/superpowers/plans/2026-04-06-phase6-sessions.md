# Phase 6: Sessions and Progress Tracking — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete practice session system — run timed routines with a metronome and flashcards, save session records, view history on a calendar, see streaks on the home page.

**Architecture:** Session runner is fully client-side (no DB write until user saves). On save, a server action writes a denormalised snapshot. History and home page are server-rendered; calendar is a `"use client"` component using react-day-picker.

**Tech Stack:** Next.js 16, Prisma 7 (PostgreSQL), React, Tailwind, Vitest + @testing-library/react, react-day-picker v9, date-fns v3, Web Audio API.

---

## File Map

**New files:**
- `lib/sessions.ts` — types + `computeStreak()` + `resolveKeySequence()`
- `lib/sessions.test.ts` — unit tests for above
- `app/(app)/sessions/actions.ts` — `saveSession`, `deleteSession` server actions
- `app/(app)/sessions/run/page.tsx` — thin server wrapper
- `app/(app)/sessions/run/_components/session-runner-client.tsx` — main `"use client"` orchestrator
- `app/(app)/sessions/run/_components/key-strip.tsx`
- `app/(app)/sessions/run/_components/section-strip.tsx`
- `app/(app)/sessions/run/_components/timer-display.tsx`
- `app/(app)/sessions/run/_components/notes-panel.tsx`
- `app/(app)/sessions/run/_components/metronome-panel.tsx`
- `app/(app)/sessions/run/_components/flashcard.tsx`
- `app/(app)/sessions/run/_components/end-session-modal.tsx`
- `lib/hooks/use-session-timer.ts`
- `lib/hooks/use-session-timer.test.ts`
- `lib/hooks/use-session-nav.ts`
- `lib/hooks/use-session-nav.test.ts`
- `lib/hooks/use-metronome.ts`
- `app/(app)/history/_components/history-calendar.tsx`
- `app/(app)/history/[sessionId]/page.tsx`
- `app/(app)/history/[sessionId]/_components/delete-session-button.tsx`

**Modified files:**
- `prisma/schema.prisma` — add 3 new models + User relation
- `components/layout/navbar-client.tsx` — reorder nav, logo → link
- `app/(app)/reference/_components/progressions-tab.tsx` — add `defaultProgressionName?` prop
- `app/(app)/reference/_components/harmony-tab.tsx` — add `defaultMode?` prop
- `app/(app)/page.tsx` — active goal, streaks, routine start buttons
- `app/(app)/goals/[goalId]/page.tsx` — fetch recent sessions
- `app/(app)/goals/[goalId]/_components/goal-detail-client.tsx` — Start buttons + recent sessions
- `app/(app)/history/page.tsx` — replace placeholder with real calendar page

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install packages**

```bash
npm install react-day-picker date-fns
```

- [ ] **Step 2: Verify installation**

```bash
node -e "require('date-fns'); require('react-day-picker'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install react-day-picker and date-fns"
```

---

### Task 2: Prisma Schema + Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add new models to schema**

In `prisma/schema.prisma`, add `practiceSessions PracticeSession[]` to the `User` model, and append these three models at the end:

```prisma
// ── Phase 6 models ────────────────────────────────────────────────────────────

model PracticeSession {
  id             String            @id @default(cuid())
  userId         String
  user           User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  goalId         String?
  goalTitle      String
  routineTitle   String
  startedAtLocal String
  endedAtLocal   String
  localDate      String
  notes          String            @default("")
  sections       SnapshotSection[]

  @@index([userId, localDate])
  @@index([userId, goalId])
}

model SnapshotSection {
  id              String                 @id @default(cuid())
  sessionId       String
  session         PracticeSession        @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  title           String
  type            SectionType
  description     String                 @default("")
  durationMinutes Int
  order           Int
  topics          SnapshotSectionTopic[]
}

model SnapshotSectionTopic {
  id           String          @id @default(cuid())
  sectionId    String
  section      SnapshotSection @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  kind         TopicKind
  subtype      String?
  displayName  String
  keys         String[]
  practiceMode PracticeMode?
  lessonUrl    String?
}
```

The `User` model becomes:

```prisma
model User {
  id               String            @id @default(cuid())
  name             String?
  email            String            @unique
  passwordHash     String
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  goals            Goal[]
  userLessons      UserLesson[]
  practiceSessions PracticeSession[]
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add_practice_sessions
```

Expected: Migration created and applied. Prisma client regenerated.

- [ ] **Step 3: Verify generated client has new models**

```bash
node -e "const {PrismaClient} = require('./lib/generated/prisma/client'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add PracticeSession snapshot schema"
```

---

### Task 3: Pure Session Utilities (`lib/sessions.ts`)

**Files:**
- Create: `lib/sessions.ts`
- Create: `lib/sessions.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/sessions.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { computeStreak, resolveKeySequence } from "./sessions"
import type { SessionTopic } from "./sessions"

// ── computeStreak ──────────────────────────────────────────────────────────────

describe("computeStreak", () => {
  const today = new Date()
  function d(daysAgo: number): string {
    const dt = new Date(today)
    dt.setDate(dt.getDate() - daysAgo)
    return dt.toISOString().slice(0, 10)
  }

  it("returns 0 for empty array", () => {
    expect(computeStreak([])).toBe(0)
  })

  it("returns 1 if only today has a session", () => {
    expect(computeStreak([d(0)])).toBe(1)
  })

  it("returns 1 if only yesterday has a session (today not yet broken)", () => {
    expect(computeStreak([d(1)])).toBe(1)
  })

  it("returns 0 if most recent session is 2+ days ago", () => {
    expect(computeStreak([d(2)])).toBe(0)
  })

  it("counts consecutive days ending today", () => {
    expect(computeStreak([d(0), d(1), d(2), d(3)])).toBe(4)
  })

  it("counts consecutive days ending yesterday when today is missing", () => {
    expect(computeStreak([d(1), d(2), d(3)])).toBe(3)
  })

  it("stops at the first gap", () => {
    expect(computeStreak([d(0), d(1), d(3), d(4)])).toBe(2)
  })

  it("handles duplicate dates", () => {
    expect(computeStreak([d(0), d(0), d(1)])).toBe(2)
  })
})

// ── resolveKeySequence ─────────────────────────────────────────────────────────

function topic(overrides: Partial<SessionTopic> = {}): SessionTopic {
  return {
    kind: "scale",
    subtype: "major",
    displayName: "C major scale",
    defaultKey: "C",
    keys: [],
    practiceMode: null,
    lessonUrl: null,
    ...overrides,
  }
}

describe("resolveKeySequence", () => {
  it("returns [defaultKey] when keys is empty", () => {
    expect(resolveKeySequence(topic({ keys: [], defaultKey: "G" }))).toEqual(["G"])
  })

  it("returns [defaultKey] when keys is [defaultKey]", () => {
    expect(resolveKeySequence(topic({ keys: ["G"], defaultKey: "G" }))).toEqual(["G"])
  })

  it("falls back to C when defaultKey is null and keys is empty", () => {
    expect(resolveKeySequence(topic({ keys: [], defaultKey: null }))).toEqual(["C"])
  })

  it("returns explicit key list unchanged", () => {
    const t = topic({ keys: ["C", "F", "G"], defaultKey: "C" })
    expect(resolveKeySequence(t)).toEqual(["C", "F", "G"])
  })

  it("returns [''] for lesson topics regardless of keys", () => {
    const t = topic({ kind: "lesson", keys: ["*"], defaultKey: "C" })
    expect(resolveKeySequence(t)).toEqual([""])
  })

  it("chromatic_asc: 12 keys starting from defaultKey", () => {
    const t = topic({ keys: ["*"], defaultKey: "G", practiceMode: "chromatic_asc" })
    const result = resolveKeySequence(t)
    expect(result).toHaveLength(12)
    expect(result[0]).toBe("G")
    expect(result[1]).toBe("Ab")
    expect(result[11]).toBe("F#")
  })

  it("chromatic_desc: 12 keys descending from defaultKey", () => {
    const t = topic({ keys: ["*"], defaultKey: "G", practiceMode: "chromatic_desc" })
    const result = resolveKeySequence(t)
    expect(result).toHaveLength(12)
    expect(result[0]).toBe("G")
    expect(result[1]).toBe("F#")
  })

  it("circle_fifths_asc: 12 keys starting from defaultKey", () => {
    const t = topic({ keys: ["*"], defaultKey: "G", practiceMode: "circle_fifths_asc" })
    const result = resolveKeySequence(t)
    expect(result).toHaveLength(12)
    expect(result[0]).toBe("G")
    // G D A E B F# C# Ab Eb Bb F C
    expect(result[1]).toBe("D")
  })

  it("random: returns 12 unique chromatic keys", () => {
    const t = topic({ keys: ["*"], defaultKey: "C", practiceMode: "random" })
    const result = resolveKeySequence(t)
    expect(result).toHaveLength(12)
    expect(new Set(result).size).toBe(12)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run lib/sessions.test.ts
```

Expected: FAIL — `computeStreak` and `resolveKeySequence` not found.

- [ ] **Step 3: Implement `lib/sessions.ts`**

```ts
import { format } from "date-fns"
import type { TopicKind, PracticeMode } from "@/lib/generated/prisma/enums"

// ── Types ──────────────────────────────────────────────────────────────────────

export type SessionTopic = {
  kind: TopicKind
  subtype: string | null
  displayName: string
  defaultKey: string | null
  keys: string[]
  practiceMode: PracticeMode | null
  lessonUrl: string | null
}

export type SessionSection = {
  id: string
  title: string
  type: import("@/lib/generated/prisma/enums").SectionType
  description: string
  durationMinutes: number
  order: number
  topic: SessionTopic | null
}

export type SessionRoutine = {
  id: string
  title: string
  goalId: string
  goalTitle: string
  sections: SessionSection[]
}

// ── computeStreak ──────────────────────────────────────────────────────────────

export function computeStreak(localDates: string[]): number {
  if (localDates.length === 0) return 0

  const unique = [...new Set(localDates)].sort((a, b) => b.localeCompare(a))
  const today = format(new Date(), "yyyy-MM-dd")
  const yesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd")

  let start = today
  if (unique[0] !== today) {
    if (unique[0] === yesterday) {
      start = yesterday
    } else {
      return 0
    }
  }

  let streak = 0
  let current = start
  const set = new Set(unique)
  while (set.has(current)) {
    streak++
    const d = new Date(current + "T12:00:00")
    d.setDate(d.getDate() - 1)
    current = format(d, "yyyy-MM-dd")
  }
  return streak
}

// ── Key sequence constants ────────────────────────────────────────────────────

const CHROMATIC_ASC = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]
const CIRCLE_FIFTHS = ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"]

function rotateFrom(arr: string[], startKey: string): string[] {
  // Find the enharmonic match
  const idx = arr.findIndex((k) => k === startKey)
  if (idx === -1) return arr // unknown key, return as-is
  return [...arr.slice(idx), ...arr.slice(0, idx)]
}

function shuffleArray(arr: string[]): string[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// ── resolveKeySequence ────────────────────────────────────────────────────────

export function resolveKeySequence(topic: SessionTopic): string[] {
  if (topic.kind === "lesson") return [""]

  const { keys, defaultKey, practiceMode } = topic
  const dk = defaultKey ?? "C"

  // No rotation or explicit list
  if (keys.length === 0 || (keys.length === 1 && keys[0] === dk)) return [dk]
  if (keys[0] !== "*") return keys

  // All 12 keys
  switch (practiceMode) {
    case "chromatic_asc":
      return rotateFrom(CHROMATIC_ASC, dk)
    case "chromatic_desc":
      return rotateFrom([...CHROMATIC_ASC].reverse(), dk)
    case "circle_fifths_asc":
      return rotateFrom(CIRCLE_FIFTHS, dk)
    case "circle_fourths_desc":
      return rotateFrom([...CIRCLE_FIFTHS].reverse(), dk)
    case "random":
      return shuffleArray(CHROMATIC_ASC)
    default:
      return rotateFrom(CHROMATIC_ASC, dk)
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run lib/sessions.test.ts
```

Expected: All 14 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/sessions.ts lib/sessions.test.ts
git commit -m "feat: add computeStreak and resolveKeySequence utilities"
```

---

### Task 4: Server Actions (`app/(app)/sessions/actions.ts`)

**Files:**
- Create: `app/(app)/sessions/actions.ts`

- [ ] **Step 1: Create the server actions file**

```ts
"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"
import { format } from "date-fns"
import type { SessionRoutine } from "@/lib/sessions"

async function requireUserId(): Promise<string> {
  const userId = await getUserId()
  if (!userId) throw new Error("Not authenticated")
  return userId
}

export type SaveSessionInput = {
  routine: SessionRoutine
  startedAtLocal: string
  endedAtLocal: string
  notes: string
}

export async function saveSession(
  input: SaveSessionInput,
): Promise<{ success: true; id: string } | { error: string }> {
  try {
    const userId = await requireUserId()
    const localDate = input.startedAtLocal.slice(0, 10)

    const session = await db.practiceSession.create({
      data: {
        userId,
        goalId: input.routine.goalId || null,
        goalTitle: input.routine.goalTitle,
        routineTitle: input.routine.title,
        startedAtLocal: input.startedAtLocal,
        endedAtLocal: input.endedAtLocal,
        localDate,
        notes: input.notes,
        sections: {
          create: input.routine.sections.map((s) => ({
            title: s.title,
            type: s.type,
            description: s.description,
            durationMinutes: s.durationMinutes,
            order: s.order,
            topics: s.topic
              ? {
                  create: {
                    kind: s.topic.kind,
                    subtype: s.topic.subtype,
                    displayName: s.topic.displayName,
                    keys: s.topic.keys,
                    practiceMode: s.topic.practiceMode,
                    lessonUrl: s.topic.lessonUrl,
                  },
                }
              : undefined,
          })),
        },
      },
    })

    revalidatePath("/history")
    revalidatePath("/")
    return { success: true, id: session.id }
  } catch {
    return { error: "Failed to save session" }
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  const userId = await requireUserId()
  const session = await db.practiceSession.findUnique({
    where: { id: sessionId },
    select: { userId: true },
  })
  if (!session || session.userId !== userId) return

  await db.practiceSession.delete({ where: { id: sessionId } })
  revalidatePath("/history")
  revalidatePath("/")
  redirect("/history")
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors (or only pre-existing errors unrelated to this file).

- [ ] **Step 3: Commit**

```bash
git add app/(app)/sessions/actions.ts
git commit -m "feat: add saveSession and deleteSession server actions"
```

---

### Task 5: Navigation Updates

**Files:**
- Modify: `components/layout/navbar-client.tsx`

- [ ] **Step 1: Update NAV_ITEMS order and logo link**

In `components/layout/navbar-client.tsx`:

Change the `NAV_ITEMS` array from:
```ts
const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/goals", label: "Goals" },
  { href: "/library", label: "Library" },
  { href: "/reference", label: "Reference" },
  { href: "/history", label: "History" },
]
```
to:
```ts
const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/goals", label: "Goals" },
  { href: "/history", label: "History" },
  { href: "/library", label: "Library" },
  { href: "/reference", label: "Reference" },
]
```

Change the logo from:
```tsx
<span className="text-sm font-medium text-foreground/85 md:mr-3">Guitar Practice</span>
```
to:
```tsx
<Link href="/" className="text-sm font-medium text-foreground/85 md:mr-3 hover:text-foreground transition-colors">
  Guitar Practice
</Link>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add components/layout/navbar-client.tsx
git commit -m "feat: reorder nav tabs and make logo link to home"
```

---

### Task 6: ProgressionsTab and HarmonyTab Props

**Files:**
- Modify: `app/(app)/reference/_components/progressions-tab.tsx`
- Modify: `app/(app)/reference/_components/harmony-tab.tsx`

- [ ] **Step 1: Add `defaultProgressionName` prop to ProgressionsTab**

In `app/(app)/reference/_components/progressions-tab.tsx`, change the interface and useState:

```ts
interface ProgressionsTabProps {
  tonic: string
  defaultProgressionName?: string
  onChordSelect?: (tonic: string, type: string, quality: string, primaryScaleName: string) => void
  onScaleSelect?: (tonic: string, scaleName: string) => void
}

export function ProgressionsTab({ tonic, defaultProgressionName, onChordSelect, onScaleSelect }: ProgressionsTabProps) {
  const [progressionName, setProgressionName] = useState(defaultProgressionName ?? "pop-standard")
```

- [ ] **Step 2: Add `defaultMode` prop to HarmonyTab**

In `app/(app)/reference/_components/harmony-tab.tsx`, change the interface and useState:

```ts
interface HarmonyTabProps {
  tonic: string
  defaultMode?: string
  onChordSelect?: (tonic: string, type: string, quality: string, primaryScaleName: string) => void
  onScaleSelect?: (tonic: string, scaleName: string) => void
}

export function HarmonyTab({ tonic, defaultMode, onChordSelect, onScaleSelect }: HarmonyTabProps) {
```

Then find the `useState` for mode and change it:

```ts
// Find: const [mode, setMode] = useState("ionian")
// Change to:
const [mode, setMode] = useState(defaultMode ?? "ionian")
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add app/(app)/reference/_components/progressions-tab.tsx app/(app)/reference/_components/harmony-tab.tsx
git commit -m "feat: add defaultProgressionName and defaultMode props to reference panels"
```

---

### Task 7: `useSessionTimer` Hook

**Files:**
- Create: `lib/hooks/use-session-timer.ts`
- Create: `lib/hooks/use-session-timer.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/hooks/use-session-timer.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useSessionTimer } from "./use-session-timer"

describe("useSessionTimer", () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it("starts paused", () => {
    const { result } = renderHook(() => useSessionTimer(60, 120))
    expect(result.current.isRunning).toBe(false)
    expect(result.current.sectionSecondsRemaining).toBe(60)
    expect(result.current.totalSecondsRemaining).toBe(120)
  })

  it("counts down when running", () => {
    const { result } = renderHook(() => useSessionTimer(60, 120))
    act(() => { result.current.play() })
    act(() => { vi.advanceTimersByTime(3000) })
    expect(result.current.sectionSecondsRemaining).toBe(57)
    expect(result.current.totalSecondsRemaining).toBe(117)
  })

  it("pauses counting", () => {
    const { result } = renderHook(() => useSessionTimer(60, 120))
    act(() => { result.current.play() })
    act(() => { vi.advanceTimersByTime(2000) })
    act(() => { result.current.pause() })
    const sec = result.current.sectionSecondsRemaining
    act(() => { vi.advanceTimersByTime(2000) })
    expect(result.current.sectionSecondsRemaining).toBe(sec)
  })

  it("does not go below 0", () => {
    const { result } = renderHook(() => useSessionTimer(2, 5))
    act(() => { result.current.play() })
    act(() => { vi.advanceTimersByTime(10000) })
    expect(result.current.sectionSecondsRemaining).toBe(0)
    expect(result.current.totalSecondsRemaining).toBe(0)
  })

  it("resetSection updates both timers", () => {
    const { result } = renderHook(() => useSessionTimer(60, 120))
    act(() => { result.current.play() })
    act(() => { vi.advanceTimersByTime(5000) })
    act(() => { result.current.resetSection(30, 90) })
    expect(result.current.sectionSecondsRemaining).toBe(30)
    expect(result.current.totalSecondsRemaining).toBe(90)
  })

  it("calls onSectionComplete when section reaches 0", () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => useSessionTimer(2, 10, onComplete))
    act(() => { result.current.play() })
    act(() => { vi.advanceTimersByTime(2000) })
    expect(onComplete).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run lib/hooks/use-session-timer.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement the hook**

Create `lib/hooks/use-session-timer.ts`:

```ts
import { useState, useEffect, useRef, useCallback } from "react"

export function useSessionTimer(
  initialSectionSeconds: number,
  initialTotalSeconds: number,
  onSectionComplete?: () => void,
) {
  const [sectionSecondsRemaining, setSectionSec] = useState(initialSectionSeconds)
  const [totalSecondsRemaining, setTotalSec] = useState(initialTotalSeconds)
  const [isRunning, setIsRunning] = useState(false)
  const onCompleteRef = useRef(onSectionComplete)
  onCompleteRef.current = onSectionComplete
  const firedRef = useRef(false)

  useEffect(() => {
    if (!isRunning) return
    firedRef.current = false
    const id = setInterval(() => {
      setSectionSec((s) => {
        if (s <= 0) return 0
        const next = s - 1
        if (next === 0 && !firedRef.current) {
          firedRef.current = true
          onCompleteRef.current?.()
        }
        return next
      })
      setTotalSec((t) => Math.max(0, t - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [isRunning])

  const play = useCallback(() => setIsRunning(true), [])
  const pause = useCallback(() => setIsRunning(false), [])
  const resetSection = useCallback((newSection: number, newTotal: number) => {
    firedRef.current = false
    setSectionSec(newSection)
    setTotalSec(newTotal)
  }, [])

  return { sectionSecondsRemaining, totalSecondsRemaining, isRunning, play, pause, resetSection }
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run lib/hooks/use-session-timer.test.ts
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/hooks/use-session-timer.ts lib/hooks/use-session-timer.test.ts
git commit -m "feat: add useSessionTimer hook"
```

---

### Task 8: `useSessionNav` Hook

**Files:**
- Create: `lib/hooks/use-session-nav.ts`
- Create: `lib/hooks/use-session-nav.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/hooks/use-session-nav.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useSessionNav } from "./use-session-nav"
import type { SessionSection } from "@/lib/sessions"

function makeSection(id: string, keys: string[] = [], defaultKey = "C"): SessionSection {
  return {
    id,
    title: id,
    type: "warmup",
    description: "",
    durationMinutes: 5,
    order: 0,
    topic: keys.length > 0 || defaultKey
      ? { kind: "scale", subtype: "major", displayName: "test", defaultKey, keys, practiceMode: null, lessonUrl: null }
      : null,
  }
}

describe("useSessionNav", () => {
  it("starts at section 0, key 0", () => {
    const sections = [makeSection("A"), makeSection("B")]
    const { result } = renderHook(() => useSessionNav(sections))
    expect(result.current.currentSectionIndex).toBe(0)
    expect(result.current.currentKeyIndex).toBe(0)
  })

  it("goToNextSection advances section and resets key", () => {
    const sections = [makeSection("A", ["C", "F"]), makeSection("B")]
    const { result } = renderHook(() => useSessionNav(sections))
    act(() => { result.current.goToNextKey() })
    expect(result.current.currentKeyIndex).toBe(1)
    act(() => { result.current.goToNextSection() })
    expect(result.current.currentSectionIndex).toBe(1)
    expect(result.current.currentKeyIndex).toBe(0)
  })

  it("goToNextSection does nothing at last section", () => {
    const sections = [makeSection("A")]
    const { result } = renderHook(() => useSessionNav(sections))
    act(() => { result.current.goToNextSection() })
    expect(result.current.currentSectionIndex).toBe(0)
  })

  it("goToPrevSection does nothing at first section", () => {
    const sections = [makeSection("A"), makeSection("B")]
    const { result } = renderHook(() => useSessionNav(sections))
    act(() => { result.current.goToPrevSection() })
    expect(result.current.currentSectionIndex).toBe(0)
  })

  it("goToSection jumps to any section", () => {
    const sections = [makeSection("A"), makeSection("B"), makeSection("C")]
    const { result } = renderHook(() => useSessionNav(sections))
    act(() => { result.current.goToSection(2) })
    expect(result.current.currentSectionIndex).toBe(2)
  })

  it("currentKeySequence resolves for current section", () => {
    const sections = [makeSection("A", ["C", "F", "G"])]
    const { result } = renderHook(() => useSessionNav(sections))
    expect(result.current.currentKeySequence).toEqual(["C", "F", "G"])
  })

  it("goToNextKey wraps around", () => {
    const sections = [makeSection("A", ["C", "F"])]
    const { result } = renderHook(() => useSessionNav(sections))
    act(() => { result.current.goToNextKey() })
    expect(result.current.currentKeyIndex).toBe(1)
    act(() => { result.current.goToNextKey() })
    expect(result.current.currentKeyIndex).toBe(0)
  })

  it("goToPrevKey wraps around", () => {
    const sections = [makeSection("A", ["C", "F"])]
    const { result } = renderHook(() => useSessionNav(sections))
    act(() => { result.current.goToPrevKey() })
    expect(result.current.currentKeyIndex).toBe(1)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run lib/hooks/use-session-nav.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement**

Create `lib/hooks/use-session-nav.ts`:

```ts
import { useState, useMemo, useCallback } from "react"
import { resolveKeySequence } from "@/lib/sessions"
import type { SessionSection } from "@/lib/sessions"

export function useSessionNav(sections: SessionSection[]) {
  const [currentSectionIndex, setSectionIndex] = useState(0)
  const [currentKeyIndex, setKeyIndex] = useState(0)

  const currentSection = sections[currentSectionIndex]
  const currentKeySequence = useMemo(
    () => currentSection?.topic ? resolveKeySequence(currentSection.topic) : [""],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentSectionIndex, sections],
  )

  const goToSection = useCallback((index: number) => {
    setSectionIndex(index)
    setKeyIndex(0)
  }, [])

  const goToNextSection = useCallback(() => {
    setSectionIndex((i) => {
      if (i >= sections.length - 1) return i
      setKeyIndex(0)
      return i + 1
    })
  }, [sections.length])

  const goToPrevSection = useCallback(() => {
    setSectionIndex((i) => {
      if (i <= 0) return i
      setKeyIndex(0)
      return i - 1
    })
  }, [])

  const goToNextKey = useCallback(() => {
    setKeyIndex((k) => (k + 1) % (currentKeySequence.length || 1))
  }, [currentKeySequence.length])

  const goToPrevKey = useCallback(() => {
    setKeyIndex((k) => (k - 1 + (currentKeySequence.length || 1)) % (currentKeySequence.length || 1))
  }, [currentKeySequence.length])

  return {
    currentSectionIndex,
    currentKeyIndex,
    currentKeySequence,
    goToSection,
    goToNextSection,
    goToPrevSection,
    goToNextKey,
    goToPrevKey,
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run lib/hooks/use-session-nav.test.ts
```

Expected: All 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/hooks/use-session-nav.ts lib/hooks/use-session-nav.test.ts
git commit -m "feat: add useSessionNav hook"
```

---

### Task 9: `useMetronome` Hook

**Files:**
- Create: `lib/hooks/use-metronome.ts`

- [ ] **Step 1: Implement (no unit tests — Web Audio API is not testable in jsdom)**

Create `lib/hooks/use-metronome.ts`:

```ts
import { useState, useRef, useCallback } from "react"

export function useMetronome() {
  const [bpm, setBpmState] = useState(80)
  const [isRunning, setIsRunning] = useState(false)
  const ctxRef = useRef<AudioContext | null>(null)
  const nextTickRef = useRef<number>(0)
  const timerIdRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleTick = useCallback((ctx: AudioContext, when: number) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(880, when)
    gain.gain.setValueAtTime(0.3, when)
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.05)
    osc.start(when)
    osc.stop(when + 0.05)
  }, [])

  const scheduleAhead = useCallback((ctx: AudioContext, bpmVal: number) => {
    const interval = 60 / bpmVal
    const scheduleWindow = 0.1 // schedule 100ms ahead
    const checkInterval = 50 // ms

    while (nextTickRef.current < ctx.currentTime + scheduleWindow) {
      scheduleTick(ctx, nextTickRef.current)
      nextTickRef.current += interval
    }
    timerIdRef.current = setTimeout(() => scheduleAhead(ctx, bpmVal), checkInterval)
  }, [scheduleTick])

  const start = useCallback(() => {
    if (isRunning) return
    const ctx = new AudioContext()
    ctxRef.current = ctx
    nextTickRef.current = ctx.currentTime
    scheduleAhead(ctx, bpm)
    setIsRunning(true)
  }, [isRunning, bpm, scheduleAhead])

  const stop = useCallback(() => {
    if (timerIdRef.current) clearTimeout(timerIdRef.current)
    ctxRef.current?.close()
    ctxRef.current = null
    setIsRunning(false)
  }, [])

  const setBpm = useCallback((val: number) => {
    setBpmState(val)
    if (isRunning) {
      stop()
      // Restart with new BPM after state update is applied
      // Caller should handle: stop() then start() — or we restart inline
    }
  }, [isRunning, stop])

  return { bpm, setBpm, isRunning, start, stop }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/use-metronome.ts
git commit -m "feat: add useMetronome hook (Web Audio API)"
```

---

### Task 10: Small Session UI Components

**Files:**
- Create: `app/(app)/sessions/run/_components/key-strip.tsx`
- Create: `app/(app)/sessions/run/_components/section-strip.tsx`
- Create: `app/(app)/sessions/run/_components/timer-display.tsx`
- Create: `app/(app)/sessions/run/_components/notes-panel.tsx`
- Create: `app/(app)/sessions/run/_components/metronome-panel.tsx`

- [ ] **Step 1: Create KeyStrip**

```tsx
// app/(app)/sessions/run/_components/key-strip.tsx
import { cn } from "@/lib/utils"

interface KeyStripProps {
  keys: string[]
  currentIndex: number
  onSelect: (index: number) => void
  onPrev: () => void
  onNext: () => void
}

export function KeyStrip({ keys, currentIndex, onSelect, onPrev, onNext }: KeyStripProps) {
  if (keys.length === 0 || (keys.length === 1 && keys[0] === "")) return null

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {keys.map((key, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={cn(
              "shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors",
              i === currentIndex
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {key}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 justify-center text-sm text-muted-foreground">
        <button
          onClick={onPrev}
          className="hover:text-foreground transition-colors disabled:opacity-40"
          aria-label="Previous key"
        >
          ←
        </button>
        <span>{currentIndex + 1}/{keys.length}</span>
        <button
          onClick={onNext}
          className="hover:text-foreground transition-colors"
          aria-label="Next key"
        >
          →
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create SectionStrip**

```tsx
// app/(app)/sessions/run/_components/section-strip.tsx
import { cn } from "@/lib/utils"
import type { SessionSection } from "@/lib/sessions"

const TYPE_COLORS: Record<string, string> = {
  warmup: "bg-blue-500",
  technique: "bg-purple-500",
  muscle_memory: "bg-orange-500",
  theory: "bg-green-500",
  lessons: "bg-yellow-500",
  songs: "bg-pink-500",
  free_practice: "bg-gray-500",
}

interface SectionStripProps {
  sections: SessionSection[]
  currentIndex: number
  onSelect: (index: number) => void
}

export function SectionStrip({ sections, currentIndex, onSelect }: SectionStripProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {sections.map((s, i) => (
        <button
          key={s.id}
          onClick={() => onSelect(i)}
          className={cn(
            "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors",
            i === currentIndex
              ? "border-accent bg-accent/10 text-foreground"
              : i < currentIndex
              ? "border-border bg-muted/40 text-muted-foreground"
              : "border-border bg-card text-muted-foreground hover:text-foreground",
          )}
        >
          <span className={cn("w-2 h-2 rounded-full shrink-0", TYPE_COLORS[s.type] ?? "bg-gray-500")} />
          <span>{s.title}</span>
          <span className="text-xs text-muted-foreground">{s.durationMinutes}m</span>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create TimerDisplay**

```tsx
// app/(app)/sessions/run/_components/timer-display.tsx
function fmt(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, "0")
  const s = (secs % 60).toString().padStart(2, "0")
  return `${m}:${s}`
}

interface TimerDisplayProps {
  sectionSecondsRemaining: number
  totalSecondsRemaining: number
}

export function TimerDisplay({ sectionSecondsRemaining, totalSecondsRemaining }: TimerDisplayProps) {
  return (
    <div className="flex items-baseline gap-1 text-sm tabular-nums text-muted-foreground">
      <span className="text-foreground font-medium">{fmt(sectionSecondsRemaining)}</span>
      <span>/</span>
      <span>{fmt(totalSecondsRemaining)}</span>
    </div>
  )
}
```

- [ ] **Step 4: Create NotesPanel**

```tsx
// app/(app)/sessions/run/_components/notes-panel.tsx
interface NotesPanelProps {
  value: string
  onChange: (value: string) => void
}

export function NotesPanel({ value, onChange }: NotesPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Session notes</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Note anything useful from this session…"
        className="flex-1 w-full resize-none rounded-md border border-border bg-card text-foreground text-sm p-3 focus:outline-none focus:ring-1 focus:ring-accent min-h-[200px]"
      />
    </div>
  )
}
```

- [ ] **Step 5: Create MetronomePanel**

```tsx
// app/(app)/sessions/run/_components/metronome-panel.tsx
interface MetronomePanelProps {
  bpm: number
  isRunning: boolean
  onBpmChange: (bpm: number) => void
  onStart: () => void
  onStop: () => void
}

export function MetronomePanel({ bpm, isRunning, onBpmChange, onStart, onStop }: MetronomePanelProps) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border border-border bg-card">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">BPM</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onBpmChange(Math.max(20, bpm - 5))}
          className="w-7 h-7 rounded border border-border bg-muted hover:bg-muted/80 text-sm font-medium transition-colors"
        >
          ▼
        </button>
        <span className="w-10 text-center font-medium tabular-nums text-sm">{bpm}</span>
        <button
          onClick={() => onBpmChange(Math.min(300, bpm + 5))}
          className="w-7 h-7 rounded border border-border bg-muted hover:bg-muted/80 text-sm font-medium transition-colors"
        >
          ▲
        </button>
      </div>
      <button
        onClick={isRunning ? onStop : onStart}
        className="ml-auto px-4 py-1.5 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity"
      >
        {isRunning ? "■ Stop" : "▶ Start"}
      </button>
    </div>
  )
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No new errors.

- [ ] **Step 7: Commit**

```bash
git add app/(app)/sessions/run/_components/
git commit -m "feat: add KeyStrip, SectionStrip, TimerDisplay, NotesPanel, MetronomePanel components"
```

---

### Task 11: FlashCard Component

**Files:**
- Create: `app/(app)/sessions/run/_components/flashcard.tsx`

- [ ] **Step 1: Implement FlashCard**

```tsx
// app/(app)/sessions/run/_components/flashcard.tsx
"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { SessionSection, SessionTopic } from "@/lib/sessions"
import { KeyStrip } from "./key-strip"
import { ScalePanel } from "@/app/(app)/reference/_components/scale-panel"
import { ChordPanel } from "@/app/(app)/reference/_components/chord-panel"
import { ArpeggioPanel } from "@/app/(app)/reference/_components/arpeggio-panel"
import { InversionPanel } from "@/app/(app)/reference/_components/inversion-panel"
import { ProgressionsTab } from "@/app/(app)/reference/_components/progressions-tab"
import { HarmonyTab } from "@/app/(app)/reference/_components/harmony-tab"

const SECTION_TYPE_LABELS: Record<string, string> = {
  warmup: "Warm Up",
  technique: "Technique",
  muscle_memory: "Muscle Memory",
  theory: "Theory",
  lessons: "Lessons",
  songs: "Songs",
  free_practice: "Free Practice",
}

const SECTION_TYPE_COLORS: Record<string, string> = {
  warmup: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  technique: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  muscle_memory: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  theory: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  lessons: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  songs: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
  free_practice: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
}

interface FlashCardProps {
  section: SessionSection
  currentKeyIndex: number
  currentKeySequence: string[]
  onSelectKey: (index: number) => void
  onPrevKey: () => void
  onNextKey: () => void
}

function ReferencePanel({ topic, currentKey }: { topic: SessionTopic; currentKey: string }) {
  const [root, setRoot] = useState(currentKey)
  // Sync if key changes externally
  if (root !== currentKey) setRoot(currentKey)

  switch (topic.kind) {
    case "scale":
      return <ScalePanel root={root} onRootChange={setRoot} scaleTypeTrigger={topic.subtype ? { type: topic.subtype } : null} />
    case "arpeggio":
      return <ArpeggioPanel root={root} onRootChange={setRoot} chordTypeTrigger={topic.subtype ? { type: topic.subtype } : null} />
    case "chord":
      return <ChordPanel root={root} onRootChange={setRoot} chordTypeTrigger={topic.subtype ? { type: topic.subtype } : null} />
    case "inversion":
      return <InversionPanel root={root} onRootChange={setRoot} inversionTypeTrigger={topic.subtype ? { type: topic.subtype } : null} />
    case "progression":
      return <ProgressionsTab tonic={root} defaultProgressionName={topic.subtype ?? undefined} />
    case "harmony":
      return <HarmonyTab tonic={root} defaultMode={topic.subtype ?? undefined} />
    case "lesson":
      return (
        <div className="p-4 space-y-3">
          <p className="font-medium">{topic.displayName}</p>
          {topic.lessonUrl ? (
            <a
              href={topic.lessonUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
            >
              Open lesson →
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">(no link available)</p>
          )}
        </div>
      )
    default:
      return null
  }
}

export function FlashCard({ section, currentKeyIndex, currentKeySequence, onSelectKey, onPrevKey, onNextKey }: FlashCardProps) {
  const [flipped, setFlipped] = useState(false)
  const currentKey = currentKeySequence[currentKeyIndex] ?? ""
  const hasTopic = section.topic !== null
  const showKeys = hasTopic && section.topic!.kind !== "lesson" && currentKeySequence[0] !== ""

  // Reset flip when section changes
  // (handled by parent re-mounting or key prop)

  const badge = (
    <span className={cn("text-xs font-medium px-2 py-0.5 rounded", SECTION_TYPE_COLORS[section.type])}>
      {SECTION_TYPE_LABELS[section.type] ?? section.type}
    </span>
  )

  if (!hasTopic) {
    return (
      <div className="flex flex-col items-center justify-center h-72 rounded-xl border border-border bg-card p-6 text-center space-y-3">
        {badge}
        <h2 className="text-2xl font-semibold">{section.title}</h2>
        {section.description && <p className="text-sm text-muted-foreground">{section.description}</p>}
      </div>
    )
  }

  return (
    <div className="relative" style={{ perspective: "1000px" }}>
      <div
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          transition: "transform 0.4s ease",
          position: "relative",
          minHeight: flipped ? "auto" : "18rem",
        }}
      >
        {/* Front */}
        <div
          className={cn(
            "rounded-xl border border-border bg-card p-6",
            flipped ? "invisible" : "visible",
          )}
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="flex flex-col items-center gap-4">
            {badge}
            <h2 className="text-2xl font-semibold text-center">{section.topic!.displayName}</h2>
            {showKeys && (
              <div className="w-full">
                <KeyStrip
                  keys={currentKeySequence}
                  currentIndex={currentKeyIndex}
                  onSelect={onSelectKey}
                  onPrev={onPrevKey}
                  onNext={onNextKey}
                />
              </div>
            )}
            <button
              onClick={() => setFlipped(true)}
              className="mt-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Turn card ↩
            </button>
          </div>
        </div>

        {/* Back */}
        <div
          className={cn(
            "rounded-xl border border-border bg-card p-4 overflow-y-auto max-h-[80vh]",
            flipped ? "visible" : "invisible absolute inset-0",
          )}
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="space-y-4">
            {showKeys && (
              <KeyStrip
                keys={currentKeySequence}
                currentIndex={currentKeyIndex}
                onSelect={onSelectKey}
                onPrev={onPrevKey}
                onNext={onNextKey}
              />
            )}
            <div className="border-t border-border pt-4">
              <ReferencePanel topic={section.topic!} currentKey={currentKey || "C"} />
            </div>
            <button
              onClick={() => setFlipped(false)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Turn card ↩
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: No new errors. (If ArpeggioPanel doesn't exist at that path, check the actual file location with `find app -name "arpeggio-panel.tsx"` and adjust the import.)

- [ ] **Step 3: Commit**

```bash
git add app/(app)/sessions/run/_components/flashcard.tsx
git commit -m "feat: add FlashCard component with 3D flip and reference panel rendering"
```

---

### Task 12: EndSessionModal Component

**Files:**
- Create: `app/(app)/sessions/run/_components/end-session-modal.tsx`

- [ ] **Step 1: Implement**

```tsx
// app/(app)/sessions/run/_components/end-session-modal.tsx
"use client"

import { useState } from "react"
import { format, differenceInMinutes, parseISO } from "date-fns"

interface EndSessionModalProps {
  routineTitle: string
  goalTitle: string
  startedAtLocal: string
  notes: string
  onSave: (finalNotes: string) => Promise<void>
  onDiscard: () => void
  isSaving: boolean
}

function formatLocalTime(localStr: string): string {
  // "YYYY-MM-DD HH:mm:ss" → "HH:mm"
  return localStr.slice(11, 16)
}

function formatLocalDate(localStr: string): string {
  // "YYYY-MM-DD HH:mm:ss" → "d MMM yyyy"
  try {
    return format(parseISO(localStr.slice(0, 10)), "d MMM yyyy")
  } catch {
    return localStr.slice(0, 10)
  }
}

function durationMinutes(start: string, end: string): number {
  try {
    return Math.max(0, differenceInMinutes(
      new Date(end.replace(" ", "T")),
      new Date(start.replace(" ", "T")),
    ))
  } catch {
    return 0
  }
}

export function EndSessionModal({
  routineTitle,
  goalTitle,
  startedAtLocal,
  notes,
  onSave,
  onDiscard,
  isSaving,
}: EndSessionModalProps) {
  const [finalNotes, setFinalNotes] = useState(notes)
  const endedAtLocal = format(new Date(), "yyyy-MM-dd HH:mm:ss")
  const dur = durationMinutes(startedAtLocal, endedAtLocal)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-xl border border-border p-6 w-full max-w-md space-y-4 shadow-xl">
        <h2 className="text-lg font-semibold">Save session?</h2>

        <div className="space-y-1">
          <p className="font-medium">{routineTitle}</p>
          <p className="text-sm text-muted-foreground">
            {goalTitle} · {formatLocalDate(startedAtLocal)} · {formatLocalTime(startedAtLocal)} – {endedAtLocal.slice(11, 16)}
          </p>
          <p className="text-sm text-muted-foreground">Duration: {dur} min</p>
        </div>

        <div className="space-y-1">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Session notes</p>
          <textarea
            value={finalNotes}
            onChange={(e) => setFinalNotes(e.target.value)}
            placeholder="Note anything useful from this session…"
            className="w-full resize-none rounded-md border border-border bg-card text-foreground text-sm p-3 focus:outline-none focus:ring-1 focus:ring-accent"
            rows={4}
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onDiscard}
            disabled={isSaving}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Discard
          </button>
          <button
            onClick={() => onSave(finalNotes)}
            disabled={isSaving}
            className="px-4 py-2 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save session"}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add app/(app)/sessions/run/_components/end-session-modal.tsx
git commit -m "feat: add EndSessionModal component"
```

---

### Task 13: Session Runner Page (Server Wrapper + Client Orchestrator)

**Files:**
- Create: `app/(app)/sessions/run/page.tsx`
- Create: `app/(app)/sessions/run/_components/session-runner-client.tsx`

- [ ] **Step 1: Check where ArpeggioPanel lives**

```bash
find app -name "arpeggio-panel.tsx" | head -5
```

Note the path for the correct import in `flashcard.tsx` (update Task 11 import if needed).

- [ ] **Step 2: Create the server wrapper page**

```tsx
// app/(app)/sessions/run/page.tsx
import { redirect } from "next/navigation"
import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"
import { formatTopicName } from "@/lib/goals"
import { SessionRunnerClient } from "./_components/session-runner-client"
import type { SessionRoutine } from "@/lib/sessions"

export default async function SessionRunPage({
  searchParams,
}: {
  searchParams: Promise<{ routineId?: string }>
}) {
  const { routineId } = await searchParams
  if (!routineId) redirect("/goals")

  const userId = await getUserId()
  if (!userId) redirect("/goals")

  const routine = await db.routine.findUnique({
    where: { id: routineId },
    include: {
      goal: { select: { id: true, title: true } },
      sections: {
        orderBy: { order: "asc" },
        include: {
          sectionTopics: {
            take: 1,
            include: {
              goalTopic: {
                include: {
                  lesson: { select: { title: true, url: true } },
                  userLesson: { select: { title: true, url: true } },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!routine || routine.goal.id === undefined) redirect("/goals")

  // Verify ownership via goal
  const goal = await db.goal.findUnique({ where: { id: routine.goalId }, select: { userId: true } })
  if (!goal || goal.userId !== userId) redirect("/goals")

  const sessionRoutine: SessionRoutine = {
    id: routine.id,
    title: routine.title,
    goalId: routine.goalId,
    goalTitle: routine.goal.title,
    sections: routine.sections.map((s) => {
      const st = s.sectionTopics[0]
      const gt = st?.goalTopic
      return {
        id: s.id,
        title: s.title,
        type: s.type,
        description: s.description,
        durationMinutes: s.durationMinutes,
        order: s.order,
        topic: gt
          ? {
              kind: gt.kind,
              subtype: gt.subtype,
              displayName: formatTopicName({
                kind: gt.kind,
                subtype: gt.subtype,
                defaultKey: gt.defaultKey,
                lesson: gt.lesson,
                userLesson: gt.userLesson,
              }),
              defaultKey: gt.defaultKey,
              keys: st.keys,
              practiceMode: st.practiceMode,
              lessonUrl: gt.lesson?.url ?? gt.userLesson?.url ?? null,
            }
          : null,
      }
    }),
  }

  return <SessionRunnerClient routine={sessionRoutine} />
}
```

- [ ] **Step 3: Create SessionRunnerClient**

```tsx
// app/(app)/sessions/run/_components/session-runner-client.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useSessionTimer } from "@/lib/hooks/use-session-timer"
import { useSessionNav } from "@/lib/hooks/use-session-nav"
import { useMetronome } from "@/lib/hooks/use-metronome"
import { saveSession } from "@/app/(app)/sessions/actions"
import type { SessionRoutine } from "@/lib/sessions"
import { FlashCard } from "./flashcard"
import { SectionStrip } from "./section-strip"
import { TimerDisplay } from "./timer-display"
import { NotesPanel } from "./notes-panel"
import { MetronomePanel } from "./metronome-panel"
import { EndSessionModal } from "./end-session-modal"

function totalSecs(sections: SessionRoutine["sections"], fromIndex: number): number {
  return sections.slice(fromIndex).reduce((sum, s) => sum + s.durationMinutes * 60, 0)
}

interface SessionRunnerClientProps {
  routine: SessionRoutine
}

export function SessionRunnerClient({ routine }: SessionRunnerClientProps) {
  const router = useRouter()
  const startedAtLocal = useState(() => format(new Date(), "yyyy-MM-dd HH:mm:ss"))[0]
  const [notes, setNotes] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [showMetronome, setShowMetronome] = useState(false)
  const [autoAdvance, setAutoAdvance] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [flashKey, setFlashKey] = useState(0) // forces FlashCard remount on section change

  const nav = useSessionNav(routine.sections)
  const currentSection = routine.sections[nav.currentSectionIndex]
  const metronome = useMetronome()

  const onSectionComplete = useCallback(() => {
    if (autoAdvance && nav.currentSectionIndex < routine.sections.length - 1) {
      nav.goToNextSection()
    }
  }, [autoAdvance, nav, routine.sections.length])

  const timer = useSessionTimer(
    currentSection.durationMinutes * 60,
    totalSecs(routine.sections, 0),
    onSectionComplete,
  )

  // When section changes: reset timer and remount flashcard
  const handleGoToSection = useCallback((index: number) => {
    nav.goToSection(index)
    timer.resetSection(
      routine.sections[index].durationMinutes * 60,
      totalSecs(routine.sections, index),
    )
    setFlashKey((k) => k + 1)
  }, [nav, routine.sections, timer])

  const handleNext = useCallback(() => {
    const next = nav.currentSectionIndex + 1
    if (next < routine.sections.length) handleGoToSection(next)
  }, [nav.currentSectionIndex, routine.sections.length, handleGoToSection])

  const handlePrev = useCallback(() => {
    const prev = nav.currentSectionIndex - 1
    if (prev >= 0) handleGoToSection(prev)
  }, [nav.currentSectionIndex, handleGoToSection])

  async function handleSave(finalNotes: string) {
    setIsSaving(true)
    const result = await saveSession({
      routine,
      startedAtLocal,
      endedAtLocal: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
      notes: finalNotes,
    })
    if ("success" in result) {
      router.push(`/history/${result.id}`)
    } else {
      setIsSaving(false)
      alert(result.error)
    }
  }

  function handleEndSession() {
    timer.pause()
    setShowModal(true)
  }

  function handleDiscard() {
    setShowModal(false)
    // Timer stays paused — user can resume or navigate away
  }

  const handleMetronomeBpmChange = useCallback((newBpm: number) => {
    if (metronome.isRunning) metronome.stop()
    // setBpm updates state; user must restart manually
    metronome.setBpm(newBpm)
  }, [metronome])

  return (
    <div className="flex flex-col h-[calc(100vh-44px)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-background shrink-0">
        <button
          onClick={() => router.back()}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back
        </button>
        <span className="flex-1 text-sm font-medium truncate">{routine.title}</span>
        <TimerDisplay
          sectionSecondsRemaining={timer.sectionSecondsRemaining}
          totalSecondsRemaining={timer.totalSecondsRemaining}
        />
        <button
          onClick={handleEndSession}
          className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
        >
          End Session
        </button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Flashcard area */}
        <div className="flex-1 overflow-y-auto p-4">
          <FlashCard
            key={flashKey}
            section={currentSection}
            currentKeyIndex={nav.currentKeyIndex}
            currentKeySequence={nav.currentKeySequence}
            onSelectKey={(i) => { nav.goToSection === nav.goToSection; /* update key index */ }}
            onPrevKey={nav.goToPrevKey}
            onNextKey={nav.goToNextKey}
          />
        </div>

        {/* Notes (desktop) */}
        <div className="hidden lg:flex w-72 shrink-0 border-l border-border p-4">
          <NotesPanel value={notes} onChange={setNotes} />
        </div>
      </div>

      {/* Section strip */}
      <div className="px-4 py-2 border-t border-border bg-background shrink-0">
        <SectionStrip
          sections={routine.sections}
          currentIndex={nav.currentSectionIndex}
          onSelect={handleGoToSection}
        />
      </div>

      {/* Controls */}
      <div className="px-4 py-3 border-t border-border bg-background shrink-0 space-y-2">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handlePrev}
            disabled={nav.currentSectionIndex === 0}
            className="px-3 py-1.5 text-sm rounded border border-border hover:bg-muted transition-colors disabled:opacity-40"
          >
            ← Prev
          </button>
          <button
            onClick={timer.isRunning ? timer.pause : timer.play}
            className="px-4 py-1.5 text-sm rounded-md bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
          >
            {timer.isRunning ? "⏸" : "▶"}
          </button>
          <button
            onClick={handleNext}
            disabled={nav.currentSectionIndex === routine.sections.length - 1}
            className="px-3 py-1.5 text-sm rounded border border-border hover:bg-muted transition-colors disabled:opacity-40"
          >
            Next →
          </button>
        </div>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setShowMetronome((v) => !v)}
            className={cn(
              "text-xs px-3 py-1 rounded border transition-colors",
              showMetronome ? "border-accent bg-accent/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            🎵 Metronome
          </button>
          <button
            onClick={() => setAutoAdvance((v) => !v)}
            className={cn(
              "text-xs px-3 py-1 rounded border transition-colors",
              autoAdvance ? "border-accent bg-accent/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            ⟳ Auto-advance: {autoAdvance ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {/* Metronome panel */}
      {showMetronome && (
        <div className="px-4 pb-3 border-t border-border bg-background shrink-0">
          <MetronomePanel
            bpm={metronome.bpm}
            isRunning={metronome.isRunning}
            onBpmChange={handleMetronomeBpmChange}
            onStart={metronome.start}
            onStop={metronome.stop}
          />
        </div>
      )}

      {/* Notes (mobile) */}
      <div className="lg:hidden px-4 pb-3 border-t border-border bg-background shrink-0">
        <NotesPanel value={notes} onChange={setNotes} />
      </div>

      {/* End session modal */}
      {showModal && (
        <EndSessionModal
          routineTitle={routine.title}
          goalTitle={routine.goalTitle}
          startedAtLocal={startedAtLocal}
          notes={notes}
          onSave={handleSave}
          onDiscard={handleDiscard}
          isSaving={isSaving}
        />
      )}
    </div>
  )
}
```

**Note:** The `onSelectKey` prop in FlashCard receives the nav's key selection — wire it to `nav.goToNextKey` / `nav.goToPrevKey`. After writing `session-runner-client.tsx`, update the `FlashCard` call to pass the correct handlers:

```tsx
onSelectKey={(i) => { /* setCurrentKeyIndex directly — add goToKeyIndex to useSessionNav */}}
```

To keep it simple, add a `goToKeyIndex` function to `useSessionNav`:

In `lib/hooks/use-session-nav.ts`, add:
```ts
const goToKeyIndex = useCallback((index: number) => {
  setKeyIndex(index)
}, [])
```
And return it. Then in `session-runner-client.tsx`:
```tsx
onSelectKey={nav.goToKeyIndex}
```

- [ ] **Step 4: Add `goToKeyIndex` to useSessionNav**

In `lib/hooks/use-session-nav.ts`, add to the return:
```ts
const goToKeyIndex = useCallback((index: number) => setKeyIndex(index), [])
// ...
return { ..., goToKeyIndex }
```

Update the test file to cover this:
```ts
it("goToKeyIndex sets key directly", () => {
  const sections = [makeSection("A", ["C", "F", "G"])]
  const { result } = renderHook(() => useSessionNav(sections))
  act(() => { result.current.goToKeyIndex(2) })
  expect(result.current.currentKeyIndex).toBe(2)
})
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: No new errors. Fix any import path mismatches (e.g. ArpeggioPanel location).

- [ ] **Step 6: Commit**

```bash
git add app/(app)/sessions/run/ lib/hooks/use-session-nav.ts lib/hooks/use-session-nav.test.ts
git commit -m "feat: add session runner server page and client orchestrator"
```

---

### Task 14: Home Page Updates

**Files:**
- Modify: `app/(app)/page.tsx`

- [ ] **Step 1: Replace the home page**

```tsx
// app/(app)/page.tsx
import Link from "next/link"
import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"
import { computeStreak } from "@/lib/sessions"

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export default async function HomePage() {
  const userId = await getUserId()

  const activeGoal = userId
    ? await db.goal.findFirst({
        where: { userId, isActive: true, isArchived: false },
        include: {
          routines: {
            orderBy: { createdAt: "asc" },
            include: {
              _count: { select: { sections: true } },
              sections: { select: { durationMinutes: true } },
            },
          },
        },
      })
    : null

  const allLocalDates = userId
    ? (
        await db.practiceSession.findMany({
          where: { userId },
          select: { localDate: true },
        })
      ).map((r) => r.localDate)
    : []

  const goalLocalDates =
    userId && activeGoal
      ? (
          await db.practiceSession.findMany({
            where: { userId, goalId: activeGoal.id },
            select: { localDate: true },
          })
        ).map((r) => r.localDate)
      : []

  const totalStreak = computeStreak(allLocalDates)
  const goalStreak = computeStreak(goalLocalDates)

  return (
    <div className="pt-6 max-w-2xl">
      <div className="flex justify-between items-baseline mb-8">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
            {greeting()}
          </p>
          <h1 className="text-2xl font-semibold text-foreground">Get started</h1>
        </div>
        {(totalStreak > 0 || goalStreak > 0) && (
          <div className="text-right">
            {totalStreak > 0 && (
              <div className="text-[13px] font-medium text-accent">🔥 {totalStreak}-day streak</div>
            )}
            {goalStreak > 0 && (
              <div className="text-[10px] text-muted-foreground">{goalStreak} days on this goal</div>
            )}
          </div>
        )}
      </div>

      {activeGoal ? (
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground mb-1">Active goal</p>
            <h2 className="text-lg font-semibold">{activeGoal.title}</h2>
            {activeGoal.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{activeGoal.description}</p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Practice routines</p>
            {activeGoal.routines.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                <Link href={`/goals/${activeGoal.id}`} className="underline underline-offset-2 hover:text-foreground transition-colors">
                  Add a routine to get started →
                </Link>
              </p>
            ) : (
              activeGoal.routines.map((routine) => {
                const totalMin = routine.sections.reduce((s, r) => s + r.durationMinutes, 0)
                return (
                  <div
                    key={routine.id}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3"
                  >
                    <div className="flex items-center gap-3 text-sm min-w-0">
                      <span className="font-medium truncate">{routine.title}</span>
                      <span className="text-muted-foreground shrink-0">
                        {routine._count.sections} sections · {formatDuration(totalMin)}
                      </span>
                    </div>
                    <Link
                      href={`/sessions/run?routineId=${routine.id}`}
                      className="shrink-0 px-3 py-1 text-xs rounded-md bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
                    >
                      ▶ Start
                    </Link>
                  </div>
                )
              })
            )}
            <Link
              href={`/goals/${activeGoal.id}`}
              className="inline-block text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
            >
              + New routine →
            </Link>
          </div>
        </div>
      ) : (
        <p className="text-base text-muted-foreground">
          <Link
            href="/goals"
            className="text-foreground underline underline-offset-2 decoration-border hover:decoration-foreground transition-colors"
          >
            Set your first goal to get started →
          </Link>
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add app/(app)/page.tsx
git commit -m "feat: update home page with active goal, routines, and streak display"
```

---

### Task 15: Goal Detail Page Updates

**Files:**
- Modify: `app/(app)/goals/[goalId]/page.tsx`
- Modify: `app/(app)/goals/[goalId]/_components/goal-detail-client.tsx`

- [ ] **Step 1: Update the server page to fetch recent sessions**

In `app/(app)/goals/[goalId]/page.tsx`, add the sessions query and extend the type passed to GoalDetailClient:

```tsx
import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { GoalDetailClient } from "./_components/goal-detail-client"

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ goalId: string }>
}) {
  const { goalId } = await params
  const userId = await getUserId()
  if (!userId) notFound()

  const goal = await db.goal.findUnique({
    where: { id: goalId },
    include: {
      topics: {
        include: { lesson: { select: { title: true } } },
        orderBy: { createdAt: "asc" },
      },
      routines: {
        orderBy: { createdAt: "asc" },
        include: {
          _count: { select: { sections: true } },
          sections: { select: { durationMinutes: true } },
        },
      },
    },
  })

  if (!goal || goal.userId !== userId) notFound()

  const recentSessions = await db.practiceSession.findMany({
    where: { userId, goalId },
    orderBy: { startedAtLocal: "desc" },
    take: 5,
    select: { id: true, routineTitle: true, startedAtLocal: true, endedAtLocal: true },
  })

  return <GoalDetailClient goal={goal} recentSessions={recentSessions} />
}
```

- [ ] **Step 2: Update GoalDetailClient to add Start buttons and recent sessions**

In `app/(app)/goals/[goalId]/_components/goal-detail-client.tsx`:

Add the `recentSessions` type and prop. Find the routines section and add a Start link. Add a recent sessions section after routines.

Add these types near the top:

```ts
type RecentSession = {
  id: string
  routineTitle: string
  startedAtLocal: string
  endedAtLocal: string
}
```

Update the props interface:

```ts
interface GoalDetailClientProps {
  goal: GoalData
  recentSessions: RecentSession[]
}
```

Update the function signature:

```ts
export function GoalDetailClient({ goal, recentSessions }: GoalDetailClientProps) {
```

Add `import Link from "next/link"` if not already present (it is).

In the routines rendering section, locate the routine list items and add a Start button. Find the pattern where routines are listed (search for `routine.title` in the file) and add a `▶ Start` link next to each routine title.

After the routines section, add a recent sessions section. The exact location depends on the current file structure — add it after the closing of the routines section, before the closing `</div>` of the main content.

The new recent sessions JSX to append:

```tsx
{/* Recent sessions */}
<div className="mt-8">
  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Recent sessions</p>
  {recentSessions.length === 0 ? (
    <p className="text-sm text-muted-foreground">No sessions yet — start one above.</p>
  ) : (
    <div className="space-y-1">
      {recentSessions.map((s) => (
        <Link
          key={s.id}
          href={`/history/${s.id}`}
          className="flex items-center justify-between gap-4 px-4 py-2.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-sm"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-medium truncate">{s.routineTitle}</span>
            <span className="text-muted-foreground shrink-0">{s.startedAtLocal.slice(0, 10)}</span>
            <span className="text-muted-foreground shrink-0">
              {s.startedAtLocal.slice(11, 16)} – {s.endedAtLocal.slice(11, 16)}
            </span>
          </div>
          <span className="text-muted-foreground shrink-0">→</span>
        </Link>
      ))}
      <Link
        href={`/history?goalId=${goal.id}`}
        className="inline-block text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
      >
        View all sessions for this goal →
      </Link>
    </div>
  )}
</div>
```

For each routine card, locate the existing routine rendering (it contains the routine title) and add a Start link button. The existing routine items are `<Link>` elements — wrap the title and add a Start button alongside:

Find the routine card structure (it wraps each routine in a Link or div). Add:
```tsx
<Link
  href={`/sessions/run?routineId=${routine.id}`}
  className="shrink-0 px-3 py-1 text-xs rounded-md bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
>
  ▶ Start
</Link>
```

Read the full goal-detail-client.tsx file to find the exact location and make minimal targeted edits.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add app/(app)/goals/[goalId]/page.tsx app/(app)/goals/[goalId]/_components/goal-detail-client.tsx
git commit -m "feat: add Start buttons and recent sessions to goal detail page"
```

---

### Task 16: History Calendar Component

**Files:**
- Create: `app/(app)/history/_components/history-calendar.tsx`

- [ ] **Step 1: Implement HistoryCalendar**

```tsx
// app/(app)/history/_components/history-calendar.tsx
"use client"

import { useState } from "react"
import { DayPicker } from "react-day-picker"
import { format, parseISO } from "date-fns"
import Link from "next/link"

type SessionSummary = {
  id: string
  routineTitle: string
  goalTitle: string
  startedAtLocal: string
  endedAtLocal: string
  localDate: string
}

interface HistoryCalendarProps {
  sessions: SessionSummary[]
}

export function HistoryCalendar({ sessions }: HistoryCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [month, setMonth] = useState<Date>(new Date())

  const sessionDates = new Set(sessions.map((s) => s.localDate))

  const sessionsForDay = selectedDate
    ? sessions.filter((s) => s.localDate === selectedDate)
    : []

  function handleDayClick(day: Date) {
    const str = format(day, "yyyy-MM-dd")
    setSelectedDate((prev) => (prev === str ? null : str))
  }

  return (
    <div className="space-y-6">
      <DayPicker
        month={month}
        onMonthChange={setMonth}
        onDayClick={handleDayClick}
        modifiers={{
          hasSession: (day) => sessionDates.has(format(day, "yyyy-MM-dd")),
          selected: (day) => format(day, "yyyy-MM-dd") === selectedDate,
        }}
        modifiersClassNames={{
          hasSession: "font-bold text-accent",
          selected: "bg-accent text-accent-foreground rounded-full",
        }}
        classNames={{
          root: "w-full",
          months: "w-full",
          month: "w-full space-y-3",
          caption: "flex items-center justify-between px-1",
          caption_label: "text-sm font-medium",
          nav: "flex items-center gap-1",
          nav_button: "p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground",
          table: "w-full border-collapse",
          head_row: "grid grid-cols-7",
          head_cell: "text-center text-xs text-muted-foreground py-1",
          row: "grid grid-cols-7",
          cell: "text-center",
          day: "w-9 h-9 mx-auto rounded-full flex items-center justify-center text-sm hover:bg-muted transition-colors cursor-pointer",
          day_outside: "opacity-30",
          day_disabled: "opacity-30 cursor-default",
        }}
      />

      {selectedDate && (
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Sessions on {format(parseISO(selectedDate), "d MMMM yyyy")}
          </p>
          {sessionsForDay.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sessions on this day.</p>
          ) : (
            <div className="space-y-1">
              {sessionsForDay.map((s) => (
                <Link
                  key={s.id}
                  href={`/history/${s.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-2.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-medium truncate">{s.routineTitle}</span>
                    <span className="text-muted-foreground shrink-0">
                      {s.startedAtLocal.slice(11, 16)} – {s.endedAtLocal.slice(11, 16)}
                    </span>
                    <span className="text-muted-foreground truncate">{s.goalTitle}</span>
                  </div>
                  <span className="text-muted-foreground shrink-0">→</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add app/(app)/history/_components/history-calendar.tsx
git commit -m "feat: add HistoryCalendar component with react-day-picker"
```

---

### Task 17: History Page and Session Detail Page

**Files:**
- Modify: `app/(app)/history/page.tsx`
- Create: `app/(app)/history/[sessionId]/page.tsx`
- Create: `app/(app)/history/[sessionId]/_components/delete-session-button.tsx`

- [ ] **Step 1: Replace the history page placeholder**

```tsx
// app/(app)/history/page.tsx
import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { HistoryCalendar } from "./_components/history-calendar"

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ goalId?: string }>
}) {
  const { goalId } = await searchParams
  const userId = await getUserId()
  if (!userId) notFound()

  const sessions = await db.practiceSession.findMany({
    where: {
      userId,
      ...(goalId ? { goalId } : {}),
    },
    orderBy: { startedAtLocal: "desc" },
    select: {
      id: true,
      routineTitle: true,
      goalTitle: true,
      goalId: true,
      startedAtLocal: true,
      endedAtLocal: true,
      localDate: true,
    },
  })

  // Distinct goals from all sessions (unfiltered) for the filter dropdown
  const allSessions = goalId
    ? await db.practiceSession.findMany({
        where: { userId },
        select: { goalId: true, goalTitle: true },
        distinct: ["goalId"],
      })
    : sessions

  const distinctGoals = [
    ...new Map(
      allSessions
        .filter((s) => s.goalId)
        .map((s) => [s.goalId, { id: s.goalId!, title: s.goalTitle }]),
    ).values(),
  ]

  return (
    <div className="pt-6 max-w-2xl">
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="text-2xl font-semibold">History</h1>
        {distinctGoals.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="goal-filter" className="text-muted-foreground text-xs">Filter by goal:</label>
            <select
              id="goal-filter"
              defaultValue={goalId ?? ""}
              onChange={(e) => {
                const val = (e.target as HTMLSelectElement).value
                window.location.href = val ? `/history?goalId=${val}` : "/history"
              }}
              className="rounded border border-border bg-card text-foreground text-xs px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">All goals</option>
              {distinctGoals.map((g) => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No sessions yet.{" "}
          <Link href="/" className="underline underline-offset-2 hover:text-foreground transition-colors">
            Start practising →
          </Link>
        </p>
      ) : (
        <HistoryCalendar sessions={sessions} />
      )}
    </div>
  )
}
```

**Note:** The `onChange` with `window.location.href` works but isn't ideal (full page reload). For a server component + URL-based filter, this is acceptable. The goal filter is a `<select>` that triggers navigation.

- [ ] **Step 2: Create DeleteSessionButton**

```tsx
// app/(app)/history/[sessionId]/_components/delete-session-button.tsx
"use client"

import { useState } from "react"
import { deleteSession } from "@/app/(app)/sessions/actions"

interface DeleteSessionButtonProps {
  sessionId: string
}

export function DeleteSessionButton({ sessionId }: DeleteSessionButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  if (confirming) {
    return (
      <div className="flex items-center gap-3 mt-4">
        <p className="text-sm text-muted-foreground">Are you sure? This cannot be undone.</p>
        <button
          onClick={async () => {
            setIsDeleting(true)
            await deleteSession(sessionId)
          }}
          disabled={isDeleting}
          className="text-sm text-destructive hover:underline disabled:opacity-50"
        >
          {isDeleting ? "Deleting…" : "Confirm delete"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="mt-4 text-sm text-muted-foreground hover:text-destructive transition-colors"
    >
      Delete session
    </button>
  )
}
```

- [ ] **Step 3: Create the session detail page**

```tsx
// app/(app)/history/[sessionId]/page.tsx
import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import { DeleteSessionButton } from "./_components/delete-session-button"
import { format, parseISO } from "date-fns"

const SECTION_TYPE_LABELS: Record<string, string> = {
  warmup: "Warm Up",
  technique: "Technique",
  muscle_memory: "Muscle Memory",
  theory: "Theory",
  lessons: "Lessons",
  songs: "Songs",
  free_practice: "Free Practice",
}

const SECTION_TYPE_COLORS: Record<string, string> = {
  warmup: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  technique: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  muscle_memory: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  theory: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  lessons: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  songs: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
  free_practice: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ")
}

function formatDuration(start: string, end: string): string {
  try {
    const diff = new Date(end.replace(" ", "T")).getTime() - new Date(start.replace(" ", "T")).getTime()
    const min = Math.round(diff / 60000)
    return `${min} min`
  } catch { return "" }
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params
  const userId = await getUserId()
  if (!userId) notFound()

  const session = await db.practiceSession.findUnique({
    where: { id: sessionId },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: { topics: true },
      },
    },
  })

  if (!session || session.userId !== userId) notFound()

  let formattedDate = session.localDate
  try {
    formattedDate = format(parseISO(session.localDate), "d MMMM yyyy")
  } catch { /* keep as-is */ }

  return (
    <div className="pt-6 max-w-2xl">
      <Link
        href="/history"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        ← Back to History
      </Link>

      <h1 className="text-2xl font-semibold mb-1">{session.routineTitle}</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {session.goalTitle} · {formattedDate} · {session.startedAtLocal.slice(11, 16)} – {session.endedAtLocal.slice(11, 16)}
        {" "}({formatDuration(session.startedAtLocal, session.endedAtLocal)})
      </p>

      <div className="space-y-4 mb-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Sections</p>
        {session.sections.map((s, i) => (
          <div key={s.id} className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{i + 1}. {s.title}</span>
              <span className="text-xs text-muted-foreground">({s.durationMinutes} min)</span>
              <span className={cn("text-xs px-1.5 py-0.5 rounded", SECTION_TYPE_COLORS[s.type])}>
                {SECTION_TYPE_LABELS[s.type] ?? s.type}
              </span>
            </div>
            {s.topics.map((t) => (
              <p key={t.id} className="text-sm text-muted-foreground ml-4">
                {t.displayName}
                {t.keys.length > 0 && t.keys[0] !== "*" && (
                  <> · Keys: {t.keys.join(", ")}</>
                )}
                {t.keys[0] === "*" && t.practiceMode && (
                  <> · All 12 keys ({t.practiceMode.replace(/_/g, " ")})</>
                )}
              </p>
            ))}
            {s.topics.length === 0 && (
              <p className="text-sm text-muted-foreground ml-4 italic">(no topic)</p>
            )}
          </div>
        ))}
      </div>

      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Notes</p>
        {session.notes ? (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{session.notes}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">(no notes recorded)</p>
        )}
      </div>

      <DeleteSessionButton sessionId={session.id} />
    </div>
  )
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: No new errors.

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add app/(app)/history/ app/(app)/sessions/actions.ts
git commit -m "feat: add history page, session detail page, and delete session functionality"
```

---

## Post-Implementation Verification

After all tasks are complete, perform these checks:

- [ ] **Run full test suite**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Check TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: No new errors introduced by this phase.

- [ ] **Start dev server and manually verify**

```bash
npm run dev
```

Verify manually:
1. Navigation order: Home → Goals → History → Library → Reference
2. "Guitar Practice" logo links to `/`
3. Home page shows active goal + routines with ▶ Start buttons
4. Streak counter appears after saving a session
5. `/sessions/run?routineId=<valid-id>` loads and the timer/flashcard work
6. Flashcard flips and shows reference panel
7. Metronome panel makes audible clicks
8. End session modal saves to DB
9. After save, redirects to session detail
10. History page shows calendar with session dots
11. Clicking a day with sessions lists them
12. Session detail renders sections, notes, delete button
13. Goal page shows Start buttons and recent sessions list

- [ ] **Final commit**

```bash
git add -A
git commit -m "feat: complete Phase 6 sessions and progress tracking"
```
