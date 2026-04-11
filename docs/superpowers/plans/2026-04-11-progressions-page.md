# Progressions Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a unified top-level `/progressions` page combining the Progression Analysis tool, My Progressions editor, and the Reference page's Progressions tab. Then remove those three sources.

**Architecture:** New page has three rows: (1) progression selector bar with dropdown/info/goal/pencil buttons, (2) two-column layout with editable chord tiles left + analysis panel right, (3) full-width Scales/Arpeggios/Chords/Inversions study tabs. Server actions moved from `reference/progressions/actions.ts` to `progressions/actions.ts`. `buildProgressionChords` utility moved to `lib/theory/`. Reference page's Progressions tab and My Progressions pages deleted. Progression Analysis tool deleted.

**Tech Stack:** React, Next.js 16 App Router, Tailwind v4, Prisma, @base-ui/react Dialog, dnd-kit, Vitest + React Testing Library

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/theory/build-progression-chords.ts` | Move from tools/_lib | Shared utility |
| `app/(app)/progressions/actions.ts` | Move+update from reference/progressions | CRUD server actions |
| `app/(app)/progressions/page.tsx` | Create | Server component, fetch user progressions |
| `app/(app)/progressions/_components/progressions-page-client.tsx` | Create | Main orchestrator: all state, layout |
| `app/(app)/progressions/_components/progression-selector.tsx` | Create | Dropdown + info/goal/pencil buttons |
| `app/(app)/progressions/_components/save-as-modal.tsx` | Create | "Save as..." dialog |
| `app/(app)/progressions/_components/edit-meta-modal.tsx` | Create | Pencil edit title/description dialog |
| `app/(app)/progressions/_components/delete-confirm-modal.tsx` | Create | Delete confirmation dialog |
| `components/layout/navbar-client.tsx` | Modify | Add Progressions after Reference |
| `components/layout/footer.tsx` | Modify | Add Progressions after Reference |
| `app/(app)/reference/_components/harmony-study.tsx` | Modify | Remove Progressions tab, show HarmonyTab directly |
| `app/(app)/reference/page.tsx` | Modify | Remove userProgressions fetch |
| `app/(app)/reference/_components/reference-page-client.tsx` | Modify | Remove userProgressions prop/state |
| `app/(app)/tools/page.tsx` | Modify | Remove Progression Analysis tile |
| `app/(app)/reference/progressions/` | Delete | Entire directory |
| `app/(app)/tools/progression-analysis/` | Delete | Entire directory |

---

### Task 1: Move buildProgressionChords to lib/theory

**Files:**
- Move: `app/(app)/tools/progression-analysis/_lib/build-progression-chords.ts` → `lib/theory/build-progression-chords.ts`
- Move: `__tests__/tools/build-progression-chords.test.ts` → `__tests__/theory/build-progression-chords.test.ts`
- Modify: `app/(app)/tools/progression-analysis/_components/analyser-client.tsx` (update import)

- [ ] **Step 1: Move the utility file**

```bash
cp "app/(app)/tools/progression-analysis/_lib/build-progression-chords.ts" "lib/theory/build-progression-chords.ts"
```

The file content is unchanged — just the path changes.

- [ ] **Step 2: Move the test file**

```bash
cp "__tests__/tools/build-progression-chords.test.ts" "__tests__/theory/build-progression-chords.test.ts"
```

Update the import at the top of the test from:
```ts
import { buildProgressionChords } from "@/app/(app)/tools/progression-analysis/_lib/build-progression-chords"
```
to:
```ts
import { buildProgressionChords } from "@/lib/theory/build-progression-chords"
```

- [ ] **Step 3: Update analyser-client.tsx import**

Change line 13 in `analyser-client.tsx`:
```ts
// Before:
import { buildProgressionChords } from "../_lib/build-progression-chords"
// After:
import { buildProgressionChords } from "@/lib/theory/build-progression-chords"
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run __tests__/theory/build-progression-chords.test.ts`
Expected: All tests pass.

- [ ] **Step 5: Delete old files**

```bash
rm "app/(app)/tools/progression-analysis/_lib/build-progression-chords.ts"
rm "__tests__/tools/build-progression-chords.test.ts"
rmdir "app/(app)/tools/progression-analysis/_lib" 2>/dev/null || true
```

- [ ] **Step 6: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: move buildProgressionChords to lib/theory"
```

---

### Task 2: Move server actions to /progressions/actions.ts

**Files:**
- Create: `app/(app)/progressions/actions.ts`
- Modify: `app/(app)/reference/progressions/_components/progression-form.tsx` (update import)
- Modify: `app/(app)/reference/progressions/_components/user-progression-card.tsx` (update import)
- Modify: `app/(app)/reference/progressions/_components/user-progression-list.tsx` (update import)
- Modify: `app/(app)/tools/progression-analysis/_components/save-modal.tsx` (update import)

- [ ] **Step 1: Create app/(app)/progressions/actions.ts**

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

function revalidate() {
  revalidatePath("/progressions")
  revalidatePath("/reference/progressions")
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
        await tx.userProgression.update({ where: { id: remaining[i]!.id }, data: { order: i } })
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
    revalidatePath("/progressions")
    revalidatePath("/reference/progressions")
    return { success: true }
  } catch {
    return { error: "Failed to reorder progressions" }
  }
}
```

- [ ] **Step 2: Update imports in four files**

In each of these files, change the import path from `@/app/(app)/reference/progressions/actions` to `@/app/(app)/progressions/actions`:

- `app/(app)/reference/progressions/_components/progression-form.tsx` line ~10
- `app/(app)/reference/progressions/_components/user-progression-card.tsx`
- `app/(app)/reference/progressions/_components/user-progression-list.tsx`
- `app/(app)/tools/progression-analysis/_components/save-modal.tsx`

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: move progression actions to /progressions/actions.ts"
```

---

### Task 3: Create ProgressionSelector component

**Files:**
- Create: `app/(app)/progressions/_components/progression-selector.tsx`
- Create: `__tests__/progressions/progression-selector.test.tsx`

- [ ] **Step 1: Write tests**

