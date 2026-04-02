# Notes View — Standard Notation Stave Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a treble-clef standard notation stave (whole-note/stemless noteheads, interval colour-coded) above the existing tab stave in the "Notes" view (currently labelled "Tab") on the Scales and Arpeggios reference panels.

**Architecture:** Extend `lib/rendering/tab.ts` — rename `renderTab` → `renderNotesView`, add a `Stave` above the existing `TabStave` in the same SVG, sync note-start x for vertical alignment, and build `StaveNote` objects (whole notes, coloured) alongside the existing `TabNote` objects. Rename the `TabViewer` component to `NotesViewer` and update both panels (scale, arpeggio) to use it and relabel their button from "Tab" to "Notes".

**Tech Stack:** VexFlow 5.x (`Stave`, `StaveNote`, `Accidental`, `TabStave`, `TabNote`, `Formatter`), React, Next.js app router, Vitest + Testing Library.

---

## File map

| File | Action |
|------|--------|
| `lib/rendering/tab.ts` | Rename export; add notation stave, pitch helpers, new VexFlow imports |
| `app/(app)/reference/_components/tab-viewer.tsx` | Delete |
| `app/(app)/reference/_components/notes-viewer.tsx` | Create — `NotesViewer` component |
| `app/(app)/reference/_components/scale-panel.tsx` | Update import, button label, `viewMode` type |
| `app/(app)/reference/_components/arpeggio-panel.tsx` | Update import, button label, `viewMode` type |
| `__tests__/reference/scale-panel.test.tsx` | Expand VexFlow mock; update button queries |
| `__tests__/reference/arpeggio-panel.test.tsx` | Expand VexFlow mock; update button query |

---

### Task 1: Extend the rendering function

**Files:**
- Modify: `lib/rendering/tab.ts`

- [ ] **Step 1: Confirm the test baseline is green**

Run: `npx vitest run 2>&1 | tail -5`
Expected: All tests pass. Note the exact count.

- [ ] **Step 2: Replace `lib/rendering/tab.ts` with the extended version**

The key additions vs the current file:
- New constant `OPEN_STRING_MIDI` for converting fret positions to MIDI pitches
- New helper `fretToVexKey` (fret + string + noteName → VexFlow key string like `"bb/3"`)
- `Stave`, `StaveNote`, `Accidental` added to the destructured VexFlow import
- `renderTab` renamed → `renderNotesView`
- `renderer.resize` height increased to 400 (auto-crop reduces it)
- Treble-clef `Stave` rendered at y=10 before the `TabStave`
- `noteStartX` synced between both staves for vertical notehead alignment
- `noteNames` pre-computed and shared between `StaveNote` construction and the SVG label loop
- `staveNotes` array of whole-note `StaveNote` objects with per-note colour and accidentals
- Two `Formatter.FormatAndDraw` calls (one per stave)
- Label loop now iterates `tabNotes` (not `notes`) — same behaviour

Write this complete file:

```typescript
import type { GuitarScale } from "@/lib/theory/types"

// VexFlow is imported via ESM so that vitest's vi.mock("vexflow") intercepts it in tests.
// Rendering only runs client-side via useEffect in viewer components.
//
// IMPORTANT: Before modifying this file, check the actual VexFlow API:
//   node_modules/vexflow/build/types/src/index.d.ts
// VexFlow 5.x uses named exports directly.
import * as VexFlow from "vexflow"

const { Renderer, Stave, StaveNote, Accidental, TabStave, TabNote, Formatter } = VexFlow as unknown as {
  Renderer: any
  Stave: any
  StaveNote: any
  Accidental: any
  TabStave: any
  TabNote: any
  Formatter: any
}

// Chroma values for open strings (index 0 = string 6 low E, index 5 = string 1 high e)
const OPEN_STRING_CHROMA = [4, 9, 2, 7, 11, 4]

// MIDI pitches for open strings (index 0 = string 6 low E, index 5 = string 1 high e)
// E2=40, A2=45, D3=50, G3=55, B3=59, E4=64
const OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64]

// Note name → chroma for looking up which scale note is at a given fret
const NOTE_CHROMA: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5,
  "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
}

/**
 * Converts a fret position to a VexFlow key string, e.g. "bb/3" or "f#/4".
 * Uses the note name already resolved from the scale (correct enharmonic spelling).
 * VexFlow convention: C4 = MIDI 60, octave = Math.floor((midi - 12) / 12).
 */
function fretToVexKey(string: number, fret: number, noteName: string): string {
  const midi   = OPEN_STRING_MIDI[6 - string] + fret
  const octave = Math.floor((midi - 12) / 12)
  return `${noteName.toLowerCase()}/${octave}`
}

/**
 * Interval display label → colour category.
 * Root uses the theme accent (resolved at render time); the others are fixed.
 */
export const INTERVAL_DEGREE_COLORS = {
  third:   "#16a34a", // green-600
  fifth:   "#2563eb", // blue-600
  seventh: "#9333ea", // purple-600
} as const

const THIRD_INTERVALS   = new Set(["3", "b3"])
const FIFTH_INTERVALS   = new Set(["5", "b5", "#5"])
const SEVENTH_INTERVALS = new Set(["7", "b7"])

function intervalColor(interval: string, rootColor: string, mutedColor: string): string {
  if (interval === "R")                return rootColor
  if (THIRD_INTERVALS.has(interval))   return INTERVAL_DEGREE_COLORS.third
  if (FIFTH_INTERVALS.has(interval))   return INTERVAL_DEGREE_COLORS.fifth
  if (SEVENTH_INTERVALS.has(interval)) return INTERVAL_DEGREE_COLORS.seventh
  return mutedColor
}

/**
 * Renders a single scale position as standard notation + guitar tab (ascending)
 * into containerEl. Both staves share one SVG. Clears the container first.
 * Safe to call multiple times.
 */
export function renderNotesView(
  containerEl: HTMLElement,
  scale: GuitarScale,
  positionIndex: number
): void {
  containerEl.innerHTML = ""

  const scalePosition = scale.positions[positionIndex]
  if (!scalePosition || scalePosition.positions.length === 0) return

  const renderer = new Renderer(containerEl, Renderer.Backends.SVG)
  renderer.resize(520, 400) // tall initial canvas; auto-crop trims excess
  const context = renderer.getContext()

  // ── Notation stave (treble clef) ───────────────────────────────────────────
  const notationStave = new Stave(10, 10, 490)
  notationStave.addClef("treble").setContext(context).draw()

  // ── Tab stave, positioned below notation stave ─────────────────────────────
  const tabStaveY = notationStave.getBottomLineBottomY() + 15
  const tabStave  = new TabStave(10, tabStaveY, 490)
  tabStave.addClef("tab").setContext(context).draw()

  // Sync note-start x so noteheads align vertically between staves
  const noteStartX = Math.max(notationStave.getNoteStartX(), tabStave.getNoteStartX())
  notationStave.setNoteStartX(noteStartX)
  tabStave.setNoteStartX(noteStartX)

  // Sort ascending: low strings (6) first, then by fret
  const sorted = [...scalePosition.positions].sort(
    (a, b) => b.string - a.string || a.fret - b.fret
  )

  // Resolve theme colours at render time
  const cs          = typeof document !== "undefined" ? getComputedStyle(document.documentElement) : null
  const accentColor = cs?.getPropertyValue("--accent").trim() || "#b45309"
  const mutedColor  = cs?.getPropertyValue("--muted-foreground").trim() || "#737373"

  // Pre-resolve note names (shared between StaveNote building and SVG labels)
  const noteNames = sorted.map((p) => {
    const openChroma = OPEN_STRING_CHROMA[6 - p.string]
    const noteChroma = (openChroma + p.fret) % 12
    return scale.notes.find((n) => (NOTE_CHROMA[n] ?? -1) === noteChroma) ?? ""
  })

  // ── Standard notation notes (whole notes = stemless) ──────────────────────
  const staveNotes = sorted.map((p, i) => {
    const noteName = noteNames[i]
    const vexKey   = noteName ? fretToVexKey(p.string, p.fret, noteName) : "b/4"
    const color    = intervalColor(p.interval, accentColor, mutedColor)
    const sn       = new StaveNote({ clef: "treble", keys: [vexKey], duration: "w" })
    sn.setStyle({ fillStyle: color, strokeStyle: color })
    // noteName is mixed-case ("Bb", "F#"); check original spelling for accidentals
    if (noteName.includes("#")) sn.addModifier(new Accidental("#"), 0)
    if (noteName.includes("b")) sn.addModifier(new Accidental("b"), 0)
    return sn
  })

  // ── Tab notes (unchanged from original renderTab) ──────────────────────────
  const tabNotes = sorted.map((p) => {
    const note  = new TabNote({ positions: [{ str: p.string, fret: String(p.fret) }], duration: "q" })
    const color = intervalColor(p.interval, accentColor, mutedColor)
    note.setStyle({ fillStyle: color, strokeStyle: color })
    return note
  })

  Formatter.FormatAndDraw(context, notationStave, staveNotes)
  Formatter.FormatAndDraw(context, tabStave, tabNotes)

  // ── SVG label injection and auto-crop ──────────────────────────────────────
  const svgEl = containerEl.querySelector("svg")
  if (svgEl) {
    // Labels below the tab stave (note names + degree labels)
    const labelY = tabStave.getBottomLineBottomY() + 20
    for (const [i, note] of tabNotes.entries()) {
      const p        = sorted[i]
      const noteName = noteNames[i]
      const color    = intervalColor(p.interval, accentColor, mutedColor)
      const x        = String(note.getAbsoluteX())

      if (noteName) {
        const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text")
        textEl.setAttribute("x", x)
        textEl.setAttribute("y", String(labelY))
        textEl.setAttribute("text-anchor", "middle")
        textEl.setAttribute("font-family", "system-ui, -apple-system, sans-serif")
        textEl.setAttribute("font-size", "10")
        textEl.setAttribute("font-weight", "400")
        textEl.setAttribute("fill", color)
        textEl.textContent = noteName
        svgEl.appendChild(textEl)
      }

      const degree   = p.interval === "R" ? "1" : p.interval
      const degreeEl = document.createElementNS("http://www.w3.org/2000/svg", "text")
      degreeEl.setAttribute("x", x)
      degreeEl.setAttribute("y", String(labelY + 14))
      degreeEl.setAttribute("text-anchor", "middle")
      degreeEl.setAttribute("font-family", "system-ui, -apple-system, sans-serif")
      degreeEl.setAttribute("font-size", "9")
      degreeEl.setAttribute("font-weight", "300")
      degreeEl.setAttribute("fill", color)
      degreeEl.textContent = degree
      svgEl.appendChild(degreeEl)
    }

    // Auto-crop: resize viewBox to actual rendered content
    try {
      const bbox          = (svgEl as SVGSVGElement).getBBox()
      const pad           = 8
      const croppedHeight = Math.round(bbox.height + pad * 2)
      svgEl.setAttribute(
        "viewBox",
        `${bbox.x - pad} ${bbox.y - pad} ${bbox.width + pad * 2} ${bbox.height + pad * 2}`
      )
      svgEl.setAttribute("height", String(croppedHeight))
      svgEl.style.height = `${croppedHeight}px`
    } catch {
      // getBBox unavailable in non-browser environments (e.g. jsdom without layout)
    }
  }
}
```

