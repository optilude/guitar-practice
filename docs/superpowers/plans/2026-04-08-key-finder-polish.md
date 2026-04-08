# Key Finder Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix chord quality matching bugs in the key detector and polish the key finder UI (arrows between tiles, × inside tiles, correct add button sizing, empty state, and mode label improvements).

**Architecture:** Five independent tasks across three layers — the theory library (key-finder.ts), the presentation components (chord-tile, chord-input-row), and the page client component (key-finder-client). Tasks 1–2 touch pure logic with unit tests; Tasks 3–5 are UI-only.

**Tech Stack:** Next.js 16, React, TonalJS (`Chord`, `Note`), @dnd-kit/core + @dnd-kit/sortable, Vitest, Tailwind v4.

---

## File Map

| File | Change |
|------|--------|
| `lib/theory/key-finder.ts` | Expand `TYPE_TO_QUALITY`; add `"dim"` entry in `buildDiatonicLookup` for `m7b5` chords |
| `lib/theory/key-finder.test.ts` | Add regression tests for type aliases and triad matching |
| `lib/theory/commonality-tiers.ts` | Change two `displayName` strings |
| `app/(app)/tools/key-finder/_components/chord-tile.tsx` | × inside tile; whole-tile drag; validate on commit |
| `app/(app)/tools/key-finder/_components/chord-input-row.tsx` | Arrow layout; PointerSensor distance constraint; + button sized to match tiles |
| `app/(app)/tools/key-finder/_components/key-finder-client.tsx` | Empty state message |

---

## Task 1: Matching library fixes (TDD)

**Files:**
- Modify: `lib/theory/key-finder.ts`
- Modify: `lib/theory/key-finder.test.ts`

### Background

Two bugs in the matching logic:

1. **`TYPE_TO_QUALITY` missing aliases.** `normalizeQuality("minor")` falls back to `"major"` because only `"min"` is in the map. If TonalJS parses `"Aminor"` and the raw suffix is `"minor"`, the chord gets `"major"` quality, fails the diatonic vi check, and is classified as a secondary dominant (0.5) instead of diatonic (1.0).

2. **Half-dim vs dim triad mismatch.** Degree vii in a major key is stored as `Bm7b5` (quality `"half-dim"`). If the user enters `"Bdim"` (a diminished triad, quality `"dim"`), it doesn't match `"half-dim"` and is classified as non-diatonic. Music theory: the dim triad is built from the same three scale tones as the m7b5 seventh chord and IS diatonic on degree vii.

- [ ] **Step 1: Write failing tests for `normalizeQuality` aliases**

Append these tests to the existing `normalizeQuality` describe block in `lib/theory/key-finder.test.ts`:

```typescript
it('maps "minor" to "minor"', () => {
  expect(normalizeQuality("minor")).toBe("minor")
})
it('maps "major" to "major"', () => {
  expect(normalizeQuality("major")).toBe("major")
})
it('maps "augmented" to "aug"', () => {
  expect(normalizeQuality("augmented")).toBe("aug")
})
it('maps "diminished" to "dim"', () => {
  expect(normalizeQuality("diminished")).toBe("dim")
})
it('maps "dominant" to "major"', () => {
  expect(normalizeQuality("dominant")).toBe("major")
})
```

- [ ] **Step 2: Write failing tests for triad matching**

First confirm the top-level import in `lib/theory/key-finder.test.ts` includes `InputChord`:
```typescript
import { parseChord, normalizeQuality, detectKey, type InputChord } from "./key-finder"
```
If `InputChord` is not already imported, add it now.

Append a new `describe` block to `lib/theory/key-finder.test.ts` (after the existing `detectKey` block):

```typescript
describe("detectKey — triad matching", () => {
  it("C major triad + Am triad score 100% fitScore in C major", () => {
    const chords = [parseChord("C"), parseChord("Am")].filter(
      (c): c is InputChord => c !== null,
    )
    expect(chords).toHaveLength(2)
    const results = detectKey(chords)
    const cMajor = results.find(r => r.tonic === "C" && r.mode === "major")
    expect(cMajor).toBeDefined()
    expect(cMajor!.fitScore).toBe(1.0)
  })

  it("Bdim is diatonic (degree vii) in C major", () => {
    const chords = [parseChord("C"), parseChord("Bdim")].filter(
      (c): c is InputChord => c !== null,
    )
    expect(chords).toHaveLength(2)
    const results = detectKey(chords)
    const cMajor = results.find(r => r.tonic === "C" && r.mode === "major")
    expect(cMajor).toBeDefined()
    const bdim = cMajor!.chordAnalysis.find(a => a.inputChord.root === "B")
    expect(bdim?.role).toBe("diatonic")
    expect(bdim?.score).toBe(1.0)
  })
})
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
npx vitest run lib/theory/key-finder.test.ts
```

