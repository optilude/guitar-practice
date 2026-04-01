# Phase 3a: Music Theory Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pure TypeScript music theory engine in `lib/theory/` with no DOM, no rendering, and no database dependencies.

**Architecture:** All logic lives in `lib/theory/` as pure functions exported via `index.ts`. Static fretboard shape data lives in `lib/theory/data/scale-patterns.ts`. TonalJS handles all pitch arithmetic; `@tombatossals/chords-db` provides guitar chord voicings. Tests live in `__tests__/theory/` and run with Vitest.

**Tech Stack:** TypeScript 5, TonalJS, @tombatossals/chords-db, Vitest 4.x, pnpm

---

## File Structure

```
lib/theory/
  types.ts
  data/
    scale-patterns.ts
  keys.ts
  scales.ts
  chords.ts
  arpeggios.ts
  harmony.ts
  progressions.ts
  index.ts

__tests__/theory/
  keys.test.ts
  scales.test.ts
  chords.test.ts
  arpeggios.test.ts
  harmony.test.ts
  progressions.test.ts
```

---

### Task 1: Install dependencies

**Files:**
- Modify: `package.json` (via pnpm)

- [ ] **Step 1: Install runtime and dev dependencies**

Run:
```
pnpm add tonal @tombatossals/chords-db && pnpm add -D vexflow svguitar
```

- [ ] **Step 2: Verify package.json**

Confirm `package.json` now lists under `dependencies`:
- `"tonal"` (any version)
- `"@tombatossals/chords-db"` (any version)

And under `devDependencies`:
- `"vexflow"`
- `"svguitar"`

- [ ] **Step 3: Commit**

```
git add package.json pnpm-lock.yaml && git commit -m "feat: install theory engine dependencies (tonal, chords-db, vexflow, svguitar)"
```

---

### Task 2: lib/theory/types.ts

**Files:**
- Create: `lib/theory/types.ts`

- [ ] **Step 1: Create the types file**

Create `lib/theory/types.ts` with:

```ts
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
  name: string // "Jazz Blues", "II-V-I", "I-IV-V", etc.
  description: string
  degrees: string[] // ["I", "IV", "V"]
}

export interface ProgressionChord {
  roman: string
  nashville: string
  tonic: NoteName
  type: ChordType
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

- [ ] **Step 2: Commit**

```
git add lib/theory/types.ts && git commit -m "feat: add lib/theory/types.ts — all theory engine TypeScript types"
```

---

### Task 3: lib/theory/data/scale-patterns.ts

**Files:**
- Create: `lib/theory/data/scale-patterns.ts`

- [ ] **Step 1: Create scale-patterns.ts**

All fret offsets are relative to the root fret on string 6 (low E). For C major the root is at fret 8. Verify each pattern: `absoluteFret = rootFretOnLowE(tonic) + offset`.

Create `lib/theory/data/scale-patterns.ts`:

```ts
// Scale patterns for the guitar fretboard.
// Each shape entry is [guitarString, fretOffset] where:
//   guitarString: 6 = low E, 1 = high e
//   fretOffset: semitones relative to root fret on string 6
//
// CAGED reference for Major (C major root = fret 8 on string 6):
//   Position 1 = E shape  (root on str 6)
//   Position 2 = D shape  (root on str 4)
//   Position 3 = C shape  (root on str 5, 2nd octave)
//   Position 4 = A shape  (root on str 5)
//   Position 5 = G shape  (root on str 6, 12fr up)

export type ShapeEntry = [guitarString: number, fretOffset: number]

export interface PatternPosition {
  label: string
  shape: ShapeEntry[]
}

export type ScalePatternMap = Record<string, PatternPosition[]>

// ---------------------------------------------------------------------------
// Helper: open-string chroma values (index 0 = string 6, index 5 = string 1)
// ---------------------------------------------------------------------------
// String 6 (low E) = 4, String 5 (A) = 9, String 4 (D) = 2,
// String 3 (G) = 7, String 2 (B) = 11, String 1 (high e) = 4

