# Chord and Triad Fretboard Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-neck fretboard diagram (always visible) to the chord panel and triad panel, showing all chord tones by note name or interval across every position on the neck.

**Architecture:** Two thin adapter functions (`getChordAsScale`, `getTriadAsScale`) map panel-specific type strings to tonal.js symbols and delegate to the existing `getArpeggio()` engine, returning a `GuitarScale` object that `FretboardViewer` already understands. The chord panel gains full box-system controls (CAGED/3NPS) while the triad panel gets a simple note/interval toggle. No new components needed.

**Tech Stack:** tonal.js (`Chord.get`), `getArpeggio` from `lib/theory/arpeggios.ts`, `FretboardViewer` component, `getArpeggioBoxSystems`/`CHORD_TYPE_TO_SCALE`/`CAGED_BOX_LABELS` from `lib/rendering/fretboard.ts`, React `useState`/`useMemo`, Vitest + Testing Library.

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `lib/theory/chords.ts` | Add `getChordAsScale(tonic, dbSuffix): GuitarScale` |
| Modify | `lib/theory/triads.ts` | Add `getTriadAsScale(tonic, type): GuitarScale` |
| Modify | `app/(app)/reference/_components/chord-panel.tsx` | Add fretboard + controls above voicing grid |
| Modify | `app/(app)/reference/_components/triad-panel.tsx` | Add fretboard + label toggle above voicing grid |
| Create | `__tests__/theory/chord-fretboard.test.ts` | Unit tests for `getChordAsScale` |
| Create | `__tests__/theory/triad-fretboard.test.ts` | Unit tests for `getTriadAsScale` |
| Modify | `__tests__/reference/chord-panel.test.tsx` | Add mock + render tests for fretboard |
| Modify | `__tests__/reference/triad-panel.test.tsx` | Add mock + render tests for fretboard |

`lib/theory/index.ts` does not need changes — it already re-exports everything from chords.ts and triads.ts via `export *`.

---

## Task 1: `getChordAsScale` — theory function

**Files:**
- Modify: `lib/theory/chords.ts`
- Create: `__tests__/theory/chord-fretboard.test.ts`

### Context

`chords.ts` uses chords-db suffix strings ("major", "minor", "maj7") as type identifiers. `getArpeggio()` (in `lib/theory/arpeggios.ts`) uses tonal.js symbols ("maj", "m", "maj7"). Most suffixes happen to be valid tonal symbols already; a small mapping handles the exceptions.

`lib/theory/index.ts` uses `export * from "@/lib/theory/chords"` — the new function is automatically exported once added to chords.ts.

- [ ] **Step 1: Write the failing test**

Create `__tests__/theory/chord-fretboard.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { getChordAsScale } from "@/lib/theory/chords"

describe("getChordAsScale", () => {
  it("maps 'major' db suffix to tonal 'maj' and returns C E G", () => {
    const scale = getChordAsScale("C", "major")
    expect(scale.notes).toEqual(["C", "E", "G"])
    expect(scale.type).toBe("maj")
    expect(scale.tonic).toBe("C")
  })

  it("maps 'minor' db suffix to tonal 'm' and returns C Eb G", () => {
    const scale = getChordAsScale("C", "minor")
    expect(scale.notes).toEqual(["C", "Eb", "G"])
    expect(scale.type).toBe("m")
  })

  it("passes 'maj7' through unchanged and returns C E G B", () => {
    const scale = getChordAsScale("C", "maj7")
    expect(scale.notes).toEqual(["C", "E", "G", "B"])
    expect(scale.type).toBe("maj7")
  })

  it("maps 'maj7 shell' to tonal 'maj7' and returns C E G B", () => {
    const scale = getChordAsScale("C", "maj7 shell")
    expect(scale.notes).toEqual(["C", "E", "G", "B"])
    expect(scale.type).toBe("maj7")
  })

  it("maps '7 shell' to tonal '7' and returns C E G Bb", () => {
    const scale = getChordAsScale("C", "7 shell")
    expect(scale.notes).toEqual(["C", "E", "G", "Bb"])
    expect(scale.type).toBe("7")
  })

  it("maps 'm7 shell' to tonal 'm7' and returns C Eb G Bb", () => {
    const scale = getChordAsScale("C", "m7 shell")
    expect(scale.notes).toEqual(["C", "Eb", "G", "Bb"])
    expect(scale.type).toBe("m7")
  })

  it("returns a non-empty positions array", () => {
    const scale = getChordAsScale("C", "major")
    expect(scale.positions.length).toBeGreaterThan(0)
  })

  it("works for a non-C tonic", () => {
    const scale = getChordAsScale("G", "major")
    expect(scale.tonic).toBe("G")
    expect(scale.notes).toEqual(["G", "B", "D"])
    expect(scale.type).toBe("maj")
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run __tests__/theory/chord-fretboard.test.ts
```

