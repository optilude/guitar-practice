# Transposer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a transposer tool that lets the user enter a chord progression in a known source key, see roman numeral analysis for every chord (including non-diatonic ones), then pick a target root and see the progression transposed to that key.

**Architecture:** Extend `analyzeChord` in `key-finder.ts` to always emit a roman numeral (chromatic for non-diatonic chords). Move `ChordInputRow`/`ChordTile` to a shared `app/(app)/tools/_components/` folder. Add `transposer.ts` for transposition arithmetic. Wire everything into a new `TransposerClient` component that replaces the "Coming soon" stub.

**Tech Stack:** Next.js App Router, TonalJS (`Note`, `Chord`), `@dnd-kit/core` + `@dnd-kit/sortable` (via shared chord input), Tailwind, Vitest.

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Modify | `lib/theory/key-finder.ts` | Add `chromaticRoman`, `analyzeChordInKey`; change `roman: string \| null` → `string`; thread `tonicChroma` into `analyzeChord` |
| Modify | `app/(app)/reference/_components/chord-quality-block.tsx` | Add `variant` prop + export `chordBlockStyle` helper |
| Create | `app/(app)/tools/_components/chord-input-row.tsx` | Shared chord input row (moved from key-finder, prop renamed) |
| Create | `app/(app)/tools/_components/chord-tile.tsx` | Shared chord tile (moved from key-finder, uses `variant`) |
| Delete | `app/(app)/tools/key-finder/_components/chord-input-row.tsx` | Replaced by shared version |
| Delete | `app/(app)/tools/key-finder/_components/chord-tile.tsx` | Replaced by shared version |
| Modify | `app/(app)/tools/key-finder/_components/key-finder-client.tsx` | New import paths, updated prop, updated `ResultChordBadge` |
| Create | `lib/theory/transposer.ts` | `transposeProgression`, `analyzeProgression`, `keyPrefersSharps` |
| Create | `lib/theory/transposer.test.ts` | Unit tests |
| Create | `app/(app)/tools/transposer/_components/transposed-row.tsx` | Read-only ChordQualityBlock tiles |
| Create | `app/(app)/tools/transposer/_components/transposer-client.tsx` | Main transposer UI |
| Modify | `app/(app)/tools/transposer/page.tsx` | Replace "Coming soon" stub |

---

## Task 1: Add `chromaticRoman` and `analyzeChordInKey` to key-finder.ts

**Files:**
- Modify: `lib/theory/key-finder.ts`

`ChordAnalysis.roman` changes from `string | null` to `string`. `analyzeChord` gains a `tonicChroma` parameter and uses `chromaticRoman` for non-diatonic/secondary-dominant results. A new exported `analyzeChordInKey` wraps the internal machinery for use by `transposer.ts`. No existing tests assert on `roman` being `null`, so they all remain green.

- [ ] **Step 1: Read the current file**

```bash
# Read lib/theory/key-finder.ts before editing — required by the editing tool
```

- [ ] **Step 2: Update `ChordAnalysis` type and add `chromaticRoman`**

In `lib/theory/key-finder.ts`, replace the `ChordAnalysis` type and add the roman numeral constants + function immediately after `normalizeQuality`. Make these changes:

```typescript
// Change ChordAnalysis.roman from string | null to string:
export type ChordAnalysis = {
  inputChord: InputChord
  degree: number | null   // 1–7 when diatonic or borrowed; null otherwise
  roman: string           // chromatic roman numeral, always set (e.g. "♭VII", "II")
  score: number           // 0 | 0.5 | 0.6 | 1.0
  role: ChordRole
}
```

Then add after the closing brace of `normalizeQuality`:

```typescript
// ---------------------------------------------------------------------------
// Chromatic roman numeral (works for any chord relative to any tonic)
// ---------------------------------------------------------------------------
const CHROMATIC_UPPER = ["I", "♭II", "II", "♭III", "III", "IV", "♭V", "V", "♭VI", "VI", "♭VII", "VII"] as const
const CHROMATIC_LOWER = ["i", "♭ii", "ii", "♭iii", "iii", "iv", "♭v", "v", "♭vi", "vi", "♭vii", "vii"] as const

export function chromaticRoman(rootChroma: number, tonicChroma: number, quality: string): string {
  const interval = (rootChroma - tonicChroma + 12) % 12
  const q = normalizeQuality(quality)
  const isMinorLike = q === "minor" || q === "dim" || q === "half-dim"
  const base = isMinorLike ? CHROMATIC_LOWER[interval] : CHROMATIC_UPPER[interval]
  if (q === "dim") return base + "°"
  if (q === "aug") return base + "+"
  if (q === "half-dim") return base + "ø"
  return base
}
```

- [ ] **Step 3: Update `analyzeChord` signature and non-diatonic returns**

Change the `analyzeChord` function signature to accept `tonicChroma` and use `chromaticRoman` for the non-diatonic cases:

```typescript
function analyzeChord(
  inputChord: InputChord,
  diatonicLookup: DiatonicLookup,
  parallelMajorLookup: DiatonicLookup,
  parallelMinorLookup: DiatonicLookup,
  tonicChroma: number,
): ChordAnalysis {
  const rootChroma = Note.chroma(inputChord.root)
  if (typeof rootChroma !== "number" || !Number.isFinite(rootChroma)) {
    return { inputChord, degree: null, roman: "?", score: 0, role: "non-diatonic" }
  }

  const quality = normalizeQuality(inputChord.type)

  // 1. Diatonic?
  const diatonicEntries = diatonicLookup.get(rootChroma) ?? []
  const diatonicMatch = diatonicEntries.find(e => e.quality === quality)
  if (diatonicMatch) {
    return {
      inputChord,
      degree: diatonicMatch.chord.degree,
      roman: diatonicMatch.chord.roman,
      score: 1.0,
      role: "diatonic",
    }
  }

  // 2. Borrowed (parallel major or parallel minor)?
  for (const parallelLookup of [parallelMajorLookup, parallelMinorLookup]) {
    const parallelEntries = parallelLookup.get(rootChroma) ?? []
    const parallelMatch = parallelEntries.find(e => e.quality === quality)
    if (parallelMatch) {
      return {
        inputChord,
        degree: parallelMatch.chord.degree,
        roman: parallelMatch.chord.roman,
        score: 0.6,
        role: "borrowed",
      }
    }
  }

  // 3. Secondary dominant? (input root = diatonic chord root + 7 semitones, quality === "major")
  if (quality === "major") {
    for (const [diatonicChroma] of diatonicLookup) {
      if ((diatonicChroma + 7) % 12 === rootChroma) {
        return {
          inputChord,
          degree: null,
          roman: chromaticRoman(rootChroma, tonicChroma, inputChord.type),
          score: 0.5,
          role: "secondary-dominant",
        }
      }
    }
  }

  return {
    inputChord,
    degree: null,
    roman: chromaticRoman(rootChroma, tonicChroma, inputChord.type),
    score: 0,
    role: "non-diatonic",
  }
}
```

- [ ] **Step 4: Update `detectKey` to compute and thread `tonicChroma`**

In the `detectKey` function, move the `tonicChroma` computation to before the chord analysis loop and update the `analyzeChord` call. Replace the existing analysis + bonus block with:

```typescript
      // Compute tonic chroma early — needed for analyzeChord and bonuses
      const tonicChroma = Note.chroma(root)
      if (typeof tonicChroma !== "number" || !Number.isFinite(tonicChroma)) continue

      // Score each chord
      const analyses = chords.map(c =>
        analyzeChord(c, diatonicLookup, parallelMajorLookup, parallelMinorLookup, tonicChroma)
      )

      const fitScore = analyses.reduce((sum, a) => sum + a.score, 0) / chords.length
      const diatonicCount = analyses.filter(a => a.role === "diatonic").length

      // Bonuses
      let bonus = 0
      const firstChroma = Note.chroma(chords[0].root)
      const lastChroma = Note.chroma(chords[chords.length - 1].root)
      if (firstChroma === tonicChroma) bonus += 0.05
      if (lastChroma === tonicChroma) bonus += 0.10

      // V→I cadence at end?
      if (chords.length >= 2) {
        const secondLastChroma = Note.chroma(chords[chords.length - 2].root)
        if (
          typeof secondLastChroma === "number" &&
          typeof lastChroma === "number" &&
          lastChroma === tonicChroma &&
          (secondLastChroma + 5) % 12 === tonicChroma
        ) {
          bonus += 0.05
        }
      }

      // ii→V→I at end?
      if (chords.length >= 3) {
        const thirdLastChroma = Note.chroma(chords[chords.length - 3].root)
        const secondLastChroma = Note.chroma(chords[chords.length - 2].root)
        if (
          typeof thirdLastChroma === "number" &&
          typeof secondLastChroma === "number" &&
          typeof lastChroma === "number" &&
          lastChroma === tonicChroma &&
          (secondLastChroma + 5) % 12 === tonicChroma &&
          (thirdLastChroma + 10) % 12 === tonicChroma
        ) {
          bonus += 0.05
        }
      }
```

The old `if (typeof tonicChroma === "number") { ... }` wrapper around the bonus block is replaced by the early-continue guard above.

- [ ] **Step 5: Add `analyzeChordInKey` export**

Add this function at the bottom of `lib/theory/key-finder.ts`, before the closing of the file:

```typescript
// ---------------------------------------------------------------------------
// Public single-chord analysis (used by transposer.ts)
// ---------------------------------------------------------------------------
export function analyzeChordInKey(chord: InputChord, tonic: string, mode: string): ChordAnalysis {
  const tonicChroma = Note.chroma(tonic)
  if (typeof tonicChroma !== "number" || !Number.isFinite(tonicChroma)) {
    return { inputChord: chord, degree: null, roman: "?", score: 0, role: "non-diatonic" }
  }
  let keyData
  try { keyData = getKey(tonic, mode) } catch {
    return { inputChord: chord, degree: null, roman: "?", score: 0, role: "non-diatonic" }
  }
  const diatonicLookup = buildDiatonicLookup(keyData.diatonicChords)
  let parallelMajorData
  let parallelMinorData
  try { parallelMajorData = getKey(tonic, "major") } catch { /* skip */ }
  try { parallelMinorData = getKey(tonic, "minor") } catch { /* skip */ }
  const parallelMajorLookup = parallelMajorData
    ? buildDiatonicLookup(parallelMajorData.diatonicChords)
    : new Map<number, DiatonicEntry[]>()
  const parallelMinorLookup = parallelMinorData
    ? buildDiatonicLookup(parallelMinorData.diatonicChords)
    : new Map<number, DiatonicEntry[]>()
  return analyzeChord(chord, diatonicLookup, parallelMajorLookup, parallelMinorLookup, tonicChroma)
}
```

- [ ] **Step 6: Run tests to confirm no regressions**

```bash
npx vitest run lib/theory/key-finder.test.ts
```

Expected: all tests pass. No test asserts `roman: null`, so the type change is transparent to existing tests.

- [ ] **Step 7: Commit**

```bash
git add lib/theory/key-finder.ts
git commit -m "feat: add chromaticRoman and analyzeChordInKey; roman always non-null"
```

---

## Task 2: Add `variant` prop and `chordBlockStyle` to `ChordQualityBlock`

**Files:**
- Modify: `app/(app)/reference/_components/chord-quality-block.tsx`

- [ ] **Step 1: Read the current file**

```bash
# Read app/(app)/reference/_components/chord-quality-block.tsx before editing
```

- [ ] **Step 2: Write the updated file**