- [ ] **Step 3: Run the full test suite**

Run: `npx vitest run 2>&1 | tail -10`
Expected: Same test count passes as Step 1. (`renderTab` export is gone but no component uses it yet.)

- [ ] **Step 4: Commit**

```bash
git add lib/rendering/tab.ts
git commit -m "feat: add standard notation stave to Notes view renderer"
```

---

### Task 2: Create NotesViewer component and update panel imports

**Files:**
- Create: `app/(app)/reference/_components/notes-viewer.tsx`
- Delete: `app/(app)/reference/_components/tab-viewer.tsx`
- Modify: `app/(app)/reference/_components/scale-panel.tsx` (import line only)
- Modify: `app/(app)/reference/_components/arpeggio-panel.tsx` (import line only)

- [ ] **Step 1: Create `app/(app)/reference/_components/notes-viewer.tsx`**

```typescript
"use client"

import { useEffect, useRef } from "react"
import { renderNotesView, INTERVAL_DEGREE_COLORS } from "@/lib/rendering/tab"
import type { GuitarScale } from "@/lib/theory/types"

interface NotesViewerProps {
  scale: GuitarScale
  positionIndex: number
}

const COLOR_KEY = [
  { label: "R",            color: "var(--accent)" },
  { label: "3 / b3",       color: INTERVAL_DEGREE_COLORS.third },
  { label: "5 / b5 / ♯5", color: INTERVAL_DEGREE_COLORS.fifth },
  { label: "7 / b7",       color: INTERVAL_DEGREE_COLORS.seventh },
]

export function NotesViewer({ scale, positionIndex }: NotesViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    try {
      renderNotesView(containerRef.current, scale, positionIndex)
    } catch {
      if (containerRef.current) {
        containerRef.current.innerHTML = "<p class='text-xs text-muted-foreground'>Notes view unavailable</p>"
      }
    }
  }, [scale, positionIndex])

  return (
    <div className="rounded border border-border bg-card p-2">
      <div
        ref={containerRef}
        className="w-full overflow-x-auto"
      />
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 px-1">
        {COLOR_KEY.map(({ label, color }) => (
          <span key={label} className="flex items-center gap-1 text-xs" style={{ color }}>
            <span aria-hidden>●</span>
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update the import in `scale-panel.tsx`**

In `app/(app)/reference/_components/scale-panel.tsx`, find line 5:
```typescript
import { TabViewer } from "./tab-viewer"
```
Replace with:
```typescript
import { NotesViewer } from "./notes-viewer"
```

The panel still has `viewMode === "tab"` guards and the button still says "Tab" — that changes in Task 3.

- [ ] **Step 3: Update the import in `arpeggio-panel.tsx`**

In `app/(app)/reference/_components/arpeggio-panel.tsx`, find line 5:
```typescript
import { TabViewer } from "./tab-viewer"
```
Replace with:
```typescript
import { NotesViewer } from "./notes-viewer"
```

- [ ] **Step 4: Delete `tab-viewer.tsx`**

```bash
git rm "app/(app)/reference/_components/tab-viewer.tsx"
```

- [ ] **Step 5: Run the full test suite**

Run: `npx vitest run 2>&1 | tail -10`
Expected: All tests pass. (Panels still have the "Tab" button; tests still find it.)

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/reference/_components/notes-viewer.tsx" \
        "app/(app)/reference/_components/scale-panel.tsx" \
        "app/(app)/reference/_components/arpeggio-panel.tsx"
git commit -m "refactor: rename TabViewer → NotesViewer component"
```