Expected: FAIL — `getChordAsScale is not a function` (or similar import error).

- [ ] **Step 3: Implement `getChordAsScale` in `lib/theory/chords.ts`**

Add the following after the existing imports at the top of `lib/theory/chords.ts`. The file currently imports from `tonal` and `@/lib/theory/types` — add `getArpeggio` import:

```typescript
import { getArpeggio } from "@/lib/theory/arpeggios"
```

Also add `GuitarScale` to the type import line (currently `import type { ChordVoicing, GuitarChord } from "@/lib/theory/types"`):

```typescript
import type { ChordVoicing, GuitarChord, GuitarScale } from "@/lib/theory/types"
```

Then append at the end of `lib/theory/chords.ts` (after all existing exports):

```typescript
// ---------------------------------------------------------------------------
// Mapping from chords-db suffix strings to tonal.js chord symbols.
// Used by getChordAsScale to bridge the chord panel's type identifiers
// to the tonal.js symbols that getArpeggio() expects.
// ---------------------------------------------------------------------------
const CHORD_DB_TO_TONAL: Record<string, string> = {
  // Shell chord types (contain spaces — matched before passthrough)
  "maj7 shell":    "maj7",
  "m7 shell":      "m7",
  "7 shell":       "7",
  "maj6 shell":    "6",
  "dim7/m6 shell": "m6",
  // Common suffixes that differ between chords-db and tonal.js
  major: "maj",
  minor: "m",
  // Edge cases from DB_SUFFIX_TO_TONAL (chords-db suffixes not valid as tonal symbols)
  alt:       "7alt",
  aug9:      "9#5",
  "maj7b5":  "M7b5",
  mmaj7:     "mM7",
  "mmaj7b5": "oM7",
  mmaj9:     "mM9",
  // All other suffixes (maj7, m7, 7, dim7, dim, aug, 9, sus2, sus4, 7sus4,
  // m7b5, 6, m6, add9, madd9, etc.) are already valid tonal symbols and
  // fall through to the passthrough default below.
}

/**
 * Returns a GuitarScale containing all positions of a chord's tones across
 * the full fretboard. Accepts chords-db suffix strings (the same identifiers
 * used by the chord panel). The returned GuitarScale.type is the tonal.js
 * symbol, which is compatible with getArpeggioBoxSystems() and
 * CHORD_TYPE_TO_SCALE from lib/rendering/fretboard.ts.
 */
export function getChordAsScale(tonic: string, dbSuffix: string): GuitarScale {
  const tonalSym = CHORD_DB_TO_TONAL[dbSuffix] ?? dbSuffix
  return getArpeggio(tonic, tonalSym)
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run __tests__/theory/chord-fretboard.test.ts
```

Expected: All 8 tests PASS.

- [ ] **Step 5: Run the full test suite to check for regressions**

```bash
npx vitest run
```

Expected: All tests pass (same count as before + 8 new).

- [ ] **Step 6: Commit**

```bash
git add lib/theory/chords.ts __tests__/theory/chord-fretboard.test.ts
git commit -m "feat: add getChordAsScale — maps chord panel types to GuitarScale"
```

---

## Task 2: `getTriadAsScale` — theory function