const SCALE_PATTERNS: ScalePatternMap = {
  // =========================================================================
  // MAJOR (Ionian) — 5 CAGED positions
  // =========================================================================
  Major: [
    {
      label: "Position 1 (E shape)",
      shape: [
        [6, 0], [6, 2],
        [5, -1], [5, 1], [5, 2],
        [4, -1], [4, 1],
        [3, -1], [3, 1],
        [2, 0], [2, 2],
        [1, 0], [1, 2],
      ],
    },
    {
      label: "Position 2 (D shape)",
      shape: [
        [6, 3], [6, 5],
        [5, 2], [5, 4],
        [4, 1], [4, 3], [4, 5],
        [3, 2], [3, 4],
        [2, 3], [2, 5],
        [1, 3], [1, 5],
      ],
    },
    {
      label: "Position 3 (C shape)",
      shape: [
        [6, 5], [6, 7],
        [5, 4], [5, 6], [5, 7],
        [4, 3], [4, 5], [4, 7],
        [3, 4], [3, 5],
        [2, 5], [2, 7],
        [1, 5], [1, 7],
      ],
    },
    {
      label: "Position 4 (A shape)",
      shape: [
        [6, 7], [6, 9],
        [5, 6], [5, 7], [5, 9],
        [4, 5], [4, 7], [4, 9],
        [3, 6], [3, 7],
        [2, 7], [2, 9],
        [1, 7], [1, 9],
      ],
    },
    {
      label: "Position 5 (G shape)",
      shape: [
        [6, 9], [6, 11],
        [5, 9], [5, 11],
        [4, 7], [4, 9], [4, 11],
        [3, 9], [3, 11],
        [2, 9], [2, 11],
        [1, 9], [1, 11],
      ],
    },
  ],

  // =========================================================================
  // DORIAN — 3 positions
  // =========================================================================
  Dorian: [
    {
      label: "Position 1",
      shape: [
        [6, 0], [6, 2],
        [5, -1], [5, 1], [5, 2],
        [4, -1], [4, 1],
        [3, -1], [3, 0],
        [2, 0], [2, 2],
        [1, 0], [1, 2],
      ],
    },
    {
      label: "Position 2",
      shape: [
        [6, 3], [6, 5],
        [5, 2], [5, 3], [5, 5],
        [4, 1], [4, 3], [4, 5],
        [3, 2], [3, 3],
        [2, 2], [2, 3], [2, 5],
        [1, 3], [1, 5],
      ],
    },
    {
      label: "Position 3",
      shape: [
        [6, 5], [6, 7],
        [5, 5], [5, 7],
        [4, 3], [4, 5], [4, 7],
        [3, 3], [3, 5],
        [2, 5], [2, 7],
        [1, 5], [1, 7],
      ],
    },
  ],

  // =========================================================================
  // PHRYGIAN — 3 positions
  // =========================================================================
  Phrygian: [
    {
      label: "Position 1",
      shape: [
        [6, 0], [6, 1],
        [5, -2], [5, 0], [5, 1],
        [4, -2], [4, 0],
        [3, -2], [3, -1],
        [2, -1], [2, 1],
        [1, 0], [1, 1],
      ],
    },
    {
      label: "Position 2",
      shape: [
        [6, 3], [6, 4],
        [5, 1], [5, 3], [5, 4],
        [4, 0], [4, 1], [4, 3],
        [3, 0], [3, 1],
        [2, 1], [2, 3],
        [1, 1], [1, 3],
      ],
    },
    {
      label: "Position 3",
      shape: [
        [6, 5], [6, 6],
        [5, 4], [5, 5],
        [4, 3], [4, 5],
        [3, 3], [3, 5],
        [2, 3], [2, 4], [2, 6],
        [1, 5], [1, 6],
      ],
    },
  ],

  // =========================================================================
  // LYDIAN — 3 positions
  // =========================================================================
  Lydian: [
    {
      label: "Position 1",
      shape: [
        [6, 0], [6, 2],
        [5, -1], [5, 1], [5, 2],
        [4, -1], [4, 1], [4, 2],
        [3, -1], [3, 1],
        [2, 0], [2, 2],
        [1, 0], [1, 2],
      ],
    },
    {
      label: "Position 2",
      shape: [
        [6, 2], [6, 4],
        [5, 1], [5, 2], [5, 4],
        [4, 1], [4, 2], [4, 4],
        [3, 1], [3, 2],
        [2, 2], [2, 4],
        [1, 2], [1, 4],
      ],
    },
    {
      label: "Position 3",
      shape: [
        [6, 5], [6, 7],
        [5, 4], [5, 6], [5, 7],
        [4, 4], [4, 6],
        [3, 4], [3, 6],
        [2, 5], [2, 7],
        [1, 5], [1, 7],
      ],
    },
  ],

  // =========================================================================
  // MIXOLYDIAN — 3 positions
  // =========================================================================
  Mixolydian: [
    {
      label: "Position 1",
      shape: [
        [6, 0], [6, 2],
        [5, -1], [5, 1], [5, 2],
        [4, -1], [4, 1],
        [3, -1], [3, 1],
        [2, 0], [2, 1],
        [1, 0], [1, 2],
      ],
    },
    {
      label: "Position 2",
      shape: [
        [6, 3], [6, 5],
        [5, 2], [5, 3], [5, 5],
        [4, 1], [4, 3], [4, 5],
        [3, 2], [3, 3],
        [2, 3], [2, 5],
        [1, 3], [1, 5],
      ],
    },
    {
      label: "Position 3",
      shape: [
        [6, 5], [6, 7],
        [5, 4], [5, 5], [5, 7],
        [4, 3], [4, 5], [4, 7],
        [3, 4], [3, 5],
        [2, 5], [2, 7],
        [1, 5], [1, 7],
      ],
    },
  ],

  // =========================================================================
  // AEOLIAN (Natural Minor) — 3 positions
  // =========================================================================
  Aeolian: [
    {
      label: "Position 1",
      shape: [
        [6, 0], [6, 2],
        [5, -1], [5, 1], [5, 2],
        [4, -1], [4, 1],
        [3, -2], [3, -1],
        [2, 0], [2, 1],
        [1, 0], [1, 2],
      ],
    },
    {
      label: "Position 2",
      shape: [
        [6, 3], [6, 5],
        [5, 2], [5, 3], [5, 5],
        [4, 1], [4, 3], [4, 5],
        [3, 1], [3, 2],
        [2, 1], [2, 3],
        [1, 3], [1, 5],
      ],
    },
    {
      label: "Position 3",
      shape: [
        [6, 5], [6, 7],
        [5, 5], [5, 7],
        [4, 3], [4, 5], [4, 7],
        [3, 3], [3, 5],
        [2, 3], [2, 5],
        [1, 5], [1, 7],
      ],
    },
  ],

  // =========================================================================
  // LOCRIAN — 3 positions
  // =========================================================================
  Locrian: [
    {
      label: "Position 1",
      shape: [
        [6, 0], [6, 1],
        [5, -2], [5, 0], [5, 1],
        [4, -2], [4, 0],
        [3, -2], [3, -1],
        [2, -1], [2, 0],
        [1, 0], [1, 1],
      ],
    },
    {
      label: "Position 2",
      shape: [
        [6, 3], [6, 4],
        [5, 1], [5, 3], [5, 4],
        [4, 0], [4, 2], [4, 3],
        [3, 0], [3, 2],
        [2, 0], [2, 1], [2, 3],
        [1, 1], [1, 3],
      ],
    },
    {
      label: "Position 3",
      shape: [
        [6, 5], [6, 6],
        [5, 4], [5, 5],
        [4, 3], [4, 5],
        [3, 3], [3, 5],
        [2, 3], [2, 5],
        [1, 5], [1, 6],
      ],
    },
  ],

  // =========================================================================
  // HARMONIC MINOR — 3 positions
  // =========================================================================
  "Harmonic Minor": [
    {
      label: "Position 1",
      shape: [
        [6, 0], [6, 2],
        [5, -1], [5, 1], [5, 2],
        [4, -1], [4, 1],
        [3, -2], [3, -1],
        [2, 0], [2, 2],
        [1, 0], [1, 2],
      ],
    },
    {
      label: "Position 2",
      shape: [
        [6, 3], [6, 4],
        [5, 2], [5, 3], [5, 4],
        [4, 1], [4, 2], [4, 4],
        [3, 0], [3, 1],
        [2, 0], [2, 2],
        [1, 0], [1, 1],
      ],
    },
    {
      label: "Position 3",
      shape: [
        [6, 5], [6, 7],
        [5, 4], [5, 5], [5, 7],
        [4, 3], [4, 4], [4, 5],
        [3, 3], [3, 4],
        [2, 2], [2, 4],
        [1, 3], [1, 4],
      ],
    },
  ],

  // =========================================================================
  // MELODIC MINOR (ascending) — 3 positions
  // =========================================================================
  "Melodic Minor": [
    {
      label: "Position 1",
      shape: [
        [6, 0], [6, 2],
        [5, -1], [5, 1], [5, 2],
        [4, -1], [4, 1],
        [3, -2], [3, -1],
        [2, 0], [2, 2],
        [1, 0], [1, 2],
      ],
    },
    {
      label: "Position 2",
      shape: [
        [6, 2], [6, 4],
        [5, 1], [5, 2], [5, 4],
        [4, 1], [4, 2],
        [3, -1], [3, 0], [3, 2],
        [2, 0], [2, 2],
        [1, 2], [1, 4],
      ],
    },
    {
      label: "Position 3",
      shape: [
        [6, 5], [6, 7],
        [5, 4], [5, 6], [5, 7],
        [4, 3], [4, 4], [4, 6],
        [3, 2], [3, 4],
        [2, 2], [2, 4],
        [1, 3], [1, 4],
      ],
    },
  ],

  // =========================================================================
  // ALTERED (7th mode of melodic minor / super Locrian) — 2 positions
  // =========================================================================
  Altered: [
    {
      label: "Position 1",
      shape: [
        [6, 0], [6, 1],
        [5, -1], [5, 0], [5, 1],
        [4, -2], [4, -1], [4, 1],
        [3, -2], [3, -1],
        [2, -1], [2, 1],
        [1, 0], [1, 1],
      ],
    },
    {
      label: "Position 2",
      shape: [
        [6, 3], [6, 4],
        [5, 1], [5, 2], [5, 4],
        [4, 0], [4, 1], [4, 2],
        [3, 0], [3, 1],
        [2, 1], [2, 2],
        [1, 1], [1, 3],
      ],
    },
  ],

  // =========================================================================
  // PENTATONIC MAJOR — 5 box positions
  // =========================================================================
  "Pentatonic Major": [
    {
      label: "Position 1 (Box 1)",
      shape: [
        [6, 0], [6, 2],
        [5, -1], [5, 2],
        [4, -1], [4, 1],
        [3, -1], [3, 1],
        [2, 0], [2, 2],
        [1, 0], [1, 2],
      ],
    },
    {
      label: "Position 2 (Box 2)",
      shape: [
        [6, 2], [6, 4],
        [5, 2], [5, 4],
        [4, 1], [4, 4],
        [3, 1], [3, 4],
        [2, 2], [2, 4],
        [1, 2], [1, 4],
      ],
    },
    {
      label: "Position 3 (Box 3)",
      shape: [
        [6, 4], [6, 7],
        [5, 4], [5, 6],
        [4, 4], [4, 6],
        [3, 4], [3, 6],
        [2, 4], [2, 7],
        [1, 4], [1, 7],
      ],
    },
    {
      label: "Position 4 (Box 4)",
      shape: [
        [6, 7], [6, 9],
        [5, 6], [5, 9],
        [4, 6], [4, 9],
        [3, 6], [3, 9],
        [2, 7], [2, 9],
        [1, 7], [1, 9],
      ],
    },
    {
      label: "Position 5 (Box 5)",
      shape: [
        [6, 9], [6, 12],
        [5, 9], [5, 11],
        [4, 9], [4, 11],
        [3, 9], [3, 11],
        [2, 9], [2, 12],
        [1, 9], [1, 12],
      ],
    },
  ],

  // =========================================================================
  // PENTATONIC MINOR — 5 box positions
  // =========================================================================
  "Pentatonic Minor": [
    {
      label: "Position 1 (Box 1)",
      shape: [
        [6, 0], [6, 3],
        [5, 0], [5, 2],
        [4, 0], [4, 2],
        [3, 0], [3, 2],
        [2, 0], [2, 3],
        [1, 0], [1, 3],
      ],
    },
    {
      label: "Position 2 (Box 2)",
      shape: [
        [6, 3], [6, 5],
        [5, 2], [5, 5],
        [4, 2], [4, 5],
        [3, 2], [3, 4],
        [2, 3], [2, 5],
        [1, 3], [1, 5],
      ],
    },
    {
      label: "Position 3 (Box 3)",
      shape: [
        [6, 5], [6, 7],
        [5, 5], [5, 7],
        [4, 5], [4, 7],
        [3, 4], [3, 7],
        [2, 5], [2, 8],
        [1, 5], [1, 7],
      ],
    },
    {
      label: "Position 4 (Box 4)",
      shape: [
        [6, 7], [6, 10],
        [5, 7], [5, 9],
        [4, 7], [4, 9],
        [3, 7], [3, 9],
        [2, 8], [2, 10],
        [1, 7], [1, 10],
      ],
    },
    {
      label: "Position 5 (Box 5)",
      shape: [
        [6, 10], [6, 12],
        [5, 9], [5, 12],
        [4, 9], [4, 12],
        [3, 9], [3, 12],
        [2, 10], [2, 12],
        [1, 10], [1, 12],
      ],
    },
  ],

  // =========================================================================
  // BLUES (minor pentatonic + b5) — 5 positions
  // =========================================================================
  Blues: [
    {
      label: "Position 1",
      shape: [
        [6, 0], [6, 3],
        [5, 0], [5, 2],
        [4, 0], [4, 1], [4, 2],
        [3, 0], [3, 2],
        [2, 0], [2, 3],
        [1, 0], [1, 3],
      ],
    },
    {
      label: "Position 2",
      shape: [
        [6, 3], [6, 5],
        [5, 2], [5, 3], [5, 5],
        [4, 2], [4, 3], [4, 5],
        [3, 2], [3, 4],
        [2, 3], [2, 5],
        [1, 3], [1, 5],
      ],
    },
    {
      label: "Position 3",
      shape: [
        [6, 5], [6, 7],
        [5, 5], [5, 6], [5, 7],
        [4, 5], [4, 6], [4, 7],
        [3, 4], [3, 6],
        [2, 5], [2, 8],
        [1, 5], [1, 7],
      ],
    },
    {
      label: "Position 4",
      shape: [
        [6, 7], [6, 10],
        [5, 7], [5, 8], [5, 9],
        [4, 7], [4, 9],
        [3, 6], [3, 7], [3, 9],
        [2, 8], [2, 10],
        [1, 7], [1, 10],
      ],
    },
    {
      label: "Position 5",
      shape: [
        [6, 10], [6, 12],
        [5, 9], [5, 10], [5, 12],
        [4, 9], [4, 10], [4, 12],
        [3, 9], [3, 12],
        [2, 10], [2, 12],
        [1, 10], [1, 12],
      ],
    },
  ],

  // =========================================================================
  // WHOLE TONE — 2 positions
  // =========================================================================
  "Whole Tone": [
    {
      label: "Position 1",
      shape: [
        [6, 0], [6, 2], [6, 4],
        [5, 1], [5, 2], [5, 4],
        [4, 1], [4, 3], [4, 4],
        [3, 2], [3, 4], [3, 6],
        [2, 2], [2, 4], [2, 6],
        [1, 2], [1, 4], [1, 6],
      ],
    },
    {
      label: "Position 2",
      shape: [
        [6, 2], [6, 4], [6, 6],
        [5, 2], [5, 4], [5, 6],
        [4, 2], [4, 4], [4, 6],
        [3, 2], [3, 4], [3, 6],
        [2, 2], [2, 4], [2, 6],
        [1, 2], [1, 4], [1, 6],
      ],
    },
  ],

  // =========================================================================
  // DIMINISHED WHOLE-HALF — 2 positions
  // =========================================================================
  "Diminished Whole-Half": [
    {
      label: "Position 1",
      shape: [
        [6, 0], [6, 2], [6, 3],
        [5, 1], [5, 2], [5, 4], [5, 5],
        [4, 1], [4, 2], [4, 4],
        [3, 0], [3, 2], [3, 3],
        [2, 1], [2, 2], [2, 4],
        [1, 0], [1, 2], [1, 3],
      ],
    },
    {
      label: "Position 2",
      shape: [
        [6, 2], [6, 3], [6, 5],
        [5, 2], [5, 4], [5, 5],
        [4, 2], [4, 3], [4, 5],
        [3, 2], [3, 3], [3, 5],
        [2, 2], [2, 4], [2, 5],
        [1, 2], [1, 3], [1, 5],
      ],
    },
  ],

  // =========================================================================
  // DIMINISHED HALF-WHOLE — 2 positions
  // =========================================================================
  "Diminished Half-Whole": [
    {
      label: "Position 1",
      shape: [
        [6, 0], [6, 1], [6, 3],
        [5, 0], [5, 2], [5, 3], [5, 5],
        [4, 0], [4, 2], [4, 3],
        [3, -1], [3, 0], [3, 2],
        [2, 0], [2, 1], [2, 3],
        [1, 0], [1, 1], [1, 3],
      ],
    },
    {
      label: "Position 2",
      shape: [
        [6, 1], [6, 3], [6, 4],
        [5, 1], [5, 3], [5, 4],
        [4, 1], [4, 3], [4, 4],
        [3, 0], [3, 2], [3, 3],
        [2, 1], [2, 3], [2, 4],
        [1, 1], [1, 3], [1, 4],
      ],
    },
  ],
}