Create `__tests__/progressions/progression-selector.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ProgressionSelector } from "@/app/(app)/progressions/_components/progression-selector"

vi.mock("@/lib/theory", () => ({
  listProgressions: () => [
    {
      name: "pop-standard",
      displayName: "Pop Axis",
      category: "Pop",
      romanDisplay: "I – V – vi – IV",
      examples: "Let It Be",
      notes: "Very common",
      description: "",
      mode: "major",
      recommendedScaleType: "Major Scale",
      degrees: ["I", "V", "vi", "IV"],
    },
  ],
  getProgression: () => [],
}))

vi.mock("@/components/add-to-goal-button", () => ({
  AddToGoalButton: () => <button>+</button>,
}))

const baseProps = {
  selected: "pop-standard",
  tonic: "C",
  userProgressions: [],
  onSelectionChange: vi.fn(),
  onEditMeta: vi.fn(),
}

describe("ProgressionSelector", () => {
  it("renders dropdown with progression option", () => {
    render(<ProgressionSelector {...baseProps} />)
    expect(screen.getByRole("combobox", { name: /progression/i })).toBeInTheDocument()
    expect(screen.getByText(/Pop Axis/)).toBeInTheDocument()
  })

  it("does not show My Progressions optgroup when no user progressions", () => {
    render(<ProgressionSelector {...baseProps} />)
    expect(screen.queryByText("My Progressions")).not.toBeInTheDocument()
  })

  it("shows My Progressions optgroup when user has progressions", () => {
    render(
      <ProgressionSelector
        {...baseProps}
        userProgressions={[{ id: "u1", displayName: "My Blues", mode: "major", degrees: ["I", "IV"], description: "" }]}
      />
    )
    expect(screen.getByText("My Progressions")).toBeInTheDocument()
    expect(screen.getByText("My Blues")).toBeInTheDocument()
  })

  it("calls onSelectionChange when dropdown changes", () => {
    const onSelectionChange = vi.fn()
    render(<ProgressionSelector {...baseProps} onSelectionChange={onSelectionChange} />)
    fireEvent.change(screen.getByRole("combobox", { name: /progression/i }), { target: { value: "pop-standard" } })
    expect(onSelectionChange).toHaveBeenCalledWith("pop-standard")
  })

  it("does not show pencil button for built-in progression", () => {
    render(<ProgressionSelector {...baseProps} selected="pop-standard" />)
    expect(screen.queryByRole("button", { name: /edit progression/i })).not.toBeInTheDocument()
  })

  it("shows pencil button for custom progression", () => {
    render(
      <ProgressionSelector
        {...baseProps}
        selected="u1"
        userProgressions={[{ id: "u1", displayName: "My Blues", mode: "major", degrees: ["I", "IV"], description: "" }]}
      />
    )
    expect(screen.getByRole("button", { name: /edit progression/i })).toBeInTheDocument()
  })

  it("calls onEditMeta when pencil clicked", () => {
    const onEditMeta = vi.fn()
    render(
      <ProgressionSelector
        {...baseProps}
        selected="u1"
        onEditMeta={onEditMeta}
        userProgressions={[{ id: "u1", displayName: "My Blues", mode: "major", degrees: ["I", "IV"], description: "" }]}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /edit progression/i }))
    expect(onEditMeta).toHaveBeenCalled()
  })

  it("shows info popover when ? button clicked", () => {
    render(<ProgressionSelector {...baseProps} />)
    fireEvent.click(screen.getByRole("button", { name: /progression info/i }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("closes info popover when ? button clicked again", () => {
    render(<ProgressionSelector {...baseProps} />)
    fireEvent.click(screen.getByRole("button", { name: /progression info/i }))
    fireEvent.click(screen.getByRole("button", { name: /progression info/i }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run __tests__/progressions/progression-selector.test.tsx`
Expected: FAIL — component doesn't exist yet.

- [ ] **Step 3: Implement ProgressionSelector**

Create `app/(app)/progressions/_components/progression-selector.tsx`:

```tsx
"use client"

import { useState, useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import { listProgressions } from "@/lib/theory"
import { AddToGoalButton } from "@/components/add-to-goal-button"
import { cn } from "@/lib/utils"
import type { UserProgressionForTab } from "@/app/(app)/reference/_components/reference-page-client"

const CATEGORY_ORDER = ["Pop", "Blues", "Jazz", "Rock", "Folk / Country", "Classical / Modal"]

interface ProgressionSelectorProps {
  selected: string
  tonic: string
  userProgressions: UserProgressionForTab[]
  onSelectionChange: (selected: string) => void
  onEditMeta: () => void
}

export function ProgressionSelector({
  selected,
  tonic,
  userProgressions,
  onSelectionChange,
  onEditMeta,
}: ProgressionSelectorProps) {
  const [infoOpen, setInfoOpen] = useState(false)
  const infoRef = useRef<HTMLDivElement>(null)

  const builtinProgressions = listProgressions()
  const builtinProg = builtinProgressions.find(p => p.name === selected)
  const userProg = userProgressions.find(p => p.id === selected)
  const isCustom = !!userProg

  const romanDisplay = userProg
    ? userProg.degrees.join(" – ")
    : builtinProg?.romanDisplay ?? ""

  const grouped = CATEGORY_ORDER.map(cat => ({
    category: cat,
    items: builtinProgressions.filter(p => p.category === cat),
  })).filter(g => g.items.length > 0)

  // Close info popover on click-outside or Escape
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

  return (
    <div className="flex items-center gap-3 flex-wrap">
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
        onChange={e => onSelectionChange(e.target.value)}
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
      {isCustom ? (
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
            className="absolute left-0 top-8 z-20 w-72 rounded-lg border border-border bg-card shadow-lg p-4 space-y-3"
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

      {/* Pencil — only for custom progressions */}
      {isCustom && (
        <button
          type="button"
          aria-label="Edit progression"
          onClick={onEditMeta}
          className="flex items-center justify-center w-6 h-6 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
            <path d="m15 5 4 4"/>
          </svg>
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npx vitest run __tests__/progressions/progression-selector.test.tsx`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add ProgressionSelector component"
```

---

### Task 4: Create modal components

**Files:**
- Create: `app/(app)/progressions/_components/save-as-modal.tsx`
- Create: `app/(app)/progressions/_components/edit-meta-modal.tsx`
- Create: `app/(app)/progressions/_components/delete-confirm-modal.tsx`
- Create: `__tests__/progressions/modals.test.tsx`

- [ ] **Step 1: Write tests**

Create `__tests__/progressions/modals.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { SaveAsModal } from "@/app/(app)/progressions/_components/save-as-modal"
import { EditMetaModal } from "@/app/(app)/progressions/_components/edit-meta-modal"
import { DeleteConfirmModal } from "@/app/(app)/progressions/_components/delete-confirm-modal"

vi.mock("@/app/(app)/progressions/actions", () => ({
  createUserProgression: vi.fn(),
  updateUserProgression: vi.fn(),
  deleteUserProgression: vi.fn(),
}))

vi.mock("@/lib/theory/key-finder", () => ({
  parseChord: vi.fn((s: string) => ({ root: s, type: "", symbol: s })),
  analyzeChordInKey: vi.fn(() => null),
  applyFunctionalRomanOverrides: vi.fn((a: unknown[]) => a),
}))

vi.mock("@/lib/theory/transposer", () => ({
  analyzeProgression: vi.fn(() => [{ roman: "I", degree: 1, role: "diatonic", score: 1, inputChord: { root: "C", type: "maj7", symbol: "Cmaj7" } }]),
}))

import { createUserProgression, updateUserProgression, deleteUserProgression } from "@/app/(app)/progressions/actions"

// ─── SaveAsModal ────────────────────────────────────────────────────────────

describe("SaveAsModal", () => {
  const onClose = vi.fn()
  const onSaved = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders with default title and description", () => {
    render(
      <SaveAsModal
        defaultTitle="Pop Axis"
        defaultDescription="A common pop progression"
        parsedChords={[]}
        tonic="C"
        modeName="major"
        onClose={onClose}
        onSaved={onSaved}
      />
    )
    expect(screen.getByDisplayValue("Pop Axis")).toBeInTheDocument()
    expect(screen.getByDisplayValue("A common pop progression")).toBeInTheDocument()
  })

  it("shows error when title is empty on save", async () => {
    render(
      <SaveAsModal
        defaultTitle=""
        defaultDescription=""
        parsedChords={[]}
        tonic="C"
        modeName="major"
        onClose={onClose}
        onSaved={onSaved}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    expect(await screen.findByText(/title is required/i)).toBeInTheDocument()
    expect(createUserProgression).not.toHaveBeenCalled()
  })

  it("calls createUserProgression and onSaved on success", async () => {
    vi.mocked(createUserProgression).mockResolvedValue({ success: true, id: "new-id" })
    render(
      <SaveAsModal
        defaultTitle="My Progression"
        defaultDescription=""
        parsedChords={[{ root: "C", type: "maj7", symbol: "Cmaj7" }]}
        tonic="C"
        modeName="major"
        onClose={onClose}
        onSaved={onSaved}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("new-id"))
  })

  it("calls onClose when Cancel clicked", () => {
    render(
      <SaveAsModal
        defaultTitle="Pop Axis"
        defaultDescription=""
        parsedChords={[]}
        tonic="C"
        modeName="major"
        onClose={onClose}
        onSaved={onSaved}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })
})

// ─── EditMetaModal ──────────────────────────────────────────────────────────