**Files:**
- Modify: `lib/theory/triads.ts`
- Create: `__tests__/theory/triad-fretboard.test.ts`

### Context

`triads.ts` uses the strings "major", "minor", "diminished", "augmented" (from `TRIAD_TYPES`). These map to tonal.js symbols "maj", "m", "dim", "aug". The file currently imports `ChordPosition` from `./chords` — add `GuitarScale` from `./types` and `getArpeggio` from `./arpeggios`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/theory/triad-fretboard.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { getTriadAsScale } from "@/lib/theory/triads"

describe("getTriadAsScale", () => {
  it("C major returns notes C E G and type 'maj'", () => {
    const scale = getTriadAsScale("C", "major")
    expect(scale.notes).toEqual(["C", "E", "G"])
    expect(scale.type).toBe("maj")
    expect(scale.tonic).toBe("C")
  })

  it("C minor returns notes C Eb G and type 'm'", () => {
    const scale = getTriadAsScale("C", "minor")
    expect(scale.notes).toEqual(["C", "Eb", "G"])
    expect(scale.type).toBe("m")
  })

  it("C diminished returns notes C Eb Gb and type 'dim'", () => {
    const scale = getTriadAsScale("C", "diminished")
    expect(scale.notes).toEqual(["C", "Eb", "Gb"])
    expect(scale.type).toBe("dim")
  })

  it("C augmented returns 3 notes starting with C E and type 'aug'", () => {
    const scale = getTriadAsScale("C", "augmented")
    expect(scale.type).toBe("aug")
    expect(scale.notes).toHaveLength(3)
    expect(scale.notes[0]).toBe("C")
    expect(scale.notes[1]).toBe("E")
    // tonal returns G# (not Ab) for Caug
    expect(scale.notes[2]).toBe("G#")
  })

  it("returns a non-empty positions array", () => {
    const scale = getTriadAsScale("C", "major")
    expect(scale.positions.length).toBeGreaterThan(0)
  })

  it("works for a non-C tonic", () => {
    const scale = getTriadAsScale("A", "minor")
    expect(scale.tonic).toBe("A")
    expect(scale.notes).toEqual(["A", "C", "E"])
    expect(scale.type).toBe("m")
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run __tests__/theory/triad-fretboard.test.ts
```

Expected: FAIL — `getTriadAsScale is not a function`.

- [ ] **Step 3: Implement `getTriadAsScale` in `lib/theory/triads.ts`**

At the top of `lib/theory/triads.ts`, add two imports after the existing `import rawTriads from "@/data/triads.json"` line:

```typescript
import type { GuitarScale } from "@/lib/theory/types"
import { getArpeggio } from "@/lib/theory/arpeggios"
```

Then append at the end of `lib/theory/triads.ts` (after the existing `export const TRIAD_STRING_SETS` line):

```typescript
// ---------------------------------------------------------------------------
// Mapping from triad type display strings to tonal.js chord symbols.
// ---------------------------------------------------------------------------
const TRIAD_TO_TONAL: Record<string, string> = {
  major:      "maj",
  minor:      "m",
  diminished: "dim",
  augmented:  "aug",
}

/**
 * Returns a GuitarScale containing all positions of a triad's tones across
 * the full fretboard. Accepts the same type strings as TRIAD_TYPES
 * ("major", "minor", "diminished", "augmented").
 */
export function getTriadAsScale(tonic: string, type: string): GuitarScale {
  const tonalSym = TRIAD_TO_TONAL[type] ?? type
  return getArpeggio(tonic, tonalSym)
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run __tests__/theory/triad-fretboard.test.ts
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Run the full test suite to check for regressions**

```bash
npx vitest run
```

Expected: All tests pass (same count as before + 6 new).

- [ ] **Step 6: Commit**

```bash
git add lib/theory/triads.ts __tests__/theory/triad-fretboard.test.ts
git commit -m "feat: add getTriadAsScale — maps triad types to GuitarScale"
```

---

## Task 3: Chord panel fretboard UI

**Files:**
- Modify: `app/(app)/reference/_components/chord-panel.tsx`
- Modify: `__tests__/reference/chord-panel.test.tsx`

### Context

The chord panel currently shows: chord type selector → notes/formula → voicing grid.

After this task it shows: chord type selector → notes/formula → **label mode checkbox + box system controls + FretboardViewer** → voicing grid.

The arpeggio panel (`arpeggio-panel.tsx`) is the reference implementation — its box system controls and FretboardViewer wiring are copied almost verbatim.

Relevant imports the component needs (not currently present):
- `getChordAsScale` from `@/lib/theory`
- `FretboardViewer` from `./fretboard-viewer`
- `getArpeggioBoxSystems`, `CHORD_TYPE_TO_SCALE`, `CAGED_BOX_LABELS` from `@/lib/rendering/fretboard`
- `BoxSystem` type from `@/lib/rendering/fretboard`
- `cn` from `@/lib/utils`

- [ ] **Step 1: Write the failing component tests**

Open `__tests__/reference/chord-panel.test.tsx`. The existing mock is:

```typescript
vi.mock("@/lib/theory", () => ({
  listChordTypes: () => ["maj", "m", "7", "maj7"],
  listChordDbSuffixes: () => ["major", "minor", "7", "maj7"],
  SHELL_CHORD_TYPES: ["maj7 shell", "m7 shell", "7 shell", "maj6 shell", "dim7/m6 shell"],
  getChord: ...
  getChordPositions: ...
  getShellChordPositions: ...
}))
```

Add `getChordAsScale` to the mock object (inside the existing `vi.mock("@/lib/theory", ...)` factory), so the full mock becomes:

```typescript
vi.mock("@/lib/theory", () => ({
  listChordTypes: () => ["maj", "m", "7", "maj7"],
  listChordDbSuffixes: () => ["major", "minor", "7", "maj7"],
  SHELL_CHORD_TYPES: ["maj7 shell", "m7 shell", "7 shell", "maj6 shell", "dim7/m6 shell"],
  getChord: (tonic: string, type: string) => ({
    tonic,
    type,
    notes: ["C", "E", "G"],
    intervals: ["1P", "3M", "5P"],
    voicings: [],
  }),
  getChordPositions: () => [
    {
      frets: [-1, 3, 2, 0, 1, 0],
      fingers: [0, 3, 2, 0, 1, 0],
      baseFret: 1,
      barres: [],
      capo: false,
      label: "Open",
    },
    {
      frets: [1, 1, 3, 3, 3, 1],
      fingers: [1, 1, 2, 3, 4, 1],
      baseFret: 3,
      barres: [1],
      capo: true,
      label: "Barre – 3fr",
    },
  ],
  getShellChordPositions: () => [
    { frets: [2, 1, 3, -1, -1, -1], fingers: [0, 0, 0, 0, 0, 0], baseFret: 7, barres: [], capo: false, label: "6th string root" },
    { frets: [-1, 2, 1, 3, -1, -1], fingers: [0, 0, 0, 0, 0, 0], baseFret: 2, barres: [], capo: false, label: "5th string root" },
    { frets: [-1, -1, 2, 1, 4, -1], fingers: [0, 0, 0, 0, 0, 0], baseFret: 9, barres: [], capo: false, label: "4th string root" },
  ],
  getChordAsScale: (_tonic: string, _type: string) => ({
    tonic: "C",
    type: "maj",
    notes: ["C", "E", "G"],
    intervals: ["1P", "3M", "5P"],
    positions: [{ label: "Position 1", positions: [{ string: 6, fret: 8, interval: "R" }] }],
  }),
}))
```

Then add two new test cases at the end of the `describe("ChordPanel", ...)` block:

```typescript
  it("renders a fretboard container in default state", () => {
    render(<ChordPanel tonic="C" />)
    // The FretboardViewer renders a div with min-h-[200px] class
    const fretboardEl = document.querySelector(".min-h-\\[200px\\]")
    expect(fretboardEl).not.toBeNull()
  })

  it("renders the show-intervals checkbox", () => {
    render(<ChordPanel tonic="C" />)
    const checkbox = screen.getByRole("checkbox", { name: /show intervals/i })
    expect(checkbox).toBeDefined()
  })
```

- [ ] **Step 2: Run the new tests to verify they fail**

```bash
npx vitest run __tests__/reference/chord-panel.test.tsx
```

Expected: The two new tests FAIL (fretboard container not found, checkbox not found). All existing tests still PASS.

- [ ] **Step 3: Update the chord panel imports**

Open `app/(app)/reference/_components/chord-panel.tsx`. The current imports are:

```typescript
"use client"

import { useState, useMemo } from "react"
import {
  getChord, listChordDbSuffixes, getChordPositions,
  SHELL_CHORD_TYPES, getShellChordPositions,
} from "@/lib/theory"
import Chord from "@tombatossals/react-chords/lib/Chord"
```

Replace with:

```typescript
"use client"

import { useState, useMemo } from "react"
import {
  getChord, listChordDbSuffixes, getChordPositions,
  SHELL_CHORD_TYPES, getShellChordPositions,
  getChordAsScale,
} from "@/lib/theory"
import Chord from "@tombatossals/react-chords/lib/Chord"
import { FretboardViewer } from "./fretboard-viewer"
import {
  getArpeggioBoxSystems,
  CHORD_TYPE_TO_SCALE,
  CAGED_BOX_LABELS,
} from "@/lib/rendering/fretboard"
import type { BoxSystem } from "@/lib/rendering/fretboard"
import { cn } from "@/lib/utils"
```

- [ ] **Step 4: Add box system labels constant**

After the existing `SHELL_FORMULA` constant in `chord-panel.tsx`, add:

```typescript
const BOX_SYSTEM_LABELS: Record<BoxSystem, string> = {
  none:       "All notes",
  caged:      "CAGED",
  "3nps":     "3NPS",
  pentatonic: "Pentatonic boxes",
  windows:    "Position windows",
}
```

- [ ] **Step 5: Add new state and derived values to `ChordPanel`**

Inside the `ChordPanel` function body, after the existing `const [chordType, setChordType] = useState(...)` line, add:

```typescript
const [labelMode, setLabelMode] = useState<"note" | "interval">("interval")
const [boxSystem, setBoxSystem] = useState<BoxSystem>("none")
const [boxIndex, setBoxIndex]   = useState(0)

const chordScale = useMemo(
  () => getChordAsScale(tonic, chordType),
  [tonic, chordType]
)
const availableBoxSystems = useMemo(
  () => getArpeggioBoxSystems(chordScale.type),
  [chordScale.type]
)
const parentScaleType = CHORD_TYPE_TO_SCALE[chordScale.type]
const boxCount = useMemo(() => {
  if (boxSystem === "caged")   return CAGED_BOX_LABELS.length  // 5
  if (boxSystem === "3nps")    return 7
  if (boxSystem === "windows") return chordScale.positions.length
  return 0
}, [boxSystem, chordScale.positions.length])
const safeBoxIndex = boxIndex < boxCount ? boxIndex : 0
```

- [ ] **Step 6: Update the chord type `onChange` handler to reset box state**

The existing `onChange` on the chord type `<select>` is:

```typescript
onChange={(e) => setChordType(e.target.value)}
```

Replace with:

```typescript
onChange={(e) => {
  const newType = e.target.value
  setChordType(newType)
  setBoxIndex(0)
  const newScale = getChordAsScale(tonic, newType)
  const newSystems = getArpeggioBoxSystems(newScale.type)
  if (!newSystems.includes(boxSystem)) setBoxSystem("none")
}}
```

- [ ] **Step 7: Add fretboard controls and viewer JSX**

In the `ChordPanel` return JSX, the current structure after the notes/formula block is:

```tsx
      {positions.length === 0 ? (
        ...
```

Insert the following **between** the notes/formula block and the voicing grid (`positions.length === 0 ? ...`):

```tsx
      {/* Label mode + box system controls */}
      <div className="flex flex-wrap gap-4 items-end">
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={labelMode === "interval"}
            onChange={(e) => setLabelMode(e.target.checked ? "interval" : "note")}
            className="accent-accent"
          />
          Show intervals
        </label>

        {availableBoxSystems.length > 1 && (
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground" htmlFor="chord-box-system-select">
                Highlight
              </label>
              <select
                id="chord-box-system-select"
                value={boxSystem}
                onChange={(e) => {
                  setBoxSystem(e.target.value as BoxSystem)
                  setBoxIndex(0)
                }}
                className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {availableBoxSystems.map((s) => (
                  <option key={s} value={s}>{BOX_SYSTEM_LABELS[s]}</option>
                ))}
              </select>
            </div>

            {boxSystem !== "none" && boxCount > 0 && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground" htmlFor="chord-box-index-select">
                  Box
                </label>
                <select
                  id="chord-box-index-select"
                  value={safeBoxIndex}
                  onChange={(e) => setBoxIndex(Number(e.target.value))}
                  className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {Array.from({ length: boxCount }, (_, i) => (
                    <option key={i} value={i}>
                      {boxSystem === "caged"
                        ? `${CAGED_BOX_LABELS[i]} shape`
                        : `Position ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fretboard */}
      <FretboardViewer
        scale={chordScale}
        boxSystem={boxSystem}
        boxIndex={safeBoxIndex}
        labelMode={labelMode}
        boxScaleType={parentScaleType}
      />
```

- [ ] **Step 8: Run the new tests to verify they pass**

```bash
npx vitest run __tests__/reference/chord-panel.test.tsx
```

Expected: All tests PASS (existing 9 + 2 new = 11 total).

- [ ] **Step 9: Run the full test suite**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 10: Commit**

```bash
git add app/(app)/reference/_components/chord-panel.tsx \
        __tests__/reference/chord-panel.test.tsx
git commit -m "feat: add fretboard view to chord panel"
```

---

## Task 4: Triad panel fretboard UI

**Files:**
- Modify: `app/(app)/reference/_components/triad-panel.tsx`
- Modify: `__tests__/reference/triad-panel.test.tsx`

### Context

The triad panel currently shows: filters → formula → voicing grid.

After this task it shows: filters → formula → **label mode checkbox + FretboardViewer** → voicing grid.

No box system controls for triads — the fretboard shows all chord tones with just a note/interval toggle.

- [ ] **Step 1: Write the failing component tests**

Open `__tests__/reference/triad-panel.test.tsx`. Add `getTriadAsScale` to the existing `vi.mock("@/lib/theory", ...)` factory:

```typescript
vi.mock("@/lib/theory", () => ({
  TRIAD_TYPES: ["major", "minor", "diminished", "augmented"],
  TRIAD_STRING_SETS: [
    "6-5-4", "6-5-3", "6-4-3",
    "5-4-3", "5-4-2", "5-3-2",
    "4-3-2", "4-3-1", "4-2-1",
    "3-2-1",
  ],
  getTriadVoicings: (tonic: string, type: string) => {
    if (tonic !== "C" || type !== "major") return []
    return [
      {
        frets: [2, 1, 2, -1, -1, -1],
        fingers: [0, 0, 0, 0, 0, 0],
        baseFret: 7,
        barres: [],
        capo: false,
        label: "Root position",
        stringSet: "6-5-4",
        voicingType: "close",
        inversion: "root",
        minFret: 7,
      },
      {
        frets: [-1, 2, 1, 2, -1, -1],
        fingers: [0, 0, 0, 0, 0, 0],
        baseFret: 5,
        barres: [],
        capo: false,
        label: "1st inversion",
        stringSet: "5-4-3",
        voicingType: "close",
        inversion: "first",
        minFret: 5,
      },
      {
        frets: [-1, -1, 2, 1, 2, -1],
        fingers: [0, 0, 0, 0, 0, 0],
        baseFret: 9,
        barres: [],
        capo: false,
        label: "2nd inversion",
        stringSet: "4-3-2",
        voicingType: "close",
        inversion: "second",
        minFret: 9,
      },
    ]
  },
  getTriadAsScale: (_tonic: string, _type: string) => ({
    tonic: "C",
    type: "maj",
    notes: ["C", "E", "G"],
    intervals: ["1P", "3M", "5P"],
    positions: [{ label: "Position 1", positions: [{ string: 6, fret: 8, interval: "R" }] }],
  }),
}))
```

Then add two new test cases at the end of the `describe("TriadPanel", ...)` block:

```typescript
  it("renders a fretboard container in default state", () => {
    render(<TriadPanel tonic="C" />)
    const fretboardEl = document.querySelector(".min-h-\\[200px\\]")
    expect(fretboardEl).not.toBeNull()
  })

  it("renders the show-intervals checkbox", () => {
    render(<TriadPanel tonic="C" />)
    const checkbox = screen.getByRole("checkbox", { name: /show intervals/i })
    expect(checkbox).toBeDefined()
  })
```

- [ ] **Step 2: Run the new tests to verify they fail**

```bash
npx vitest run __tests__/reference/triad-panel.test.tsx
```

Expected: The two new tests FAIL. All existing tests still PASS.

- [ ] **Step 3: Update the triad panel imports**

Open `app/(app)/reference/_components/triad-panel.tsx`. The current imports are:

```typescript
"use client"

import { useState, useMemo } from "react"
import {
  TRIAD_TYPES,
  TRIAD_STRING_SETS,
  getTriadVoicings,
  type TriadVoicing,
} from "@/lib/theory"
import Chord from "@tombatossals/react-chords/lib/Chord"
```

Replace with:

```typescript
"use client"

import { useState, useMemo } from "react"
import {
  TRIAD_TYPES,
  TRIAD_STRING_SETS,
  getTriadVoicings,
  getTriadAsScale,
  type TriadVoicing,
} from "@/lib/theory"
import Chord from "@tombatossals/react-chords/lib/Chord"
import { FretboardViewer } from "./fretboard-viewer"
```

- [ ] **Step 4: Add new state and derived value to `TriadPanel`**

Inside the `TriadPanel` function body, after the existing `const [stringSetFilter, setStringSetFilter] = useState<string>("all")` line, add:

```typescript
const [labelMode, setLabelMode] = useState<"note" | "interval">("interval")

const triadScale = useMemo(
  () => getTriadAsScale(tonic, triadType),
  [tonic, triadType]
)
```

- [ ] **Step 5: Add label checkbox and fretboard viewer JSX**

In the `TriadPanel` return JSX, the current structure is:

```tsx
      {/* Formula */}
      <p className="text-xs text-muted-foreground">
        Formula: {TRIAD_FORMULA[triadType]}
      </p>

      {/* Voicings grouped by string set */}
      {grouped.length === 0 ? (
```

Insert the following **between** the formula paragraph and the voicing grid:

```tsx
      {/* Label mode toggle */}
      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
        <input
          type="checkbox"
          checked={labelMode === "interval"}
          onChange={(e) => setLabelMode(e.target.checked ? "interval" : "note")}
          className="accent-accent"
        />
        Show intervals
      </label>

      {/* Fretboard */}
      <FretboardViewer
        scale={triadScale}
        boxSystem="none"
        boxIndex={0}
        labelMode={labelMode}
      />
```

- [ ] **Step 6: Run the new tests to verify they pass**

```bash
npx vitest run __tests__/reference/triad-panel.test.tsx
```

Expected: All tests PASS (existing 9 + 2 new = 11 total).

- [ ] **Step 7: Run the full test suite**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add app/(app)/reference/_components/triad-panel.tsx \
        __tests__/reference/triad-panel.test.tsx
git commit -m "feat: add fretboard view to triad panel"
```

---

## Done

After all four tasks, the chord and triad panels each show a full-neck fretboard diagram above their existing voicing grids. The chord panel includes CAGED/3NPS box-system controls for chords that have a known parent scale. Both panels support note/interval labelling. No new components were added — all rendering goes through the existing `FretboardViewer`.