export default SCALE_PATTERNS
```

- [ ] **Step 2: Commit**

```
git add lib/theory/data/scale-patterns.ts && git commit -m "feat: add lib/theory/data/scale-patterns.ts — all scale fretboard patterns"
```

---
### Task 4: lib/theory/keys.ts + __tests__/theory/keys.test.ts

**Files:**
- Create: `lib/theory/keys.ts`
- Test: `__tests__/theory/keys.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/theory/keys.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { getKey, getCircleOfFifths, stepCircle } from "@/lib/theory/keys"

describe("stepCircle", () => {
  it("steps forward one fifth: C → G", () => {
    expect(stepCircle("C", 1)).toBe("G")
  })

  it("steps backward one fourth: C → F", () => {
    expect(stepCircle("C", -1)).toBe("F")
  })

  it("wraps around: B → F#", () => {
    expect(stepCircle("B", 1)).toBe("F#")
  })

  it("steps forward two: C → D", () => {
    expect(stepCircle("C", 2)).toBe("D")
  })

  it("steps backward two: C → Bb", () => {
    expect(stepCircle("C", -2)).toBe("Bb")
  })
})

describe("getCircleOfFifths", () => {
  it("returns 12 entries", () => {
    const circle = getCircleOfFifths()
    expect(circle).toHaveLength(12)
  })

  it("first entry is C with 0 sharps", () => {
    const circle = getCircleOfFifths()
    expect(circle[0].tonic).toBe("C")
    expect(circle[0].sharps).toBe(0)
  })

  it("second entry is G with 1 sharp", () => {
    const circle = getCircleOfFifths()
    expect(circle[1].tonic).toBe("G")
    expect(circle[1].sharps).toBe(1)
  })

  it("last entry is F with 1 flat", () => {
    const circle = getCircleOfFifths()
    expect(circle[11].tonic).toBe("F")
    expect(circle[11].flats).toBe(1)
  })

  it("all entries have a relativeMinor", () => {
    const circle = getCircleOfFifths()
    for (const entry of circle) {
      expect(entry.relativeMinor).toBeTruthy()
    }
  })
})