describe("EditMetaModal", () => {
  const onClose = vi.fn()
  const onSaved = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders with current title and description", () => {
    render(
      <EditMetaModal
        progressionId="p1"
        currentTitle="My Blues"
        currentDescription="A blues progression"
        onClose={onClose}
        onSaved={onSaved}
      />
    )
    expect(screen.getByDisplayValue("My Blues")).toBeInTheDocument()
    expect(screen.getByDisplayValue("A blues progression")).toBeInTheDocument()
  })

  it("calls updateUserProgression with new title and description on save", async () => {
    vi.mocked(updateUserProgression).mockResolvedValue({ success: true })
    render(
      <EditMetaModal
        progressionId="p1"
        currentTitle="My Blues"
        currentDescription=""
        onClose={onClose}
        onSaved={onSaved}
      />
    )
    fireEvent.change(screen.getByDisplayValue("My Blues"), { target: { value: "Updated Blues" } })
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(updateUserProgression).toHaveBeenCalledWith("p1", {
      displayName: "Updated Blues",
      description: "",
    })
  })

  it("calls onClose when Cancel clicked", () => {
    render(
      <EditMetaModal
        progressionId="p1"
        currentTitle="My Blues"
        currentDescription=""
        onClose={onClose}
        onSaved={onSaved}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })
})

// ─── DeleteConfirmModal ──────────────────────────────────────────────────────

describe("DeleteConfirmModal", () => {
  const onClose = vi.fn()
  const onDeleted = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows progression title in confirmation text", () => {
    render(
      <DeleteConfirmModal
        progressionId="p1"
        progressionTitle="My Blues"
        onClose={onClose}
        onDeleted={onDeleted}
      />
    )
    expect(screen.getByText(/my blues/i)).toBeInTheDocument()
  })

  it("calls deleteUserProgression and onDeleted on confirm", async () => {
    vi.mocked(deleteUserProgression).mockResolvedValue({ success: true })
    render(
      <DeleteConfirmModal
        progressionId="p1"
        progressionTitle="My Blues"
        onClose={onClose}
        onDeleted={onDeleted}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /delete/i }))
    await waitFor(() => expect(onDeleted).toHaveBeenCalled())
    expect(deleteUserProgression).toHaveBeenCalledWith("p1")
  })

  it("calls onClose when Cancel clicked", () => {
    render(
      <DeleteConfirmModal
        progressionId="p1"
        progressionTitle="My Blues"
        onClose={onClose}
        onDeleted={onDeleted}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run __tests__/progressions/modals.test.tsx`
Expected: FAIL — components don't exist.

- [ ] **Step 3: Implement SaveAsModal**

Create `app/(app)/progressions/_components/save-as-modal.tsx`:

```tsx
"use client"

import { useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { createUserProgression } from "@/app/(app)/progressions/actions"
import { analyzeProgression } from "@/lib/theory/transposer"
import { btn } from "@/lib/button-styles"
import type { InputChord } from "@/lib/theory/key-finder"

interface SaveAsModalProps {
  defaultTitle: string
  defaultDescription: string
  parsedChords: InputChord[]
  tonic: string
  modeName: string
  onClose: () => void
  onSaved: (newId: string) => void
}

export function SaveAsModal({
  defaultTitle,
  defaultDescription,
  parsedChords,
  tonic,
  modeName,
  onClose,
  onSaved,
}: SaveAsModalProps) {
  const [title, setTitle] = useState(defaultTitle)
  const [description, setDescription] = useState(defaultDescription)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!title.trim()) { setError("Title is required"); return }
    setIsSaving(true)
    setError(null)
    const analyses = parsedChords.length > 0
      ? analyzeProgression(parsedChords, tonic, modeName)
      : []
    const degrees = analyses.map((a, i) => `${a.roman}:${parsedChords[i]!.type}`)
    const result = await createUserProgression({
      displayName: title.trim(),
      description,
      mode: modeName,
      degrees,
    })
    setIsSaving(false)
    if ("error" in result) { setError(result.error); return }
    onSaved(result.id)
  }

  return (
    <Dialog.Root open onOpenChange={open => { if (!open) onClose() }} disablePointerDismissal={isSaving}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-[51] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-xl transition duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0">
          <div className="space-y-4">
            <Dialog.Title className="text-sm font-semibold">Save as new progression</Dialog.Title>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Title</label>
              <input
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Description <span className="text-muted-foreground/60">(Markdown, optional)</span></label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-y"
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className={btn("primary", "sm")}
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
              <Dialog.Close disabled={isSaving} className={btn("standalone", "sm")}>
                Cancel
              </Dialog.Close>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

- [ ] **Step 4: Implement EditMetaModal**

Create `app/(app)/progressions/_components/edit-meta-modal.tsx`:

```tsx
"use client"

import { useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { updateUserProgression } from "@/app/(app)/progressions/actions"
import { btn } from "@/lib/button-styles"

interface EditMetaModalProps {
  progressionId: string
  currentTitle: string
  currentDescription: string
  onClose: () => void
  onSaved: () => void
}

export function EditMetaModal({
  progressionId,
  currentTitle,
  currentDescription,
  onClose,
  onSaved,
}: EditMetaModalProps) {
  const [title, setTitle] = useState(currentTitle)
  const [description, setDescription] = useState(currentDescription)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!title.trim()) { setError("Title is required"); return }
    setIsSaving(true)
    const result = await updateUserProgression(progressionId, {
      displayName: title.trim(),
      description,
    })
    setIsSaving(false)
    if ("error" in result) { setError(result.error); return }
    onSaved()
  }

  return (
    <Dialog.Root open onOpenChange={open => { if (!open) onClose() }} disablePointerDismissal={isSaving}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-[51] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-xl transition duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0">
          <div className="space-y-4">
            <Dialog.Title className="text-sm font-semibold">Edit progression</Dialog.Title>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Title</label>
              <input
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Description <span className="text-muted-foreground/60">(Markdown, optional)</span></label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-y"
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className={btn("primary", "sm")}
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
              <Dialog.Close disabled={isSaving} className={btn("standalone", "sm")}>
                Cancel
              </Dialog.Close>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

- [ ] **Step 5: Implement DeleteConfirmModal**

Create `app/(app)/progressions/_components/delete-confirm-modal.tsx`:

```tsx
"use client"

import { useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { deleteUserProgression } from "@/app/(app)/progressions/actions"
import { btn } from "@/lib/button-styles"

interface DeleteConfirmModalProps {
  progressionId: string
  progressionTitle: string
  onClose: () => void
  onDeleted: () => void
}

export function DeleteConfirmModal({
  progressionId,
  progressionTitle,
  onClose,
  onDeleted,
}: DeleteConfirmModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setIsDeleting(true)
    setError(null)
    const result = await deleteUserProgression(progressionId)
    if ("error" in result) {
      setError(result.error)
      setIsDeleting(false)
    } else {
      onDeleted()
    }
  }

  return (
    <Dialog.Root open onOpenChange={open => { if (!open) onClose() }} disablePointerDismissal={isDeleting}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-[51] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-xl transition duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0">
          <div className="space-y-4">
            <Dialog.Title className="text-sm font-semibold">Delete progression?</Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              <span className="font-bold text-foreground">{progressionTitle}</span> will be permanently deleted. This cannot be undone.
            </Dialog.Description>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className={btn("destructive", "sm")}
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
              <Dialog.Close disabled={isDeleting} className={btn("standalone", "sm")}>
                Cancel
              </Dialog.Close>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

- [ ] **Step 6: Run tests to confirm they pass**

Run: `npx vitest run __tests__/progressions/modals.test.tsx`
Expected: PASS (9 tests).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add SaveAsModal, EditMetaModal, DeleteConfirmModal"
```

---

### Task 5: Create the Progressions page

**Files:**
- Create: `app/(app)/progressions/page.tsx`
- Create: `app/(app)/progressions/_components/progressions-page-client.tsx`
- Create: `__tests__/progressions/progressions-page-client.test.tsx`

**Key design decisions:**
- When `selected` changes → reload chords from progression in current key; update mode from progression
- When `key` changes → keep current chords, re-analyze in new key (same as Analyser tool)
- Clicking a chord tile → selects it (shows analysis panel) AND updates bottom study panels (panelRoot, chord/arpeggio/inversion/scale type triggers)
- Clicking a scale in SoloScalesPanel → switches bottom panel to Scales tab and updates it
- `handleSave()` → converts parsedChords + displayAnalyses to `"roman:type"` degrees, calls `updateUserProgression`
- After save-as → sets `selected` to the new progression id
- After delete → sets `selected` to `"pop-standard"`
- Over the whole progression recommendation → shown in right column when no chord selected

- [ ] **Step 1: Write tests**

Create `__tests__/progressions/progressions-page-client.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { ProgressionsPageClient } from "@/app/(app)/progressions/_components/progressions-page-client"

vi.mock("@/lib/theory", () => ({
  listProgressions: () => [
    {
      name: "pop-standard",
      displayName: "Pop Axis",
      category: "Pop",
      romanDisplay: "I – V – vi – IV",
      examples: "Let It Be",
      notes: "Very common",
      description: "",
      mode: "major",
      recommendedScaleType: "Major Scale",
      degrees: ["I", "V", "vi", "IV"],
    },
  ],
  getProgression: () => [
    { roman: "I", nashville: "1", tonic: "C", type: "maj7", quality: "major", degree: 1 },
    { roman: "V", nashville: "5", tonic: "G", type: "7",    quality: "dominant", degree: 5 },
  ],
  getSubstitutions: () => [],
  getSoloScales: () => ({ chordTonic: "C", primary: { scaleName: "Ionian (major)" }, additional: [] }),
  analyzeFunctionalContext: () => ({}),
  INVERSION_TYPES: [],
}))

vi.mock("@/lib/theory/transposer", () => ({
  analyzeProgression: () => [],
}))

vi.mock("@/lib/theory/key-finder", () => ({
  parseChord: vi.fn((s: string) => s ? { root: s[0], type: s.slice(1), symbol: s } : null),
  applyFunctionalRomanOverrides: vi.fn((a: unknown[]) => a),
  analyzeChordInKey: vi.fn(() => null),
}))

vi.mock("@/lib/theory/build-progression-chords", () => ({
  buildProgressionChords: vi.fn(() => [
    { roman: "I", nashville: "1", tonic: "C", type: "maj7", quality: "major", degree: 1 },
  ]),
}))

vi.mock("@/lib/theory/user-progressions", () => ({
  getUserProgressionChords: vi.fn(() => []),
}))

vi.mock("@/lib/theory/commonality-tiers", () => ({
  ALL_KEY_MODES: [{ modeName: "major", displayName: "Major (Ionian)", tier: 1 }],
}))

vi.mock("@/app/(app)/tools/_components/chord-input-row", () => ({
  ChordInputRow: () => <div data-testid="chord-input-row" />,
}))

vi.mock("@/app/(app)/progressions/_components/progression-selector", () => ({
  ProgressionSelector: ({ selected }: { selected: string }) => (
    <div data-testid="progression-selector">{selected}</div>
  ),
}))

vi.mock("@/app/(app)/reference/_components/substitutions-panel", () => ({
  SubstitutionsPanel: () => <div data-testid="substitutions-panel" />,
}))

vi.mock("@/app/(app)/reference/_components/solo-scales-panel", () => ({
  SoloScalesPanel: () => <div data-testid="solo-scales-panel" />,
}))

vi.mock("@/app/(app)/reference/_components/scale-panel", () => ({
  ScalePanel: () => <div data-testid="scale-panel" />,
}))

vi.mock("@/app/(app)/reference/_components/arpeggio-panel", () => ({
  ArpeggioPanel: () => <div data-testid="arpeggio-panel" />,
}))

vi.mock("@/app/(app)/reference/_components/chord-panel", () => ({
  ChordPanel: () => <div data-testid="chord-panel" />,
}))

vi.mock("@/app/(app)/reference/_components/inversion-panel", () => ({
  InversionPanel: () => <div data-testid="inversion-panel" />,
}))

vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({ attributes: {}, listeners: {}, setNodeRef: vi.fn(), transform: null, transition: null, isDragging: false }),
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  verticalListSortingStrategy: {},
  sortableKeyboardCoordinates: {},
  arrayMove: (arr: unknown[], from: number, to: number) => arr,
}))

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PointerSensor: class {},
  KeyboardSensor: class {},
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
  closestCenter: vi.fn(),
}))