---

### Task 3: Update scale-panel — button label and tests

**Files:**
- Modify: `__tests__/reference/scale-panel.test.tsx`
- Modify: `app/(app)/reference/_components/scale-panel.tsx`

- [ ] **Step 1: Update `__tests__/reference/scale-panel.test.tsx`**

**a) Replace the VexFlow mock block (lines 6–11):**

```typescript
vi.mock("vexflow", () => ({
  Renderer: class { static Backends = { SVG: "svg" }; resize = vi.fn(); getContext = vi.fn(() => ({})) },
  Stave: class {
    addClef = vi.fn().mockReturnThis()
    setContext = vi.fn().mockReturnThis()
    draw = vi.fn()
    getBottomLineBottomY = vi.fn(() => 100)
    getNoteStartX = vi.fn(() => 50)
    setNoteStartX = vi.fn()
  },
  StaveNote: class {
    constructor(public c: unknown) {}
    setStyle = vi.fn()
    addModifier = vi.fn()
    getAbsoluteX = vi.fn(() => 0)
  },
  Accidental: class { constructor(public t: unknown) {} },
  TabStave: class {
    addClef = vi.fn().mockReturnThis()
    setContext = vi.fn().mockReturnThis()
    draw = vi.fn()
    getBottomLineBottomY = vi.fn(() => 150)
    getNoteStartX = vi.fn(() => 60)
    setNoteStartX = vi.fn()
  },
  TabNote: class {
    constructor(public c: unknown) {}
    setStyle = vi.fn()
    getAbsoluteX = vi.fn(() => 0)
  },
  Formatter: { FormatAndDraw: vi.fn() },
}))
```