Expected: the 5 new `normalizeQuality` tests fail, the 2 new `detectKey` tests fail. All existing tests pass.

- [ ] **Step 4: Fix `TYPE_TO_QUALITY` in `lib/theory/key-finder.ts`**

Add these entries to the `TYPE_TO_QUALITY` object (after the `// Augmented` group):

```typescript
// Full-word aliases (TonalJS may return these as chord types)
"minor": "minor", "major": "major",
"augmented": "aug", "diminished": "dim",
"dominant": "major",
```

The complete object should look like this (add the new block after `"aug7"` / `"maj7#5"`):

```typescript
const TYPE_TO_QUALITY: Record<string, string> = {
  // Major quality
  "": "major", "maj": "major", "M": "major", "5": "major",
  "7": "major", "9": "major", "11": "major", "13": "major",
  "7b5": "major", "7#5": "major", "7#11": "major",
  "9#11": "major", "13b9": "major", "alt": "major",
  "7b9": "major", "7#9": "major",
  "maj7": "major", "maj9": "major", "maj11": "major", "maj13": "major",
  "maj7#11": "major",
  "6": "major", "69": "major", "6/9": "major",
  "add9": "major", "add11": "major",
  // Suspended
  "7sus4": "sus", "9sus4": "sus", "13sus4": "sus", "sus2": "sus", "sus4": "sus",
  // Minor quality
  "m": "minor", "min": "minor", "-": "minor",
  "m7": "minor", "m9": "minor", "m11": "minor", "m13": "minor", "-7": "minor",
  "m6": "minor", "m69": "minor", "m6/9": "minor",
  // Minor-major
  "mmaj7": "mmaj7", "mM7": "mmaj7", "-maj7": "mmaj7",
  // Half-diminished
  "m7b5": "half-dim", "ø": "half-dim", "ø7": "half-dim",
  // Diminished
  "dim": "dim", "dim7": "dim", "°7": "dim",
  // Augmented
  "aug": "aug", "+": "aug", "aug7": "aug", "maj7#5": "aug",
  // Full-word aliases (TonalJS may return these as chord types)
  "minor": "minor", "major": "major",
  "augmented": "aug", "diminished": "dim",
  "dominant": "major",
}
```

- [ ] **Step 5: Fix `buildDiatonicLookup` in `lib/theory/key-finder.ts`**

Locate `buildDiatonicLookup`. Replace the loop body to also register a `"dim"` quality entry for every `"m7b5"` chord (so diminished triads match degree vii):

```typescript
function buildDiatonicLookup(diatonicChords: DiatonicChord[]): DiatonicLookup {
  const map: DiatonicLookup = new Map()
  for (const chord of diatonicChords) {
    const chroma = Note.chroma(chord.tonic)
    if (typeof chroma !== "number" || !Number.isFinite(chroma)) continue
    const quality = normalizeQuality(chord.type)
    const existing = map.get(chroma) ?? []
    existing.push({ chord, quality })
    // Half-diminished seventh also accepts its triad (diminished triad)
    if (chord.type === "m7b5") {
      existing.push({ chord, quality: "dim" })
    }
    map.set(chroma, existing)
  }
  return map
}
```

- [ ] **Step 6: Run all tests and confirm they pass**

```bash
npx vitest run lib/theory/key-finder.test.ts
```

Expected: all tests pass (original + 7 new).

- [ ] **Step 7: Commit**

```bash
git add lib/theory/key-finder.ts lib/theory/key-finder.test.ts
git commit -m "fix: expand TYPE_TO_QUALITY aliases and allow dim triads on degree vii"
```

---

## Task 2: Mode label changes

**Files:**
- Modify: `lib/theory/commonality-tiers.ts`

### Background