describe("getKey", () => {
  it("G major has correct notes", () => {
    const key = getKey("G", "major")
    expect(key.notes).toEqual(["G", "A", "B", "C", "D", "E", "F#"])
  })

  it("G major has 1 sharp", () => {
    const key = getKey("G", "major")
    expect(key.signature.sharps).toBe(1)
  })

  it("G major relative key is E minor", () => {
    const key = getKey("G", "major")
    expect(key.relativeKey.tonic).toBe("E")
    expect(key.relativeKey.mode).toBe("minor")
  })

  it("G major has 7 diatonic chords", () => {
    const key = getKey("G", "major")
    expect(key.diatonicChords).toHaveLength(7)
  })

  it("G major first diatonic chord is Gmaj7", () => {
    const key = getKey("G", "major")
    expect(key.diatonicChords[0].tonic).toBe("G")
    expect(key.diatonicChords[0].roman).toBe("I")
    expect(key.diatonicChords[0].nashville).toBe("1")
  })

  it("A minor has correct notes", () => {
    const key = getKey("A", "minor")
    expect(key.notes).toEqual(["A", "B", "C", "D", "E", "F", "G"])
  })

  it("A minor relative key is C major", () => {
    const key = getKey("A", "minor")
    expect(key.relativeKey.tonic).toBe("C")
    expect(key.relativeKey.mode).toBe("major")
  })

  it("C dorian has correct notes", () => {
    const key = getKey("C", "dorian")
    expect(key.notes).toEqual(["C", "D", "Eb", "F", "G", "A", "Bb"])
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `pnpm test:run __tests__/theory/keys.test.ts`
Expected: FAIL (cannot find module `@/lib/theory/keys`)

- [ ] **Step 3: Implement**

Create `lib/theory/keys.ts`:

```ts
import { Key as TonalKey, Scale, Note } from "tonal"
import type { CircleEntry, DiatonicChord, Key } from "@/lib/theory/types"

// ---------------------------------------------------------------------------
// Circle of fifths (clockwise from C)
// ---------------------------------------------------------------------------
const CIRCLE: CircleEntry[] = [
  { tonic: "C",  relativeMinor: "A",  sharps: 0 },
  { tonic: "G",  relativeMinor: "E",  sharps: 1 },
  { tonic: "D",  relativeMinor: "B",  sharps: 2 },
  { tonic: "A",  relativeMinor: "F#", sharps: 3 },
  { tonic: "E",  relativeMinor: "C#", sharps: 4 },
  { tonic: "B",  relativeMinor: "G#", sharps: 5 },
  { tonic: "F#", relativeMinor: "D#", sharps: 6 },
  { tonic: "Db", relativeMinor: "Bb", flats:  5 },
  { tonic: "Ab", relativeMinor: "F",  flats:  4 },
  { tonic: "Eb", relativeMinor: "C",  flats:  3 },
  { tonic: "Bb", relativeMinor: "G",  flats:  2 },
  { tonic: "F",  relativeMinor: "D",  flats:  1 },
]

export function getCircleOfFifths(): CircleEntry[] {
  return CIRCLE
}

export function stepCircle(tonic: string, steps: number): string {
  const idx = CIRCLE.findIndex(
    (e) => Note.chroma(e.tonic) === Note.chroma(tonic)
  )
  if (idx === -1) return tonic
  const next = ((idx + steps) % 12 + 12) % 12
  return CIRCLE[next].tonic
}

// ---------------------------------------------------------------------------
// Quality helpers
// ---------------------------------------------------------------------------
const QUALITY_MAP: Record<string, string> = {
  maj7:  "major",
  "":    "major",
  m7:    "minor",
  m:     "minor",
  "7":   "dominant",
  m7b5:  "diminished",
  dim7:  "diminished",
  aug:   "augmented",
}

function chordQuality(type: string): string {
  return QUALITY_MAP[type] ?? "major"
}

// ---------------------------------------------------------------------------
// Roman numerals and Nashville numbers for degrees 1–7
// ---------------------------------------------------------------------------
const MAJOR_ROMANS    = ["I",   "ii",  "iii", "IV",  "V",   "vi",  "vii°"]
const MINOR_ROMANS    = ["i",   "ii°", "III", "iv",  "v",   "VI",  "VII"]
const NASHVILLE       = ["1",   "2",   "3",   "4",   "5",   "6",   "7"]

// ---------------------------------------------------------------------------
// Key signature sharp/flat count from TonalJS
// ---------------------------------------------------------------------------
function signatureFor(tonic: string, mode: string): { sharps?: number; flats?: number } {
  const entry = CIRCLE.find((e) => Note.chroma(e.tonic) === Note.chroma(tonic))
  if (mode === "major" || mode === "ionian") {
    if (!entry) return {}
    return entry.sharps !== undefined ? { sharps: entry.sharps } : { flats: entry.flats }
  }
  if (mode === "minor" || mode === "aeolian") {
    // relative major is 3 semitones up
    const relChroma = (Note.chroma(tonic)! + 3) % 12
    const relEntry = CIRCLE.find((e) => Note.chroma(e.tonic) === relChroma)
    if (!relEntry) return {}
    return relEntry.sharps !== undefined ? { sharps: relEntry.sharps } : { flats: relEntry.flats }
  }
  return {}
}

// ---------------------------------------------------------------------------
// Build diatonic chords for a major key using TonalJS
// ---------------------------------------------------------------------------
function buildMajorDiatonicChords(
  scaleTonic: string,
  chordNames: string[],
  romans: string[]
): DiatonicChord[] {
  return chordNames.map((chordName, i) => {
    // chordName e.g. "Cmaj7", "Dm7", "G7"
    const match = chordName.match(/^([A-G][#b]?)(.*)$/)
    const noteName = match?.[1] ?? scaleTonic
    const type     = match?.[2] ?? "maj7"
    return {
      degree:   i + 1,
      roman:    romans[i],
      nashville: NASHVILLE[i],
      tonic:    noteName,
      type,
      quality:  chordQuality(type),
    }
  })
}

// ---------------------------------------------------------------------------
// Modal scale diatonic chords — computed from scale notes + quality pattern
// ---------------------------------------------------------------------------
const MODE_CHORD_TYPES: Record<string, string[]> = {
  dorian:      ["m7",    "m7",    "maj7",   "7",     "m7",    "m7b5",  "maj7"],
  phrygian:    ["m7",    "maj7",  "7",      "m7",    "m7b5",  "maj7",  "m7"],
  lydian:      ["maj7",  "7",     "m7",     "m7b5",  "maj7",  "m7",    "m7"],
  mixolydian:  ["7",     "m7",    "m7b5",   "maj7",  "m7",    "m7",    "maj7"],
  locrian:     ["m7b5",  "maj7",  "m7",     "m7",    "maj7",  "7",     "m7"],
}

const MODE_ROMANS: Record<string, string[]> = {
  dorian:      ["i",   "ii",  "III", "IV",  "v",   "vi°",  "VII"],
  phrygian:    ["i",   "II",  "III", "iv",  "v°",  "VI",   "vii"],
  lydian:      ["I",   "II",  "iii", "iv°", "V",   "vi",   "vii"],
  mixolydian:  ["I",   "ii",  "iii°","IV",  "v",   "vi",   "VII"],
  locrian:     ["i°",  "II",  "iii", "iv",  "V",   "VI",   "vii"],
}

function buildModalDiatonicChords(tonic: string, mode: string): DiatonicChord[] {
  const scale = Scale.get(`${tonic} ${mode}`)
  const types  = MODE_CHORD_TYPES[mode] ?? MODE_CHORD_TYPES.dorian
  const romans = MODE_ROMANS[mode]     ?? MAJOR_ROMANS
  return scale.notes.map((note, i) => ({
    degree:    i + 1,
    roman:     romans[i],
    nashville: NASHVILLE[i],
    tonic:     note,
    type:      types[i],
    quality:   chordQuality(types[i]),
  }))
}

// ---------------------------------------------------------------------------
// Relative key helper
// ---------------------------------------------------------------------------
function relativeKey(tonic: string, mode: string): { tonic: string; mode: string } {
  if (mode === "major" || mode === "ionian") {
    // relative minor = 9 semitones up (or 3 down)
    const relChroma = (Note.chroma(tonic)! + 9) % 12
    const entry = CIRCLE.find((e) => Note.chroma(e.tonic) === relChroma)
    return { tonic: entry?.tonic ?? tonic, mode: "minor" }
  }
  if (mode === "minor" || mode === "aeolian") {
    const relChroma = (Note.chroma(tonic)! + 3) % 12
    const entry = CIRCLE.find((e) => Note.chroma(e.tonic) === relChroma)
    return { tonic: entry?.tonic ?? tonic, mode: "major" }
  }
  // For other modes, return the parent major
  const scale = Scale.get(`${tonic} ${mode}`)
  return { tonic: scale.tonic ?? tonic, mode: "major" }
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------
export function getKey(tonic: string, mode: string): Key {
  const normalMode = mode.toLowerCase()

  if (normalMode === "major" || normalMode === "ionian") {
    const k = TonalKey.majorKey(tonic)
    const chords = buildMajorDiatonicChords(tonic, k.chords, MAJOR_ROMANS)
    return {
      tonic,
      mode: "major",
      notes: k.scale,
      signature: signatureFor(tonic, "major"),
      diatonicChords: chords,
      relativeKey: relativeKey(tonic, "major"),
    }
  }

  if (normalMode === "minor" || normalMode === "aeolian") {
    const k = TonalKey.minorKey(tonic)
    const chords = buildMajorDiatonicChords(tonic, k.natural.chords, MINOR_ROMANS)
    return {
      tonic,
      mode: "minor",
      notes: k.natural.scale,
      signature: signatureFor(tonic, "minor"),
      diatonicChords: chords,
      relativeKey: relativeKey(tonic, "minor"),
    }
  }

  // Modal keys
  const scale = Scale.get(`${tonic} ${normalMode}`)
  const chords = buildModalDiatonicChords(tonic, normalMode)
  return {
    tonic,
    mode: normalMode,
    notes: scale.notes,
    signature: {},
    diatonicChords: chords,
    relativeKey: relativeKey(tonic, normalMode),
  }
}
```

- [ ] **Step 4: Run test to confirm it passes**

Run: `pnpm test:run __tests__/theory/keys.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```
git add lib/theory/keys.ts __tests__/theory/keys.test.ts && git commit -m "feat: implement keys.ts — getKey, getCircleOfFifths, stepCircle"
```

---

### Task 5: lib/theory/scales.ts + __tests__/theory/scales.test.ts

**Files:**
- Create: `lib/theory/scales.ts`
- Test: `__tests__/theory/scales.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/theory/scales.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { getScale, listScaleTypes } from "@/lib/theory/scales"

describe("listScaleTypes", () => {
  it("returns an array of strings", () => {
    const types = listScaleTypes()
    expect(Array.isArray(types)).toBe(true)
    expect(types.length).toBeGreaterThan(0)
  })

  it("includes Major and Blues", () => {
    const types = listScaleTypes()
    expect(types).toContain("Major")
    expect(types).toContain("Blues")
  })

  it("includes all 7 diatonic modes", () => {
    const types = listScaleTypes()
    expect(types).toContain("Major")
    expect(types).toContain("Dorian")
    expect(types).toContain("Phrygian")
    expect(types).toContain("Lydian")
    expect(types).toContain("Mixolydian")
    expect(types).toContain("Aeolian")
    expect(types).toContain("Locrian")
  })
})

describe("getScale - C Major", () => {
  it("returns correct tonic and type", () => {
    const scale = getScale("C", "Major")
    expect(scale.tonic).toBe("C")
    expect(scale.type).toBe("Major")
  })

  it("returns 7 notes for C major", () => {
    const scale = getScale("C", "Major")
    expect(scale.notes).toHaveLength(7)
  })

  it("C major notes are C D E F G A B", () => {
    const scale = getScale("C", "Major")
    expect(scale.notes).toEqual(["C", "D", "E", "F", "G", "A", "B"])
  })

  it("returns 7 intervals", () => {
    const scale = getScale("C", "Major")
    expect(scale.intervals).toHaveLength(7)
  })

  it("first interval is 1P (root)", () => {
    const scale = getScale("C", "Major")
    expect(scale.intervals[0]).toBe("1P")
  })

  it("returns at least 1 position", () => {
    const scale = getScale("C", "Major")
    expect(scale.positions.length).toBeGreaterThan(0)
  })

  it("each position has a label and positions array", () => {
    const scale = getScale("C", "Major")
    for (const pos of scale.positions) {
      expect(typeof pos.label).toBe("string")
      expect(Array.isArray(pos.positions)).toBe(true)
    }
  })

  it("each FretPosition has string, fret, and interval", () => {
    const scale = getScale("C", "Major")
    const pos = scale.positions[0]
    for (const fp of pos.positions) {
      expect(typeof fp.string).toBe("number")
      expect(typeof fp.fret).toBe("number")
      expect(typeof fp.interval).toBe("string")
    }
  })

  it("fret position strings are in range 1-6", () => {
    const scale = getScale("C", "Major")
    for (const scalePos of scale.positions) {
      for (const fp of scalePos.positions) {
        expect(fp.string).toBeGreaterThanOrEqual(1)
        expect(fp.string).toBeLessThanOrEqual(6)
      }
    }
  })
})

describe("getScale - C Dorian", () => {
  it("C Dorian notes are C D Eb F G A Bb", () => {
    const scale = getScale("C", "Dorian")
    expect(scale.notes).toEqual(["C", "D", "Eb", "F", "G", "A", "Bb"])
  })

  it("returns positions", () => {
    const scale = getScale("C", "Dorian")
    expect(scale.positions.length).toBeGreaterThan(0)
  })
})

describe("getScale - positionIndex", () => {
  it("returns only the requested position when positionIndex is given", () => {
    const scale = getScale("C", "Major", 0)
    expect(scale.positions).toHaveLength(1)
  })

  it("position 0 label matches Position 1", () => {
    const scale = getScale("C", "Major", 0)
    expect(scale.positions[0].label).toContain("Position 1")
  })
})

describe("getScale - G Major fret positions sanity", () => {
  it("G major position 1 contains root at fret 3 on string 6", () => {
    const scale = getScale("G", "Major", 0)
    const rootFret = scale.positions[0].positions.find(
      (fp) => fp.string === 6 && fp.interval === "R"
    )
    expect(rootFret).toBeDefined()
    expect(rootFret?.fret).toBe(3)
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `pnpm test:run __tests__/theory/scales.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

Create `lib/theory/scales.ts`:

```ts
import { Scale, Note, Interval } from "tonal"
import SCALE_PATTERNS from "@/lib/theory/data/scale-patterns"
import type { GuitarScale, ScalePosition, FretPosition } from "@/lib/theory/types"

// ---------------------------------------------------------------------------
// Open-string chroma values: index 0 = string 6 (low E), 5 = string 1 (high e)
// ---------------------------------------------------------------------------
const OPEN_CHROMA = [4, 9, 2, 7, 11, 4] // low E, A, D, G, B, high e

// ---------------------------------------------------------------------------
// Interval display labels (TonalJS interval → guitar interval name)
// ---------------------------------------------------------------------------
const INTERVAL_LABEL: Record<string, string> = {
  "1P": "R",
  "2m": "b2", "2M": "2",
  "3m": "b3", "3M": "3",
  "4P": "4",  "4A": "#4",
  "5d": "b5", "5P": "5", "5A": "#5",
  "6m": "b6", "6M": "6",
  "7m": "b7", "7M": "7",
}

function intervalLabel(tonalInterval: string): string {
  return INTERVAL_LABEL[tonalInterval] ?? tonalInterval
}

// ---------------------------------------------------------------------------
// Root fret on low E (string 6) for a given tonic
// ---------------------------------------------------------------------------
function rootFretOnLowE(tonic: string): number {
  const chroma = Note.chroma(tonic)
  if (chroma === undefined || chroma === null) return 0
  return ((chroma - OPEN_CHROMA[0] + 12) % 12)
}

// ---------------------------------------------------------------------------
// Map TonalJS scale type name → our pattern key
// ---------------------------------------------------------------------------
const TONAL_TO_PATTERN: Record<string, string> = {
  major:                 "Major",
  ionian:                "Major",
  dorian:                "Dorian",
  phrygian:              "Phrygian",
  lydian:                "Lydian",
  mixolydian:            "Mixolydian",
  aeolian:               "Aeolian",
  minor:                 "Aeolian",
  locrian:               "Locrian",
  "harmonic minor":      "Harmonic Minor",
  "melodic minor":       "Melodic Minor",
  altered:               "Altered",
  "major pentatonic":    "Pentatonic Major",
  "minor pentatonic":    "Pentatonic Minor",
  blues:                 "Blues",
  "whole tone":          "Whole Tone",
  "diminished whole half": "Diminished Whole-Half",
  "diminished half whole": "Diminished Half-Whole",
}

// Our display type → TonalJS scale name (for Scale.get())
const PATTERN_TO_TONAL: Record<string, string> = {
  Major:                  "major",
  Dorian:                 "dorian",
  Phrygian:               "phrygian",
  Lydian:                 "lydian",
  Mixolydian:             "mixolydian",
  Aeolian:                "aeolian",
  Locrian:                "locrian",
  "Harmonic Minor":       "harmonic minor",
  "Melodic Minor":        "melodic minor",
  Altered:                "altered",
  "Pentatonic Major":     "major pentatonic",
  "Pentatonic Minor":     "minor pentatonic",
  Blues:                  "blues",
  "Whole Tone":           "whole tone",
  "Diminished Whole-Half":"diminished whole half",
  "Diminished Half-Whole":"diminished half whole",
}

// ---------------------------------------------------------------------------
// Build fretboard positions from a pattern shape
// ---------------------------------------------------------------------------
function buildPositions(
  patternKey: string,
  rootFret: number,
  scaleNotes: string[],
  scaleIntervals: string[]
): ScalePosition[] {
  const patterns = SCALE_PATTERNS[patternKey]
  if (!patterns) return []

  return patterns.map((patternPos) => {
    const fretPositions: FretPosition[] = patternPos.shape.map(([guitarString, fretOffset]) => {
      const absoluteFret = rootFret + fretOffset
      // Determine which note is at this fret/string
      const stringIndex = 6 - guitarString // 0=str6,5=str1
      const openC = OPEN_CHROMA[stringIndex]
      const noteChroma = (openC + absoluteFret + 1200) % 12

      // Find matching note in scale
      const noteIndex = scaleNotes.findIndex(
        (n) => Note.chroma(n) === noteChroma
      )
      const tonalInterval = noteIndex >= 0 ? scaleIntervals[noteIndex] : "1P"
      return {
        string: guitarString,
        fret: absoluteFret,
        interval: intervalLabel(tonalInterval),
      }
    })

    return {
      label: patternPos.label,
      positions: fretPositions,
    }
  })
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function listScaleTypes(): string[] {
  return Object.keys(SCALE_PATTERNS)
}

export function getScale(
  tonic: string,
  type: string,
  positionIndex?: number
): GuitarScale {
  // Normalize our display type to TonalJS name
  const tonalName = PATTERN_TO_TONAL[type] ?? type.toLowerCase()
  const scale = Scale.get(`${tonic} ${tonalName}`)

  // Fall back gracefully if TonalJS doesn't know the scale
  const notes     = scale.notes.length > 0 ? scale.notes : [tonic]
  const intervals = scale.intervals.length > 0 ? scale.intervals : ["1P"]

  // Find pattern key (try display type first, then normalize)
  const patternKey =
    SCALE_PATTERNS[type] ? type :
    TONAL_TO_PATTERN[tonalName] ?? type

  const rootFret = rootFretOnLowE(tonic)
  let positions = buildPositions(patternKey, rootFret, notes, intervals)

  if (positionIndex !== undefined) {
    positions = positions.slice(positionIndex, positionIndex + 1)
  }

  return {
    tonic,
    type,
    notes,
    intervals,
    positions,
  }
}
```

- [ ] **Step 4: Run test to confirm it passes**

Run: `pnpm test:run __tests__/theory/scales.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```
git add lib/theory/scales.ts __tests__/theory/scales.test.ts && git commit -m "feat: implement scales.ts — getScale and listScaleTypes with CAGED positions"
```

---

### Task 6: lib/theory/chords.ts + __tests__/theory/chords.test.ts

**Files:**
- Create: `lib/theory/chords.ts`
- Test: `__tests__/theory/chords.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/theory/chords.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { getChord, listChordTypes, generateDropVoicing } from "@/lib/theory/chords"

describe("listChordTypes", () => {
  it("returns an array of strings", () => {
    const types = listChordTypes()
    expect(Array.isArray(types)).toBe(true)
    expect(types.length).toBeGreaterThan(0)
  })

  it("includes common chord types", () => {
    const types = listChordTypes()
    expect(types).toContain("maj7")
    expect(types).toContain("m7")
    expect(types).toContain("7")
  })
})

describe("getChord - Cmaj7", () => {
  it("returns correct tonic and type", () => {
    const chord = getChord("C", "maj7")
    expect(chord.tonic).toBe("C")
    expect(chord.type).toBe("maj7")
  })

  it("returns notes C E G B", () => {
    const chord = getChord("C", "maj7")
    expect(chord.notes).toEqual(["C", "E", "G", "B"])
  })

  it("returns correct intervals", () => {
    const chord = getChord("C", "maj7")
    expect(chord.intervals).toEqual(["1P", "3M", "5P", "7M"])
  })

  it("returns at least one voicing", () => {
    const chord = getChord("C", "maj7")
    expect(chord.voicings.length).toBeGreaterThan(0)
  })

  it("each voicing has frets array of length 6", () => {
    const chord = getChord("C", "maj7")
    for (const v of chord.voicings) {
      expect(v.frets).toHaveLength(6)
    }
  })

  it("each voicing fret value is number or null", () => {
    const chord = getChord("C", "maj7")
    for (const v of chord.voicings) {
      for (const f of v.frets) {
        expect(f === null || typeof f === "number").toBe(true)
      }
    }
  })
})

describe("getChord - Am7", () => {
  it("returns notes A C E G", () => {
    const chord = getChord("A", "m7")
    expect(chord.notes).toEqual(["A", "C", "E", "G"])
  })

  it("returns at least one voicing", () => {
    const chord = getChord("A", "m7")
    expect(chord.voicings.length).toBeGreaterThan(0)
  })
})

describe("generateDropVoicing", () => {
  it("returns a ChordVoicing with label Drop 2", () => {
    const base = {
      frets: [null, null, 10, 9, 8, 7],
      fingers: [null, null, 4, 3, 2, 1],
    }
    const drop2 = generateDropVoicing(base, 2)
    expect(drop2.label).toBe("Drop 2")
  })

  it("drop-2 lowers the 2nd highest voice by 12", () => {
    const base = {
      frets: [null, null, 10, 9, 8, 7],
      fingers: [null, null, 4, 3, 2, 1],
    }
    // Sounding strings high-to-low: str1(7), str2(8), str3(9), str4(10)
    // 2nd from top is str2 = fret 8, should become -4 (8-12)
    const drop2 = generateDropVoicing(base, 2)
    expect(drop2.frets[4]).toBe(8 - 12)
  })

  it("drop-3 lowers the 3rd highest voice by 12", () => {
    const base = {
      frets: [null, null, 10, 9, 8, 7],
      fingers: [null, null, 4, 3, 2, 1],
    }
    // 3rd from top is str3 = fret 9
    const drop3 = generateDropVoicing(base, 3)
    expect(drop3.frets[3]).toBe(9 - 12)
    expect(drop3.label).toBe("Drop 3")
  })

  it("returns original voicing if not enough sounding strings", () => {
    const base = {
      frets: [null, null, null, null, 5, null],
      fingers: [null, null, null, null, 1, null],
    }
    const drop2 = generateDropVoicing(base, 2)
    expect(drop2.frets).toEqual(base.frets)
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `pnpm test:run __tests__/theory/chords.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

Create `lib/theory/chords.ts`:

```ts
import { Chord } from "tonal"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import chordsDb from "@tombatossals/chords-db"
import type { ChordVoicing, GuitarChord } from "@/lib/theory/types"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = chordsDb as any

// ---------------------------------------------------------------------------
// Chord type list — sourced from TonalJS chord types supported by chords-db
// ---------------------------------------------------------------------------
const CHORD_TYPES = [
  "maj7", "maj", "m7", "m", "7", "m7b5", "dim7", "dim",
  "aug", "sus2", "sus4", "9", "maj9", "m9", "6", "m6",
  "add9", "madd9", "7sus4",
]

export function listChordTypes(): string[] {
  return CHORD_TYPES
}

// ---------------------------------------------------------------------------
// Key name mapping: TonalJS tonic → chords-db key
// ---------------------------------------------------------------------------
const TONIC_TO_DB_KEY: Record<string, string> = {
  C:  "C",
  "C#": "Csharp", Db: "Csharp",
  D:  "D",
  "D#": "Eb",     Eb: "Eb",
  E:  "E",
  F:  "F",
  "F#": "Fsharp", Gb: "Fsharp",
  G:  "G",
  "G#": "Ab",     Ab: "Ab",
  A:  "A",
  "A#": "Bb",     Bb: "Bb",
  B:  "B",
}

// ---------------------------------------------------------------------------
// Chord type mapping: our type → chords-db suffix keys
// ---------------------------------------------------------------------------
const TYPE_TO_DB_SUFFIX: Record<string, string[]> = {
  maj7:   ["major7"],
  maj:    ["major"],
  m7:     ["minor7"],
  m:      ["minor"],
  "7":    ["dominant7"],
  m7b5:   ["minor7b5"],
  dim7:   ["diminished7"],
  dim:    ["diminished"],
  aug:    ["augmented"],
  sus2:   ["sus2"],
  sus4:   ["sus4"],
  "9":    ["dominant9"],
  maj9:   ["major9"],
  m9:     ["minor9"],
  "6":    ["major6"],
  m6:     ["minor6"],
  add9:   ["add9"],
  madd9:  ["minor add9"],
  "7sus4":["7sus4"],
}

// ---------------------------------------------------------------------------
// Map chords-db voicing to our ChordVoicing
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapVoicing(v: any): ChordVoicing {
  const frets: (number | null)[] = (v.frets as number[]).map((f: number) =>
    f === -1 ? null : f + (v.baseFret ?? 1) - 1
  )
  const fingers: (number | null)[] = (v.fingers as number[]).map((f: number) =>
    f === 0 ? null : f
  )

  const voicing: ChordVoicing = { frets, fingers }

  if (v.barre !== undefined && v.barre > 0) {
    voicing.barre = {
      fret: v.barre + (v.baseFret ?? 1) - 1,
      fromString: 6,
      toString: 1,
    }
    voicing.label = "Barre"
  } else if ((v.baseFret ?? 1) === 1) {
    voicing.label = "Open"
  }

  return voicing
}

// ---------------------------------------------------------------------------
// Look up voicings from chords-db
// ---------------------------------------------------------------------------
function getVoicingsFromDb(tonic: string, type: string): ChordVoicing[] {
  const dbKey = TONIC_TO_DB_KEY[tonic]
  if (!dbKey) return []

  const dbSuffixes = TYPE_TO_DB_SUFFIX[type] ?? [type]
  const chords = db.guitar?.chords?.[dbKey]
  if (!chords) return []

  const voicings: ChordVoicing[] = []
  for (const suffix of dbSuffixes) {
    const arr = chords[suffix] ?? []
    for (const v of arr) {
      voicings.push(mapVoicing(v))
    }
  }
  return voicings
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function getChord(tonic: string, type: string): GuitarChord {
  const chord = Chord.get(`${tonic}${type}`)
  const notes     = chord.notes.length > 0 ? chord.notes : [tonic]
  const intervals = chord.intervals.length > 0 ? chord.intervals : ["1P"]

  const voicings = getVoicingsFromDb(tonic, type)

  return {
    tonic,
    type,
    notes,
    intervals,
    voicings,
  }
}

export function generateDropVoicing(voicing: ChordVoicing, drop: 2 | 3): ChordVoicing {
  const frets = [...voicing.frets]
  const soundingIndices = frets
    .map((f, i) => ({ f, i }))
    .filter((x) => x.f !== null)
    .reverse() // high-string index first → highest pitched first

  const targetIndex = drop - 1 // drop-2 → index 1, drop-3 → index 2
  if (soundingIndices.length <= targetIndex) return voicing

  const target = soundingIndices[targetIndex]
  const newFrets = [...frets]
  newFrets[target.i] = (target.f as number) - 12

  return {
    ...voicing,
    frets: newFrets,
    fingers: voicing.fingers,
    label: `Drop ${drop}`,
  }
}
```

- [ ] **Step 4: Run test to confirm it passes**

Run: `pnpm test:run __tests__/theory/chords.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```
git add lib/theory/chords.ts __tests__/theory/chords.test.ts && git commit -m "feat: implement chords.ts — getChord, listChordTypes, generateDropVoicing"
```

---
### Task 7: lib/theory/arpeggios.ts + __tests__/theory/arpeggios.test.ts

**Files:**
- Create: `lib/theory/arpeggios.ts`
- Test: `__tests__/theory/arpeggios.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/theory/arpeggios.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { getArpeggio } from "@/lib/theory/arpeggios"

describe("getArpeggio - Cmaj7", () => {
  it("returns only chord tones for Cmaj7: C E G B", () => {
    const arp = getArpeggio("C", "maj7")
    expect(arp.notes).toEqual(["C", "E", "G", "B"])
  })

  it("returns correct intervals for Cmaj7", () => {
    const arp = getArpeggio("C", "maj7")
    expect(arp.intervals).toEqual(["1P", "3M", "5P", "7M"])
  })

  it("returns tonic and type", () => {
    const arp = getArpeggio("C", "maj7")
    expect(arp.tonic).toBe("C")
    expect(arp.type).toBe("maj7")
  })

  it("returns at least one position", () => {
    const arp = getArpeggio("C", "maj7")
    expect(arp.positions.length).toBeGreaterThan(0)
  })

  it("positions only contain chord tones (R, 3, 5, 7)", () => {
    const arp = getArpeggio("C", "maj7")
    const validIntervals = new Set(["R", "3", "5", "7"])
    for (const scalePos of arp.positions) {
      for (const fp of scalePos.positions) {
        expect(validIntervals.has(fp.interval)).toBe(true)
      }
    }
  })
})

describe("getArpeggio - Am7", () => {
  it("returns notes A C E G", () => {
    const arp = getArpeggio("A", "m7")
    expect(arp.notes).toEqual(["A", "C", "E", "G"])
  })

  it("positions only contain chord tones (R, b3, 5, b7)", () => {
    const arp = getArpeggio("A", "m7")
    const validIntervals = new Set(["R", "b3", "5", "b7"])
    for (const scalePos of arp.positions) {
      for (const fp of scalePos.positions) {
        expect(validIntervals.has(fp.interval)).toBe(true)
      }
    }
  })
})

describe("getArpeggio - positionIndex", () => {
  it("returns only the requested position when positionIndex is given", () => {
    const arp = getArpeggio("C", "maj7", 0)
    expect(arp.positions).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `pnpm test:run __tests__/theory/arpeggios.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

Create `lib/theory/arpeggios.ts`:

```ts
import { Chord, Note } from "tonal"
import SCALE_PATTERNS from "@/lib/theory/data/scale-patterns"
import type { GuitarScale, ScalePosition, FretPosition } from "@/lib/theory/types"

// Open-string chroma (index 0 = string 6 low E, 5 = string 1 high e)
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

function intervalLabel(tonalInterval: string): string {
  return INTERVAL_LABEL[tonalInterval] ?? tonalInterval
}

function rootFretOnLowE(tonic: string): number {
  const chroma = Note.chroma(tonic)
  if (chroma === undefined || chroma === null) return 0
  return ((chroma - OPEN_CHROMA[0] + 12) % 12)
}

// ---------------------------------------------------------------------------
// Build arpeggio positions by filtering Major scale positions to chord tones
// ---------------------------------------------------------------------------
function buildArpeggioPositions(
  tonic: string,
  chordNotes: string[],
  chordIntervals: string[],
  positionIndex?: number
): ScalePosition[] {
  const rootFret = rootFretOnLowE(tonic)
  const patterns = SCALE_PATTERNS["Major"]
  if (!patterns) return []

  const patternSlice = positionIndex !== undefined
    ? patterns.slice(positionIndex, positionIndex + 1)
    : patterns

  return patternSlice.map((patternPos) => {
    const fretPositions: FretPosition[] = []

    for (const [guitarString, fretOffset] of patternPos.shape) {
      const absoluteFret = rootFret + fretOffset
      const stringIndex = 6 - guitarString
      const openC = OPEN_CHROMA[stringIndex]
      const noteChroma = (openC + absoluteFret + 1200) % 12

      // Only include if this fret is a chord tone
      const noteIndex = chordNotes.findIndex(
        (n) => Note.chroma(n) === noteChroma
      )
      if (noteIndex === -1) continue

      fretPositions.push({
        string: guitarString,
        fret: absoluteFret,
        interval: intervalLabel(chordIntervals[noteIndex]),
      })
    }

    return {
      label: patternPos.label,
      positions: fretPositions,
    }
  }).filter((p) => p.positions.length > 0)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function getArpeggio(
  tonic: string,
  chordType: string,
  positionIndex?: number
): GuitarScale {
  const chord = Chord.get(`${tonic}${chordType}`)
  const notes     = chord.notes.length > 0 ? chord.notes : [tonic]
  const intervals = chord.intervals.length > 0 ? chord.intervals : ["1P"]

  const positions = buildArpeggioPositions(tonic, notes, intervals, positionIndex)

  return {
    tonic,
    type: chordType,
    notes,
    intervals,
    positions,
  }
}
```

- [ ] **Step 4: Run test to confirm it passes**

Run: `pnpm test:run __tests__/theory/arpeggios.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```
git add lib/theory/arpeggios.ts __tests__/theory/arpeggios.test.ts && git commit -m "feat: implement arpeggios.ts — getArpeggio filters scale positions to chord tones"
```

---

### Task 8: lib/theory/harmony.ts + __tests__/theory/harmony.test.ts

**Files:**
- Create: `lib/theory/harmony.ts`
- Test: `__tests__/theory/harmony.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/theory/harmony.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { getDiatonicChords } from "@/lib/theory/harmony"

describe("getDiatonicChords - G major", () => {
  it("returns 7 diatonic chords", () => {
    const chords = getDiatonicChords("G", "major")
    expect(chords).toHaveLength(7)
  })

  it("degree 1 is G, Roman I, Nashville 1", () => {
    const chords = getDiatonicChords("G", "major")
    expect(chords[0].degree).toBe(1)
    expect(chords[0].tonic).toBe("G")
    expect(chords[0].roman).toBe("I")
    expect(chords[0].nashville).toBe("1")
  })

  it("degree 2 is A, Roman ii, Nashville 2", () => {
    const chords = getDiatonicChords("G", "major")
    expect(chords[1].degree).toBe(2)
    expect(chords[1].tonic).toBe("A")
    expect(chords[1].roman).toBe("ii")
    expect(chords[1].nashville).toBe("2")
  })

  it("degree 5 is D, Roman V, Nashville 5", () => {
    const chords = getDiatonicChords("G", "major")
    expect(chords[4].degree).toBe(5)
    expect(chords[4].tonic).toBe("D")
    expect(chords[4].roman).toBe("V")
    expect(chords[4].nashville).toBe("5")
  })

  it("degree 7 is F#, Roman vii°, Nashville 7", () => {
    const chords = getDiatonicChords("G", "major")
    expect(chords[6].degree).toBe(7)
    expect(chords[6].tonic).toBe("F#")
    expect(chords[6].roman).toBe("vii°")
    expect(chords[6].nashville).toBe("7")
  })

  it("each chord has a quality field", () => {
    const chords = getDiatonicChords("G", "major")
    for (const c of chords) {
      expect(typeof c.quality).toBe("string")
      expect(c.quality.length).toBeGreaterThan(0)
    }
  })
})

describe("getDiatonicChords - A minor", () => {
  it("returns 7 diatonic chords", () => {
    const chords = getDiatonicChords("A", "minor")
    expect(chords).toHaveLength(7)
  })

  it("degree 1 is A, Roman i, Nashville 1", () => {
    const chords = getDiatonicChords("A", "minor")
    expect(chords[0].tonic).toBe("A")
    expect(chords[0].roman).toBe("i")
    expect(chords[0].nashville).toBe("1")
  })

  it("degree 5 is E, Roman v, Nashville 5", () => {
    const chords = getDiatonicChords("A", "minor")
    expect(chords[4].tonic).toBe("E")
    expect(chords[4].roman).toBe("v")
    expect(chords[4].nashville).toBe("5")
  })
})

describe("getDiatonicChords - C dorian", () => {
  it("returns 7 diatonic chords", () => {
    const chords = getDiatonicChords("C", "dorian")
    expect(chords).toHaveLength(7)
  })

  it("degree 1 is C with minor quality", () => {
    const chords = getDiatonicChords("C", "dorian")
    expect(chords[0].tonic).toBe("C")
    expect(chords[0].quality).toBe("minor")
  })

  it("degree 4 is F with major quality", () => {
    const chords = getDiatonicChords("C", "dorian")
    expect(chords[3].tonic).toBe("F")
    expect(chords[3].quality).toBe("major")
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `pnpm test:run __tests__/theory/harmony.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

Create `lib/theory/harmony.ts`:

```ts
import { getKey } from "@/lib/theory/keys"
import type { DiatonicChord } from "@/lib/theory/types"

export function getDiatonicChords(tonic: string, mode: string): DiatonicChord[] {
  const key = getKey(tonic, mode)
  return key.diatonicChords
}
```

- [ ] **Step 4: Run test to confirm it passes**

Run: `pnpm test:run __tests__/theory/harmony.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```
git add lib/theory/harmony.ts __tests__/theory/harmony.test.ts && git commit -m "feat: implement harmony.ts — getDiatonicChords delegating to getKey"
```

---

### Task 9: lib/theory/progressions.ts + lib/theory/index.ts + __tests__/theory/progressions.test.ts

**Files:**
- Create: `lib/theory/progressions.ts`
- Create: `lib/theory/index.ts`
- Test: `__tests__/theory/progressions.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/theory/progressions.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { listProgressions, getProgression } from "@/lib/theory/progressions"

describe("listProgressions", () => {
  it("returns an array of Progression objects", () => {
    const progs = listProgressions()
    expect(Array.isArray(progs)).toBe(true)
    expect(progs.length).toBeGreaterThan(0)
  })

  it("each progression has name, description, and degrees array", () => {
    const progs = listProgressions()
    for (const p of progs) {
      expect(typeof p.name).toBe("string")
      expect(typeof p.description).toBe("string")
      expect(Array.isArray(p.degrees)).toBe(true)
      expect(p.degrees.length).toBeGreaterThan(0)
    }
  })

  it("includes ii-V-I and I-IV-V", () => {
    const progs = listProgressions()
    const names = progs.map((p) => p.name)
    expect(names).toContain("ii-V-I")
    expect(names).toContain("I-IV-V")
  })
})

describe("getProgression - ii-V-I in C", () => {
  it("returns 3 chords", () => {
    const chords = getProgression("ii-V-I", "C")
    expect(chords).toHaveLength(3)
  })

  it("first chord is Dm7 (ii)", () => {
    const chords = getProgression("ii-V-I", "C")
    expect(chords[0].tonic).toBe("D")
    expect(chords[0].type).toBe("m7")
    expect(chords[0].roman).toBe("ii")
    expect(chords[0].nashville).toBe("2")
  })

  it("second chord is G7 (V)", () => {
    const chords = getProgression("ii-V-I", "C")
    expect(chords[1].tonic).toBe("G")
    expect(chords[1].type).toBe("7")
    expect(chords[1].roman).toBe("V")
    expect(chords[1].nashville).toBe("5")
  })

  it("third chord is Cmaj7 (I)", () => {
    const chords = getProgression("ii-V-I", "C")
    expect(chords[2].tonic).toBe("C")
    expect(chords[2].type).toBe("maj7")
    expect(chords[2].roman).toBe("I")
    expect(chords[2].nashville).toBe("1")
  })
})

describe("getProgression - I-IV-V in G", () => {
  it("returns 3 chords", () => {
    const chords = getProgression("I-IV-V", "G")
    expect(chords).toHaveLength(3)
  })

  it("first chord is G (I)", () => {
    const chords = getProgression("I-IV-V", "G")
    expect(chords[0].tonic).toBe("G")
    expect(chords[0].roman).toBe("I")
  })

  it("second chord is C (IV)", () => {
    const chords = getProgression("I-IV-V", "G")
    expect(chords[1].tonic).toBe("C")
    expect(chords[1].roman).toBe("IV")
  })

  it("third chord is D (V)", () => {
    const chords = getProgression("I-IV-V", "G")
    expect(chords[2].tonic).toBe("D")
    expect(chords[2].roman).toBe("V")
  })
})

describe("getProgression - unknown name", () => {
  it("returns empty array for unknown progression name", () => {
    const chords = getProgression("Unknown-Progression", "C")
    expect(chords).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `pnpm test:run __tests__/theory/progressions.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement progressions.ts**

Create `lib/theory/progressions.ts`:

```ts
import { getDiatonicChords } from "@/lib/theory/harmony"
import type { Progression, ProgressionChord, DiatonicChord } from "@/lib/theory/types"

// ---------------------------------------------------------------------------
// Static progression library
// ---------------------------------------------------------------------------
const PROGRESSIONS: Progression[] = [
  { name: "I-IV-V",     description: "Blues / rock foundation",        degrees: ["I",  "IV", "V"] },
  { name: "I-V-vi-IV",  description: "Pop progression",                degrees: ["I",  "V",  "vi", "IV"] },
  { name: "ii-V-I",     description: "Jazz turnaround",                degrees: ["ii", "V",  "I"] },
  { name: "I-vi-IV-V",  description: "50s progression",                degrees: ["I",  "vi", "IV", "V"] },
  { name: "I-IV-I-V",   description: "12-bar blues (simplified)",      degrees: ["I",  "IV", "I",  "V"] },
  { name: "vi-IV-I-V",  description: "Minor variation",                degrees: ["vi", "IV", "I",  "V"] },
  { name: "ii-V-I-VI",  description: "Jazz turnaround with VI",        degrees: ["ii", "V",  "I",  "VI"] },
  { name: "I-iii-IV-V", description: "Classic rock",                   degrees: ["I",  "iii","IV", "V"] },
]

export function listProgressions(): Progression[] {
  return PROGRESSIONS
}

// ---------------------------------------------------------------------------
// Roman numeral → degree index (1-based)
// ---------------------------------------------------------------------------
const ROMAN_TO_DEGREE: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7,
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7,
}

function romanToDegree(roman: string): number {
  // Strip leading lowercase to find numeral
  const normalized = roman.replace(/[°+]/g, "")
  return ROMAN_TO_DEGREE[normalized] ?? 1
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function getProgression(name: string, tonic: string): ProgressionChord[] {
  const prog = PROGRESSIONS.find((p) => p.name === name)
  if (!prog) return []

  const diatonic = getDiatonicChords(tonic, "major")
  // Index diatonic chords by degree number
  const byDegree: Record<number, DiatonicChord> = {}
  for (const dc of diatonic) {
    byDegree[dc.degree] = dc
  }

  return prog.degrees.map((roman) => {
    const degree = romanToDegree(roman)
    const dc = byDegree[degree]
    if (!dc) {
      return { roman, nashville: String(degree), tonic, type: "maj7" }
    }
    return {
      roman,
      nashville: dc.nashville,
      tonic: dc.tonic,
      type: dc.type,
    }
  })
}
```

- [ ] **Step 4: Create lib/theory/index.ts**

Create `lib/theory/index.ts`:

```ts
// Music theory engine — public API
// Re-exports everything from all theory modules

export * from "@/lib/theory/types"
export * from "@/lib/theory/keys"
export * from "@/lib/theory/scales"
export * from "@/lib/theory/chords"
export * from "@/lib/theory/arpeggios"
export * from "@/lib/theory/harmony"
export * from "@/lib/theory/progressions"
```

- [ ] **Step 5: Run test to confirm it passes**

Run: `pnpm test:run __tests__/theory/progressions.test.ts`
Expected: PASS

- [ ] **Step 6: Run all theory tests**

Run: `pnpm test:run __tests__/theory/`
Expected: All PASS

- [ ] **Step 7: Commit**

```
git add lib/theory/progressions.ts lib/theory/index.ts __tests__/theory/progressions.test.ts && git commit -m "feat: implement progressions.ts, index.ts — complete theory engine Phase 3a"
```

---

## Summary of deliverables

| File | Purpose |
|---|---|
| `lib/theory/types.ts` | All TypeScript types for the theory engine |
| `lib/theory/data/scale-patterns.ts` | Static fretboard shape data for all scale types |
| `lib/theory/keys.ts` | `getKey`, `getCircleOfFifths`, `stepCircle` |
| `lib/theory/scales.ts` | `getScale`, `listScaleTypes` |
| `lib/theory/chords.ts` | `getChord`, `listChordTypes`, `generateDropVoicing` |
| `lib/theory/arpeggios.ts` | `getArpeggio` |
| `lib/theory/harmony.ts` | `getDiatonicChords` |
| `lib/theory/progressions.ts` | `listProgressions`, `getProgression` |
| `lib/theory/index.ts` | Re-exports all theory modules |
| `__tests__/theory/keys.test.ts` | Tests for keys module |
| `__tests__/theory/scales.test.ts` | Tests for scales module |
| `__tests__/theory/chords.test.ts` | Tests for chords module |
| `__tests__/theory/arpeggios.test.ts` | Tests for arpeggios module |
| `__tests__/theory/harmony.test.ts` | Tests for harmony module |
| `__tests__/theory/progressions.test.ts` | Tests for progressions module |