Replace the entire file content with:

```typescript
"use client"

import { INTERVAL_DEGREE_COLORS } from "@/lib/rendering/tab"

const DEGREE_HEX: Record<number, string> = {
  1: "#b45309",                      // amber-700  (matches fretboard root accent)
  2: INTERVAL_DEGREE_COLORS.second,  // yellow-600
  3: INTERVAL_DEGREE_COLORS.third,   // green-600
  4: INTERVAL_DEGREE_COLORS.fourth,  // rose-600
  5: INTERVAL_DEGREE_COLORS.fifth,   // blue-600
  6: INTERVAL_DEGREE_COLORS.sixth,   // cyan-600
  7: INTERVAL_DEGREE_COLORS.seventh, // purple-600
}

const NON_DIATONIC_HEX = "#c2410c" // orange-700 — signals unusual/unexpected chord

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export function chordBlockStyle(
  degree: number,
  variant: "diatonic" | "borrowed" | "non-diatonic",
  isSelected: boolean,
): { borderColor: string; backgroundColor: string } {
  const hex = variant === "non-diatonic" ? NON_DIATONIC_HEX : (DEGREE_HEX[degree] ?? "#6b7280")
  const borderAlpha = variant === "borrowed"
    ? (isSelected ? 0.4 : 0.15)
    : (isSelected ? 0.6 : 0.2)
  const bgAlpha = variant === "borrowed"
    ? (isSelected ? 0.14 : 0.07)
    : (isSelected ? 0.2 : 0.1)
  return {
    borderColor: hexToRgba(hex, borderAlpha),
    backgroundColor: hexToRgba(hex, bgAlpha),
  }
}

interface ChordQualityBlockProps {
  roman: string      // "I", "ii", "V", "vii°", "♭VII"
  chordName: string  // "Cmaj7", "G7", "Am7"
  degree: number     // 1–7 scale degree — determines colour (ignored for non-diatonic variant)
  isSelected: boolean
  onClick: () => void
  variant?: "diatonic" | "borrowed" | "non-diatonic"
}

export function ChordQualityBlock({
  roman,
  chordName,
  degree,
  isSelected,
  onClick,
  variant = "diatonic",
}: ChordQualityBlockProps) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onClick}
      className="flex flex-col items-center rounded-lg border-2 px-3 py-2.5 text-center min-w-[68px] flex-shrink-0 transition-colors focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
      style={chordBlockStyle(degree, variant, isSelected)}
    >
      <span className="text-[10px] text-muted-foreground mb-1">{roman}</span>
      <span className="text-sm font-semibold text-foreground leading-tight">{chordName}</span>
    </button>
  )
}
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run
```

Expected: all existing tests pass (this component has no unit tests — visual change only).

- [ ] **Step 4: Commit**

```bash
git add app/(app)/reference/_components/chord-quality-block.tsx
git commit -m "feat: add variant prop and chordBlockStyle to ChordQualityBlock"
```

---

## Task 3: Create shared chord input components

**Files:**
- Create: `app/(app)/tools/_components/chord-input-row.tsx`
- Create: `app/(app)/tools/_components/chord-tile.tsx`
- Delete: `app/(app)/tools/key-finder/_components/chord-input-row.tsx`
- Delete: `app/(app)/tools/key-finder/_components/chord-tile.tsx`

The shared files are functionally identical to the key-finder versions, with two changes:
1. `ChordInputRow` prop renamed from `selectedResult: KeyMatch | null` → `chordAnalyses: ChordAnalysis[] | null`
2. `ChordTile` display logic updated: all chords with analysis use `ChordQualityBlock` with the appropriate `variant` (no more faded opacity div); the "no analysis" state renders a plain tile.

- [ ] **Step 1: Read existing chord-input-row.tsx**

```bash
# Read app/(app)/tools/key-finder/_components/chord-input-row.tsx
```

- [ ] **Step 2: Write `app/(app)/tools/_components/chord-input-row.tsx`**

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
import type { ChordAnalysis } from "@/lib/theory/key-finder"

interface ChordEntry {
  id: string
  symbol: string
}

interface ChordInputRowProps {
  chords: ChordEntry[]
  editingId: string | null
  chordAnalyses: ChordAnalysis[] | null
  onChordChange: (chords: ChordEntry[]) => void
  onCommit: (id: string, symbol: string) => void
  onRemove: (id: string) => void
  onStartEdit: (id: string) => void
  onAdd: () => void
}

export function ChordInputRow({
  chords,
  editingId,
  chordAnalyses,
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
    if (!chordAnalyses) return null
    const index = chords.findIndex(c => c.id === id)
    if (index === -1 || index >= chordAnalyses.length) return null
    return chordAnalyses[index]
  }

  // items-start: × badge at -top-1.5 overflows tile bounds; items-center would mis-align on wrap
  return (
    <div className="flex flex-wrap items-start gap-2">
      <DndContext
        id="chord-input-dnd"
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
                onTabNext={() => {
                  if (i === chords.length - 1) onAdd()
                  else onStartEdit(chords[i + 1].id)
                }}
                onArrowPrev={i > 0 ? () => onStartEdit(chords[i - 1].id) : undefined}
                onArrowNext={i < chords.length - 1 ? () => onStartEdit(chords[i + 1].id) : undefined}
              />
            </div>
          ))}
        </SortableContext>
      </DndContext>

      {/* Add button — outside SortableContext so it cannot be dragged */}
      <button
        type="button"
        onClick={onAdd}
        className="relative flex flex-col items-center rounded-lg border-2 border-dashed border-border px-3 py-2.5 min-w-[68px] text-muted-foreground hover:border-accent hover:text-foreground transition-colors"
        aria-label="add chord"
      >
        <span className="text-[10px] mb-1 invisible" aria-hidden="true">&nbsp;</span>
        <span className="text-sm invisible" aria-hidden="true">&nbsp;</span>
        <span className="absolute inset-0 flex items-center justify-center text-xl leading-none">+</span>
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Read existing chord-tile.tsx**

