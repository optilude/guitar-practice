# Fretboard.js Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken SVGuitar fretboard view with Fretboard.js, showing the full neck with colour-coded interval dots, CAGED/3NPS/pentatonic box highlighting, and a note/interval label toggle for both Scales and Arpeggios.

**Architecture:** Fretboard.js renders SVG only (`setDots()` + `style()` + `render()`). All music-theory computation (note positions, box membership) stays in our own code using TonalJS and the existing `SCALE_PATTERNS` data. The only exception is pentatonic box membership, which uses Fretboard.js's `FretboardSystem` + `Systems.pentatonic`.

**Tech Stack:** `@moonwave99/fretboard.js`, TonalJS (`Note` from `tonal`), existing `SCALE_PATTERNS`, React client components, Vitest.

**IMPORTANT — Before writing any code:** Read `node_modules/next/dist/docs/` for Next.js 16 specifics. The project uses Next.js 16 with breaking API changes. Also check `node_modules/@moonwave99/fretboard.js/` for the actual exported names — docs may be inaccurate.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `package.json` | Modify | Add `@moonwave99/fretboard.js` dependency |
| `lib/rendering/fretboard.ts` | Rewrite | All computational + rendering logic |
| `__tests__/fretboard-positions.test.ts` | Create | Unit tests for pure functions |
| `app/(app)/reference/_components/fretboard-viewer.tsx` | Modify | Updated props |
| `app/(app)/reference/_components/scale-panel.tsx` | Modify | Box system + box number selectors |
| `app/(app)/reference/_components/arpeggio-panel.tsx` | Modify | Box system + box number selectors |

**No changes to:** `lib/theory/scales.ts`, `lib/theory/arpeggios.ts`, `lib/theory/types.ts`, `lib/rendering/tab.ts`, `lib/theory/data/scale-patterns.ts`.

---

## Task 1: Install Fretboard.js and verify import

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

```bash
pnpm add @moonwave99/fretboard.js
```

Expected: package installs without errors. `package.json` now lists `@moonwave99/fretboard.js` under `dependencies`.

- [ ] **Step 2: Verify ESM named imports work**

```bash
node --input-type=module <<'EOF'
import { Fretboard, FretboardSystem, Systems } from '@moonwave99/fretboard.js'
console.log(typeof Fretboard, typeof FretboardSystem, typeof Systems)
EOF
```

Expected output: `function function object` (or similar — all three should be defined, not `undefined`).

If named imports fail (output includes `undefined`), check the package's `exports` field:
```bash
node -e "const p = require('./node_modules/@moonwave99/fretboard.js/package.json'); console.log(JSON.stringify(p.exports || p.main, null, 2))"
```
Then adjust the import strategy in Task 6 accordingly (namespace import `import * as fb from '...'`).

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: install @moonwave99/fretboard.js"
```

---

## Task 2: Types and `getAllFretboardPositions()`

**Files:**
- Rewrite: `lib/rendering/fretboard.ts` (replace entire file content with the new skeleton below)
- Create: `__tests__/fretboard-positions.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/fretboard-positions.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { getAllFretboardPositions } from "@/lib/rendering/fretboard"

const C_MAJOR_NOTES     = ["C", "D", "E", "F", "G", "A", "B"]
const C_MAJOR_INTERVALS = ["1P", "2M", "3M", "4P", "5P", "6M", "7M"]