describe("ProgressionsPageClient", () => {
  it("renders heading and progression selector", () => {
    render(<ProgressionsPageClient userProgressions={[]} />)
    expect(screen.getByRole("heading", { name: /progressions/i })).toBeInTheDocument()
    expect(screen.getByTestId("progression-selector")).toBeInTheDocument()
  })

  it("renders key and mode selectors", () => {
    render(<ProgressionsPageClient userProgressions={[]} />)
    expect(screen.getByRole("combobox", { name: /key/i })).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: /mode/i })).toBeInTheDocument()
  })

  it("renders chord input row", () => {
    render(<ProgressionsPageClient userProgressions={[]} />)
    expect(screen.getByTestId("chord-input-row")).toBeInTheDocument()
  })

  it("hides Save button for standard (built-in) progression", () => {
    render(<ProgressionsPageClient userProgressions={[]} />)
    expect(screen.queryByRole("button", { name: /^save$/i })).not.toBeInTheDocument()
  })

  it("shows Save as button as primary for standard progression", () => {
    render(<ProgressionsPageClient userProgressions={[]} />)
    expect(screen.getByRole("button", { name: /save as/i })).toBeInTheDocument()
  })

  it("shows all three buttons for custom progression", () => {
    const userProgs = [{ id: "u1", displayName: "My Blues", mode: "major", degrees: ["I", "IV"], description: "" }]
    render(<ProgressionsPageClient userProgressions={userProgs} initialSelected="u1" />)
    expect(screen.getByRole("button", { name: /^save$/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /save as/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument()
  })

  it("renders Scales tab panel by default in study section", () => {
    render(<ProgressionsPageClient userProgressions={[]} />)
    expect(screen.getByTestId("scale-panel")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run __tests__/progressions/progressions-page-client.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Create the server page**

Create `app/(app)/progressions/page.tsx`:

```tsx
import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"
import { ProgressionsPageClient } from "./_components/progressions-page-client"
import type { UserProgressionForTab } from "@/app/(app)/reference/_components/reference-page-client"

export default async function ProgressionsPage() {
  const userId = await getUserId()

  const userProgressions: UserProgressionForTab[] = userId
    ? await db.userProgression.findMany({
        where: { userId },
        orderBy: { order: "asc" },
        select: { id: true, displayName: true, mode: true, degrees: true, description: true },
      })
    : []

  return <ProgressionsPageClient userProgressions={userProgressions} />
}
```

- [ ] **Step 4: Implement ProgressionsPageClient**

Create `app/(app)/progressions/_components/progressions-page-client.tsx`:

```tsx
"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { parseChord, applyFunctionalRomanOverrides, analyzeChordInKey } from "@/lib/theory/key-finder"
import { analyzeProgression } from "@/lib/theory/transposer"
import { listProgressions, getProgression, getSubstitutions, getSoloScales, analyzeFunctionalContext, INVERSION_TYPES } from "@/lib/theory"
import type { FunctionalAnalysis, ChordContext } from "@/lib/theory"
import { getUserProgressionChords } from "@/lib/theory/user-progressions"
import { ALL_KEY_MODES } from "@/lib/theory/commonality-tiers"
import { buildProgressionChords } from "@/lib/theory/build-progression-chords"
import { targetDegreeFromRoman } from "@/app/(app)/reference/_components/chord-quality-block"
import { ChordInputRow, type PreviewTile } from "@/app/(app)/tools/_components/chord-input-row"
import { SubstitutionsPanel } from "@/app/(app)/reference/_components/substitutions-panel"
import { SoloScalesPanel } from "@/app/(app)/reference/_components/solo-scales-panel"
import { ScalePanel } from "@/app/(app)/reference/_components/scale-panel"
import { ArpeggioPanel } from "@/app/(app)/reference/_components/arpeggio-panel"
import { ChordPanel } from "@/app/(app)/reference/_components/chord-panel"
import { InversionPanel } from "@/app/(app)/reference/_components/inversion-panel"
import { ProgressionSelector } from "./progression-selector"
import { SaveAsModal } from "./save-as-modal"
import { EditMetaModal } from "./edit-meta-modal"
import { DeleteConfirmModal } from "./delete-confirm-modal"
import { updateUserProgression } from "@/app/(app)/progressions/actions"
import { btn } from "@/lib/button-styles"
import { cn } from "@/lib/utils"
import { Scale } from "tonal"
import { SCALE_TONAL_NAMES } from "@/lib/theory/solo-scales"
import type { ChordSubstitution, PreviewChord, ProgressionChord } from "@/lib/theory/types"
import type { UserProgressionForTab } from "@/app/(app)/reference/_components/reference-page-client"

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
  "bg-card border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"

type ChordEntry = { id: string; symbol: string }
type PanelTab = "scales" | "arpeggios" | "chords" | "inversions"

const PANEL_TABS: { id: PanelTab; label: string }[] = [
  { id: "scales",     label: "Scales" },
  { id: "arpeggios",  label: "Arpeggios" },
  { id: "chords",     label: "Chords" },
  { id: "inversions", label: "Inversions" },
]

const QUALITY_TO_INVERSION_TYPE: Record<string, string> = {
  major: "major", minor: "minor", dominant: "major", diminished: "dim", augmented: "aug",
}

const SOLO_SCALE_TO_PANEL_TYPE: Record<string, string> = {
  "Ionian (major)": "Major", "Dorian": "Dorian", "Phrygian": "Phrygian",
  "Lydian": "Lydian", "Mixolydian": "Mixolydian", "Aeolian (natural minor)": "Aeolian",
  "Locrian": "Locrian", "Major Pentatonic": "Pentatonic Major", "Minor Pentatonic": "Pentatonic Minor",
  "Blues Scale": "Blues", "Locrian #2": "Locrian #2", "Altered": "Altered",
  "Lydian Dominant": "Lydian Dominant", "Lydian Augmented": "Lydian Augmented",
  "Phrygian Dominant": "Phrygian Dominant", "Bebop Dominant": "Bebop Dominant",
  "Melodic Minor": "Melodic Minor", "Harmonic Minor": "Harmonic Minor",
  "Diminished Half-Whole": "Diminished Half-Whole", "Dorian b2": "Dorian b2",
  "Mixolydian b6": "Mixolydian b6", "Locrian #6": "Locrian #6",
  "Ionian #5": "Ionian #5", "Dorian #4": "Dorian #4", "Lydian #2": "Lydian #2",
  "Altered Diminished": "Altered Diminished",
}

const MODE_TO_SOLO_SCALE_NAME: Record<string, string> = {
  ionian: "Ionian (major)", major: "Ionian (major)", dorian: "Dorian",
  phrygian: "Phrygian", lydian: "Lydian", mixolydian: "Mixolydian",
  aeolian: "Aeolian (natural minor)", minor: "Aeolian (natural minor)", locrian: "Locrian",
  "melodic minor": "Melodic Minor", "harmonic minor": "Harmonic Minor",
  "dorian b2": "Dorian b2", "lydian augmented": "Lydian Augmented",
  "lydian dominant": "Lydian Dominant", "mixolydian b6": "Mixolydian b6",
  "locrian #2": "Locrian #2", altered: "Altered",
}

// Preview helpers
function chordToPreview(c: ProgressionChord): PreviewChord {
  return { tonic: c.tonic, type: c.type, roman: c.roman, quality: c.quality, degree: c.degree }
}

function applyPreview(
  chords: ProgressionChord[],
  sub: ChordSubstitution,
): { previewChords: PreviewChord[]; highlightIndices: Set<number> } {
  const base = chords.map(chordToPreview)
  const { result } = sub
  if (result.kind === "replacement") {
    const preview = [...base]
    const indices = new Set<number>()
    for (const { index, chord } of result.replacements) { preview[index] = chord; indices.add(index) }
    return { previewChords: preview, highlightIndices: indices }
  }
  if (result.kind === "insertion") {
    const preview = [...base.slice(0, result.insertBefore), ...result.chords, ...base.slice(result.insertBefore)]
    const indices = new Set(Array.from({ length: result.chords.length + 1 }, (_, i) => result.insertBefore + i))
    return { previewChords: preview, highlightIndices: indices }
  }
  const preview = [...base.slice(0, result.startIndex), ...result.chords, ...base.slice(result.endIndex + 1)]
  const indices = new Set(Array.from({ length: result.chords.length }, (_, i) => result.startIndex + i))
  return { previewChords: preview, highlightIndices: indices }
}

interface ProgressionsPageClientProps {
  userProgressions: UserProgressionForTab[]
  initialSelected?: string
}

export function ProgressionsPageClient({ userProgressions, initialSelected }: ProgressionsPageClientProps) {
  // ── Progression selection ──────────────────────────────────────────────────
  const [selected, setSelected] = useState(initialSelected ?? "pop-standard")

  // ── Analysis state ─────────────────────────────────────────────────────────
  const [key, setKey]         = useState("C")
  const [modeIdx, setModeIdx] = useState(0)
  const [chords, setChords]   = useState<ChordEntry[]>([])
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [previewedSub, setPreviewedSub]   = useState<ChordSubstitution | null>(null)
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<"substitutions" | "soloing">("substitutions")

  // ── Study panel state ──────────────────────────────────────────────────────
  const [activeStudyTab, setActiveStudyTab]                 = useState<PanelTab>("scales")
  const [panelRoot, setPanelRoot]                           = useState("C")
  const [panelScaleTypeTrigger, setPanelScaleTypeTrigger]   = useState<{ type: string } | null>(null)
  const [panelChordTypeTrigger, setPanelChordTypeTrigger]   = useState<{ type: string } | null>(null)
  const [panelArpeggioTypeTrigger, setPanelArpeggioTypeTrigger] = useState<{ type: string } | null>(null)
  const [panelInversionTypeTrigger, setPanelInversionTypeTrigger] = useState<{ type: string } | null>(null)

  // ── Modal state ────────────────────────────────────────────────────────────
  const [saveAsModalOpen, setSaveAsModalOpen]     = useState(false)
  const [editMetaModalOpen, setEditMetaModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen]     = useState(false)
  const [isSaving, setIsSaving]                   = useState(false)
  const [saveError, setSaveError]                 = useState<string | null>(null)

  // ── Derived ────────────────────────────────────────────────────────────────
  const mode             = ALL_KEY_MODES[modeIdx]!
  const builtinProgressions = useMemo(() => listProgressions(), [])
  const builtinProg      = builtinProgressions.find(p => p.name === selected)
  const userProg         = userProgressions.find(p => p.id === selected)
  const isCustom         = !!userProg

  // ── Load chords when selection changes ─────────────────────────────────────
  useEffect(() => {
    const rawChords = userProg
      ? getUserProgressionChords(userProg.degrees, userProg.mode, key)
      : getProgression(selected, key)

    setChords(rawChords.map(c => ({ id: crypto.randomUUID(), symbol: `${c.tonic}${c.type}` })))

    // Sync mode from progression
    const progModeName = userProg?.mode ?? builtinProg?.mode ?? "major"
    const newModeIdx = ALL_KEY_MODES.findIndex(m => m.modeName === progModeName)
    if (newModeIdx >= 0) setModeIdx(newModeIdx)

    setSelectedIndex(null)
    setPreviewedSub(null)
    setSaveError(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  // ── Analysis computations ──────────────────────────────────────────────────
  const parsedChords = useMemo(
    () => chords.map(c => parseChord(c.symbol)).filter((c): c is NonNullable<typeof c> => c !== null),
    [chords],
  )

  const chordAnalyses = useMemo(
    () => parsedChords.length > 0 ? analyzeProgression(parsedChords, key, mode.modeName) : [],
    [parsedChords, key, mode.modeName],
  )

  const displayAnalyses = useMemo(
    () => chordAnalyses.length > 0 ? applyFunctionalRomanOverrides(chordAnalyses, key, mode.modeName) : [],
    [chordAnalyses, key, mode.modeName],
  )

  const progressionChords = useMemo(
    () => buildProgressionChords(parsedChords, displayAnalyses),
    [parsedChords, displayAnalyses],
  )

  const functionalAnalyses = useMemo(
    (): FunctionalAnalysis[] =>
      progressionChords.map((chord, i) =>
        analyzeFunctionalContext(
          { ...chord, quality: chord.quality as ChordContext["quality"] },
          progressionChords[i + 1] ? { ...progressionChords[i + 1]!, quality: progressionChords[i + 1]!.quality as ChordContext["quality"] } : null,
          key,
          mode.modeName,
        )
      ),
    [progressionChords, key, mode.modeName],
  )

  const chordIdToAnalysisIdx = useMemo(() => {
    const map = new Map<string, number>()
    let idx = 0
    for (const chord of chords) {
      if (parseChord(chord.symbol) !== null) map.set(chord.id, idx++)
    }
    return map
  }, [chords])

  const selectedId    = selectedIndex !== null ? (chords[selectedIndex]?.id ?? null) : null
  const selectedChord = selectedIndex !== null ? progressionChords[selectedIndex] ?? null : null
  const selectedDisplayRoman = selectedIndex !== null
    ? (functionalAnalyses[selectedIndex]?.romanOverride ?? progressionChords[selectedIndex]?.roman ?? null)
    : null

  const scales = useMemo(() => {
    if (!selectedChord || selectedIndex === null) return null
    return functionalAnalyses[selectedIndex]?.scalesOverride ??
      getSoloScales({ tonic: selectedChord.tonic, type: selectedChord.type, degree: selectedChord.degree }, mode.modeName)
  }, [selectedChord, selectedIndex, functionalAnalyses, mode.modeName])

  const substitutions = useMemo(
    () => selectedIndex !== null && selectedChord
      ? getSubstitutions(selectedChord, progressionChords, selectedIndex, key, mode.modeName)
      : [],
    [selectedChord, progressionChords, selectedIndex, key, mode.modeName],
  )

  const previewTiles = useMemo((): PreviewTile[] | undefined => {
    if (!previewedSub) return undefined
    const { previewChords, highlightIndices } = applyPreview(progressionChords, previewedSub)
    return previewChords.map((chord, i) => {
      const inputChord = parseChord(`${chord.tonic}${chord.type}`)
      const keyAnalysis = inputChord ? analyzeChordInKey(inputChord, key, mode.modeName) : null
      const targetDegree = targetDegreeFromRoman(chord.roman)
      const degree = targetDegree ?? keyAnalysis?.degree ?? chord.degree ?? 1
      const variant: "diatonic" | "borrowed" | "non-diatonic" = targetDegree !== null
        ? "borrowed"
        : keyAnalysis?.role === "diatonic" ? "diatonic"
        : keyAnalysis?.role === "borrowed" ? "borrowed"
        : "non-diatonic"
      return { chordName: `${chord.tonic}${chord.type}`, roman: chord.roman, degree, variant, isHighlighted: highlightIndices.has(i) }
    })
  }, [previewedSub, progressionChords, key, mode.modeName])

  // ── Over the whole progression ─────────────────────────────────────────────
  const progModeName           = userProg?.mode ?? builtinProg?.mode ?? mode.modeName
  const progressionSoloScaleName = MODE_TO_SOLO_SCALE_NAME[progModeName]
  const progressionScaleNotes    = progressionSoloScaleName
    ? Scale.get(`${key} ${SCALE_TONAL_NAMES[progressionSoloScaleName] ?? progModeName}`).notes.join(" ")
    : ""
  const recommendedScaleType    = builtinProg?.recommendedScaleType
    ?? (progressionSoloScaleName ? `${progressionSoloScaleName} Scale` : "")

  // ── Panel sync helpers ─────────────────────────────────────────────────────
  function syncPanelsForChord(chordTonic: string, type: string, quality: string, primaryScaleName: string) {
    setPanelRoot(chordTonic)
    setPanelChordTypeTrigger({ type })
    setPanelArpeggioTypeTrigger({ type })
    const inversionType = INVERSION_TYPES.includes(type) ? type : QUALITY_TO_INVERSION_TYPE[quality]
    if (inversionType) setPanelInversionTypeTrigger({ type: inversionType })
    const panelScaleType = SOLO_SCALE_TO_PANEL_TYPE[primaryScaleName]
    if (panelScaleType) setPanelScaleTypeTrigger({ type: panelScaleType })
  }

  function handleScaleSelect(scaleTonic: string, scaleName: string) {
    setPanelRoot(scaleTonic)
    const panelType = SOLO_SCALE_TO_PANEL_TYPE[scaleName]
    if (panelType) setPanelScaleTypeTrigger({ type: panelType })
    setActiveStudyTab("scales")
  }

  // ── Chord tile callbacks ───────────────────────────────────────────────────
  const handleAdd = useCallback(() => {
    const id = crypto.randomUUID()
    setChords(prev => [...prev, { id, symbol: "" }])
    setEditingId(id)
  }, [])

  const handleCommit = useCallback((id: string, symbol: string) => {
    setEditingId(null)
    if (!symbol) setChords(prev => prev.filter(c => c.id !== id))
    else setChords(prev => prev.map(c => c.id === id ? { ...c, symbol } : c))
    setSelectedIndex(null)
    setPreviewedSub(null)
  }, [])

  const handleRemove = useCallback((id: string) => {
    setChords(prev => prev.filter(c => c.id !== id))
    setSelectedIndex(null)
    setPreviewedSub(null)
  }, [])

  const handleStartEdit = useCallback((id: string) => setEditingId(id), [])

  const getDisplayAnalysis = useCallback((id: string) => {
    const analysisIdx = chordIdToAnalysisIdx.get(id)
    if (analysisIdx === undefined) return null
    const pc = progressionChords[analysisIdx]
    const fa = functionalAnalyses[analysisIdx]
    if (!pc) return null
    const roman = fa?.romanOverride ?? pc.roman
    const tgtDeg = targetDegreeFromRoman(roman)
    const role = displayAnalyses[analysisIdx]?.role ?? "diatonic"
    const degree = tgtDeg ?? pc.degree
    const variant: "diatonic" | "borrowed" | "non-diatonic" = tgtDeg !== null
      ? "borrowed"
      : role === "diatonic" ? "diatonic"
      : role === "borrowed" ? "borrowed"
      : "non-diatonic"
    return { roman, degree, variant }
  }, [chordIdToAnalysisIdx, progressionChords, functionalAnalyses, displayAnalyses])

  const handleSelect = useCallback((id: string) => {
    const i = chords.findIndex(c => c.id === id)
    if (i === -1) return
    setPreviewedSub(null)
    setSelectedIndex(prev => {
      const next = prev === i ? null : i
      if (next !== null) {
        const pc = progressionChords[next]
        if (pc) {
          const fa = functionalAnalyses[next]
          const soloScales = fa?.scalesOverride ??
            getSoloScales({ tonic: pc.tonic, type: pc.type, degree: pc.degree }, mode.modeName)
          syncPanelsForChord(pc.tonic, pc.type, pc.quality, soloScales.primary.scaleName)
        }
      }
      return next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chords, progressionChords, functionalAnalyses, mode.modeName])

  const handleApplyPermanently = useCallback((sub: ChordSubstitution) => {
    const { previewChords: applied } = applyPreview(progressionChords, sub)
    setChords(applied.map(c => ({ id: crypto.randomUUID(), symbol: `${c.tonic}${c.type}` })))
    setPreviewedSub(null)
    setSelectedIndex(null)
    setEditingId(null)
  }, [progressionChords])

  // ── Save (custom progression) ──────────────────────────────────────────────
  async function handleSave() {
    if (!userProg) return
    setIsSaving(true)
    setSaveError(null)
    const degrees = parsedChords.map((pc, i) => `${displayAnalyses[i]?.roman ?? "?"}:${pc.type}`)
    const result = await updateUserProgression(userProg.id, { degrees, mode: mode.modeName })
    setIsSaving(false)
    if ("error" in result) setSaveError(result.error)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="pt-6 space-y-6">
      {/* Page heading */}
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Practice</p>
        <h1 className="text-2xl font-semibold text-foreground">Progressions</h1>
      </div>

      {/* Row 1: Progression selector */}
      <ProgressionSelector
        selected={selected}
        tonic={key}
        userProgressions={userProgressions}
        onSelectionChange={newSel => { setSelected(newSel); setSelectedIndex(null); setPreviewedSub(null) }}
        onEditMeta={() => setEditMetaModalOpen(true)}
      />

      {/* Row 2: Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6 w-full">
        {/* Left column */}
        <div className="flex flex-col gap-6 min-w-0 lg:flex-none lg:w-2/3">
          {/* Key + Mode */}
          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex flex-col gap-1 flex-shrink-0">
              <label className="text-xs text-muted-foreground" aria-hidden="true">Key</label>
              <select
                value={key}
                onChange={e => setKey(e.target.value)}
                aria-label="Key"
                className={cn(SELECT_CLASS, "w-fit")}
              >
                {ROOT_NOTES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground" aria-hidden="true">Mode</label>
              <select
                value={modeIdx}
                onChange={e => setModeIdx(Number(e.target.value))}
                aria-label="Mode"
                className={cn(SELECT_CLASS, "w-fit")}
              >
                {MODE_GROUPS.map(group => (
                  <optgroup key={group.label} label={group.label}>
                    {group.modes.map(m => {
                      const idx = ALL_KEY_MODES.findIndex(km => km.modeName === m.modeName)
                      return <option key={m.modeName} value={idx}>{m.displayName}</option>
                    })}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {/* Chord input */}
          <div>
            <label className="block text-xs text-muted-foreground mb-2">Chords</label>
            <ChordInputRow
              chords={chords}
              editingId={editingId}
              chordAnalyses={displayAnalyses}
              onChordChange={setChords}
              onCommit={handleCommit}
              onRemove={handleRemove}
              onStartEdit={handleStartEdit}
              onAdd={handleAdd}
              selectedId={selectedId}
              onSelect={handleSelect}
              getDisplayAnalysis={getDisplayAnalysis}
              previewTiles={previewTiles}
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            {isCustom && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className={btn("primary")}
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setSaveAsModalOpen(true)}
              className={btn(isCustom ? "standalone" : "primary")}
            >
              Save as...
            </button>
            {isCustom && (
              <button
                type="button"
                onClick={() => setDeleteModalOpen(true)}
                className={btn("destructive")}
              >
                Delete
              </button>
            )}
            {saveError && <p className="text-xs text-destructive">{saveError}</p>}
          </div>
        </div>

        {/* Right column: analysis */}
        <div className="min-w-0 lg:flex-1 lg:ml-auto space-y-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Analysis</p>
          {selectedChord ? (
            <div className="space-y-3">
              <div className="flex rounded border border-border overflow-hidden text-sm w-fit">
                <button
                  type="button"
                  onClick={() => setActiveAnalysisTab("substitutions")}
                  className={cn(
                    "px-3 py-1.5 transition-colors",
                    activeAnalysisTab === "substitutions"
                      ? "bg-accent text-accent-foreground"
                      : "bg-card text-muted-foreground hover:bg-muted",
                  )}
                >
                  Substitutions
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAnalysisTab("soloing")}
                  className={cn(
                    "px-3 py-1.5 transition-colors border-l border-border",
                    activeAnalysisTab === "soloing"
                      ? "bg-accent text-accent-foreground"
                      : "bg-card text-muted-foreground hover:bg-muted",
                  )}
                >
                  Soloing
                </button>
              </div>

              {activeAnalysisTab === "substitutions" && (
                <SubstitutionsPanel
                  substitutions={substitutions}
                  chordName={`${selectedChord.tonic}${selectedChord.type}`}
                  previewedId={previewedSub?.id ?? null}
                  onPreview={setPreviewedSub}
                  onApply={handleApplyPermanently}
                />
              )}

              {activeAnalysisTab === "soloing" && scales && (
                <SoloScalesPanel
                  scales={scales}
                  chordName={`${selectedChord.tonic}${selectedChord.type}`}
                  romanNumeral={selectedDisplayRoman ?? undefined}
                  onScaleSelect={handleScaleSelect}
                />
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Select a chord tile to view substitutions and applicable chord scales.
              </p>
              {progressionSoloScaleName && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                    Over the whole progression
                  </p>
                  <button
                    type="button"
                    onClick={() => handleScaleSelect(key, progressionSoloScaleName)}
                    className="flex items-center gap-3 flex-wrap text-left group cursor-pointer"
                    title="Open in Scales tab"
                  >
                    <span className="flex items-baseline gap-1">
                      <span className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">
                        {key} {recommendedScaleType}
                      </span>
                      <span className="text-xs text-muted-foreground/40 group-hover:text-accent transition-colors select-none">⏵</span>
                    </span>
                    {progressionScaleNotes && (
                      <span className="text-xs text-muted-foreground">· {progressionScaleNotes}</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Study tools */}
      <section aria-label="Study tools">
        <div
          role="tablist"
          aria-label="Study panels"
          className="flex border-b border-border"
          onKeyDown={(e) => {
            const ids = PANEL_TABS.map(t => t.id)
            const current = ids.indexOf(activeStudyTab)
            if (e.key === "ArrowRight") setActiveStudyTab(ids[(current + 1) % ids.length]!)
            if (e.key === "ArrowLeft") setActiveStudyTab(ids[(current - 1 + ids.length) % ids.length]!)
          }}
        >
          {PANEL_TABS.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeStudyTab === tab.id}
              aria-controls={`prog-panel-${tab.id}`}
              id={`prog-tab-${tab.id}`}
              tabIndex={activeStudyTab === tab.id ? 0 : -1}
              onClick={() => setActiveStudyTab(tab.id)}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeStudyTab === tab.id
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
          id={`prog-panel-${activeStudyTab}`}
          aria-labelledby={`prog-tab-${activeStudyTab}`}
          className="pt-6"
        >
          {activeStudyTab === "scales"     && <ScalePanel    root={panelRoot} onRootChange={setPanelRoot} scaleTypeTrigger={panelScaleTypeTrigger} />}
          {activeStudyTab === "arpeggios"  && <ArpeggioPanel root={panelRoot} onRootChange={setPanelRoot} chordTypeTrigger={panelArpeggioTypeTrigger} />}
          {activeStudyTab === "chords"     && <ChordPanel    root={panelRoot} onRootChange={setPanelRoot} chordTypeTrigger={panelChordTypeTrigger} onScaleSelect={handleScaleSelect} />}
          {activeStudyTab === "inversions" && <InversionPanel root={panelRoot} onRootChange={setPanelRoot} inversionTypeTrigger={panelInversionTypeTrigger} onScaleSelect={handleScaleSelect} />}
        </div>
      </section>

      {/* Modals */}
      {saveAsModalOpen && (
        <SaveAsModal
          defaultTitle={userProg?.displayName ?? builtinProg?.displayName ?? ""}
          defaultDescription={userProg?.description ?? builtinProg?.description ?? ""}
          parsedChords={parsedChords}
          tonic={key}
          modeName={mode.modeName}
          onClose={() => setSaveAsModalOpen(false)}
          onSaved={newId => { setSaveAsModalOpen(false); setSelected(newId) }}
        />
      )}

      {editMetaModalOpen && userProg && (
        <EditMetaModal
          progressionId={userProg.id}
          currentTitle={userProg.displayName}
          currentDescription={userProg.description}
          onClose={() => setEditMetaModalOpen(false)}
          onSaved={() => setEditMetaModalOpen(false)}
        />
      )}

      {deleteModalOpen && userProg && (
        <DeleteConfirmModal
          progressionId={userProg.id}
          progressionTitle={userProg.displayName}
          onClose={() => setDeleteModalOpen(false)}
          onDeleted={() => { setDeleteModalOpen(false); setSelected("pop-standard") }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run tests to confirm they pass**

Run: `npx vitest run __tests__/progressions/progressions-page-client.test.tsx`
Expected: PASS (7 tests).

- [ ] **Step 6: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Progressions page with unified progression editor and study tools"
```

---

### Task 6: Update navigation

**Files:**
- Modify: `components/layout/navbar-client.tsx`
- Modify: `components/layout/footer.tsx`

- [ ] **Step 1: Update navbar**

In `components/layout/navbar-client.tsx`, add `{ href: "/progressions", label: "Progressions" }` after the Reference entry in `BASE_NAV_ITEMS`:

```ts
const BASE_NAV_ITEMS = [
  { href: "/",             label: "Home" },
  { href: "/goals",        label: "Goals" },
  { href: "/history",      label: "History" },
  { href: "/library",      label: "Library" },
  { href: "/reference",    label: "Reference" },
  { href: "/progressions", label: "Progressions" },
  { href: "/tools",        label: "Tools" },
]
```

- [ ] **Step 2: Update footer**

In `components/layout/footer.tsx`, add `{ href: "/progressions", label: "Progressions" }` after Reference in `NAV_ITEMS`:

```ts
const NAV_ITEMS = [
  { href: "/",             label: "Home" },
  { href: "/goals",        label: "Goals" },
  { href: "/history",      label: "History" },
  { href: "/library",      label: "Library" },
  { href: "/reference",    label: "Reference" },
  { href: "/progressions", label: "Progressions" },
  { href: "/tools",        label: "Tools" },
]
```

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add components/layout/navbar-client.tsx components/layout/footer.tsx
git commit -m "feat: add Progressions link to navbar and footer"
```

---

### Task 7: Simplify Reference page (remove Progressions tab)

**Files:**
- Modify: `app/(app)/reference/_components/harmony-study.tsx`
- Modify: `app/(app)/reference/_components/reference-page-client.tsx`
- Modify: `app/(app)/reference/page.tsx`
- Modify: `__tests__/reference/harmony-study.test.tsx`
- Modify: `__tests__/reference/page.test.tsx`
- Delete: `__tests__/reference/progressions-tab.test.tsx`

- [ ] **Step 1: Simplify harmony-study.tsx**

Replace the entire file with:

```tsx
"use client"

import { HarmonyTab } from "./harmony-tab"

interface HarmonyStudyProps {
  tonic: string
  onChordSelect?: (tonic: string, type: string, quality: string, primaryScaleName: string) => void
  onScaleSelect?: (tonic: string, scaleName: string) => void
}

export function HarmonyStudy({ tonic, onChordSelect, onScaleSelect }: HarmonyStudyProps) {
  return (
    <HarmonyTab tonic={tonic} onChordSelect={onChordSelect} onScaleSelect={onScaleSelect} />
  )
}
```

- [ ] **Step 2: Remove userProgressions from reference-page-client.tsx**

In `app/(app)/reference/_components/reference-page-client.tsx`:

1. Remove the `userProgressions` prop from `ReferencePageClientProps` (delete the interface entirely and inline the type, or just make it empty)
2. Remove `userProgressions` from the `ReferencePageClient` function signature
3. Remove the `userProgressions={userProgressions}` prop from the `<HarmonyStudy>` call
4. Keep `UserProgressionForTab` type export (it's imported by the new page)

The updated interface and function signature:
```tsx
interface ReferencePageClientProps {}

export function ReferencePageClient() {
```

And the HarmonyStudy call becomes:
```tsx
<HarmonyStudy
  tonic={selectedKey}
  onChordSelect={handleChordSelect}
  onScaleSelect={handleScaleSelect}
/>
```

- [ ] **Step 3: Simplify reference/page.tsx**

Replace with:

```tsx
import { ReferencePageClient } from "./_components/reference-page-client"

export default async function ReferencePage() {
  return <ReferencePageClient />
}
```

- [ ] **Step 4: Update harmony-study.test.tsx**

Read the current test file. Remove any tests that reference "Progressions" tab. Update the render call to remove `userProgressions` prop. If the file only had harmony/modes content tests, they should still pass as-is.

- [ ] **Step 5: Update reference/page.test.tsx**

Read the current test file. Remove any `userProgressions`-related mocks or assertions. Update the render call to `<ReferencePageClient />` with no props.

- [ ] **Step 6: Delete progressions-tab.test.tsx**

```bash
rm __tests__/reference/progressions-tab.test.tsx
```

- [ ] **Step 7: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: remove Progressions tab from Reference page; simplify HarmonyStudy"
```

---

### Task 8: Remove My Progressions pages

**Files:**
- Delete: `app/(app)/reference/progressions/` (entire directory — actions.ts, page.tsx, new/page.tsx, [id]/edit/page.tsx, _components/)

- [ ] **Step 1: Delete the entire directory**

```bash
rm -rf "app/(app)/reference/progressions"
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass (no test files imported from this directory).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: remove My Progressions edit pages (progressions now managed on /progressions)"
```

---

### Task 9: Remove Progression Analysis tool

**Files:**
- Delete: `app/(app)/tools/progression-analysis/` (entire directory)
- Modify: `app/(app)/tools/page.tsx` (remove Progression Analysis tile)
- Delete: `__tests__/tools/analyser-client.test.tsx`
- Delete: `__tests__/tools/save-modal.test.tsx`

- [ ] **Step 1: Delete tool directory**

```bash
rm -rf "app/(app)/tools/progression-analysis"
```

- [ ] **Step 2: Remove tile from tools/page.tsx**

Remove the entry:
```ts
{
  href: "/tools/progression-analysis",
  icon: <BarChart2 size={36} strokeWidth={1.5} aria-hidden="true" />,
  name: "Progression Analysis",
  description: "Analyse chord progressions with real-time harmonic labelling",
},
```

Also remove `BarChart2` from the lucide-react import if it's only used by that tile.

- [ ] **Step 3: Delete stale test files**

```bash
rm __tests__/tools/analyser-client.test.tsx
rm __tests__/tools/save-modal.test.tsx
```

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: remove Progression Analysis tool (functionality moved to /progressions)"
```

---

## Verification

1. Run `npm run dev` and navigate to `/progressions`
2. Verify progression selector shows built-in progressions grouped by category
3. Select a progression → chord tiles load with roman numeral analysis
4. Click a chord tile → right analysis panel appears with Substitutions/Soloing tabs
5. In Soloing tab, click a scale → Scales study panel updates and switches to Scales tab
6. Select a substitution → preview shown in chord tiles; click Apply → chords update
7. Change key → chord analysis updates; chord tiles keep same symbols
8. Click "Save as..." → modal opens with progression title/description pre-filled
9. For a custom progression: Save, Save as, Delete all work; pencil icon visible
10. Navigate to `/reference` → only Modes tab, no Progressions tab
11. Navigate to `/tools` → Progression Analysis tile gone
12. Run `npx vitest run` — all tests pass