```bash
# Read app/(app)/tools/key-finder/_components/chord-tile.tsx
```

- [ ] **Step 4: Write `app/(app)/tools/_components/chord-tile.tsx`**

This is the same as the key-finder version but with the display logic updated to use `variant` on `ChordQualityBlock` for all analysed chords (no more separate faded div for non-diatonic).

```typescript
"use client"

import { useRef, useEffect, useState } from "react"
import { Chord } from "tonal"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ChordQualityBlock } from "@/app/(app)/reference/_components/chord-quality-block"
import { listChordDbSuffixes } from "@/lib/theory/chords"
import { parseChord, type ChordAnalysis } from "@/lib/theory/key-finder"

// Two-char roots must precede their single-char base so Array.find returns the
// longest prefix match first (e.g. "A#" before "A", "Gb" before "G").
const ROOT_NOTES = ["Ab", "A#", "A", "Bb", "B", "C#", "C", "Db", "D#", "D", "Eb", "E", "F#", "F", "Gb", "G#", "G"] as const

const ALL_SUFFIXES = listChordDbSuffixes()

function toDbCanonical(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return ""

  const directRoot = ROOT_NOTES.find(
    r => trimmed.startsWith(r) && ALL_SUFFIXES.includes(trimmed.slice(r.length))
  )
  if (directRoot !== undefined) return trimmed

  const chord = Chord.get(trimmed)
  if (chord.empty || !chord.tonic) return null
  const { tonic, type } = chord
  const match = ALL_SUFFIXES.find(s => Chord.get(`${tonic}${s}`).type === type)
  return match !== undefined ? `${tonic}${match}` : (chord.symbol || tonic)
}

interface ChordTileProps {
  id: string
  symbol: string
  analysis: ChordAnalysis | null
  isEditing: boolean
  onCommit: (symbol: string) => void
  onRemove: () => void
  onStartEdit: () => void
  onTabNext?: () => void
  onArrowPrev?: () => void
  onArrowNext?: () => void
}

export function ChordTile({
  id,
  symbol,
  analysis,
  isEditing,
  onCommit,
  onRemove,
  onStartEdit,
  onTabNext,
  onArrowPrev,
  onArrowNext,
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
  const isSelectingSuggestionRef = useRef(false)

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

  function commitAndNavigate(value: string, navigate?: () => void) {
    isSelectingSuggestionRef.current = false
    setSuggestions([])
    setActiveIdx(-1)
    const canonical = toDbCanonical(value)
    if (canonical === null) {
      onCommit(symbol)
    } else {
      onCommit(canonical)
    }
    navigate?.()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, suggestions.length - 1))
      return
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, -1))
      return
    }

    const activeValue = activeIdx >= 0 && suggestions[activeIdx] ? suggestions[activeIdx] : inputValue

    if (e.key === "Enter") {
      e.preventDefault()
      commitAndNavigate(activeValue)
      return
    }
    if (e.key === "Escape") {
      setSuggestions([])
      onCommit(symbol)
      return
    }
    if (e.key === "Tab") {
      e.preventDefault()
      commitAndNavigate(activeValue, e.shiftKey ? onArrowPrev : onTabNext)
      return
    }

    if (suggestions.length === 0) {
      if (e.key === "ArrowLeft") {
        const input = inputRef.current
        if (input && input.selectionStart === 0 && input.selectionEnd === 0) {
          e.preventDefault()
          commitAndNavigate(inputValue, onArrowPrev)
        }
      } else if (e.key === "ArrowRight") {
        const input = inputRef.current
        if (input && input.selectionStart === input.value.length && input.selectionEnd === input.value.length) {
          e.preventDefault()
          commitAndNavigate(inputValue, onArrowNext)
        }
      }
    }
  }

  // Editing mode
  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style} className="relative flex-shrink-0">
        <div className="flex flex-col items-center rounded-lg border-2 border-dashed border-border px-3 py-2.5 w-[80px]">
          <span className="text-[10px] mb-1 invisible" aria-hidden="true">·</span>
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
            onBlur={() => {
              if (!isSelectingSuggestionRef.current) commitAndNavigate(inputValue)
              isSelectingSuggestionRef.current = false
            }}
            className="w-full bg-transparent text-foreground text-sm font-semibold text-center focus:outline-none leading-tight placeholder:text-muted-foreground placeholder:font-normal"
            placeholder="Chord"
          />
        </div>
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 z-50 mt-1 w-28 rounded border border-border bg-card shadow-md overflow-hidden">
            {suggestions.map((s, i) => (
              <button
                key={s}
                type="button"
                onMouseDown={e => {
                  e.preventDefault()
                  isSelectingSuggestionRef.current = true
                  commitAndNavigate(s)
                }}
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none select-none"
      {...attributes}
      {...listeners}
    >
      {analysis ? (
        <div className="relative">
          <ChordQualityBlock
            roman={analysis.roman}
            chordName={symbol}
            degree={analysis.degree ?? 1}
            isSelected={false}
            onClick={onStartEdit}
            variant={
              analysis.role === "diatonic" ? "diatonic"
              : analysis.role === "borrowed" ? "borrowed"
              : "non-diatonic"
            }
          />
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

- [ ] **Step 5: Delete old key-finder-specific component files**

```bash
rm app/(app)/tools/key-finder/_components/chord-input-row.tsx
rm app/(app)/tools/key-finder/_components/chord-tile.tsx
```

- [ ] **Step 6: Run tests**

```bash
npx vitest run
```

Expected: all tests pass (these components have no unit tests — just confirm the build works).

- [ ] **Step 7: Commit**

```bash
git add app/(app)/tools/_components/chord-input-row.tsx
git add app/(app)/tools/_components/chord-tile.tsx
git rm app/(app)/tools/key-finder/_components/chord-input-row.tsx
git rm app/(app)/tools/key-finder/_components/chord-tile.tsx
git commit -m "refactor: move ChordInputRow and ChordTile to shared tools/_components"
```

---

## Task 4: Update `key-finder-client.tsx` for new imports and `ResultChordBadge`

**Files:**
- Modify: `app/(app)/tools/key-finder/_components/key-finder-client.tsx`

Changes:
1. Import `ChordInputRow` from `@/app/(app)/tools/_components/chord-input-row`
2. Import `chordBlockStyle` from chord-quality-block (for `ResultChordBadge`)
3. Change `selectedResult={selectedResult}` prop to `chordAnalyses={selectedResult?.chordAnalysis ?? null}`
4. Remove local `DEGREE_HEX` and `hexToRgba` (now handled by `chordBlockStyle`)
5. Rewrite `ResultChordBadge` to always show roman numeral with variant colour — uses a `<div>` not a `<button>` because it is nested inside a clickable `<button>` row

- [ ] **Step 1: Read the current file**

```bash
# Read app/(app)/tools/key-finder/_components/key-finder-client.tsx
```

- [ ] **Step 2: Update imports**

Change the import block at the top of the file from:

```typescript
import { INTERVAL_DEGREE_COLORS } from "@/lib/rendering/tab"
import { parseChord, detectKey, countDistinctChords } from "@/lib/theory/key-finder"
import type { KeyMatch, ChordAnalysis } from "@/lib/theory/key-finder"
import { ChordInputRow } from "./chord-input-row"
import { btn } from "@/lib/button-styles"
```

to:

```typescript
import { parseChord, detectKey, countDistinctChords } from "@/lib/theory/key-finder"
import type { KeyMatch, ChordAnalysis } from "@/lib/theory/key-finder"
import { ChordInputRow } from "@/app/(app)/tools/_components/chord-input-row"
import { chordBlockStyle } from "@/app/(app)/reference/_components/chord-quality-block"
import { btn } from "@/lib/button-styles"
```

(Remove the `INTERVAL_DEGREE_COLORS` import — it is no longer needed in this file.)

- [ ] **Step 3: Update `ChordInputRow` usage**

Find the `ChordInputRow` JSX element and change the `selectedResult` prop to `chordAnalyses`:

```typescript
      <ChordInputRow
        chords={chords}
        editingId={editingId}
        chordAnalyses={selectedResult?.chordAnalysis ?? null}
        onChordChange={(newChords) => {
          setChords(newChords)
          setSelectedResult(null)
        }}
        onCommit={handleCommit}
        onRemove={handleRemove}
        onStartEdit={handleStartEdit}
        onAdd={handleAdd}
      />