**b) In the test `"renders the position selector in tab mode"`, change:**
```typescript
fireEvent.click(screen.getByRole("button", { name: /tab/i }))
```
to:
```typescript
fireEvent.click(screen.getByRole("button", { name: /notes/i }))
```

**c) In the test `"switches to tab view when Tab button is clicked"`, change:**
```typescript
const tabButton = screen.getByRole("button", { name: /tab/i })
```
to:
```typescript
const tabButton = screen.getByRole("button", { name: /notes/i })
```

- [ ] **Step 2: Run scale-panel tests to confirm they fail**

Run: `npx vitest run __tests__/reference/scale-panel.test.tsx --reporter=verbose 2>&1`
Expected: 2 tests fail — "Unable to find an accessible element with the role 'button' and name matching /notes/i" (the button still says "Tab").

- [ ] **Step 3: Update `scale-panel.tsx` — viewMode type, button, and guards**

Three edits to `app/(app)/reference/_components/scale-panel.tsx`:

**a) Change viewMode state type (line 52):**
```typescript
// Before:
const [viewMode, setViewMode] = useState<"tab" | "fretboard">("fretboard")
// After:
const [viewMode, setViewMode] = useState<"notes" | "fretboard">("fretboard")
```

**b) Update the "Tab" button (the second button in the view-mode toggle, inside `<div className="flex rounded border...">`):**
```tsx
// Before:
<button
  onClick={() => setViewMode("tab")}
  className={cn(
    "px-3 py-1.5 transition-colors border-l border-border",
    viewMode === "tab"
      ? "bg-accent text-accent-foreground"
      : "bg-card text-muted-foreground hover:bg-muted"
  )}
>
  Tab
</button>
// After:
<button
  onClick={() => setViewMode("notes")}
  className={cn(
    "px-3 py-1.5 transition-colors border-l border-border",
    viewMode === "notes"
      ? "bg-accent text-accent-foreground"
      : "bg-card text-muted-foreground hover:bg-muted"
  )}
>
  Notes
</button>
```

**c) Update the two `viewMode === "tab"` guards — position selector and viewer:**
```tsx
// Position selector guard:
// Before:  {viewMode === "tab" && (
// After:   {viewMode === "notes" && (

// Viewer conditional (bottom of component):
// Before:  {viewMode === "tab" ? (
//            <TabViewer scale={scale} positionIndex={safePositionIndex} />
// After:   {viewMode === "notes" ? (
//            <NotesViewer scale={scale} positionIndex={safePositionIndex} />
```

- [ ] **Step 4: Run scale-panel tests**

Run: `npx vitest run __tests__/reference/scale-panel.test.tsx --reporter=verbose 2>&1`
Expected: All scale-panel tests pass.

- [ ] **Step 5: Run the full test suite**

Run: `npx vitest run 2>&1 | tail -10`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add "__tests__/reference/scale-panel.test.tsx" \
        "app/(app)/reference/_components/scale-panel.tsx"
