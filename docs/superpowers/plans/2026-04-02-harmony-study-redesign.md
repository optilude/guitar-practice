# Harmony Study & Reference Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Reference page so the Circle of Fifths and a new Harmony Study panel sit side-by-side, with the Scale/Arpeggio/Chord/Triad study tools below in a full-width section; introduce a diatonic chord explorer and progression study backed by a new `getSoloScales` engine.

**Architecture:** The page gains a three-section layout (Circle + Harmony Study on top; Study Tools spanning full width below). Harmony Study is a new component subtree with two sub-tabs (Harmony, Progressions) that share a reusable chord-block component and a scale-recommendation display. The theory layer gains `getSoloScales`, extended types, and a richer progressions dataset.

**Tech Stack:** Next.js 16 App Router ("use client" components unchanged), React 19, Tailwind v4, TonalJS (already in use), existing `getDiatonicChords` / `getProgression` theory API, Vitest + React Testing Library.

---

## File Map

### New files
| Path | Purpose |
|------|---------|
| `lib/theory/solo-scales.ts` | `getSoloScales` engine — primary + additional scale recommendations |
| `app/(app)/reference/_components/harmony-study.tsx` | Harmony/Progressions sub-tab container |
| `app/(app)/reference/_components/harmony-tab.tsx` | Mode selector + diatonic chord blocks + scale panel |
| `app/(app)/reference/_components/progressions-tab.tsx` | Progression selector + chord blocks + scale panel |
| `app/(app)/reference/_components/chord-quality-block.tsx` | Reusable diatonic chord block (selectable button) |
| `app/(app)/reference/_components/solo-scales-panel.tsx` | Primary + "Also works" scale display |
| `__tests__/theory/solo-scales.test.ts` | Unit tests for getSoloScales |
| `__tests__/reference/harmony-study.test.tsx` | Tab switching tests |
| `__tests__/reference/harmony-tab.test.tsx` | Mode selector, chord blocks, chord selection |
| `__tests__/reference/progressions-tab.test.tsx` | Progression selector, chord blocks, scale display |

### Modified files
| Path | Change |
|------|--------|
| `lib/theory/types.ts` | Extend `Progression`; extend `ProgressionChord`; add `SoloScaleEntry` + `SoloScales` |
| `lib/theory/progressions.ts` | Replace PROGRESSIONS with 15 entries; extend ROMAN_TO_DEGREE; use per-progression mode; return `degree`+`quality` |
| `lib/theory/index.ts` | Add `export * from "@/lib/theory/solo-scales"` |
| `app/(app)/reference/page.tsx` | New three-section layout with HarmonyStudy in top-right |
| `app/(app)/reference/_components/chord-panel.tsx` | Fingerings grid: max 5 columns |
| `app/(app)/reference/_components/triad-panel.tsx` | Fingerings grid: max 5 columns |
| `__tests__/theory/progressions.test.ts` | Rewrite for new progression names + extended return type |
| `__tests__/reference/page.test.tsx` | Extend mock + assertions for new layout |

---

### Task 1: Extend types and re-export

**Files:**
- Modify: `lib/theory/types.ts`
- Modify: `lib/theory/index.ts`

- [ ] **Step 1: Extend `Progression`, `ProgressionChord`, and add `SoloScaleEntry` / `SoloScales` to `lib/theory/types.ts`**

Replace the existing `Progression` and `ProgressionChord` interfaces, and add two new interfaces at the bottom of the file. The complete final file:

```typescript
export type NoteName = string // "C", "D#", "Bb"
export type IntervalName = string // "1P", "3M", "7m" (TonalJS format)
export type ScaleType = string // "Major", "Dorian", "Altered", "Blues", etc.
export type ChordType = string // "maj7", "m7", "7", "m7b5", "dim7", "aug", etc.

export interface FretPosition {
  string: number // 1 = high e, 6 = low E
  fret: number
  interval: string // "R", "2", "b3", "3", "4", "b5", "5", "6", "b7", "7"
}

export interface ScalePosition {
  label: string // "Position 1", "Position 2", etc.
  positions: FretPosition[]
}

export interface GuitarScale {
  tonic: NoteName
  type: ScaleType
  notes: NoteName[]
  intervals: IntervalName[]
  positions: ScalePosition[]
}

export interface ChordVoicing {
  frets: (number | null)[] // index 0 = low E string, null = muted
  fingers: (number | null)[]
  barre?: { fret: number; fromString: number; toString: number }
  label?: string // "Drop 2", "Drop 3", "Open", "Barre Xfr", etc.
}

export interface GuitarChord {
  tonic: NoteName
  type: ChordType
  notes: NoteName[]
  intervals: IntervalName[]
  voicings: ChordVoicing[]
}

export interface DiatonicChord {
  degree: number // 1–7
  roman: string // "I", "ii", "iii", "IV", "V", "vi", "vii°"
  nashville: string // "1", "2", "3", "4", "5", "6", "7"
  tonic: NoteName
  type: ChordType
  quality: string // "major", "minor", "diminished", "augmented"
}

export interface CircleEntry {
  tonic: NoteName
  relativeMajor?: NoteName
  relativeMinor?: NoteName
  sharps?: number
  flats?: number
}

export interface Progression {
  name: string          // slug identifier: "pop-standard"
  displayName: string   // "Pop Standard"
  romanDisplay: string  // "I – V – vi – IV"
  description: string   // short prose
  degrees: string[]     // ["I", "V", "vi", "IV"] — may include "♭VII"
  mode: string          // TonalJS mode name: "ionian", "aeolian", "mixolydian"
  recommendedScaleType: string // "Major Scale", "Natural Minor Scale", "Mixolydian Scale"
}

export interface ProgressionChord {
  roman: string
  nashville: string
  tonic: NoteName
  type: ChordType
  quality: string  // "major" | "minor" | "dominant" | "diminished"
  degree: number   // 1–7
}

export interface SoloScaleEntry {
  scaleName: string  // type only, no tonic: "Mixolydian", "Minor Pentatonic"
  hint?: string      // "bluesy", "lifted feel", "brighter", "adds ♭5 colour"
}

export interface SoloScales {
  chordTonic: NoteName        // e.g. "G" — prepend to scale name for display
  primary: SoloScaleEntry
  additional: SoloScaleEntry[]
}

export interface Key {
  tonic: NoteName
  mode: string
  notes: NoteName[]
  signature: { sharps?: number; flats?: number }
  diatonicChords: DiatonicChord[]
  relativeKey: { tonic: NoteName; mode: string }
}
```

- [ ] **Step 2: Add solo-scales re-export to `lib/theory/index.ts`**

Add one line at the end of the file:

```typescript
export * from "@/lib/theory/solo-scales"
```

The final file:

```typescript
// Music theory engine — public API
// Re-exports everything from all theory modules

export * from "@/lib/theory/types"
export * from "@/lib/theory/keys"
export * from "@/lib/theory/scales"
export * from "@/lib/theory/chords"
export * from "@/lib/theory/arpeggios"
export * from "@/lib/theory/harmony"
export * from "@/lib/theory/progressions"
export * from "@/lib/theory/shells"
export * from "@/lib/theory/triads"
export * from "@/lib/theory/solo-scales"
```

- [ ] **Step 3: Verify TypeScript compiles with no errors**

Run: `npx tsc --noEmit`
Expected: no output (no errors). If `solo-scales.ts` doesn't exist yet the import in index.ts will fail — that's fine; create a stub:

```bash
echo 'export {}' > lib/theory/solo-scales.ts
```