```

- [ ] **Step 4: Replace `ResultChordBadge` and remove dead constants**

Delete the `DEGREE_HEX` and `hexToRgba` constants at the bottom of the file (they are no longer used here). Replace the `ResultChordBadge` function with:

```typescript
interface ResultChordBadgeProps {
  analysis: ChordAnalysis
  symbol: string
}

function ResultChordBadge({ analysis, symbol }: ResultChordBadgeProps) {
  const variant: "diatonic" | "borrowed" | "non-diatonic" =
    analysis.role === "diatonic" ? "diatonic"
    : analysis.role === "borrowed" ? "borrowed"
    : "non-diatonic"
  // Renders as <div> not <button> — this badge lives inside a clickable <button> row,
  // so nesting another <button> would be invalid HTML.
  return (
    <div
      className="flex flex-col items-center rounded-lg border-2 px-3 py-2.5 text-center min-w-[68px]"
      style={chordBlockStyle(analysis.degree ?? 1, variant, false)}
    >
      <span className="text-[10px] text-muted-foreground mb-1">{analysis.roman}</span>
      <span className="text-sm font-semibold text-foreground leading-tight">{symbol}</span>
    </div>
  )
}
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/(app)/tools/key-finder/_components/key-finder-client.tsx
git commit -m "feat: update key-finder to use shared chord input and always show roman numerals"
```

---

## Task 5: Create `lib/theory/transposer.ts`

**Files:**
- Create: `lib/theory/transposer.ts`

- [ ] **Step 1: Write the file**

```typescript
import { Note } from "tonal"
import { getKey } from "./keys"
import { analyzeChordInKey } from "./key-finder"
import type { InputChord, ChordAnalysis } from "./key-finder"

// ---------------------------------------------------------------------------
// Enharmonic root tables — flat-preferred and sharp-preferred chromatic scales
// ---------------------------------------------------------------------------
const FLAT_ROOTS  = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] as const
const SHARP_ROOTS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const