describe("getAllFretboardPositions", () => {
  it("returns root on string 6 fret 8 for C major", () => {
    const dots = getAllFretboardPositions("C", C_MAJOR_NOTES, C_MAJOR_INTERVALS)
    const dot = dots.find(d => d.string === 6 && d.fret === 8)
    expect(dot).toBeDefined()
    expect(dot!.interval).toBe("R")
    expect(dot!.note).toBe("C")
  })

  it("does not include non-scale notes (C# at string 6 fret 9)", () => {
    const dots = getAllFretboardPositions("C", C_MAJOR_NOTES, C_MAJOR_INTERVALS)
    expect(dots.find(d => d.string === 6 && d.fret === 9)).toBeUndefined()
  })

  it("includes open strings that are scale tones (E at string 6 fret 0 in E major)", () => {
    const eMajor = ["E", "F#", "G#", "A", "B", "C#", "D#"]
    const eInts  = ["1P", "2M", "3M", "4P", "5P", "6M", "7M"]
    const dots = getAllFretboardPositions("E", eMajor, eInts)
    const dot = dots.find(d => d.string === 6 && d.fret === 0)
    expect(dot).toBeDefined()
    expect(dot!.interval).toBe("R")
  })

  it("includes notes on all 6 strings", () => {
    const dots = getAllFretboardPositions("C", C_MAJOR_NOTES, C_MAJOR_INTERVALS)
    for (let str = 1; str <= 6; str++) {
      expect(dots.some(d => d.string === str)).toBe(true)
    }
  })

  it("does not return frets above 15", () => {
    const dots = getAllFretboardPositions("C", C_MAJOR_NOTES, C_MAJOR_INTERVALS)
    expect(dots.every(d => d.fret <= 15)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test:run -- --reporter=verbose 2>&1 | grep -A5 "getAllFretboardPositions"
```

Expected: test fails with `getAllFretboardPositions is not a function` or similar.

- [ ] **Step 3: Replace `lib/rendering/fretboard.ts` with new skeleton**

```typescript
import { Note } from "tonal"
import type { GuitarScale } from "@/lib/theory/types"
import { INTERVAL_DEGREE_COLORS } from "@/lib/rendering/tab"
import SCALE_PATTERNS from "@/lib/theory/data/scale-patterns"

// ---------------------------------------------------------------------------
// Fretboard.js — imported via ESM. Rendering only runs client-side (useEffect).
// If named imports fail at runtime, adjust to: import * as fb from "..."
// ---------------------------------------------------------------------------
import { Fretboard, FretboardSystem, Systems } from "@moonwave99/fretboard.js"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
// Open-string chroma: index 0 = string 6 (low E), index 5 = string 1 (high e)
const OPEN_CHROMA = [4, 9, 2, 7, 11, 4]

const INTERVAL_LABEL: Record<string, string> = {
  "1P": "R",
  "2m": "b2", "2M": "2",
  "3m": "b3", "3M": "3",
  "4P": "4",  "4A": "#4",
  "5d": "b5", "5P": "5", "5A": "#5",
  "6m": "b6", "6M": "6",
  "7m": "b7", "7M": "7",
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type BoxSystem = "none" | "caged" | "3nps" | "pentatonic" | "windows"

export type FretboardDot = {
  string: number    // 1 = high e, 6 = low E
  fret: number      // 0–15
  interval: string  // display label: "R", "b3", "5", etc.
  note: string      // note name: "C", "Eb", "G", etc.
}

// ---------------------------------------------------------------------------
// Box system availability
// ---------------------------------------------------------------------------
const PENTATONIC_SCALE_TYPES = new Set(["Pentatonic Major", "Pentatonic Minor", "Blues"])
const NO_BOX_SCALE_TYPES     = new Set(["Whole Tone", "Diminished Whole-Half", "Diminished Half-Whole"])

const PENTATONIC_TYPE_MAP: Record<string, string> = {
  "Pentatonic Minor": "pentatonic minor",
  "Pentatonic Major": "major pentatonic",
  "Blues":            "minor pentatonic",
}

export const CHORD_TYPE_TO_SCALE: Record<string, string> = {
  major:   "Major",  maj7: "Major",  maj9: "Major",  "6": "Major",  maj6: "Major",  add9: "Major",
  minor:   "Aeolian", m:   "Aeolian",
  m7:      "Dorian",  m9:  "Dorian",
  "7":     "Mixolydian", "9": "Mixolydian", "11": "Mixolydian", "13": "Mixolydian",
  m7b5:    "Locrian",
  mmaj7:   "Melodic Minor",  mmaj9: "Melodic Minor",
}

export function getScaleBoxSystems(scaleType: string): BoxSystem[] {
  if (NO_BOX_SCALE_TYPES.has(scaleType))     return ["none"]
  if (PENTATONIC_SCALE_TYPES.has(scaleType)) return ["none", "pentatonic"]
  return ["none", "caged", "3nps"]
}

export function getArpeggioBoxSystems(chordType: string): BoxSystem[] {
  return CHORD_TYPE_TO_SCALE[chordType] ? ["none", "caged", "3nps"] : ["none", "windows"]
}

// ---------------------------------------------------------------------------
// Full fretboard position computation
// ---------------------------------------------------------------------------
export function getAllFretboardPositions(
  tonic: string,
  scaleNotes: string[],
  scaleIntervals: string[]
): FretboardDot[] {
  const scaleChroma = scaleNotes.map(n => Note.chroma(n) ?? -1)
  const intervalLabels = scaleIntervals.map(iv => INTERVAL_LABEL[iv] ?? iv)

  const dots: FretboardDot[] = []
  for (let strIdx = 0; strIdx < 6; strIdx++) {
    const guitarString = 6 - strIdx
    const openCh = OPEN_CHROMA[strIdx]
    for (let fret = 0; fret <= 15; fret++) {
      const noteChroma = (openCh + fret) % 12
      const noteIdx = scaleChroma.indexOf(noteChroma)
      if (noteIdx !== -1) {
        dots.push({
          string: guitarString,
          fret,
          interval: intervalLabels[noteIdx],
          note: scaleNotes[noteIdx],
        })
      }
    }
  }
  return dots
}

// ---------------------------------------------------------------------------
// 3NPS position computation — stubs filled in Task 3
// ---------------------------------------------------------------------------
export function build3NPSPositions(
  tonic: string,
  scaleNotes: string[],
  scaleIntervals: string[]
): Set<string>[] {
  return [] // stub — implemented in Task 3
}

// ---------------------------------------------------------------------------
// Box membership — stub filled in Task 4
// ---------------------------------------------------------------------------
export function getBoxMembershipSet(
  tonic: string,
  scaleType: string,
  boxSystem: BoxSystem,
  boxIndex: number,
  scaleNotes: string[],
  scaleIntervals: string[]
): Set<string> {
  return new Set() // stub — implemented in Task 4
}

// ---------------------------------------------------------------------------
// renderFretboard — stub filled in Task 6
// ---------------------------------------------------------------------------
export function renderFretboard(
  containerEl: HTMLElement,
  scale: GuitarScale,
  boxSystem: BoxSystem,
  boxIndex: number,
  labelMode: "note" | "interval",
  boxScaleType?: string
): void {
  containerEl.innerHTML = "<p class='text-xs text-muted-foreground'>Fretboard coming soon</p>"
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm test:run -- --reporter=verbose 2>&1 | grep -A3 "getAllFretboardPositions"
```

Expected: all 5 `getAllFretboardPositions` tests pass.

- [ ] **Step 5: Run full test suite to check for regressions**

```bash
pnpm test:run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/rendering/fretboard.ts __tests__/fretboard-positions.test.ts
git commit -m "feat: add getAllFretboardPositions + FretboardDot type"
```

---

## Task 3: `build3NPSPositions()`

**Files:**
- Modify: `lib/rendering/fretboard.ts` (replace the `build3NPSPositions` stub)
- Modify: `__tests__/fretboard-positions.test.ts` (add new describe block)

- [ ] **Step 1: Write failing tests**

Append to `__tests__/fretboard-positions.test.ts`:

```typescript
import { build3NPSPositions } from "@/lib/rendering/fretboard"

describe("build3NPSPositions", () => {
  it("returns 7 sets for a 7-note scale", () => {
    const positions = build3NPSPositions("C", C_MAJOR_NOTES, C_MAJOR_INTERVALS)
    expect(positions).toHaveLength(7)
  })

  it("each set has at most 3 entries per string (and typically exactly 3)", () => {
    const positions = build3NPSPositions("C", C_MAJOR_NOTES, C_MAJOR_INTERVALS)
    for (const pos of positions) {
      for (let str = 1; str <= 6; str++) {
        const notesOnString = [...pos].filter(k => k.startsWith(`${str}:`))
        expect(notesOnString.length).toBeLessThanOrEqual(3)
      }
    }
  })

  it("position 0 (root) includes C at fret 8 on string 6 for C major", () => {
    const positions = build3NPSPositions("C", C_MAJOR_NOTES, C_MAJOR_INTERVALS)
    expect(positions[0].has("6:8")).toBe(true)
  })

  it("returns [] for a 5-note scale (pentatonic)", () => {
    const pentaNotes = ["C", "D", "E", "G", "A"]
    const pentaInts  = ["1P", "2M", "3M", "5P", "6M"]
    const positions = build3NPSPositions("C", pentaNotes, pentaInts)
    expect(positions).toHaveLength(0)
  })

  it("sets contain only frets 0-15", () => {
    const positions = build3NPSPositions("C", C_MAJOR_NOTES, C_MAJOR_INTERVALS)
    for (const pos of positions) {
      for (const key of pos) {
        const fret = parseInt(key.split(":")[1])
        expect(fret).toBeGreaterThanOrEqual(0)
        expect(fret).toBeLessThanOrEqual(15)
      }
    }
  })
})
```

- [ ] **Step 2: Run to confirm they fail**

```bash
pnpm test:run -- --reporter=verbose 2>&1 | grep -A3 "build3NPSPositions"
```

Expected: tests fail (`toHaveLength(7)` fails since stub returns `[]`).

- [ ] **Step 3: Implement `build3NPSPositions`**

Replace the stub in `lib/rendering/fretboard.ts`:

```typescript
export function build3NPSPositions(
  tonic: string,
  scaleNotes: string[],
  _scaleIntervals: string[]
): Set<string>[] {
  if (scaleNotes.length < 7) return []

  const scaleChroma = scaleNotes.map(n => Note.chroma(n) ?? -1)

  // For each string, all frets 0–17 that are scale tones (extends to 17 for positional overlap)
  const fretsByString: number[][] = OPEN_CHROMA.map(openCh => {
    const frets: number[] = []
    for (let f = 0; f <= 17; f++) {
      if (scaleChroma.includes((openCh + f) % 12)) frets.push(f)
    }
    return frets
  })

  // 7 positions: one starting on each scale degree.
  // startFret for position i = lowest fret of scale degree i on string 6.
  return scaleChroma.map(degChroma => {
    const inBox = new Set<string>()
    let startFret = ((degChroma - OPEN_CHROMA[0] + 12) % 12)

    for (let strIdx = 0; strIdx < 6; strIdx++) {
      const guitarString = 6 - strIdx
      // Take first 3 scale tones at or above startFret on this string
      const chosen = fretsByString[strIdx].filter(f => f >= startFret).slice(0, 3)
      // Only add frets within display range (0–15)
      chosen.forEach(f => { if (f <= 15) inBox.add(`${guitarString}:${f}`) })
      // Carry the lowest chosen fret forward as the anchor for the next string
      if (chosen.length > 0) startFret = chosen[0]
    }

    return inBox
  })
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test:run -- --reporter=verbose 2>&1 | grep -A3 "build3NPSPositions"
```

Expected: all 5 `build3NPSPositions` tests pass.

- [ ] **Step 5: Run full suite**

```bash
pnpm test:run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/rendering/fretboard.ts __tests__/fretboard-positions.test.ts
git commit -m "feat: add build3NPSPositions algorithm"
```

---

## Task 4: `getBoxMembershipSet()` — CAGED, 3NPS, and windows

**Files:**
- Modify: `lib/rendering/fretboard.ts` (replace `getBoxMembershipSet` stub)
- Modify: `__tests__/fretboard-positions.test.ts` (add new describe block)

- [ ] **Step 1: Write failing tests**

Append to `__tests__/fretboard-positions.test.ts`:

```typescript
import { getBoxMembershipSet } from "@/lib/rendering/fretboard"

describe("getBoxMembershipSet", () => {
  it("returns empty set for boxSystem 'none'", () => {
    const set = getBoxMembershipSet("C", "Major", "none", 0, C_MAJOR_NOTES, C_MAJOR_INTERVALS)
    expect(set.size).toBe(0)
  })

  it("returns empty set for boxSystem 'windows'", () => {
    const set = getBoxMembershipSet("C", "Major", "windows", 0, C_MAJOR_NOTES, C_MAJOR_INTERVALS)
    expect(set.size).toBe(0)
  })

  it("CAGED: returns non-empty set for Major scale position 0", () => {
    const set = getBoxMembershipSet("C", "Major", "caged", 0, C_MAJOR_NOTES, C_MAJOR_INTERVALS)
    expect(set.size).toBeGreaterThan(0)
  })

  it("CAGED: position 0 of C Major includes string 6 fret 8 (root C)", () => {
    // SCALE_PATTERNS["Major"][0] has [6, 0] entry; rootFret for C on low E = 8
    const set = getBoxMembershipSet("C", "Major", "caged", 0, C_MAJOR_NOTES, C_MAJOR_INTERVALS)
    expect(set.has("6:8")).toBe(true)
  })

  it("CAGED: returns empty set for an unknown scale type", () => {
    const set = getBoxMembershipSet("C", "UnknownScale", "caged", 0, C_MAJOR_NOTES, C_MAJOR_INTERVALS)
    expect(set.size).toBe(0)
  })

  it("3NPS: position 0 of C Major includes C at string 6 fret 8", () => {
    const set = getBoxMembershipSet("C", "Major", "3nps", 0, C_MAJOR_NOTES, C_MAJOR_INTERVALS)
    expect(set.has("6:8")).toBe(true)
  })

  it("3NPS: all frets in set are within 0–15", () => {
    const set = getBoxMembershipSet("C", "Major", "3nps", 2, C_MAJOR_NOTES, C_MAJOR_INTERVALS)
    for (const key of set) {
      const fret = parseInt(key.split(":")[1])
      expect(fret).toBeGreaterThanOrEqual(0)
      expect(fret).toBeLessThanOrEqual(15)
    }
  })
})
```

- [ ] **Step 2: Run to confirm they fail**

```bash
pnpm test:run -- --reporter=verbose 2>&1 | grep -A3 "getBoxMembershipSet"
```

Expected: most tests fail (stub returns empty set).

- [ ] **Step 3: Implement `getBoxMembershipSet`**

Replace the stub in `lib/rendering/fretboard.ts`:

```typescript
export function getBoxMembershipSet(
  tonic: string,
  scaleType: string,
  boxSystem: BoxSystem,
  boxIndex: number,
  scaleNotes: string[],
  scaleIntervals: string[]
): Set<string> {
  if (boxSystem === "none" || boxSystem === "windows") return new Set()

  if (boxSystem === "caged") {
    const patterns = SCALE_PATTERNS[scaleType]
    if (!patterns || !patterns[boxIndex]) return new Set()
    const rootFret = ((Note.chroma(tonic) ?? 0) - OPEN_CHROMA[0] + 12) % 12
    const set = new Set<string>()
    for (const [guitarString, fretOffset] of patterns[boxIndex].shape) {
      let fret = rootFret + fretOffset
      if (fret < 0) fret += 12
      if (fret > 15) continue
      set.add(`${guitarString}:${fret}`)
    }
    return set
  }

  if (boxSystem === "3nps") {
    const positions = build3NPSPositions(tonic, scaleNotes, scaleIntervals)
    return positions[boxIndex] ?? new Set()
  }

  // "pentatonic" handled in Task 5
  return new Set()
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test:run -- --reporter=verbose 2>&1 | grep -A3 "getBoxMembershipSet"
```

Expected: all 7 tests pass.

- [ ] **Step 5: Run full suite**

```bash
pnpm test:run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/rendering/fretboard.ts __tests__/fretboard-positions.test.ts
git commit -m "feat: add getBoxMembershipSet (CAGED, 3NPS, windows)"
```

---

## Task 5: `getBoxMembershipSet()` — pentatonic via `FretboardSystem`

**Files:**
- Modify: `lib/rendering/fretboard.ts` (extend `getBoxMembershipSet` with pentatonic branch)
- Modify: `__tests__/fretboard-positions.test.ts` (add pentatonic tests with FretboardSystem mock)

- [ ] **Step 1: Write failing test (with mock)**

Append to `__tests__/fretboard-positions.test.ts`:

```typescript
import { vi } from "vitest"

// Mock @moonwave99/fretboard.js so FretboardSystem doesn't require a DOM
vi.mock("@moonwave99/fretboard.js", () => ({
  Fretboard: vi.fn(),
  FretboardSystem: vi.fn().mockImplementation(() => ({
    getScale: vi.fn().mockReturnValue([
      { string: 6, fret: 8, inBox: true },
      { string: 6, fret: 10, inBox: false },
      { string: 5, fret: 8, inBox: true },
    ]),
  })),
  Systems: { pentatonic: "pentatonic" },
}))

describe("getBoxMembershipSet — pentatonic", () => {
  it("returns in-box positions from FretboardSystem", () => {
    const set = getBoxMembershipSet("C", "Pentatonic Minor", "pentatonic", 0, ["C", "Eb", "F", "G", "Bb"], ["1P", "3m", "4P", "5P", "7m"])
    // Mock returns string:6 fret:8 inBox:true and string:5 fret:8 inBox:true
    expect(set.has("6:8")).toBe(true)
    expect(set.has("5:8")).toBe(true)
    // string:6 fret:10 has inBox:false → should NOT be in set
    expect(set.has("6:10")).toBe(false)
  })

  it("falls back to SCALE_PATTERNS when FretboardSystem throws", () => {
    // Re-mock to throw
    const { FretboardSystem } = require("@moonwave99/fretboard.js")
    FretboardSystem.mockImplementationOnce(() => ({
      getScale: vi.fn().mockImplementation(() => { throw new Error("unsupported") }),
    }))
    // Blues falls back to SCALE_PATTERNS["Blues"] CAGED positions
    // Just verify it doesn't throw and returns a Set
    const set = getBoxMembershipSet("A", "Blues", "pentatonic", 0, ["A", "C", "D", "Eb", "E", "G"], ["1P", "3m", "4P", "5d", "5P", "7m"])
    expect(set).toBeInstanceOf(Set)
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

```bash
pnpm test:run -- --reporter=verbose 2>&1 | grep -A5 "pentatonic"
```

Expected: `has("6:8") → false` (stub returns empty set).

- [ ] **Step 3: Add pentatonic branch to `getBoxMembershipSet`**

In `lib/rendering/fretboard.ts`, in `getBoxMembershipSet`, replace the final `return new Set()` with:

```typescript
  if (boxSystem === "pentatonic") {
    const fbType = PENTATONIC_TYPE_MAP[scaleType]
    if (!fbType) {
      // No Fretboard.js mapping → fall back to CAGED from SCALE_PATTERNS
      return getBoxMembershipSet(tonic, scaleType, "caged", boxIndex, scaleNotes, scaleIntervals)
    }
    try {
      const system = new FretboardSystem()
      const dots = system.getScale({
        type: fbType,
        root: tonic,
        box: { box: boxIndex + 1, system: Systems.pentatonic },
      }) as Array<{ string: number; fret: number; inBox: boolean }>
      return new Set(dots.filter(d => d.inBox).map(d => `${d.string}:${d.fret}`))
    } catch {
      return getBoxMembershipSet(tonic, scaleType, "caged", boxIndex, scaleNotes, scaleIntervals)
    }
  }

  return new Set()
```

- [ ] **Step 4: Run tests**

```bash
pnpm test:run -- --reporter=verbose 2>&1 | grep -A3 "pentatonic"
```

Expected: both pentatonic tests pass.

- [ ] **Step 5: Run full suite**

```bash
pnpm test:run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/rendering/fretboard.ts __tests__/fretboard-positions.test.ts
git commit -m "feat: add pentatonic box membership via FretboardSystem"
```

---

## Task 6: Rewrite `renderFretboard()`

**Files:**
- Modify: `lib/rendering/fretboard.ts` (replace the `renderFretboard` stub)

No new unit tests (Fretboard.js rendering requires a live DOM; manual smoke test in Task 9).

- [ ] **Step 1: Replace the `renderFretboard` stub**

In `lib/rendering/fretboard.ts`, replace the stub with:

```typescript
export function renderFretboard(
  containerEl: HTMLElement,
  scale: GuitarScale,
  boxSystem: BoxSystem,
  boxIndex: number,
  labelMode: "note" | "interval",
  boxScaleType?: string   // for arpeggios: parent scale type for CAGED/3NPS lookup
): void {
  containerEl.innerHTML = ""

  // Resolve CSS custom properties (theme colours)
  const cs = typeof document !== "undefined" ? getComputedStyle(document.documentElement) : null
  const accentColor = cs?.getPropertyValue("--accent").trim() || "#b45309"
  const mutedColor  = cs?.getPropertyValue("--muted-foreground").trim() || "#737373"

  // Compute all positions of scale/arpeggio notes across the full fretboard
  const baseDots = getAllFretboardPositions(scale.tonic, scale.notes, scale.intervals)

  // Determine box membership
  let inBoxSet: Set<string>
  if (boxSystem === "windows") {
    // Arpeggios only: use the pre-computed position windows from GuitarScale.positions
    const windowPos = scale.positions[boxIndex]?.positions ?? []
    inBoxSet = new Set(windowPos.map(p => `${p.string}:${p.fret}`))
  } else {
    // For CAGED/3NPS, use boxScaleType if provided (e.g., parent scale for arpeggio)
    const lookupScaleType = boxScaleType ?? scale.type
    inBoxSet = getBoxMembershipSet(
      scale.tonic, lookupScaleType, boxSystem, boxIndex, scale.notes, scale.intervals
    )
  }

  const hasBox = boxSystem !== "none"

  // Attach inBox and label to each dot
  const dots = baseDots.map(d => ({
    ...d,
    inBox: hasBox ? inBoxSet.has(`${d.string}:${d.fret}`) : true,
    label: labelMode === "interval" ? d.interval : d.note,
  }))

  // Create Fretboard instance
  // Note: if Fretboard only accepts a CSS selector (not an element), assign a
  // temporary id: containerEl.id = `fb-${Date.now()}` and pass `#${containerEl.id}`
  const fretboard = new (Fretboard as any)({
    el: containerEl,
    fretCount: 15,
    dotText: (d: any) => d.label,
    showFretNumbers: true,
  })

  fretboard.setDots(dots)

  // Style out-of-box dots first (dimmed grey)
  fretboard.style({
    filter: (d: any) => !d.inBox,
    fill: "#aaaaaa",
    stroke: "#aaaaaa",
    fontFill: "#aaaaaa",
    opacity: 0.25,
  })

  // Style in-box dots by interval degree (applied after dimming — overrides)
  const inBox = (d: any) => d.inBox

  fretboard
    .style({
      filter: (d: any) => inBox(d) && d.interval === "R",
      fill: accentColor,
      stroke: accentColor,
      fontFill: "#ffffff",
    })
    .style({
      filter: (d: any) => inBox(d) && (d.interval === "3" || d.interval === "b3"),
      fill: INTERVAL_DEGREE_COLORS.third,
      stroke: INTERVAL_DEGREE_COLORS.third,
      fontFill: "#ffffff",
    })
    .style({
      filter: (d: any) => inBox(d) && (d.interval === "5" || d.interval === "b5" || d.interval === "#5"),
      fill: INTERVAL_DEGREE_COLORS.fifth,
      stroke: INTERVAL_DEGREE_COLORS.fifth,
      fontFill: "#ffffff",
    })
    .style({
      filter: (d: any) => inBox(d) && (d.interval === "7" || d.interval === "b7"),
      fill: INTERVAL_DEGREE_COLORS.seventh,
      stroke: INTERVAL_DEGREE_COLORS.seventh,
      fontFill: "#ffffff",
    })
    .style({
      // All other in-box intervals (2, b2, 4, #4, 6, b6, etc.)
      filter: (d: any) => inBox(d) && !["R","3","b3","5","b5","#5","7","b7"].includes(d.interval),
      fill: mutedColor,
      stroke: mutedColor,
      fontFill: "#ffffff",
    })

  fretboard.render()
}
```

- [ ] **Step 2: Run full test suite**

```bash
pnpm test:run
```

Expected: all tests pass. (The mock for `@moonwave99/fretboard.js` in Task 5's test covers the import.)

- [ ] **Step 3: Commit**

```bash
git add lib/rendering/fretboard.ts
git commit -m "feat: rewrite renderFretboard() using Fretboard.js"
```

---

## Task 7: Update `FretboardViewer` component

**Files:**
- Modify: `app/(app)/reference/_components/fretboard-viewer.tsx`

- [ ] **Step 1: Replace the component**

```typescript
"use client"

import { useEffect, useRef } from "react"
import { renderFretboard } from "@/lib/rendering/fretboard"
import type { BoxSystem } from "@/lib/rendering/fretboard"
import type { GuitarScale } from "@/lib/theory/types"

interface FretboardViewerProps {
  scale: GuitarScale
  boxSystem: BoxSystem
  boxIndex: number
  labelMode: "note" | "interval"
  boxScaleType?: string  // parent scale type for CAGED/3NPS when showing an arpeggio
}

export function FretboardViewer({
  scale,
  boxSystem,
  boxIndex,
  labelMode,
  boxScaleType,
}: FretboardViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    try {
      renderFretboard(containerRef.current, scale, boxSystem, boxIndex, labelMode, boxScaleType)
    } catch {
      if (containerRef.current) {
        containerRef.current.innerHTML =
          "<p class='text-xs text-muted-foreground'>Diagram unavailable</p>"
      }
    }
  }, [scale, boxSystem, boxIndex, labelMode, boxScaleType])

  return (
    <div
      ref={containerRef}
      className="w-full overflow-x-auto rounded border border-border bg-card p-2 min-h-[200px]"
    />
  )
}
```

- [ ] **Step 2: Run full test suite**

```bash
pnpm test:run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/(app)/reference/_components/fretboard-viewer.tsx
git commit -m "feat: update FretboardViewer props (boxSystem, boxIndex, labelMode)"
```

---

## Task 8: Update `ScalePanel`

**Files:**
- Modify: `app/(app)/reference/_components/scale-panel.tsx`

- [ ] **Step 1: Replace the file**

```typescript
"use client"

import { useState, useMemo } from "react"
import { getScale, listScaleTypes } from "@/lib/theory"
import { TabViewer } from "./tab-viewer"
import { FretboardViewer } from "./fretboard-viewer"
import { getScaleBoxSystems } from "@/lib/rendering/fretboard"
import type { BoxSystem } from "@/lib/rendering/fretboard"
import SCALE_PATTERNS from "@/lib/theory/data/scale-patterns"
import { cn } from "@/lib/utils"

const TONAL_TO_DEGREE: Record<string, string> = {
  "1P": "1",
  "2m": "b2", "2M": "2", "2A": "#2",
  "3m": "b3", "3M": "3",
  "4P": "4", "4A": "#4",
  "5d": "b5", "5P": "5", "5A": "#5",
  "6m": "b6", "6M": "6",
  "7m": "b7", "7M": "7",
}
const tonalToDegree = (interval: string) => TONAL_TO_DEGREE[interval] ?? interval

const BOX_SYSTEM_LABELS: Record<BoxSystem, string> = {
  none:       "All notes",
  caged:      "CAGED",
  "3nps":     "3NPS",
  pentatonic: "Pentatonic boxes",
  windows:    "Position windows",
}

interface ScalePanelProps {
  tonic: string
}

export function ScalePanel({ tonic }: ScalePanelProps) {
  const scaleTypes = useMemo(() => listScaleTypes(), [])
  const [scaleType, setScaleType] = useState(scaleTypes[0] ?? "Major")
  const [viewMode, setViewMode]   = useState<"tab" | "fretboard">("tab")
  const [labelMode, setLabelMode] = useState<"note" | "interval">("interval")
  const [boxSystem, setBoxSystem] = useState<BoxSystem>("none")
  const [boxIndex, setBoxIndex]   = useState(0)
  // Tab view position selector (unchanged from original)
  const [positionIndex, setPositionIndex] = useState(0)

  const scale = useMemo(() => getScale(tonic, scaleType), [tonic, scaleType])

  const availableBoxSystems = useMemo(() => getScaleBoxSystems(scaleType), [scaleType])

  const boxCount = useMemo(() => {
    if (boxSystem === "caged")      return SCALE_PATTERNS[scaleType]?.length ?? 0
    if (boxSystem === "3nps")       return 7
    if (boxSystem === "pentatonic") return 5
    return 0
  }, [boxSystem, scaleType])

  const safeBoxIndex    = boxIndex < boxCount ? boxIndex : 0
  const positionCount   = scale.positions.length
  const safePositionIndex = positionIndex < positionCount ? positionIndex : 0

  return (
    <div className="space-y-4">
      {/* Scale type selector */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground" htmlFor="scale-type-select">
          Scale type
        </label>
        <select
          id="scale-type-select"
          value={scaleType}
          onChange={(e) => {
            const newType = e.target.value
            setScaleType(newType)
            setPositionIndex(0)
            setBoxIndex(0)
            // Reset box system if no longer available
            const newSystems = getScaleBoxSystems(newType)
            if (!newSystems.includes(boxSystem)) setBoxSystem("none")
          }}
          className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
        >
          {scaleTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Tab position selector — shown only in tab view */}
      {viewMode === "tab" && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="scale-position-select">
            Position
          </label>
          <select
            id="scale-position-select"
            value={safePositionIndex}
            onChange={(e) => setPositionIndex(Number(e.target.value))}
            className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {Array.from({ length: positionCount }, (_, i) => (
              <option key={i} value={i}>
                {scale.positions[i]?.label ?? `Position ${i + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* View mode toggle + label mode */}
      <div className="flex items-center gap-4">
        <div className="flex rounded border border-border overflow-hidden text-sm">
          <button
            onClick={() => setViewMode("fretboard")}
            className={cn(
              "px-3 py-1.5 transition-colors",
              viewMode === "fretboard"
                ? "bg-accent text-accent-foreground"
                : "bg-card text-muted-foreground hover:bg-muted"
            )}
          >
            Fretboard
          </button>
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
        </div>

        {viewMode === "fretboard" && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={labelMode === "interval"}
              onChange={(e) => setLabelMode(e.target.checked ? "interval" : "note")}
              className="accent-accent"
            />
            Show intervals
          </label>
        )}
      </div>

      {/* Fretboard box controls — shown only in fretboard view */}
      {viewMode === "fretboard" && availableBoxSystems.length > 1 && (
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="box-system-select">
              Highlight
            </label>
            <select
              id="box-system-select"
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
              <label className="text-xs text-muted-foreground" htmlFor="box-index-select">
                Box
              </label>
              <select
                id="box-index-select"
                value={safeBoxIndex}
                onChange={(e) => setBoxIndex(Number(e.target.value))}
                className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {Array.from({ length: boxCount }, (_, i) => (
                  <option key={i} value={i}>
                    {boxSystem === "caged"
                      ? (SCALE_PATTERNS[scaleType]?.[i]?.label ?? `Position ${i + 1}`)
                      : `Position ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Viewer */}
      {viewMode === "tab" ? (
        <TabViewer scale={scale} positionIndex={safePositionIndex} />
      ) : (
        <FretboardViewer
          scale={scale}
          boxSystem={boxSystem}
          boxIndex={safeBoxIndex}
          labelMode={labelMode}
        />
      )}

      {/* Notes + formula */}
      <div className="text-xs text-muted-foreground space-y-0.5">
        <p>Notes: {scale.notes.join(" – ")}</p>
        <p>Formula: {scale.intervals.map(tonalToDegree).join(" – ")}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run full test suite**

```bash
pnpm test:run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/(app)/reference/_components/scale-panel.tsx
git commit -m "feat: add CAGED/3NPS/pentatonic box selectors to ScalePanel"
```

---

## Task 9: Update `ArpeggioPanel`

**Files:**
- Modify: `app/(app)/reference/_components/arpeggio-panel.tsx`

- [ ] **Step 1: Replace the file**

```typescript
"use client"

import { useState, useMemo } from "react"
import { getArpeggio, listChordTypes } from "@/lib/theory"
import { TabViewer } from "./tab-viewer"
import { FretboardViewer } from "./fretboard-viewer"
import {
  getArpeggioBoxSystems,
  CHORD_TYPE_TO_SCALE,
} from "@/lib/rendering/fretboard"
import type { BoxSystem } from "@/lib/rendering/fretboard"
import SCALE_PATTERNS from "@/lib/theory/data/scale-patterns"
import { cn } from "@/lib/utils"

const TONAL_TO_DEGREE: Record<string, string> = {
  "1P": "1",
  "2m": "b2", "2M": "2", "2A": "#2",
  "3m": "b3", "3M": "3",
  "4P": "4", "4A": "#4",
  "5d": "b5", "5P": "5", "5A": "#5",
  "6m": "b6", "6M": "6",
  "7m": "b7", "7M": "7",
}
const tonalToDegree = (interval: string) => TONAL_TO_DEGREE[interval] ?? interval

const BOX_SYSTEM_LABELS: Record<BoxSystem, string> = {
  none:       "All notes",
  caged:      "CAGED",
  "3nps":     "3NPS",
  pentatonic: "Pentatonic boxes",
  windows:    "Position windows",
}

interface ArpeggioPanelProps {
  tonic: string
}

export function ArpeggioPanel({ tonic }: ArpeggioPanelProps) {
  const chordTypes = useMemo(() => listChordTypes(), [])
  const [chordType, setChordType] = useState(chordTypes[0] ?? "maj7")
  const [viewMode, setViewMode]   = useState<"tab" | "fretboard">("tab")
  const [labelMode, setLabelMode] = useState<"note" | "interval">("interval")
  const [boxSystem, setBoxSystem] = useState<BoxSystem>("none")
  const [boxIndex, setBoxIndex]   = useState(0)
  const [positionIndex, setPositionIndex] = useState(0)

  const arpeggio = useMemo(() => getArpeggio(tonic, chordType), [tonic, chordType])

  const parentScaleType     = CHORD_TYPE_TO_SCALE[chordType]
  const availableBoxSystems = useMemo(() => getArpeggioBoxSystems(chordType), [chordType])

  const boxCount = useMemo(() => {
    if (boxSystem === "caged" && parentScaleType)
      return SCALE_PATTERNS[parentScaleType]?.length ?? 0
    if (boxSystem === "3nps")    return 7
    if (boxSystem === "windows") return arpeggio.positions.length
    return 0
  }, [boxSystem, chordType, arpeggio.positions.length, parentScaleType])

  const safeBoxIndex      = boxIndex < boxCount ? boxIndex : 0
  const positionCount     = arpeggio.positions.length
  const safePositionIndex = positionIndex < positionCount ? positionIndex : 0

  return (
    <div className="space-y-4">
      {/* Chord type selector */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground" htmlFor="arpeggio-type-select">
          Chord type
        </label>
        <select
          id="arpeggio-type-select"
          value={chordType}
          onChange={(e) => {
            const newType = e.target.value
            setChordType(newType)
            setPositionIndex(0)
            setBoxIndex(0)
            const newSystems = getArpeggioBoxSystems(newType)
            if (!newSystems.includes(boxSystem)) setBoxSystem("none")
          }}
          className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
        >
          {chordTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Tab position selector — shown only in tab view */}
      {viewMode === "tab" && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="arpeggio-position-select">
            Position
          </label>
          <select
            id="arpeggio-position-select"
            value={safePositionIndex}
            onChange={(e) => setPositionIndex(Number(e.target.value))}
            className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {Array.from({ length: positionCount }, (_, i) => (
              <option key={i} value={i}>
                {arpeggio.positions[i]?.label ?? `Position ${i + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* View mode toggle + label mode */}
      <div className="flex items-center gap-4">
        <div className="flex rounded border border-border overflow-hidden text-sm">
          <button
            onClick={() => setViewMode("fretboard")}
            className={cn(
              "px-3 py-1.5 transition-colors",
              viewMode === "fretboard"
                ? "bg-accent text-accent-foreground"
                : "bg-card text-muted-foreground hover:bg-muted"
            )}
          >
            Fretboard
          </button>
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
        </div>

        {viewMode === "fretboard" && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={labelMode === "interval"}
              onChange={(e) => setLabelMode(e.target.checked ? "interval" : "note")}
              className="accent-accent"
            />
            Show intervals
          </label>
        )}
      </div>

      {/* Fretboard box controls */}
      {viewMode === "fretboard" && availableBoxSystems.length > 1 && (
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="arp-box-system-select">
              Highlight
            </label>
            <select
              id="arp-box-system-select"
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
              <label className="text-xs text-muted-foreground" htmlFor="arp-box-index-select">
                Box
              </label>
              <select
                id="arp-box-index-select"
                value={safeBoxIndex}
                onChange={(e) => setBoxIndex(Number(e.target.value))}
                className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {Array.from({ length: boxCount }, (_, i) => (
                  <option key={i} value={i}>
                    {boxSystem === "caged" && parentScaleType
                      ? (SCALE_PATTERNS[parentScaleType]?.[i]?.label ?? `Position ${i + 1}`)
                      : `Position ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Viewer */}
      {viewMode === "tab" ? (
        <TabViewer scale={arpeggio} positionIndex={safePositionIndex} />
      ) : (
        <FretboardViewer
          scale={arpeggio}
          boxSystem={boxSystem}
          boxIndex={safeBoxIndex}
          labelMode={labelMode}
          boxScaleType={parentScaleType}
        />
      )}

      {/* Notes + formula */}
      <div className="text-xs text-muted-foreground space-y-0.5">
        <p>Notes: {arpeggio.notes.join(" – ")}</p>
        <p>Formula: {arpeggio.intervals.map(tonalToDegree).join(" – ")}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run full test suite**

```bash
pnpm test:run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/(app)/reference/_components/arpeggio-panel.tsx
git commit -m "feat: add CAGED/3NPS/windows box selectors to ArpeggioPanel"
```

---

## Task 10: Manual smoke test

- [ ] **Step 1: Start dev server**

```bash
pnpm dev
```

Open [http://localhost:3000/reference](http://localhost:3000/reference).

- [ ] **Step 2: Test Scales — full fretboard renders**

1. Go to the Scales tab, pick any tonic (e.g. C) and scale type (e.g. Major).
2. Click "Fretboard". A full 15-fret neck should appear with coloured dots.
3. Verify root dots match the accent colour, 3rd/b3 = green, 5th = blue, 7th = purple.

- [ ] **Step 3: Test Scales — box highlighting**

1. Select "CAGED" from the Highlight dropdown. Select "Position 1 (E shape)".  
   Expected: most dots dim to grey; the E-shape position is brightly coloured.
2. Switch to "3NPS", select Position 1.  
   Expected: approximately 18 bright dots (3 per string × 6 strings).
3. Switch scale type to "Pentatonic Minor", select "Pentatonic boxes", Position 1.  
   Expected: 12 bright dots (2 per string × 6 strings).
4. Switch scale type to "Blues". Confirm "Pentatonic boxes" is still the only option.
5. Switch scale type to "Whole Tone". Confirm only "All notes" is available.

- [ ] **Step 4: Test Scales — label toggle**

1. Check "Show intervals" → dots show degree labels ("R", "b3", "5", etc.).
2. Uncheck → dots show note names ("C", "Eb", "G", etc.).

- [ ] **Step 5: Test Arpeggios — full fretboard renders**

1. Go to the Arpeggios tab, pick a chord type (e.g. maj7). Click "Fretboard".  
   Expected: full neck with coloured dots (only arpeggio tones).
2. Select "CAGED", Position 1. Confirm in-box dots bright, others dimmed.
3. Select chord type "dim7". Confirm only "Position windows" is available (no CAGED/3NPS).

- [ ] **Step 6: Test tab view is unaffected**

1. On both Scales and Arpeggios, switch to "Tab" view. Confirm tab notation still renders correctly.

- [ ] **Step 7: Run final test suite**

```bash
pnpm test:run
```

Expected: all tests pass.

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "feat: Fretboard.js integration complete — full neck view with CAGED/3NPS/pentatonic boxes"
```

---

## Known edge cases

- **ESM import issues with Fretboard.js:** If `new Fretboard({...})` throws in a Next.js build because the package uses browser globals at import time, wrap the constructor call in a dynamic import inside `renderFretboard()`:  
  `const { Fretboard } = await import("@moonwave99/fretboard.js")`.  
  Since `renderFretboard` is only called from `useEffect`, this is safe.

- **Fretboard.js `el` accepts only selectors:** If `new Fretboard({ el: containerEl })` fails, add a temporary ID:  
  `containerEl.id = \`fb-\${Date.now()}\`; new Fretboard({ el: \`#\${containerEl.id}\` })`.

- **CAGED patterns with negative fret offsets near the nut:** The `+12` correction in `getBoxMembershipSet` (CAGED branch) shifts negative frets up one octave. If the corrected fret > 15, the dot is discarded. Box may appear incomplete for keys near fret 0 — acceptable.

- **3NPS positions extending above fret 15:** `build3NPSPositions` only adds frets ≤ 15 to the set. Some positions (e.g. position 2 starting on D at fret 10 in C major) may have a few notes above 15 that are silently omitted. The box will appear with fewer dots than usual — acceptable.