Re-run `npx tsc --noEmit` and expect no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/theory/types.ts lib/theory/index.ts lib/theory/solo-scales.ts
git commit -m "feat(theory): extend Progression/ProgressionChord types; add SoloScales types"
```

---

### Task 2: Solo scales engine

**Files:**
- Create: `lib/theory/solo-scales.ts`
- Create: `__tests__/theory/solo-scales.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/theory/solo-scales.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { getSoloScales } from "@/lib/theory/solo-scales"

describe("getSoloScales", () => {
  it("returns G Mixolydian as primary for G7 (degree 5) in ionian", () => {
    const result = getSoloScales({ tonic: "G", type: "7", degree: 5 }, "ionian")
    expect(result.chordTonic).toBe("G")
    expect(result.primary.scaleName).toBe("Mixolydian")
  })

  it("returns A Aeolian as primary for Am7 (degree 6) in ionian", () => {
    const result = getSoloScales({ tonic: "A", type: "m7", degree: 6 }, "ionian")
    expect(result.primary.scaleName).toBe("Aeolian (natural minor)")
  })

  it("does not include the primary scale in additional", () => {
    const result = getSoloScales({ tonic: "G", type: "7", degree: 5 }, "ionian")
    expect(result.additional.map((a) => a.scaleName)).not.toContain("Mixolydian")
  })

  it("returns Minor Pentatonic and Blues Scale as additional for dominant 7", () => {
    const result = getSoloScales({ tonic: "G", type: "7", degree: 5 }, "ionian")
    const names = result.additional.map((a) => a.scaleName)
    expect(names).toContain("Minor Pentatonic")
    expect(names).toContain("Blues Scale")
  })

  it("returns Dorian as primary for Am7 (degree 1) in dorian", () => {
    const result = getSoloScales({ tonic: "A", type: "m7", degree: 1 }, "dorian")
    expect(result.primary.scaleName).toBe("Dorian")
  })

  it("returns Lydian as primary for Fmaj7 (degree 4) in ionian", () => {
    const result = getSoloScales({ tonic: "F", type: "maj7", degree: 4 }, "ionian")
    expect(result.primary.scaleName).toBe("Lydian")
  })

  it("filters Lydian from additional when primary is already Lydian", () => {
    const result = getSoloScales({ tonic: "F", type: "maj7", degree: 4 }, "ionian")
    // primary is Lydian; additional for maj7 includes Lydian — should be filtered out
    expect(result.additional.map((a) => a.scaleName)).not.toContain("Lydian")
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npm test __tests__/theory/solo-scales.test.ts`
Expected: FAIL — `getSoloScales` is not exported from `@/lib/theory/solo-scales`

- [ ] **Step 3: Implement `lib/theory/solo-scales.ts`**

Replace the stub created in Task 1:

```typescript
import type { SoloScaleEntry, SoloScales } from "@/lib/theory/types"

// ---------------------------------------------------------------------------
// Mode rotation tables
// ---------------------------------------------------------------------------
const MODES = [
  "ionian",
  "dorian",
  "phrygian",
  "lydian",
  "mixolydian",
  "aeolian",
  "locrian",
] as const

const MODE_OFFSET: Record<string, number> = {
  ionian: 0, major: 0,
  dorian: 1,
  phrygian: 2,
  lydian: 3,
  mixolydian: 4,
  aeolian: 5, minor: 5,
  locrian: 6,
}

const MODE_DISPLAY: Record<string, string> = {
  ionian:     "Ionian (major)",
  dorian:     "Dorian",
  phrygian:   "Phrygian",
  lydian:     "Lydian",
  mixolydian: "Mixolydian",
  aeolian:    "Aeolian (natural minor)",
  locrian:    "Locrian",
}

// ---------------------------------------------------------------------------
// Additional scales by chord type — listed in preference order
// ---------------------------------------------------------------------------
const ADDITIONAL_BY_TYPE: Record<string, SoloScaleEntry[]> = {
  maj7: [
    { scaleName: "Lydian",           hint: "lifted feel" },
    { scaleName: "Major Pentatonic", hint: "safe choice" },
  ],
  "7": [
    { scaleName: "Minor Pentatonic", hint: "bluesy" },
    { scaleName: "Blues Scale",      hint: "adds ♭5 colour" },
  ],
  m7: [
    { scaleName: "Minor Pentatonic" },
    { scaleName: "Dorian",           hint: "brighter" },
  ],
  m7b5: [
    { scaleName: "Locrian #2", hint: "less dissonant" },
  ],
}

// ---------------------------------------------------------------------------
// TonalJS scale name mapping — exported for SoloScalesPanel to call Scale.get()
// ---------------------------------------------------------------------------
export const SCALE_TONAL_NAMES: Record<string, string> = {
  "Ionian (major)":          "ionian",
  "Dorian":                  "dorian",
  "Phrygian":                "phrygian",
  "Lydian":                  "lydian",
  "Mixolydian":              "mixolydian",
  "Aeolian (natural minor)": "aeolian",
  "Locrian":                 "locrian",
  "Major Pentatonic":        "major pentatonic",
  "Minor Pentatonic":        "minor pentatonic",
  "Blues Scale":             "blues",
  "Locrian #2":              "locrian #2",
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
function primaryScaleType(mode: string, degree: number): string {
  const offset = MODE_OFFSET[mode.toLowerCase()] ?? 0
  return MODES[(offset + degree - 1) % 7]
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function getSoloScales(
  chord: { tonic: string; type: string; degree: number },
  mode: string
): SoloScales {
  const primaryType = primaryScaleType(mode, chord.degree)
  const primaryDisplay = MODE_DISPLAY[primaryType] ?? primaryType

  const additional = (ADDITIONAL_BY_TYPE[chord.type] ?? []).filter(
    (a) => a.scaleName.toLowerCase() !== primaryDisplay.toLowerCase()
  )

  return {
    chordTonic: chord.tonic,
    primary: { scaleName: primaryDisplay },
    additional,
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npm test __tests__/theory/solo-scales.test.ts`
Expected: 7 tests passing

- [ ] **Step 5: Commit**

```bash
git add lib/theory/solo-scales.ts __tests__/theory/solo-scales.test.ts
git commit -m "feat(theory): add getSoloScales engine with modal rotation and SCALE_TONAL_NAMES"
```

---

### Task 3: Updated progressions data and tests

**Files:**
- Modify: `lib/theory/progressions.ts`
- Modify: `__tests__/theory/progressions.test.ts`

- [ ] **Step 1: Rewrite `__tests__/theory/progressions.test.ts` for the new data**

```typescript
import { describe, it, expect } from "vitest"
import { listProgressions, getProgression } from "@/lib/theory/progressions"

describe("listProgressions", () => {
  it("returns exactly 15 progressions", () => {
    expect(listProgressions()).toHaveLength(15)
  })

  it("every progression has required fields", () => {
    for (const p of listProgressions()) {
      expect(typeof p.name).toBe("string")
      expect(typeof p.displayName).toBe("string")
      expect(typeof p.romanDisplay).toBe("string")
      expect(typeof p.description).toBe("string")
      expect(Array.isArray(p.degrees)).toBe(true)
      expect(p.degrees.length).toBeGreaterThan(0)
      expect(typeof p.mode).toBe("string")
      expect(typeof p.recommendedScaleType).toBe("string")
    }
  })

  it("includes pop-standard, jazz-turnaround, and folk-rock", () => {
    const names = listProgressions().map((p) => p.name)
    expect(names).toContain("pop-standard")
    expect(names).toContain("jazz-turnaround")
    expect(names).toContain("folk-rock")
  })
})

describe("getProgression", () => {
  it("returns empty array for unknown name", () => {
    expect(getProgression("unknown-progression", "C")).toEqual([])
  })

  it("resolves pop-standard chords in C: C G Am F", () => {
    const chords = getProgression("pop-standard", "C")
    expect(chords.map((c) => c.tonic)).toEqual(["C", "G", "A", "F"])
    expect(chords.map((c) => c.type)).toEqual(["maj7", "7", "m7", "maj7"])
  })

  it("returns degree on each chord", () => {
    const chords = getProgression("pop-standard", "C")
    expect(chords.map((c) => c.degree)).toEqual([1, 5, 6, 4])
  })

  it("returns quality on each chord", () => {
    const chords = getProgression("pop-standard", "C")
    expect(typeof chords[0].quality).toBe("string")
    expect(chords[0].quality.length).toBeGreaterThan(0)
  })

  it("resolves blues-rock ♭VII in C: C → Bb → F (mixolydian mode)", () => {
    const chords = getProgression("blues-rock", "C")
    expect(chords).toHaveLength(3)
    expect(chords[0].tonic).toBe("C")
    expect(chords[1].tonic).toBe("Bb")
    expect(chords[2].tonic).toBe("F")
  })

  it("resolves dark-ballad in A: A F C G (aeolian mode)", () => {
    const chords = getProgression("dark-ballad", "A")
    expect(chords.map((c) => c.tonic)).toEqual(["A", "F", "C", "G"])
  })

  it("resolves jazz-turnaround in C: Dm7 → G7 → Cmaj7", () => {
    const chords = getProgression("jazz-turnaround", "C")
    expect(chords).toHaveLength(3)
    expect(chords[0].tonic).toBe("D")
    expect(chords[0].type).toBe("m7")
    expect(chords[1].tonic).toBe("G")
    expect(chords[1].type).toBe("7")
    expect(chords[2].tonic).toBe("C")
    expect(chords[2].type).toBe("maj7")
  })

  it("pachelbel has 8 chords (I appears twice)", () => {
    const chords = getProgression("pachelbel", "C")
    expect(chords).toHaveLength(8)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npm test __tests__/theory/progressions.test.ts`
Expected: FAIL — `listProgressions` returns 8 items, not 15; names like "pop-standard" don't exist yet

- [ ] **Step 3: Rewrite `lib/theory/progressions.ts`**

```typescript
import { getDiatonicChords } from "@/lib/theory/harmony"
import type { Progression, ProgressionChord, DiatonicChord } from "@/lib/theory/types"

// ---------------------------------------------------------------------------
// Progression library — 15 progressions
// ---------------------------------------------------------------------------
const PROGRESSIONS: Progression[] = [
  {
    name: "pop-standard",
    displayName: "Pop Standard",
    romanDisplay: "I – V – vi – IV",
    description: "The most common pop progression",
    degrees: ["I", "V", "vi", "IV"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "sensitive-pop",
    displayName: "Sensitive Pop",
    romanDisplay: "vi – IV – I – V",
    description: "Minor-feel variant of the pop progression",
    degrees: ["vi", "IV", "I", "V"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "doo-wop",
    displayName: "50s / Doo-Wop",
    romanDisplay: "I – vi – IV – V",
    description: "Classic 1950s progression",
    degrees: ["I", "vi", "IV", "V"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "folk-rock",
    displayName: "Folk Rock",
    romanDisplay: "I – IV – V",
    description: "Simple three-chord foundation",
    degrees: ["I", "IV", "V"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "jazz-turnaround",
    displayName: "Jazz Turnaround",
    romanDisplay: "ii – V – I",
    description: "The most important cadence in jazz",
    degrees: ["ii", "V", "I"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "extended-turnaround",
    displayName: "Extended Turnaround",
    romanDisplay: "vi – ii – V – I",
    description: "Jazz turnaround extended one step back",
    degrees: ["vi", "ii", "V", "I"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "blues-rock",
    displayName: "Blues Rock",
    romanDisplay: "I – ♭VII – IV",
    description: "Rock staple with the ♭VII chord (diatonic in mixolydian)",
    degrees: ["I", "♭VII", "IV"],
    mode: "mixolydian",
    recommendedScaleType: "Mixolydian Scale",
  },
  {
    name: "classic-rock-loop",
    displayName: "Classic Rock Loop",
    romanDisplay: "I – IV – I – V",
    description: "Looping rock pattern with repeated tonic",
    degrees: ["I", "IV", "I", "V"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "climactic-rise",
    displayName: "Climactic Rise",
    romanDisplay: "I – IV – V – IV",
    description: "Rising tension then releasing back through IV",
    degrees: ["I", "IV", "V", "IV"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "dark-ballad",
    displayName: "Dark / Emo Ballad",
    romanDisplay: "i – ♭VI – ♭III – ♭VII",
    description: "Descending minor progression",
    degrees: ["i", "♭VI", "♭III", "♭VII"],
    mode: "aeolian",
    recommendedScaleType: "Natural Minor Scale",
  },
  {
    name: "driving-rock",
    displayName: "Driving Rock",
    romanDisplay: "vi – V – IV – V",
    description: "Descending major pattern starting on vi",
    degrees: ["vi", "V", "IV", "V"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "epic-cadence",
    displayName: "Epic Cadence",
    romanDisplay: "IV – V – iii – vi",
    description: "Ascending then landing on vi",
    degrees: ["IV", "V", "iii", "vi"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "pachelbel",
    displayName: "Pachelbel's Canon",
    romanDisplay: "I – V – vi – iii – IV – I – IV – V",
    description: "Classical progression, basis for many modern songs",
    degrees: ["I", "V", "vi", "iii", "IV", "I", "IV", "V"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "gospel-rb",
    displayName: "Gospel / R&B Loop",
    romanDisplay: "I – vi – ii – V",
    description: "Smooth loop common in gospel and R&B",
    degrees: ["I", "vi", "ii", "V"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "progressive-ballad",
    displayName: "Progressive Ballad",
    romanDisplay: "vi – iii – IV – I",
    description: "Descending through the major scale",
    degrees: ["vi", "iii", "IV", "I"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
]

export function listProgressions(): Progression[] {
  return PROGRESSIONS
}

// ---------------------------------------------------------------------------
// Roman numeral → degree (1-based), including ♭-prefixed
// ---------------------------------------------------------------------------
const ROMAN_TO_DEGREE: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7,
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7,
  "♭II": 2, "♭III": 3, "♭IV": 4, "♭V": 5, "♭VI": 6, "♭VII": 7,
  "♭ii": 2, "♭iii": 3, "♭iv": 4, "♭v": 5, "♭vi": 6, "♭vii": 7,
}

function romanToDegree(roman: string): number {
  // Strip decoration symbols (°, +) but NOT ♭ — ♭VII must match as-is
  const normalized = roman.replace(/[°+]/g, "")
  return ROMAN_TO_DEGREE[normalized] ?? 1
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function getProgression(name: string, tonic: string): ProgressionChord[] {
  const prog = PROGRESSIONS.find((p) => p.name === name)
  if (!prog) return []

  // Use the progression's own mode (not hardcoded "major")
  const diatonic = getDiatonicChords(tonic, prog.mode)
  const byDegree: Record<number, DiatonicChord> = {}
  for (const dc of diatonic) byDegree[dc.degree] = dc

  return prog.degrees.map((roman) => {
    const degree = romanToDegree(roman)
    const dc = byDegree[degree]
    if (!dc) {
      return { roman, nashville: String(degree), tonic, type: "maj7", quality: "major", degree }
    }
    return {
      roman,
      nashville: dc.nashville,
      tonic: dc.tonic,
      type: dc.type,
      quality: dc.quality,
      degree: dc.degree,
    }
  })
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npm test __tests__/theory/progressions.test.ts`
Expected: all 9 tests passing

- [ ] **Step 5: Run full test suite to confirm nothing else broke**

Run: `npm test`
Expected: all tests passing (no regressions)

- [ ] **Step 6: Commit**

```bash
git add lib/theory/progressions.ts __tests__/theory/progressions.test.ts
git commit -m "feat(theory): replace progressions with 15 entries; extend ProgressionChord with degree+quality"
```

---

### Task 4: ChordQualityBlock component

**Files:**
- Create: `app/(app)/reference/_components/chord-quality-block.tsx`

No separate test file — ChordQualityBlock is tested indirectly via HarmonyTab and ProgressionsTab tests in Tasks 6–7. It is a pure presentational component.

- [ ] **Step 1: Create `app/(app)/reference/_components/chord-quality-block.tsx`**

```typescript
import { cn } from "@/lib/utils"

interface ChordQualityBlockProps {
  roman: string      // "I", "ii", "V", "vii°", "♭VII"
  chordName: string  // "Cmaj7", "G7", "Am7"
  type: string       // chord type: "maj7", "7", "m7", "m7b5"
  isSelected: boolean
  onClick: () => void
}

function blockColors(type: string): {
  border: string; bg: string; text: string; sub: string
} {
  if (type === "maj7" || type === "")
    return { border: "border-green-700",  bg: "bg-green-950",  text: "text-green-400",  sub: "text-green-700" }
  if (type === "7")
    return { border: "border-amber-700",  bg: "bg-amber-950",  text: "text-amber-400",  sub: "text-amber-700" }
  if (type === "m7")
    return { border: "border-blue-700",   bg: "bg-blue-950",   text: "text-blue-400",   sub: "text-blue-700" }
  if (type === "m7b5" || type === "dim7")
    return { border: "border-purple-700", bg: "bg-purple-950", text: "text-purple-400", sub: "text-purple-700" }
  return { border: "border-border", bg: "bg-card", text: "text-foreground", sub: "text-muted-foreground" }
}

export function ChordQualityBlock({
  roman,
  chordName,
  type,
  isSelected,
  onClick,
}: ChordQualityBlockProps) {
  const colors = blockColors(type)
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center rounded-lg px-3 py-2.5 text-center transition-all min-w-[68px] flex-shrink-0",
        colors.bg,
        isSelected
          ? cn("border-2 ring-2 ring-offset-1 ring-offset-background", colors.border)
          : cn("border", colors.border)
      )}
    >
      <span className={cn("text-[9px] font-medium mb-1", colors.sub)}>{roman}</span>
      <span className={cn("text-sm font-bold leading-tight", colors.text)}>{chordName}</span>
      <span className={cn("text-[9px] mt-1", colors.sub)}>{type}</span>
    </button>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/(app)/reference/_components/chord-quality-block.tsx
git commit -m "feat(reference): add ChordQualityBlock reusable chord display component"
```

---

### Task 5: SoloScalesPanel component

**Files:**
- Create: `app/(app)/reference/_components/solo-scales-panel.tsx`

No separate test file — tested indirectly via HarmonyTab and ProgressionsTab tests.

- [ ] **Step 1: Create `app/(app)/reference/_components/solo-scales-panel.tsx`**

```typescript
import { Scale } from "tonal"
import { SCALE_TONAL_NAMES } from "@/lib/theory/solo-scales"
import type { SoloScales } from "@/lib/theory/types"

interface SoloScalesPanelProps {
  scales: SoloScales
  chordName: string  // e.g. "G7", "Am7" — used in heading and badge color
}

function badgeColor(type: string): string {
  if (type === "maj7" || type === "") return "bg-green-600 text-black"
  if (type === "7") return "bg-amber-500 text-black"
  if (type === "m7") return "bg-blue-600 text-white"
  if (type === "m7b5" || type === "dim7") return "bg-purple-600 text-white"
  return "bg-muted text-muted-foreground"
}

export function SoloScalesPanel({ scales, chordName }: SoloScalesPanelProps) {
  // Derive chord type from chordName by stripping tonic prefix (e.g. "G7" → "7")
  const type = chordName.replace(/^[A-G][#b]?/, "")

  const tonalName = SCALE_TONAL_NAMES[scales.primary.scaleName]
  const noteString = tonalName
    ? Scale.get(`${scales.chordTonic} ${tonalName}`).notes.join(" ")
    : ""

  return (
    <div className="rounded-lg border border-border bg-card/50 p-3 space-y-3">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        Scales to solo over {chordName}
      </p>

      {/* Primary scale */}
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${badgeColor(type)}`}
        >
          PRIMARY
        </span>
        <span className="text-base font-semibold text-foreground">
          {scales.chordTonic} {scales.primary.scaleName}
        </span>
        {noteString && (
          <span className="text-xs text-muted-foreground">· {noteString}</span>
        )}
      </div>

      {/* Also works */}
      {scales.additional.length > 0 && (
        <>
          <div className="border-t border-border" />
          <div className="space-y-1.5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Also works
            </p>
            {scales.additional.map((entry) => (
              <div key={entry.scaleName} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">
                  {scales.chordTonic} {entry.scaleName}
                </span>
                {entry.hint && (
                  <span className="text-xs text-muted-foreground/60">· {entry.hint}</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/(app)/reference/_components/solo-scales-panel.tsx
git commit -m "feat(reference): add SoloScalesPanel with primary scale, note string, and Also works section"
```

---

### Task 6: HarmonyTab component and tests

**Files:**
- Create: `app/(app)/reference/_components/harmony-tab.tsx`
- Create: `__tests__/reference/harmony-tab.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `__tests__/reference/harmony-tab.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// Mock tonal (used by SoloScalesPanel)
vi.mock("tonal", () => ({
  Scale: { get: () => ({ notes: ["G", "A", "B", "C", "D", "E", "F"] }) },
}))

// Mock theory engine
vi.mock("@/lib/theory", () => ({
  getDiatonicChords: () => [
    { degree: 1, roman: "I",    tonic: "C", type: "maj7", quality: "major",     nashville: "1" },
    { degree: 2, roman: "ii",   tonic: "D", type: "m7",   quality: "minor",     nashville: "2" },
    { degree: 3, roman: "iii",  tonic: "E", type: "m7",   quality: "minor",     nashville: "3" },
    { degree: 4, roman: "IV",   tonic: "F", type: "maj7", quality: "major",     nashville: "4" },
    { degree: 5, roman: "V",    tonic: "G", type: "7",    quality: "dominant",  nashville: "5" },
    { degree: 6, roman: "vi",   tonic: "A", type: "m7",   quality: "minor",     nashville: "6" },
    { degree: 7, roman: "vii°", tonic: "B", type: "m7b5", quality: "diminished",nashville: "7" },
  ],
  getSoloScales: () => ({
    chordTonic: "G",
    primary: { scaleName: "Mixolydian" },
    additional: [
      { scaleName: "Minor Pentatonic", hint: "bluesy" },
      { scaleName: "Blues Scale", hint: "adds ♭5 colour" },
    ],
  }),
}))

import { HarmonyTab } from "@/app/(app)/reference/_components/harmony-tab"

describe("HarmonyTab", () => {
  it("renders mode selector defaulting to Ionian (major)", () => {
    render(<HarmonyTab tonic="C" />)
    expect(screen.getByRole("combobox", { name: /mode/i })).toBeDefined()
    expect((screen.getByRole("combobox", { name: /mode/i }) as HTMLSelectElement).value).toBe("ionian")
  })

  it("renders 7 chord blocks", () => {
    render(<HarmonyTab tonic="C" />)
    const buttons = screen.getAllByRole("button")
    expect(buttons.length).toBeGreaterThanOrEqual(7)
  })

  it("shows placeholder when no chord is selected", () => {
    render(<HarmonyTab tonic="C" />)
    expect(screen.getByText(/click a chord to see recommended scales/i)).toBeDefined()
  })

  it("shows solo scales panel when a chord is clicked", async () => {
    render(<HarmonyTab tonic="C" />)
    const gButton = screen.getAllByRole("button").find(
      (b) => b.textContent?.includes("G7") || b.textContent?.includes("G")
    )!
    await userEvent.click(gButton)
    expect(screen.getByText(/scales to solo over/i)).toBeDefined()
  })

  it("hides solo scales panel when same chord is clicked again (toggle)", async () => {
    render(<HarmonyTab tonic="C" />)
    const buttons = screen.getAllByRole("button")
    const g7Button = buttons.find((b) => b.textContent?.includes("G7") || b.textContent?.includes("7"))!
    await userEvent.click(g7Button)
    expect(screen.queryByText(/click a chord/i)).toBeNull()
    await userEvent.click(g7Button)
    expect(screen.getByText(/click a chord to see recommended scales/i)).toBeDefined()
  })

  it("clears selection when mode changes", async () => {
    render(<HarmonyTab tonic="C" />)
    const buttons = screen.getAllByRole("button")
    await userEvent.click(buttons[4]) // click V chord
    expect(screen.queryByText(/click a chord/i)).toBeNull()
    // Change mode
    await userEvent.selectOptions(screen.getByRole("combobox", { name: /mode/i }), "dorian")
    expect(screen.getByText(/click a chord to see recommended scales/i)).toBeDefined()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npm test __tests__/reference/harmony-tab.test.tsx`
Expected: FAIL — `HarmonyTab` module not found

- [ ] **Step 3: Create `app/(app)/reference/_components/harmony-tab.tsx`**

```typescript
"use client"

import { useState } from "react"
import { getDiatonicChords, getSoloScales } from "@/lib/theory"
import { ChordQualityBlock } from "./chord-quality-block"
import { SoloScalesPanel } from "./solo-scales-panel"

interface HarmonyTabProps {
  tonic: string
}

const MODE_OPTIONS = [
  { value: "ionian",     label: "Ionian (major)" },
  { value: "dorian",     label: "Dorian" },
  { value: "phrygian",   label: "Phrygian" },
  { value: "lydian",     label: "Lydian" },
  { value: "mixolydian", label: "Mixolydian" },
  { value: "aeolian",    label: "Aeolian (natural minor)" },
  { value: "locrian",    label: "Locrian" },
]

export function HarmonyTab({ tonic }: HarmonyTabProps) {
  const [mode, setMode] = useState("ionian")
  const [selectedDegree, setSelectedDegree] = useState<number | null>(null)

  const chords = getDiatonicChords(tonic, mode)
  const selectedChord =
    selectedDegree !== null ? chords.find((c) => c.degree === selectedDegree) ?? null : null
  const scales = selectedChord
    ? getSoloScales(
        { tonic: selectedChord.tonic, type: selectedChord.type, degree: selectedChord.degree },
        mode
      )
    : null

  const modeLabel = MODE_OPTIONS.find((o) => o.value === mode)?.label ?? mode

  function handleChordClick(degree: number) {
    setSelectedDegree((prev) => (prev === degree ? null : degree))
  }

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="harmony-mode"
          className="text-xs uppercase tracking-widest text-muted-foreground whitespace-nowrap"
        >
          Mode
        </label>
        <select
          id="harmony-mode"
          aria-label="Mode"
          value={mode}
          onChange={(e) => {
            setMode(e.target.value)
            setSelectedDegree(null)
          }}
          className="flex-1 bg-background border border-border rounded-md px-3 py-1.5 text-sm text-foreground"
        >
          {MODE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Diatonic chord blocks */}
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          Diatonic 7th chords · {tonic} {modeLabel}
        </p>
        <div role="group" aria-label="Diatonic chords" className="flex gap-2 overflow-x-auto pb-2">
          {chords.map((chord) => (
            <ChordQualityBlock
              key={chord.degree}
              roman={chord.roman}
              chordName={`${chord.tonic}${chord.type}`}
              type={chord.type}
              isSelected={selectedDegree === chord.degree}
              onClick={() => handleChordClick(chord.degree)}
            />
          ))}
        </div>
      </div>

      {/* Scale recommendation or placeholder */}
      {scales && selectedChord ? (
        <SoloScalesPanel
          scales={scales}
          chordName={`${selectedChord.tonic}${selectedChord.type}`}
        />
      ) : (
        <p className="text-sm text-muted-foreground italic">
          Click a chord to see recommended scales for soloing.
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npm test __tests__/reference/harmony-tab.test.tsx`
Expected: all 5 tests passing

- [ ] **Step 5: Commit**

```bash
git add app/(app)/reference/_components/harmony-tab.tsx __tests__/reference/harmony-tab.test.tsx
git commit -m "feat(reference): add HarmonyTab with mode selector, diatonic chord blocks, and scale panel"
```

---

### Task 7: ProgressionsTab component and tests

**Files:**
- Create: `app/(app)/reference/_components/progressions-tab.tsx`
- Create: `__tests__/reference/progressions-tab.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `__tests__/reference/progressions-tab.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

vi.mock("tonal", () => ({
  Scale: { get: () => ({ notes: ["C", "D", "E", "F", "G", "A", "B"] }) },
}))

vi.mock("@/lib/theory", () => ({
  listProgressions: () => [
    {
      name: "pop-standard",
      displayName: "Pop Standard",
      romanDisplay: "I – V – vi – IV",
      description: "The most common pop progression",
      degrees: ["I", "V", "vi", "IV"],
      mode: "ionian",
      recommendedScaleType: "Major Scale",
    },
    {
      name: "jazz-turnaround",
      displayName: "Jazz Turnaround",
      romanDisplay: "ii – V – I",
      description: "The most important cadence in jazz",
      degrees: ["ii", "V", "I"],
      mode: "ionian",
      recommendedScaleType: "Major Scale",
    },
  ],
  getProgression: (_name: string, tonic: string) => [
    { roman: "I",  nashville: "1", tonic,  type: "maj7", quality: "major",    degree: 1 },
    { roman: "V",  nashville: "5", tonic: "G", type: "7",    quality: "dominant", degree: 5 },
    { roman: "vi", nashville: "6", tonic: "A", type: "m7",   quality: "minor",    degree: 6 },
    { roman: "IV", nashville: "4", tonic: "F", type: "maj7", quality: "major",    degree: 4 },
  ],
  getSoloScales: (_chord: unknown, _mode: string) => ({
    chordTonic: "G",
    primary: { scaleName: "Mixolydian" },
    additional: [{ scaleName: "Minor Pentatonic", hint: "bluesy" }],
  }),
}))

import { ProgressionsTab } from "@/app/(app)/reference/_components/progressions-tab"

describe("ProgressionsTab", () => {
  it("renders the progression selector", () => {
    render(<ProgressionsTab tonic="C" />)
    expect(screen.getByRole("combobox", { name: /progression/i })).toBeDefined()
  })

  it("renders chord blocks for the default progression", () => {
    render(<ProgressionsTab tonic="C" />)
    // 4 chord buttons for pop-standard
    const buttons = screen.getAllByRole("button")
    expect(buttons.length).toBeGreaterThanOrEqual(4)
  })

  it("always shows the progression-wide scale recommendation", () => {
    render(<ProgressionsTab tonic="C" />)
    expect(screen.getByText(/over the whole progression/i)).toBeDefined()
    expect(screen.getByText(/major scale/i)).toBeDefined()
  })

  it("shows per-chord scale panel with Also works when chord is clicked", async () => {
    render(<ProgressionsTab tonic="C" />)
    const buttons = screen.getAllByRole("button")
    await userEvent.click(buttons[1]) // click second chord (G7)
    expect(screen.getByText(/scales to solo over/i)).toBeDefined()
    expect(screen.getByText(/also works/i)).toBeDefined()
    expect(screen.getByText(/minor pentatonic/i)).toBeDefined()
  })

  it("hides per-chord panel when same chord is clicked again", async () => {
    render(<ProgressionsTab tonic="C" />)
    const buttons = screen.getAllByRole("button")
    await userEvent.click(buttons[1])
    expect(screen.queryByText(/click a chord/i)).toBeNull()
    await userEvent.click(buttons[1])
    expect(screen.getByText(/click a chord to see recommended scales/i)).toBeDefined()
  })

  it("clears selection when progression changes", async () => {
    render(<ProgressionsTab tonic="C" />)
    const buttons = screen.getAllByRole("button")
    await userEvent.click(buttons[1])
    expect(screen.queryByText(/click a chord/i)).toBeNull()
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /progression/i }),
      "jazz-turnaround"
    )
    expect(screen.getByText(/click a chord to see recommended scales/i)).toBeDefined()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npm test __tests__/reference/progressions-tab.test.tsx`
Expected: FAIL — `ProgressionsTab` module not found

- [ ] **Step 3: Create `app/(app)/reference/_components/progressions-tab.tsx`**

```typescript
"use client"

import { useState } from "react"
import { listProgressions, getProgression, getSoloScales } from "@/lib/theory"
import { ChordQualityBlock } from "./chord-quality-block"
import { SoloScalesPanel } from "./solo-scales-panel"

interface ProgressionsTabProps {
  tonic: string
}

export function ProgressionsTab({ tonic }: ProgressionsTabProps) {
  const [progressionName, setProgressionName] = useState("pop-standard")
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const progressions = listProgressions()
  const prog = progressions.find((p) => p.name === progressionName)!
  const chords = getProgression(progressionName, tonic)

  const selectedChord = selectedIndex !== null ? chords[selectedIndex] ?? null : null
  const scales = selectedChord
    ? getSoloScales(
        { tonic: selectedChord.tonic, type: selectedChord.type, degree: selectedChord.degree },
        prog.mode
      )
    : null

  function handleIndexClick(index: number) {
    setSelectedIndex((prev) => (prev === index ? null : index))
  }

  return (
    <div className="space-y-4">
      {/* Progression selector */}
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
          value={progressionName}
          onChange={(e) => {
            setProgressionName(e.target.value)
            setSelectedIndex(null)
          }}
          className="flex-1 bg-background border border-border rounded-md px-3 py-1.5 text-sm text-foreground"
        >
          {progressions.map((p) => (
            <option key={p.name} value={p.name}>
              {p.displayName} · {p.romanDisplay}
            </option>
          ))}
        </select>
      </div>

      {/* Chord blocks in order with arrows */}
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          Chords in {tonic} · {prog.romanDisplay}
        </p>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {chords.map((chord, i) => (
            <div key={i} className="flex items-center gap-1 flex-shrink-0">
              {i > 0 && (
                <span className="text-muted-foreground text-sm flex-shrink-0">→</span>
              )}
              <ChordQualityBlock
                roman={chord.roman}
                chordName={`${chord.tonic}${chord.type}`}
                type={chord.type}
                isSelected={selectedIndex === i}
                onClick={() => handleIndexClick(i)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Per-chord scale recommendation or placeholder */}
      {scales && selectedChord ? (
        <SoloScalesPanel
          scales={scales}
          chordName={`${selectedChord.tonic}${selectedChord.type}`}
        />
      ) : (
        <p className="text-sm text-muted-foreground italic">
          Click a chord to see recommended scales for soloing.
        </p>
      )}

      {/* Progression-wide recommendation — always visible */}
      <div className="rounded-lg border border-green-800 bg-green-950/30 p-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
          Over the whole progression
        </p>
        <p className="text-sm font-semibold text-green-400">
          {tonic} {prog.recommendedScaleType}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npm test __tests__/reference/progressions-tab.test.tsx`
Expected: all 6 tests passing

- [ ] **Step 5: Commit**

```bash
git add app/(app)/reference/_components/progressions-tab.tsx __tests__/reference/progressions-tab.test.tsx
git commit -m "feat(reference): add ProgressionsTab with chord blocks, per-chord scales, and progression-wide recommendation"
```

---

### Task 8: HarmonyStudy container and tests

**Files:**
- Create: `app/(app)/reference/_components/harmony-study.tsx`
- Create: `__tests__/reference/harmony-study.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `__tests__/reference/harmony-study.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

vi.mock("tonal", () => ({
  Scale: { get: () => ({ notes: ["C", "D", "E", "F", "G", "A", "B"] }) },
}))

vi.mock("@/lib/theory", () => ({
  getDiatonicChords: () => [
    { degree: 1, roman: "I",  tonic: "C", type: "maj7", quality: "major",    nashville: "1" },
    { degree: 5, roman: "V",  tonic: "G", type: "7",    quality: "dominant", nashville: "5" },
    { degree: 6, roman: "vi", tonic: "A", type: "m7",   quality: "minor",    nashville: "6" },
  ],
  getSoloScales: () => ({
    chordTonic: "G",
    primary: { scaleName: "Mixolydian" },
    additional: [],
  }),
  listProgressions: () => [
    {
      name: "pop-standard",
      displayName: "Pop Standard",
      romanDisplay: "I – V – vi – IV",
      description: "The most common pop progression",
      degrees: ["I", "V", "vi", "IV"],
      mode: "ionian",
      recommendedScaleType: "Major Scale",
    },
  ],
  getProgression: (_name: string, tonic: string) => [
    { roman: "I", nashville: "1", tonic, type: "maj7", quality: "major", degree: 1 },
    { roman: "V", nashville: "5", tonic: "G", type: "7", quality: "dominant", degree: 5 },
  ],
}))

import { HarmonyStudy } from "@/app/(app)/reference/_components/harmony-study"

describe("HarmonyStudy", () => {
  it("renders Harmony and Progressions tab buttons", () => {
    render(<HarmonyStudy tonic="C" />)
    expect(screen.getByRole("tab", { name: "Harmony" })).toBeDefined()
    expect(screen.getByRole("tab", { name: "Progressions" })).toBeDefined()
  })

  it("defaults to Harmony tab active", () => {
    render(<HarmonyStudy tonic="C" />)
    const harmonyTab = screen.getByRole("tab", { name: "Harmony" })
    expect(harmonyTab).toHaveAttribute("aria-selected", "true")
  })

  it("Progressions tab is not selected by default", () => {
    render(<HarmonyStudy tonic="C" />)
    const progressionsTab = screen.getByRole("tab", { name: "Progressions" })
    expect(progressionsTab).toHaveAttribute("aria-selected", "false")
  })

  it("clicking Progressions tab shows progressions content", async () => {
    render(<HarmonyStudy tonic="C" />)
    await userEvent.click(screen.getByRole("tab", { name: "Progressions" }))
    expect(screen.getByRole("tab", { name: "Progressions" })).toHaveAttribute("aria-selected", "true")
    // ProgressionsTab shows a progression selector
    expect(screen.getByRole("combobox", { name: /progression/i })).toBeDefined()
  })

  it("clicking Harmony tab after Progressions returns to harmony content", async () => {
    render(<HarmonyStudy tonic="C" />)
    await userEvent.click(screen.getByRole("tab", { name: "Progressions" }))
    await userEvent.click(screen.getByRole("tab", { name: "Harmony" }))
    expect(screen.getByRole("tab", { name: "Harmony" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("combobox", { name: /mode/i })).toBeDefined()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npm test __tests__/reference/harmony-study.test.tsx`
Expected: FAIL — `HarmonyStudy` module not found

- [ ] **Step 3: Create `app/(app)/reference/_components/harmony-study.tsx`**

```typescript
"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { HarmonyTab } from "./harmony-tab"
import { ProgressionsTab } from "./progressions-tab"

interface HarmonyStudyProps {
  tonic: string
}

type HarmonySubTab = "harmony" | "progressions"

export function HarmonyStudy({ tonic }: HarmonyStudyProps) {
  const [tab, setTab] = useState<HarmonySubTab>("harmony")

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Sub-tab bar */}
      <div
        role="tablist"
        aria-label="Harmony study panels"
        className="flex border-b border-border mb-4"
      >
        {(["harmony", "progressions"] as const).map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            aria-controls="harmony-study-panel"
            onClick={() => setTab(id)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize",
              tab === id
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {id === "harmony" ? "Harmony" : "Progressions"}
          </button>
        ))}
      </div>

      {/* Tab panel */}
      <div id="harmony-study-panel" role="tabpanel">
        {tab === "harmony" && <HarmonyTab tonic={tonic} />}
        {tab === "progressions" && <ProgressionsTab tonic={tonic} />}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npm test __tests__/reference/harmony-study.test.tsx`
Expected: all 5 tests passing

- [ ] **Step 5: Commit**

```bash
git add app/(app)/reference/_components/harmony-study.tsx __tests__/reference/harmony-study.test.tsx
git commit -m "feat(reference): add HarmonyStudy sub-tab container (Harmony / Progressions)"
```

---

### Task 9: Page layout and page test update

**Files:**
- Modify: `app/(app)/reference/page.tsx`
- Modify: `__tests__/reference/page.test.tsx`

- [ ] **Step 1: Update `__tests__/reference/page.test.tsx`**

Extend the existing `@/lib/theory` mock to include the new functions HarmonyStudy needs. Add assertions for the new layout structure. The full updated file:

```typescript
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// Mock all rendering-layer dependencies
vi.mock("vexflow", () => ({
  Renderer: class { static Backends = { SVG: "svg" }; resize = vi.fn(); getContext = vi.fn(() => ({})) },
  Stave: class { addClef = vi.fn().mockReturnThis(); setContext = vi.fn().mockReturnThis(); draw = vi.fn(); getBottomLineBottomY = vi.fn(() => 100); getNoteStartX = vi.fn(() => 80); setNoteStartX = vi.fn() },
  StaveNote: class { constructor(public c: unknown) {} setStyle = vi.fn(); addModifier = vi.fn() },
  Accidental: class { constructor(public type: string) {} },
  TabStave: class { addClef = vi.fn().mockReturnThis(); setContext = vi.fn().mockReturnThis(); draw = vi.fn(); getBottomLineBottomY = vi.fn(() => 200); getNoteStartX = vi.fn(() => 80); setNoteStartX = vi.fn() },
  TabNote: class { constructor(public c: unknown) {} getAbsoluteX = vi.fn(() => 50) },
  Formatter: class { format = vi.fn() },
  Voice: class { addTickables = vi.fn().mockReturnThis(); setMode = vi.fn().mockReturnThis(); draw = vi.fn() },
}))
vi.mock("svguitar", () => ({
  ChordStyle: { normal: "normal" },
  SVGuitarChord: class {
    chord = vi.fn().mockReturnThis()
    configure = vi.fn().mockReturnThis()
    draw = vi.fn()
  },
}))
vi.mock("@tombatossals/react-chords/lib/Chord", () => ({
  default: () => <svg data-testid="chord-diagram" />,
}))
vi.mock("tonal", () => ({
  Scale: { get: () => ({ notes: ["C", "D", "E", "F", "G", "A", "B"] }) },
}))

// Mock theory engine
vi.mock("@/lib/theory", () => ({
  listScaleTypes: () => ["Major", "Minor Pentatonic"],
  listChordTypes: () => ["major", "minor", "maj7"],
  listChordDbSuffixes: () => ["major", "minor", "maj7"],
  SHELL_CHORD_TYPES: ["maj7 shell", "m7 shell", "7 shell", "maj6 shell", "dim7/m6 shell"],
  getShellChordPositions: () => [],
  getScale: (tonic: string, type: string) => ({
    tonic,
    type,
    notes: ["C", "D", "E", "F", "G", "A", "B"],
    intervals: ["1P", "2M", "3M", "4P", "5P", "6M", "7M"],
    positions: [{ label: "Position 1", positions: [{ string: 6, fret: 8, interval: "R" }] }],
  }),
  getChord: (tonic: string, type: string) => ({
    tonic,
    type,
    notes: ["C", "E", "G"],
    intervals: ["1P", "3M", "5P"],
    voicings: [],
  }),
  getChordPositions: () => [
    { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], baseFret: 1, barres: [], capo: false, label: "Open" },
  ],
  getArpeggio: (tonic: string, type: string) => ({
    tonic,
    type,
    notes: ["C", "E", "G", "B"],
    intervals: ["1P", "3M", "5P", "7M"],
    positions: [{ label: "Position 1", positions: [{ string: 6, fret: 8, interval: "R" }] }],
  }),
  getChordAsScale: (_tonic: string, _type: string) => ({
    tonic: "C",
    type: "maj",
    notes: ["C", "E", "G"],
    intervals: ["1P", "3M", "5P"],
    positions: [{ label: "Position 1", positions: [{ string: 6, fret: 8, interval: "R" }] }],
  }),
  // New: Harmony Study functions
  getDiatonicChords: () => [
    { degree: 1, roman: "I",  tonic: "C", type: "maj7", quality: "major",    nashville: "1" },
    { degree: 5, roman: "V",  tonic: "G", type: "7",    quality: "dominant", nashville: "5" },
    { degree: 6, roman: "vi", tonic: "A", type: "m7",   quality: "minor",    nashville: "6" },
  ],
  getSoloScales: () => ({
    chordTonic: "G",
    primary: { scaleName: "Mixolydian" },
    additional: [],
  }),
  listProgressions: () => [
    {
      name: "pop-standard",
      displayName: "Pop Standard",
      romanDisplay: "I – V – vi – IV",
      description: "The most common pop progression",
      degrees: ["I", "V", "vi", "IV"],
      mode: "ionian",
      recommendedScaleType: "Major Scale",
    },
  ],
  getProgression: (_name: string, tonic: string) => [
    { roman: "I", nashville: "1", tonic, type: "maj7", quality: "major", degree: 1 },
  ],
}))

import ReferencePage from "@/app/(app)/reference/page"

describe("ReferencePage", () => {
  it("renders the page heading", () => {
    render(<ReferencePage />)
    expect(screen.getByText("Reference")).toBeDefined()
  })

  it("renders the Circle of Fifths", () => {
    render(<ReferencePage />)
    expect(screen.getByRole("img", { name: /circle of fifths/i })).toBeDefined()
  })

  it("defaults to key C shown in the circle centre", () => {
    render(<ReferencePage />)
    const cElements = screen.getAllByText("C")
    expect(cElements.length).toBeGreaterThanOrEqual(1)
  })

  it("renders Harmony and Progressions tab buttons in the Harmony Study panel", () => {
    render(<ReferencePage />)
    expect(screen.getByRole("tab", { name: "Harmony" })).toBeDefined()
    expect(screen.getByRole("tab", { name: "Progressions" })).toBeDefined()
  })

  it("renders Study Tools tab buttons: Scales, Arpeggios, Chords, Triads", () => {
    render(<ReferencePage />)
    expect(screen.getByRole("tab", { name: "Scales" })).toBeDefined()
    expect(screen.getByRole("tab", { name: "Arpeggios" })).toBeDefined()
    expect(screen.getByRole("tab", { name: "Chords" })).toBeDefined()
    expect(screen.getByRole("tab", { name: "Triads" })).toBeDefined()
  })

  it("defaults to the Scales tab", () => {
    render(<ReferencePage />)
    const scalesTab = screen.getByRole("tab", { name: "Scales" })
    expect(scalesTab).toHaveAttribute("aria-selected", "true")
  })

  it("switches to Chords panel when Chords tab is clicked", async () => {
    render(<ReferencePage />)
    await userEvent.click(screen.getByRole("tab", { name: "Chords" }))
    expect(screen.getByRole("tab", { name: "Chords" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByLabelText(/chord type/i)).toBeDefined()
  })

  it("switches to Arpeggios panel when Arpeggios tab is clicked", async () => {
    render(<ReferencePage />)
    await userEvent.click(screen.getByRole("tab", { name: "Arpeggios" }))
    expect(screen.getByRole("tab", { name: "Arpeggios" })).toHaveAttribute("aria-selected", "true")
  })

  it("updates the selected key when a circle key is clicked", async () => {
    render(<ReferencePage />)
    const gButton = screen.getByRole("button", { name: "Select key G" })
    await userEvent.click(gButton)
    expect(gButton).toHaveAttribute("aria-pressed", "true")
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npm test __tests__/reference/page.test.tsx`
Expected: FAIL on the two new harmony assertions (HarmonyStudy not in page yet)

- [ ] **Step 3: Rewrite `app/(app)/reference/page.tsx`**

```typescript
"use client"

import { useState } from "react"
import { CircleOfFifths } from "./_components/circle-of-fifths"
import { HarmonyStudy } from "./_components/harmony-study"
import { ScalePanel } from "./_components/scale-panel"
import { ArpeggioPanel } from "./_components/arpeggio-panel"
import { ChordPanel } from "./_components/chord-panel"
import { TriadPanel } from "./_components/triad-panel"
import { cn } from "@/lib/utils"

type PanelTab = "scales" | "arpeggios" | "chords" | "triads"

const TABS: { id: PanelTab; label: string }[] = [
  { id: "scales",    label: "Scales" },
  { id: "arpeggios", label: "Arpeggios" },
  { id: "chords",    label: "Chords" },
  { id: "triads",    label: "Triads" },
]

export default function ReferencePage() {
  const [selectedKey, setSelectedKey] = useState("C")
  const [activeTab, setActiveTab] = useState<PanelTab>("scales")

  return (
    <div className="pt-6 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
          Music Theory
        </p>
        <h1 className="text-2xl font-semibold text-foreground mb-2">Reference</h1>
      </div>

      {/* Top section: Circle of Fifths + Harmony Study */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <section
          aria-label="Circle of Fifths key picker"
          className="lg:sticky lg:top-6 lg:w-[400px] lg:shrink-0"
        >
          <CircleOfFifths selectedKey={selectedKey} onKeySelect={setSelectedKey} />
        </section>

        <div className="flex-1 min-w-0">
          <HarmonyStudy tonic={selectedKey} />
        </div>
      </div>

      {/* Bottom section: Study Tools — full width */}
      <section aria-label="Study tools">
        <div
          role="tablist"
          aria-label="Reference panels"
          className="flex border-b border-border"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
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
          {activeTab === "scales"    && <ScalePanel    tonic={selectedKey} />}
          {activeTab === "arpeggios" && <ArpeggioPanel tonic={selectedKey} />}
          {activeTab === "chords"    && <ChordPanel    tonic={selectedKey} />}
          {activeTab === "triads"    && <TriadPanel    tonic={selectedKey} />}
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Run page tests to confirm they pass**

Run: `npm test __tests__/reference/page.test.tsx`
Expected: all 9 tests passing

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: all tests passing

- [ ] **Step 6: Commit**

```bash
git add app/(app)/reference/page.tsx __tests__/reference/page.test.tsx
git commit -m "feat(reference): new three-section layout — Circle + HarmonyStudy top, Study Tools full-width below"
```

---

### Task 10: Study Tools grid expansion

**Files:**
- Modify: `app/(app)/reference/_components/chord-panel.tsx` (line 271)
- Modify: `app/(app)/reference/_components/triad-panel.tsx` (line 225)

- [ ] **Step 1: Update `chord-panel.tsx` fingerings grid**

In `app/(app)/reference/_components/chord-panel.tsx` at line 271, change:

```typescript
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
```

to:

```typescript
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-6">
```

- [ ] **Step 2: Update `triad-panel.tsx` fingerings grid**

In `app/(app)/reference/_components/triad-panel.tsx` at line 225, change:

```typescript
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
```

to:

```typescript
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4">
```

- [ ] **Step 3: Run the full test suite to confirm no regressions**

Run: `npm test`
Expected: all tests passing

- [ ] **Step 4: Commit**

```bash
git add app/(app)/reference/_components/chord-panel.tsx app/(app)/reference/_components/triad-panel.tsx
git commit -m "feat(reference): expand chord and triad fingering grids to max 5 columns for full-width container"
```

---

## Self-review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Three-section page layout | Task 9 |
| Circle of Fifths stays same size (sticky, 400px) | Task 9 |
| HarmonyStudy right-column panel | Task 8 |
| Harmony tab: mode selector (7 modes) | Task 6 |
| Harmony tab: diatonic 7th chord blocks | Task 6 |
| Harmony tab: click chord → scale panel with primary + Also works | Task 6 |
| Harmony tab: deselect on re-click | Task 6 |
| Harmony tab: mode change clears selection | Task 6 |
| Progressions tab: 15 progressions in dropdown | Task 7 |
| Progressions tab: chord blocks in order with arrows | Task 7 |
| Progressions tab: click chord → per-chord scales with Also works | Task 7 |
| Progressions tab: progression-wide scale always visible | Task 7 |
| Progressions tab: deselect on re-click | Task 7 |
| Progressions tab: progression change clears selection | Task 7 |
| getSoloScales modal rotation algorithm | Task 2 |
| SCALE_TONAL_NAMES exported for note strings | Task 2 |
| Blues Rock uses mixolydian mode (♭VII diatonic) | Task 3 |
| Dark Ballad uses aeolian mode | Task 3 |
| ProgressionChord extended with degree + quality | Task 3 |
| Color coding: green/amber/blue/purple | Task 4 |
| ChordQualityBlock aria-pressed | Task 4 |
| SoloScalesPanel note string via TonalJS | Task 5 |
| Chords fingering grid: max 5 columns | Task 10 |
| Triads fingering grid: max 5 columns | Task 10 |
| progressions.test.ts updated for new names | Task 3 |
| page.test.tsx updated for new layout | Task 9 |

**Placeholder scan:** No TBD, no "implement later", no vague steps. All code blocks are complete.

**Type consistency check:** `getSoloScales` takes `{tonic, type, degree}` in Task 2, and callers in Tasks 6 and 7 pass `{tonic: chord.tonic, type: chord.type, degree: chord.degree}` — consistent. `SoloScalesPanel` receives `SoloScales` (returned by `getSoloScales`) — types match. `SCALE_TONAL_NAMES` exported in Task 2 and imported in Task 5 — consistent.