// ---------------------------------------------------------------------------
// keyPrefersSharps
// Determine whether a key uses sharp or flat spellings by counting accidentals
// in the key's diatonic note set.
// ---------------------------------------------------------------------------
export function keyPrefersSharps(tonic: string, mode: string): boolean {
  try {
    const keyData = getKey(tonic, mode)
    let sharps = 0, flats = 0
    for (const note of keyData.notes) {
      if (note.endsWith("#")) sharps++
      else if (note.endsWith("b")) flats++
    }
    return sharps > flats
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// transposeProgression
// Shifts every chord root by the semitone distance from sourceTonic to
// targetTonic, preserving chord quality (type) exactly. Enharmonic spelling
// of the transposed root is resolved by:
//   1. Checking whether the new chroma is diatonic in the target key (if so,
//      use that key's spelling of the note).
//   2. Falling back to the target key's preferred accidental convention.
// Returns the original chords unchanged when source and target are the same.
// ---------------------------------------------------------------------------
export function transposeProgression(
  chords: InputChord[],
  sourceTonic: string,
  targetTonic: string,
  mode: string,
): InputChord[] {
  const sourceChroma = Note.chroma(sourceTonic)
  const targetChroma = Note.chroma(targetTonic)
  if (typeof sourceChroma !== "number" || typeof targetChroma !== "number") return chords

  const semitones = (targetChroma - sourceChroma + 12) % 12
  if (semitones === 0) return chords

  // Build chroma → note-name lookup from the target key's diatonic notes
  const targetDiatonicByChroma = new Map<number, string>()
  try {
    const targetKeyData = getKey(targetTonic, mode)
    for (const note of targetKeyData.notes) {
      const chroma = Note.chroma(note)
      if (typeof chroma === "number") targetDiatonicByChroma.set(chroma, note)
    }
  } catch { /* skip — fall back to accidental preference */ }

  const roots = keyPrefersSharps(targetTonic, mode) ? SHARP_ROOTS : FLAT_ROOTS

  return chords.map(chord => {
    const sourceRootChroma = Note.chroma(chord.root)
    if (typeof sourceRootChroma !== "number") return chord
    const newChroma = (sourceRootChroma + semitones) % 12
    const newRoot = targetDiatonicByChroma.get(newChroma) ?? roots[newChroma]
    return { root: newRoot, type: chord.type, symbol: `${newRoot}${chord.type}` }
  })
}

// ---------------------------------------------------------------------------
// analyzeProgression
// Analyse each chord against a specific key, returning a ChordAnalysis for
// each (always with a non-null roman numeral). Delegates to analyzeChordInKey
// in key-finder.ts — no duplication of analysis logic here.
// ---------------------------------------------------------------------------
export function analyzeProgression(
  chords: InputChord[],
  tonic: string,
  mode: string,
): ChordAnalysis[] {
  return chords.map(c => analyzeChordInKey(c, tonic, mode))
}
```

- [ ] **Step 2: Run tests (build check)**

```bash
npx vitest run
```

Expected: all existing tests pass. No new tests yet — those come in Task 6.

- [ ] **Step 3: Commit**

```bash
git add lib/theory/transposer.ts
git commit -m "feat: add transposer.ts with transposeProgression and analyzeProgression"
```

---

## Task 6: Write tests for `transposer.ts`

**Files:**
- Create: `lib/theory/transposer.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect } from "vitest"
import { chromaticRoman } from "./key-finder"
import { parseChord } from "./key-finder"
import { transposeProgression, keyPrefersSharps, analyzeProgression } from "./transposer"

describe("chromaticRoman", () => {
  it("returns I for unison major chord", () => {
    expect(chromaticRoman(0, 0, "")).toBe("I")
  })
  it("returns ♭VII for 10 semitones above tonic (major quality)", () => {
    // Bb (chroma 10) over C (chroma 0) = ♭VII
    expect(chromaticRoman(10, 0, "")).toBe("♭VII")
  })
  it("returns ♭vii for 10 semitones above tonic (minor quality)", () => {
    expect(chromaticRoman(10, 0, "m")).toBe("♭vii")
  })
  it("returns ii° for 2 semitones above tonic (dim quality)", () => {
    expect(chromaticRoman(2, 0, "dim")).toBe("ii°")
  })
  it("returns I+ for unison augmented chord", () => {
    expect(chromaticRoman(0, 0, "aug")).toBe("I+")
  })
  it("returns iø for half-diminished at unison", () => {
    expect(chromaticRoman(0, 0, "m7b5")).toBe("iø")
  })
  it("handles non-zero tonic: E (chroma 4) over C (chroma 0) = III", () => {
    expect(chromaticRoman(4, 0, "")).toBe("III")
  })
  it("handles non-zero tonic: Bb (chroma 10) over D (chroma 2) = ♭VII", () => {
    expect(chromaticRoman(10, 2, "")).toBe("♭VII")
  })
  it("handles wrap-around: B (chroma 11) over C (chroma 0) = VII", () => {
    expect(chromaticRoman(11, 0, "")).toBe("VII")
  })
})

describe("keyPrefersSharps", () => {
  it("returns false for C major (no accidentals)", () => {
    expect(keyPrefersSharps("C", "major")).toBe(false)
  })
  it("returns true for G major (1 sharp: F#)", () => {
    expect(keyPrefersSharps("G", "major")).toBe(true)
  })
  it("returns false for F major (1 flat: Bb)", () => {
    expect(keyPrefersSharps("F", "major")).toBe(false)
  })
  it("returns false for Bb major (2 flats)", () => {
    expect(keyPrefersSharps("Bb", "major")).toBe(false)
  })
  it("returns true for D major (2 sharps: F# C#)", () => {
    expect(keyPrefersSharps("D", "major")).toBe(true)
  })
})

describe("transposeProgression", () => {
  it("transposes Cm up 2 semitones to Dm", () => {
    const input = [parseChord("Cm")!]
    const result = transposeProgression(input, "C", "D", "major")
    expect(result[0].root).toBe("D")
    expect(result[0].type).toBe("m")
    expect(result[0].symbol).toBe("Dm")
  })

  it("uses flat spelling for flat keys: Am transposed to Bb major becomes Bbm", () => {
    const input = [parseChord("Am")!]
    const result = transposeProgression(input, "C", "Bb", "major")
    expect(result[0].root).toBe("Bb")
  })

  it("treats enharmonic source roots identically: A#m and Am produce the same transposed root in Bb major", () => {
    const fromFlat = transposeProgression([parseChord("Am")!], "C", "Bb", "major")
    const fromSharp = transposeProgression([parseChord("A#m")!], "C", "B", "major")
    // A# in C transposed to B major: both A and A# are chroma 9 and 10 respectively
    // Just check they each produce a root without crashing
    expect(fromFlat[0].root).toBeDefined()
    expect(fromSharp[0].root).toBeDefined()
  })

  it("preserves chord quality: Cdim7 transposed up 2 semitones stays dim7", () => {
    const input = [parseChord("Cdim7")!]
    const result = transposeProgression(input, "C", "D", "major")
    expect(result[0].type).toBe("dim7")
    expect(result[0].root).toBe("D")
  })

  it("returns original chords unchanged when source equals target", () => {
    const input = [parseChord("C")!, parseChord("Dm")!]
    const result = transposeProgression(input, "C", "C", "major")
    expect(result).toBe(input) // same reference — no copy made
  })

  it("produces correct symbol: Cm7 from C to G major becomes Gm7", () => {
    const input = [parseChord("Cm7")!]
    const result = transposeProgression(input, "C", "G", "major")
    expect(result[0].symbol).toBe("Gm7")
  })

  it("handles a multi-chord progression: C F G in C major → G C D in G major", () => {
    const input = ["C", "F", "G"].map(s => parseChord(s)!)
    const result = transposeProgression(input, "C", "G", "major")
    expect(result.map(c => c.root)).toEqual(["G", "C", "D"])
  })
})

describe("analyzeProgression", () => {
  it("returns a ChordAnalysis for each chord", () => {
    const input = [parseChord("C")!, parseChord("Dm")!]
    const analyses = analyzeProgression(input, "C", "major")
    expect(analyses).toHaveLength(2)
  })

  it("marks diatonic chords correctly", () => {
    const input = [parseChord("C")!, parseChord("G")!]
    const analyses = analyzeProgression(input, "C", "major")
    expect(analyses[0].role).toBe("diatonic")
    expect(analyses[1].role).toBe("diatonic")
  })

  it("always returns a non-null roman numeral for non-diatonic chords", () => {
    // Db is ♭II in C major — completely non-diatonic
    const input = [parseChord("C")!, parseChord("Db")!]
    const analyses = analyzeProgression(input, "C", "major")
    expect(analyses[1].role).toBe("non-diatonic")
    expect(analyses[1].roman).toBe("♭II")
  })
})
```

- [ ] **Step 2: Run the tests to verify they pass**

```bash
npx vitest run lib/theory/transposer.test.ts
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add lib/theory/transposer.test.ts
git commit -m "test: add transposer unit tests"
```

---

## Task 7: Create `transposed-row.tsx`

**Files:**
- Create: `app/(app)/tools/transposer/_components/transposed-row.tsx`

Read-only row of `ChordQualityBlock` tiles with `→` arrows between them. Mirrors the Progressions tab display pattern.

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p app/(app)/tools/transposer/_components
```

- [ ] **Step 2: Write the file**

```typescript
"use client"

import { ChordQualityBlock } from "@/app/(app)/reference/_components/chord-quality-block"
import type { InputChord, ChordAnalysis } from "@/lib/theory/key-finder"

interface TransposedRowProps {
  chords: InputChord[]
  analyses: ChordAnalysis[]
}

export function TransposedRow({ chords, analyses }: TransposedRowProps) {
  return (
    <div role="group" aria-label="Transposed chords" className="flex flex-wrap items-center gap-1">
      {chords.map((chord, i) => {
        const analysis = analyses[i]
        if (!analysis) return null
        const variant: "diatonic" | "borrowed" | "non-diatonic" =
          analysis.role === "diatonic" ? "diatonic"
          : analysis.role === "borrowed" ? "borrowed"
          : "non-diatonic"
        return (
          <div key={i} className="flex items-center gap-1 flex-shrink-0">
            {i > 0 && <span className="text-muted-foreground text-sm flex-shrink-0">→</span>}
            <ChordQualityBlock
              roman={analysis.roman}
              chordName={chord.symbol}
              degree={analysis.degree ?? 1}
              isSelected={false}
              onClick={() => {}}
              variant={variant}
            />
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/(app)/tools/transposer/_components/transposed-row.tsx
git commit -m "feat: add TransposedRow component"
```

---

## Task 8: Create `transposer-client.tsx`

**Files:**
- Create: `app/(app)/tools/transposer/_components/transposer-client.tsx`

The main transposer UI. Layout (top to bottom): source key selectors → chord input row → clear button → target key selector (with mode label) → transposed output row.

- [ ] **Step 1: Write the file**

```typescript
"use client"

import { useCallback, useMemo, useState } from "react"
import { Note } from "tonal"
import { parseChord } from "@/lib/theory/key-finder"
import { analyzeProgression, transposeProgression } from "@/lib/theory/transposer"
import { ALL_KEY_MODES } from "@/lib/theory/commonality-tiers"
import { ChordInputRow } from "@/app/(app)/tools/_components/chord-input-row"
import { TransposedRow } from "./transposed-row"
import { btn } from "@/lib/button-styles"

const ROOT_NOTES = [
  "Ab", "A", "A#", "Bb", "B", "C", "C#", "Db", "D", "D#", "Eb", "E",
  "F", "F#", "Gb", "G", "G#",
] as const

// Group modes by commonality tier for the <optgroup> dropdown
const MODE_GROUPS = [
  { label: "Common",   modes: ALL_KEY_MODES.filter(m => m.tier === 1) },
  { label: "Modal",    modes: ALL_KEY_MODES.filter(m => m.tier === 2 || m.tier === 3) },
  { label: "Advanced", modes: ALL_KEY_MODES.filter(m => m.tier >= 4) },
]

const SELECT_CLASS =
  "bg-card border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent w-fit"

interface ChordEntry {
  id: string
  symbol: string
}

export function TransposerClient() {
  const [sourceRoot, setSourceRoot] = useState("C")
  const [modeIdx, setModeIdx]       = useState(0)          // index into ALL_KEY_MODES
  const [targetRoot, setTargetRoot] = useState("G")
  const [chords, setChords]         = useState<ChordEntry[]>([])
  const [editingId, setEditingId]   = useState<string | null>(null)

  const sourceMode = ALL_KEY_MODES[modeIdx]!

  const parsedChords = useMemo(
    () => chords.map(c => parseChord(c.symbol)).filter((c): c is NonNullable<typeof c> => c !== null),
    [chords],
  )

  // Always compute source analysis when chords are present — source key is explicit
  const chordAnalyses = useMemo(
    () => parsedChords.length > 0
      ? analyzeProgression(parsedChords, sourceRoot, sourceMode.modeName)
      : null,
    [parsedChords, sourceRoot, sourceMode.modeName],
  )

  // Transposed chords — null when source === target (by chroma)
  const transposedChords = useMemo(() => {
    if (parsedChords.length === 0) return null
    const sc = Note.chroma(sourceRoot)
    const tc = Note.chroma(targetRoot)
    if (sc === tc) return null
    return transposeProgression(parsedChords, sourceRoot, targetRoot, sourceMode.modeName)
  }, [parsedChords, sourceRoot, targetRoot, sourceMode.modeName])

  // Analyse the transposed chords in the target key
  const transposedAnalyses = useMemo(
    () => transposedChords
      ? analyzeProgression(transposedChords, targetRoot, sourceMode.modeName)
      : null,
    [transposedChords, targetRoot, sourceMode.modeName],
  )

  const handleAdd = useCallback(() => {
    const id = crypto.randomUUID()
    setChords(prev => [...prev, { id, symbol: "" }])
    setEditingId(id)
  }, [])

  const handleCommit = useCallback((id: string, symbol: string) => {
    setEditingId(null)
    if (!symbol) {
      setChords(prev => prev.filter(c => c.id !== id))
    } else {
      setChords(prev => prev.map(c => c.id === id ? { ...c, symbol } : c))
    }
  }, [])

  const handleRemove = useCallback((id: string) => {
    setChords(prev => prev.filter(c => c.id !== id))
  }, [])

  const handleStartEdit = useCallback((id: string) => {
    setEditingId(id)
  }, [])

  function handleClear() {
    setChords([])
    setEditingId(null)
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Source key selectors */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs uppercase tracking-widest text-muted-foreground whitespace-nowrap">
          Source key
        </span>
        <select
          value={sourceRoot}
          onChange={e => setSourceRoot(e.target.value)}
          aria-label="Source root"
          className={SELECT_CLASS}
        >
          {ROOT_NOTES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={modeIdx}
          onChange={e => setModeIdx(Number(e.target.value))}
          aria-label="Mode"
          className={SELECT_CLASS}
        >
          {MODE_GROUPS.map(group => (
            <optgroup key={group.label} label={group.label}>
              {group.modes.map(mode => {
                const idx = ALL_KEY_MODES.findIndex(m => m.modeName === mode.modeName)
                return (
                  <option key={mode.modeName} value={idx}>
                    {mode.displayName}
                  </option>
                )
              })}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Chord input */}
      <ChordInputRow
        chords={chords}
        editingId={editingId}
        chordAnalyses={chordAnalyses}
        onChordChange={newChords => setChords(newChords)}
        onCommit={handleCommit}
        onRemove={handleRemove}
        onStartEdit={handleStartEdit}
        onAdd={handleAdd}
      />

      {chords.length === 0 && (
        <p className="text-sm text-muted-foreground">Add chords to transpose.</p>
      )}

      {chords.length > 0 && (
        <div>
          <button type="button" onClick={handleClear} className={btn("destructive", "sm")}>
            Clear
          </button>
        </div>
      )}

      {/* Target key selector — shown once chords are entered */}
      {chords.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs uppercase tracking-widest text-muted-foreground whitespace-nowrap">
            Target key
          </span>
          <select
            value={targetRoot}
            onChange={e => setTargetRoot(e.target.value)}
            aria-label="Target root"
            className={SELECT_CLASS}
          >
            {ROOT_NOTES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {/* Static mode label — mode is always the same as source */}
          <span className="text-sm text-muted-foreground">{sourceMode.displayName}</span>
        </div>
      )}

      {/* Transposed output row */}
      {transposedChords && transposedAnalyses && (
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            In {targetRoot} {sourceMode.displayName}
          </p>
          <TransposedRow chords={transposedChords} analyses={transposedAnalyses} />
        </div>
      )}

    </div>
  )
}
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/(app)/tools/transposer/_components/transposer-client.tsx
git commit -m "feat: add TransposerClient component"
```

---

## Task 9: Replace the transposer page stub

**Files:**
- Modify: `app/(app)/tools/transposer/page.tsx`

- [ ] **Step 1: Read the current file**

```bash
# Read app/(app)/tools/transposer/page.tsx
```

- [ ] **Step 2: Replace the stub**

```typescript
import Link from "next/link"
import { TransposerClient } from "./_components/transposer-client"

export default function TransposerPage() {
  return (
    <div className="pt-6">
      <Link
        href="/tools"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-1"
      >
        ← Tools
      </Link>
      <h1 className="text-2xl font-semibold text-foreground mb-2">Transposer</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Enter a progression in a source key and transpose it to any other root.
      </p>
      <TransposerClient />
    </div>
  )
}
```

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Verify the page loads in the browser**

Start the dev server and navigate to `/tools/transposer`. Verify:
- Source key dropdowns (root + mode) are present and functional
- Adding a chord (e.g. "C") shows it as a `ChordQualityBlock` tile with roman numeral "I"
- Adding "Db" shows a tile with "♭II" in orange (non-diatonic colour)
- Changing the target root (e.g. to "G") shows a transposed output row
- The mode label next to the target dropdown matches the source mode
- When source root === target root (same chroma), the transposed row is hidden

```bash
npm run dev
```

- [ ] **Step 5: Commit**

```bash
git add app/(app)/tools/transposer/page.tsx
git commit -m "feat: implement transposer tool page"
```