The key finder currently shows result keys as "C Major" and "A Aeolian". The user wants "C Ionian (major)" and "A Aeolian (natural minor)" to make the mode name explicit.

- [ ] **Step 1: Update displayName strings**

In `lib/theory/commonality-tiers.ts`, change the first two entries of `ALL_KEY_MODES`:

```typescript
export const ALL_KEY_MODES: Array<{ displayName: string; modeName: string; tier: number }> = [
  { displayName: "Ionian (major)",          modeName: "major",              tier: 1 },
  { displayName: "Aeolian (natural minor)", modeName: "minor",              tier: 1 },
  // ... rest unchanged
```

`COMMONALITY_TIER` (the other export in the same file) uses different keys ("Major", "Aeolian") and is used by `scale-finder.ts`. Do **not** change `COMMONALITY_TIER`.

- [ ] **Step 2: Run the full test suite**

```bash
npx vitest run
```

If any tests fail because they compare `result.displayName` to `"C Major"` or `"A Aeolian"`, update those string literals to `"C Ionian (major)"` and `"A Aeolian (natural minor)"` respectively. The tests in `key-finder.test.ts` should use `r.tonic === "C" && r.mode === "major"` (not displayName) — if they don't, fix them now to be robust.

Expected outcome: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add lib/theory/commonality-tiers.ts lib/theory/key-finder.test.ts
git commit -m "feat: rename Major→Ionian (major) and Aeolian→Aeolian (natural minor) in key finder"
```

---

## Task 3: ChordTile redesign

**Files:**
- Modify: `app/(app)/tools/key-finder/_components/chord-tile.tsx`

### Background

Three changes to the chord tile:
1. **× inside tile** — absolute-positioned top-right, removes the external button that currently sits after the tile.
2. **Whole-tile drag** — apply `{...attributes} {...listeners}` to the outer wrapper div (PointerSensor distance constraint, set in Task 4, prevents accidental drags on click). The `⠿` drag handle button is removed.
3. **Validate on commit** — if the typed symbol doesn't parse, silently revert to original instead of saving garbage.

The `onRemove` prop **stays** — ChordTile now calls it internally from the × button, but ChordInputRow still passes it.

- [ ] **Step 1: Replace `chord-tile.tsx` with the updated implementation**

```typescript
"use client"

import { useRef, useEffect, useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ChordQualityBlock } from "@/app/(app)/reference/_components/chord-quality-block"
import { listChordDbSuffixes } from "@/lib/theory/chords"
import { parseChord, type ChordAnalysis } from "@/lib/theory/key-finder"

// Two-char roots (Ab, Bb, etc.) must precede single-char roots (A, B, etc.)
// so that Array.find returns the longest prefix match first.
const ROOT_NOTES = ["Ab", "A", "Bb", "B", "C", "Db", "D", "Eb", "E", "F", "Gb", "G"] as const

const ALL_SUFFIXES = listChordDbSuffixes()

interface ChordTileProps {
  id: string
  symbol: string
  analysis: ChordAnalysis | null
  isEditing: boolean
  onCommit: (symbol: string) => void
  onRemove: () => void
  onStartEdit: () => void
}