git commit -m "feat: rename Tab → Notes on scale panel; update tests"
```

---

### Task 4: Update arpeggio-panel — button label and tests

**Files:**
- Modify: `__tests__/reference/arpeggio-panel.test.tsx`
- Modify: `app/(app)/reference/_components/arpeggio-panel.tsx`

- [ ] **Step 1: Update `__tests__/reference/arpeggio-panel.test.tsx`**

**a) Replace the VexFlow mock block (lines 5–10) with the same expanded mock from Task 3:**

```typescript
vi.mock("vexflow", () => ({
  Renderer: class { static Backends = { SVG: "svg" }; resize = vi.fn(); getContext = vi.fn(() => ({})) },
  Stave: class {
    addClef = vi.fn().mockReturnThis()
    setContext = vi.fn().mockReturnThis()
    draw = vi.fn()
    getBottomLineBottomY = vi.fn(() => 100)
    getNoteStartX = vi.fn(() => 50)
    setNoteStartX = vi.fn()
  },
  StaveNote: class {
    constructor(public c: unknown) {}
    setStyle = vi.fn()
    addModifier = vi.fn()
    getAbsoluteX = vi.fn(() => 0)
  },
  Accidental: class { constructor(public t: unknown) {} },
  TabStave: class {
    addClef = vi.fn().mockReturnThis()
    setContext = vi.fn().mockReturnThis()
    draw = vi.fn()
    getBottomLineBottomY = vi.fn(() => 150)
    getNoteStartX = vi.fn(() => 60)
    setNoteStartX = vi.fn()
  },
  TabNote: class {
    constructor(public c: unknown) {}
    setStyle = vi.fn()
    getAbsoluteX = vi.fn(() => 0)
  },
  Formatter: { FormatAndDraw: vi.fn() },
}))
```

**b) In the test `"renders the position selector in tab mode"`, change:**
```typescript
fireEvent.click(screen.getByRole("button", { name: /tab/i }))
```
to:
```typescript
fireEvent.click(screen.getByRole("button", { name: /notes/i }))
```

- [ ] **Step 2: Run arpeggio-panel tests to confirm they fail**

Run: `npx vitest run __tests__/reference/arpeggio-panel.test.tsx --reporter=verbose 2>&1`
Expected: 1 test fails — "Unable to find an accessible element with the role 'button' and name matching /notes/i".

- [ ] **Step 3: Update `arpeggio-panel.tsx` — viewMode type, button, and guards**

Three edits to `app/(app)/reference/_components/arpeggio-panel.tsx`:

**a) Change viewMode state type (line 50):**
```typescript
// Before:
const [viewMode, setViewMode] = useState<"tab" | "fretboard">("fretboard")
// After:
const [viewMode, setViewMode] = useState<"notes" | "fretboard">("fretboard")
```

**b) Update the "Tab" button:**
```tsx
// Before:
<button
  onClick={() => setViewMode("tab")}
  className={cn(
    "px-3 py-1.5 transition-colors border-l border-border",
    viewMode === "tab"
      ? "bg-accent text-accent-foreground"
      : "bg-card text-muted-foreground hover:bg-muted"
  )}
>
  Tab
</button>
// After:
<button
  onClick={() => setViewMode("notes")}
  className={cn(
    "px-3 py-1.5 transition-colors border-l border-border",
    viewMode === "notes"
      ? "bg-accent text-accent-foreground"
      : "bg-card text-muted-foreground hover:bg-muted"
  )}
>
  Notes
</button>
```

**c) Update the two `viewMode === "tab"` guards — position selector and viewer:**
```tsx
// Position selector guard:
// Before:  {viewMode === "tab" && (
// After:   {viewMode === "notes" && (

// Viewer conditional (bottom of component):
// Before:  {viewMode === "tab" ? (
//            <TabViewer scale={arpeggio} positionIndex={safePositionIndex} />
// After:   {viewMode === "notes" ? (
//            <NotesViewer scale={arpeggio} positionIndex={safePositionIndex} />
```

- [ ] **Step 4: Run arpeggio-panel tests**

Run: `npx vitest run __tests__/reference/arpeggio-panel.test.tsx --reporter=verbose 2>&1`
Expected: All arpeggio-panel tests pass.

- [ ] **Step 5: Run the full test suite**

Run: `npx vitest run 2>&1 | tail -10`
Expected: All tests pass (same or higher count as the start of Task 1).

- [ ] **Step 6: Commit**

```bash
git add "__tests__/reference/arpeggio-panel.test.tsx" \
        "app/(app)/reference/_components/arpeggio-panel.tsx"
git commit -m "feat: rename Tab → Notes on arpeggio panel; update tests"
```