export function ChordTile({
  id,
  symbol,
  analysis,
  isEditing,
  onCommit,
  onRemove,
  onStartEdit,
}: ChordTileProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: isEditing,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const [inputValue, setInputValue] = useState(symbol)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) {
      setInputValue(symbol)
      setSuggestions([])
      setActiveIdx(-1)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [isEditing, symbol])

  function detectSuggestions(value: string) {
    if (!value) { setSuggestions([]); return }
    const root = ROOT_NOTES.find(r => value.startsWith(r))
    if (!root) { setSuggestions([]); return }
    const suffix = value.slice(root.length)
    setSuggestions(
      ALL_SUFFIXES.filter(s => s.startsWith(suffix)).slice(0, 10).map(s => `${root}${s}`),
    )
  }

  function commit(value: string) {
    setSuggestions([])
    setActiveIdx(-1)
    const trimmed = value.trim()
    // Reject non-empty input that TonalJS cannot parse — revert to original
    if (trimmed && !parseChord(trimmed)) {
      onCommit(symbol)
      return
    }
    onCommit(trimmed)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, -1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      commit(activeIdx >= 0 && suggestions[activeIdx] ? suggestions[activeIdx] : inputValue)
    } else if (e.key === "Escape") {
      setSuggestions([])
      onCommit(symbol)
    }
  }

  // Editing mode — no drag, no × button
  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style} className="relative flex-shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => {
            setInputValue(e.target.value)
            detectSuggestions(e.target.value)
            setActiveIdx(-1)
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => commit(inputValue)}
          className="w-20 rounded border border-accent bg-card text-foreground text-sm text-center px-2 py-2 focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="Chord"
        />
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 z-50 mt-1 w-28 rounded border border-border bg-card shadow-md overflow-hidden">
            {suggestions.map((s, i) => (
              <button
                key={s}
                type="button"
                onMouseDown={e => { e.preventDefault(); commit(s) }}
                className={`w-full text-left px-2 py-1 text-xs transition-colors ${
                  i === activeIdx
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  const isDiatonic = analysis?.role === "diatonic" || analysis?.role === "borrowed"

  // × button rendered inside every display variant
  const removeBtn = (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onRemove() }}
      aria-label={`remove ${symbol}`}
      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-card border border-border text-muted-foreground hover:text-destructive hover:border-destructive text-[10px] leading-none flex items-center justify-center cursor-pointer z-10"
    >
      ×
    </button>
  )

  // Whole tile is the drag handle — PointerSensor distance:5 prevents accidental drags
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none select-none"
      {...attributes}
      {...listeners}
    >
      {analysis && isDiatonic ? (
        <div className="relative">
          <ChordQualityBlock
            roman={analysis.roman ?? ""}
            chordName={symbol}
            degree={analysis.degree ?? 1}
            isSelected={false}
            onClick={onStartEdit}
          />
          {removeBtn}
        </div>
      ) : analysis ? (
        <div className="relative">
          <button
            type="button"
            onClick={onStartEdit}
            className="flex flex-col items-center rounded-lg border-2 border-border px-3 py-2.5 text-center min-w-[68px] bg-card opacity-40 hover:opacity-60 transition-opacity"
          >
            <span className="text-[10px] text-muted-foreground mb-1">—</span>
            <span className="text-sm font-semibold text-muted-foreground leading-tight">{symbol}</span>
          </button>
          {removeBtn}
        </div>
      ) : (
        <div className="relative">
          <button
            type="button"
            onClick={onStartEdit}
            className="flex flex-col items-center rounded-lg border-2 border-border px-3 py-2.5 text-center min-w-[68px] bg-card hover:bg-muted transition-colors"
          >
            <span className="text-[10px] text-muted-foreground mb-1">&nbsp;</span>
            <span className="text-sm font-semibold text-foreground leading-tight">{symbol}</span>
          </button>
          {removeBtn}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass (no unit tests cover chord-tile directly).

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/tools/key-finder/_components/chord-tile.tsx
git commit -m "feat: move × inside chord tile and make whole tile draggable"
```

---

## Task 4: ChordInputRow layout

**Files:**
- Modify: `app/(app)/tools/key-finder/_components/chord-input-row.tsx`

### Background

Three changes:
1. **PointerSensor distance constraint** — must match Task 3's whole-tile drag approach.
2. **Arrow layout** — each chord at index > 0 is grouped with a leading `→` in a `flex-shrink-0` wrapper, so wrapping starts a new line with `→ [tile]`.
3. **+ button sizing** — match tile height with two-row internal structure.

- [ ] **Step 1: Replace `chord-input-row.tsx` with the updated implementation**

```typescript
"use client"

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
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable"
import { ChordTile } from "./chord-tile"
import type { ChordAnalysis, KeyMatch } from "@/lib/theory/key-finder"

interface ChordEntry {
  id: string
  symbol: string
}

interface ChordInputRowProps {
  chords: ChordEntry[]
  editingId: string | null
  selectedResult: KeyMatch | null
  onChordChange: (chords: ChordEntry[]) => void
  onCommit: (id: string, symbol: string) => void
  onRemove: (id: string) => void
  onStartEdit: (id: string) => void
  onAdd: () => void
}

export function ChordInputRow({
  chords,
  editingId,
  selectedResult,
  onChordChange,
  onCommit,
  onRemove,
  onStartEdit,
  onAdd,
}: ChordInputRowProps) {
  // distance:5 lets quick clicks pass through to inner buttons without activating drag
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = chords.findIndex(c => c.id === active.id)
    const newIndex = chords.findIndex(c => c.id === over.id)
    onChordChange(arrayMove(chords, oldIndex, newIndex))
  }

  function getAnalysis(id: string): ChordAnalysis | null {
    if (!selectedResult) return null
    const index = chords.findIndex(c => c.id === id)
    if (index === -1 || index >= selectedResult.chordAnalysis.length) return null
    return selectedResult.chordAnalysis[index]
  }

  return (
    <div className="flex flex-wrap items-start gap-2">
      <DndContext
        id="key-finder-dnd"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={chords.map(c => c.id)}
          strategy={horizontalListSortingStrategy}
        >
          {chords.map((chord, i) => (
            // Arrow + tile grouped as flex-shrink-0 so wrapping keeps → ahead of its tile
            <div key={chord.id} className="flex items-center gap-1 flex-shrink-0">
              {i > 0 && (
                <span className="text-muted-foreground text-sm select-none">→</span>
              )}
              <ChordTile
                id={chord.id}
                symbol={chord.symbol}
                analysis={getAnalysis(chord.id)}
                isEditing={editingId === chord.id}
                onCommit={symbol => onCommit(chord.id, symbol)}
                onRemove={() => onRemove(chord.id)}
                onStartEdit={() => onStartEdit(chord.id)}
              />
            </div>
          ))}
        </SortableContext>
      </DndContext>

      {/* Add button — outside SortableContext so it cannot be dragged */}
      {/* Two-row structure matches chord tile height exactly */}
      <button
        type="button"
        onClick={onAdd}
        className="flex flex-col items-center rounded-lg border-2 border-dashed border-border px-3 py-2.5 min-w-[68px] text-muted-foreground hover:border-accent hover:text-foreground transition-colors"
        aria-label="add chord"
      >
        <span className="text-[10px] mb-1 invisible">+</span>
        <span className="text-sm">+</span>
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/tools/key-finder/_components/chord-input-row.tsx
git commit -m "feat: add arrows between chord tiles and fix + button sizing"
```

---

## Task 5: Empty state

**Files:**
- Modify: `app/(app)/tools/key-finder/_components/key-finder-client.tsx`

### Background

When no chords have been added, the page shows only the `[+]` button with no explanation. A short helper message improves discoverability.

- [ ] **Step 1: Add empty state message**

In `key-finder-client.tsx`, locate the `<ChordInputRow ... />` block and add the empty state paragraph immediately after it (still inside the outer `<div className="flex flex-col gap-4">`):

```tsx
{/* Chord input row */}
<ChordInputRow
  chords={chords}
  editingId={editingId}
  selectedResult={selectedResult}
  onChordChange={(newChords) => {
    setChords(newChords)
    setSelectedResult(null)
  }}
  onCommit={handleCommit}
  onRemove={handleRemove}
  onStartEdit={handleStartEdit}
  onAdd={handleAdd}
/>

{/* Empty state */}
{chords.length === 0 && (
  <p className="text-sm text-muted-foreground">Add chords to analyse.</p>
)}
```

- [ ] **Step 2: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/tools/key-finder/_components/key-finder-client.tsx
git commit -m "feat: show empty state message when no chords added to key finder"
```

---

## Manual Testing Checklist

After all tasks complete, verify in the browser at `/tools/key-finder`:

- [ ] Opening the page shows only `[+]` button and "Add chords to analyse." message
- [ ] `[+]` button is the same height as a chord tile
- [ ] Adding first chord: no arrow before it; adding second: `→` appears before second chord
- [ ] Wrapping (add 6+ chords): wrapped lines start with `→ [tile]`
- [ ] `×` appears inside each tile (top-right corner); clicking removes the tile
- [ ] Dragging a tile reorders it; clicking to edit still works (no accidental drag)
- [ ] Typing garbage text and pressing Enter/blurring reverts to previous chord (or removes new tile)
- [ ] `C` + `Am` → C major and A aeolian both show 100% match
- [ ] `C` + `Bdim` → C major shows, Bdim shown as diatonic
- [ ] Result list shows "C Ionian (major)" and "A Aeolian (natural minor)" labels
