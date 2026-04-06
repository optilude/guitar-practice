# Melodic Minor & Harmonic Minor Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the 7 modes of the Melodic Minor scale and 7 modes of the Harmonic Minor scale to the Scales tab and the Soloing modal context selector, with proper grouping in all dropdowns.

**Architecture:** New scale types are added to `lib/theory/scales.ts`. The Scale panel select is restructured from 3 optgroups (Modes / Pentatonics / Other) into 5 (Major modes / Melodic Minor modes / Harmonic Minor modes / Pentatonics / Other). The solo-scales modal context selector expands from 8 to 21 modes, rendered as optgroups in chord-panel and inversion-panel. `getSoloScales()` gains rotation logic for all three modal families.

**Tech Stack:** TonalJS (scale lookups), React (UI), TypeScript

---

## Background / what exists

### Scales already in `lib/theory/scales.ts` `PATTERN_TO_TONAL`

Major modes (7): Major, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian

Modes also already present as individual scales (but currently in "Other" group):
- Melodic Minor modes already in: **Melodic Minor**, Lydian Augmented, Lydian Dominant, Locrian #2, Altered
- Harmonic Minor modes already in: **Harmonic Minor**, Phrygian Dominant

**Not yet in PATTERN_TO_TONAL (must be added — 7 new types):**

| Display name | TonalJS name | Parent | Degree |
|---|---|---|---|
| Dorian b2 | `"dorian b2"` | Melodic Minor | 2 |
| Mixolydian b6 | `"mixolydian b6"` | Melodic Minor | 5 |
| Locrian #6 | `"locrian #6"` | Harmonic Minor | 2 |
| Ionian #5 | `"ionian augmented"` | Harmonic Minor | 3 |
| Dorian #4 | `"dorian #4"` | Harmonic Minor | 4 |
| Lydian #2 | `"lydian #2"` | Harmonic Minor | 6 |
| Altered Diminished | `"ultralocrian"` | Harmonic Minor | 7 |

### Current grouping in scale-panel.tsx

```
<optgroup label="Modes">          ← 7 diatonic modes
<optgroup label="Pentatonics">    ← Pentatonic Major, Pentatonic Minor, Blues
<optgroup label="Other">          ← everything else (incl. Harmonic Minor, Melodic Minor, etc.)
```

### Mode families (ordered by degree)

```
MAJOR_SCALE_MODES (7):
  Major, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian

MELODIC_MINOR_MODES (7):
  Melodic Minor, Dorian b2, Lydian Augmented, Lydian Dominant,
  Mixolydian b6, Locrian #2, Altered

HARMONIC_MINOR_MODES (7):
  Harmonic Minor, Locrian #6, Ionian #5, Dorian #4, Phrygian Dominant,
  Lydian #2, Altered Diminished

PENTATONICS (3):
  Pentatonic Major, Pentatonic Minor, Blues

OTHER (remains):
  Bebop Dominant, Whole Tone, Diminished Whole-Half,
  Diminished Half-Whole, Chromatic
```

### Current `SOLO_MODE_OPTIONS` (8 flat entries)

ionian, dorian, phrygian, lydian, mixolydian, aeolian, locrian, melodic minor

After this task: 21 entries organised as 3 optgroups.

---

## Task 1: Add 7 new scale types to `lib/theory/scales.ts`

**Files:**
- Modify: `lib/theory/scales.ts`

- [ ] **Step 1: Write failing test for new scale types**

Add to `__tests__/theory/scales.test.ts` (after the existing describe blocks):

```typescript
describe("New melodic/harmonic minor mode scale types", () => {
  const newTypes: [string, string[], string[]][] = [
    // [type, expectedNotes for C, firstInterval]
    ["Dorian b2",          ["C", "Db", "Eb", "F", "G", "A", "Bb"], "1P"],
    ["Mixolydian b6",      ["C", "D", "E", "F", "G", "Ab", "Bb"],  "1P"],
    ["Locrian #6",         ["C", "Db", "Eb", "F", "Gb", "A", "Bb"], "1P"],
    ["Ionian #5",          ["C", "D", "E", "F", "G#", "A", "B"],   "1P"],
    ["Dorian #4",          ["C", "D", "Eb", "F#", "G", "A", "Bb"], "1P"],
    ["Lydian #2",          ["C", "D#", "E", "F#", "G", "A", "B"],  "1P"],
    ["Altered Diminished", ["C", "Db", "Eb", "E", "Gb", "Ab", "A", "B"], "1P"],
  ]

  for (const [type] of newTypes) {
    it(`listScaleTypes() includes "${type}"`, () => {
      expect(listScaleTypes()).toContain(type)
    })

    it(`getScale("C", "${type}") returns notes and intervals`, () => {
      const scale = getScale("C", type)
      expect(scale.notes.length).toBeGreaterThan(0)
      expect(scale.intervals.length).toBeGreaterThan(0)
      expect(scale.intervals[0]).toBe("1P")
    })
  }
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/maraspeli/Build/Claude/GuitarPractice && pnpm test __tests__/theory/scales.test.ts
```

Expected: FAIL — `listScaleTypes()` does not include "Dorian b2" etc.

- [ ] **Step 3: Add new entries to PATTERN_TO_TONAL in `lib/theory/scales.ts`**

```typescript
// In PATTERN_TO_TONAL, after the existing entries, add:
"Dorian b2":          "dorian b2",
"Mixolydian b6":      "mixolydian b6",
"Locrian #6":         "locrian #6",
"Ionian #5":          "ionian augmented",
"Dorian #4":          "dorian #4",
"Lydian #2":          "lydian #2",
"Altered Diminished": "ultralocrian",
```

The full updated PATTERN_TO_TONAL block (replace from line 49 through 72 in the file):

```typescript
const PATTERN_TO_TONAL: Record<string, string> = {
  Major:                   "major",
  Dorian:                  "dorian",
  Phrygian:                "phrygian",
  Lydian:                  "lydian",
  Mixolydian:              "mixolydian",
  Aeolian:                 "aeolian",
  Locrian:                 "locrian",
  // Modes of Melodic Minor
  "Melodic Minor":         "melodic minor",
  "Dorian b2":             "dorian b2",
  "Lydian Augmented":      "lydian augmented",
  "Lydian Dominant":       "lydian dominant",
  "Mixolydian b6":         "mixolydian b6",
  "Locrian #2":            "locrian #2",
  "Altered":               "altered",
  // Modes of Harmonic Minor
  "Harmonic Minor":        "harmonic minor",
  "Locrian #6":            "locrian #6",
  "Ionian #5":             "ionian augmented",
  "Dorian #4":             "dorian #4",
  "Phrygian Dominant":     "phrygian dominant",
  "Lydian #2":             "lydian #2",
  "Altered Diminished":    "ultralocrian",
  // Pentatonics
  "Pentatonic Major":      "major pentatonic",
  "Pentatonic Minor":      "minor pentatonic",
  Blues:                   "blues",
  // Other
  "Bebop Dominant":        "bebop",
  "Whole Tone":            "whole tone",
  "Diminished Whole-Half": "diminished",
  "Diminished Half-Whole": "half-whole diminished",
  Chromatic:               "chromatic",
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
cd /Users/maraspeli/Build/Claude/GuitarPractice && pnpm test __tests__/theory/scales.test.ts
```

Expected: All pass.

**If "Ionian #5" notes don't match** — TonalJS may call mode 3 of harmonic minor `"ionian augmented"` or `"ionian #5"`. If `Scale.get("C ionian augmented").notes` is empty, try `"ionian #5"`. Use whichever gives non-empty notes.

**If "Altered Diminished" fails** — TonalJS may use `"superlocrian bb7"` instead of `"ultralocrian"`. Check with `Scale.get("C ultralocrian").notes.length > 0`.

- [ ] **Step 5: Commit**

```bash
cd /Users/maraspeli/Build/Claude/GuitarPractice
git add lib/theory/scales.ts __tests__/theory/scales.test.ts
git commit -m "feat: add 7 new melodic/harmonic minor mode scale types"
```

---

## Task 2: Regroup the Scales tab select into 5 optgroups

**Files:**
- Modify: `app/(app)/reference/_components/scale-panel.tsx`

- [ ] **Step 1: Replace the three mode/pentatonic/other constants and memos**

In `scale-panel.tsx`, remove:

```typescript
const MODES = ["Major", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Aeolian", "Locrian"]
const PENTATONICS = ["Pentatonic Major", "Pentatonic Minor", "Blues"]
```

and the three memos (`modeTypes`, `pentatonicTypes`, `otherTypes`).

Add these constants (at module level, after ROOT_NOTES):

```typescript
const MAJOR_SCALE_MODES = [
  "Major", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Aeolian", "Locrian",
]
const MELODIC_MINOR_MODES = [
  "Melodic Minor", "Dorian b2", "Lydian Augmented", "Lydian Dominant",
  "Mixolydian b6", "Locrian #2", "Altered",
]
const HARMONIC_MINOR_MODES = [
  "Harmonic Minor", "Locrian #6", "Ionian #5", "Dorian #4",
  "Phrygian Dominant", "Lydian #2", "Altered Diminished",
]
const PENTATONICS = ["Pentatonic Major", "Pentatonic Minor", "Blues"]

const ALL_GROUPED = new Set([
  ...MAJOR_SCALE_MODES,
  ...MELODIC_MINOR_MODES,
  ...HARMONIC_MINOR_MODES,
  ...PENTATONICS,
])
```

Add these five memos inside the component (replacing the old three):

```typescript
const majorModeTypes      = useMemo(() => MAJOR_SCALE_MODES.filter(t => scaleTypes.includes(t)),      [scaleTypes])
const melodicMinorTypes   = useMemo(() => MELODIC_MINOR_MODES.filter(t => scaleTypes.includes(t)),    [scaleTypes])
const harmonicMinorTypes  = useMemo(() => HARMONIC_MINOR_MODES.filter(t => scaleTypes.includes(t)),   [scaleTypes])
const pentatonicTypes     = useMemo(() => PENTATONICS.filter(t => scaleTypes.includes(t)),            [scaleTypes])
const otherTypes          = useMemo(() => scaleTypes.filter(t => !ALL_GROUPED.has(t)),                [scaleTypes])
```

- [ ] **Step 2: Update the select JSX**

Replace the select's optgroup children with:

```tsx
<optgroup label="Modes of the Major scale">
  {majorModeTypes.map((t) => (
    <option key={t} value={t}>{scaleLabel(t)}</option>
  ))}
</optgroup>
<optgroup label="Modes of the Melodic Minor scale">
  {melodicMinorTypes.map((t) => (
    <option key={t} value={t}>{scaleLabel(t)}</option>
  ))}
</optgroup>
<optgroup label="Modes of the Harmonic Minor scale">
  {harmonicMinorTypes.map((t) => (
    <option key={t} value={t}>{scaleLabel(t)}</option>
  ))}
</optgroup>
<optgroup label="Pentatonics">
  {pentatonicTypes.map((t) => (
    <option key={t} value={t}>{scaleLabel(t)}</option>
  ))}
</optgroup>
{otherTypes.length > 0 && (
  <optgroup label="Other">
    {otherTypes.map((t) => (
      <option key={t} value={t}>{scaleLabel(t)}</option>
    ))}
  </optgroup>
)}
```

- [ ] **Step 3: Add display label for Aeolian**

The existing `SCALE_DISPLAY_LABELS` already maps `"Aeolian"` → `"Aeolian (natural minor)"`. No new display labels are needed for the new modes — they display as their own names.

- [ ] **Step 4: Run full test suite**

```bash
cd /Users/maraspeli/Build/Claude/GuitarPractice && pnpm test
```

Expected: All pass (no tests directly cover scale-panel rendering, so no new tests needed for this task).

- [ ] **Step 5: Commit**

```bash
cd /Users/maraspeli/Build/Claude/GuitarPractice
git add "app/(app)/reference/_components/scale-panel.tsx"
git commit -m "feat: regroup scale-panel select into 5 optgroups (major / melodic minor / harmonic minor / pentatonic / other)"
```

---

## Task 3: Expand solo-scales.ts to all 21 modes

**Files:**
- Modify: `lib/theory/solo-scales.ts`

This is the most complex task. We need to:
1. Define the three mode family rotation arrays
2. Update `getSoloScales` to detect which family the mode belongs to and rotate within it
3. Expand `SOLO_MODE_OPTIONS` into grouped form
4. Expand `MODE_DISPLAY` with new entries
5. Expand `SCALE_TONAL_NAMES` with new entries

- [ ] **Step 1: Write failing tests for new mode rotation behaviour**

Add to `__tests__/theory/solo-scales.test.ts`:

```typescript
describe("getSoloScales — melodic minor modal family", () => {
  it("degree 1 in melodic minor context returns Melodic Minor", () => {
    const result = getSoloScales({ tonic: "C", type: "m7", degree: 1 }, "melodic minor")
    expect(result.primary.scaleName).toBe("Melodic Minor")
  })

  it("degree 2 in melodic minor context returns Dorian b2", () => {
    const result = getSoloScales({ tonic: "D", type: "m7b5", degree: 2 }, "melodic minor")
    expect(result.primary.scaleName).toBe("Dorian b2")
  })

  it("degree 3 in melodic minor context returns Lydian Augmented", () => {
    const result = getSoloScales({ tonic: "Eb", type: "maj7", degree: 3 }, "melodic minor")
    expect(result.primary.scaleName).toBe("Lydian Augmented")
  })

  it("degree 4 in melodic minor context returns Lydian Dominant", () => {
    const result = getSoloScales({ tonic: "F", type: "7", degree: 4 }, "melodic minor")
    expect(result.primary.scaleName).toBe("Lydian Dominant")
  })

  it("degree 5 in melodic minor context returns Mixolydian b6", () => {
    const result = getSoloScales({ tonic: "G", type: "7", degree: 5 }, "melodic minor")
    expect(result.primary.scaleName).toBe("Mixolydian b6")
  })

  it("degree 6 in melodic minor context returns Locrian #2", () => {
    const result = getSoloScales({ tonic: "A", type: "m7b5", degree: 6 }, "melodic minor")
    expect(result.primary.scaleName).toBe("Locrian #2")
  })

  it("degree 7 in melodic minor context returns Altered", () => {
    const result = getSoloScales({ tonic: "B", type: "7", degree: 7 }, "melodic minor")
    expect(result.primary.scaleName).toBe("Altered")
  })

  it("degree 1 in dorian b2 context returns Dorian b2", () => {
    const result = getSoloScales({ tonic: "D", type: "m7", degree: 1 }, "dorian b2")
    expect(result.primary.scaleName).toBe("Dorian b2")
  })

  it("degree 3 in dorian b2 context returns Lydian Dominant (mode 4 of mel minor = degree 2+2)", () => {
    // dorian b2 = offset 1, degree 3 → (1+3-1) % 7 = 3 → MELODIC_MINOR_MODES[3] = Lydian Dominant
    const result = getSoloScales({ tonic: "F", type: "7", degree: 3 }, "dorian b2")
    expect(result.primary.scaleName).toBe("Lydian Dominant")
  })
})

describe("getSoloScales — harmonic minor modal family", () => {
  it("degree 1 in harmonic minor context returns Harmonic Minor", () => {
    const result = getSoloScales({ tonic: "A", type: "m7", degree: 1 }, "harmonic minor")
    expect(result.primary.scaleName).toBe("Harmonic Minor")
  })

  it("degree 2 in harmonic minor context returns Locrian #6", () => {
    const result = getSoloScales({ tonic: "B", type: "m7b5", degree: 2 }, "harmonic minor")
    expect(result.primary.scaleName).toBe("Locrian #6")
  })

  it("degree 3 in harmonic minor context returns Ionian #5", () => {
    const result = getSoloScales({ tonic: "C", type: "maj7", degree: 3 }, "harmonic minor")
    expect(result.primary.scaleName).toBe("Ionian #5")
  })

  it("degree 4 in harmonic minor context returns Dorian #4", () => {
    const result = getSoloScales({ tonic: "D", type: "m7", degree: 4 }, "harmonic minor")
    expect(result.primary.scaleName).toBe("Dorian #4")
  })

  it("degree 5 in harmonic minor context returns Phrygian Dominant", () => {
    const result = getSoloScales({ tonic: "E", type: "7", degree: 5 }, "harmonic minor")
    expect(result.primary.scaleName).toBe("Phrygian Dominant")
  })

  it("degree 6 in harmonic minor context returns Lydian #2", () => {
    const result = getSoloScales({ tonic: "F", type: "maj7", degree: 6 }, "harmonic minor")
    expect(result.primary.scaleName).toBe("Lydian #2")
  })

  it("degree 7 in harmonic minor context returns Altered Diminished", () => {
    const result = getSoloScales({ tonic: "G#", type: "dim7", degree: 7 }, "harmonic minor")
    expect(result.primary.scaleName).toBe("Altered Diminished")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/maraspeli/Build/Claude/GuitarPractice && pnpm test __tests__/theory/solo-scales.test.ts
```

Expected: FAIL — new tests fail because getSoloScales only handles 7 diatonic modes.

- [ ] **Step 3: Replace the entire `lib/theory/solo-scales.ts` with the new implementation**

```typescript
import type { SoloScaleEntry, SoloScales } from "@/lib/theory/types"

// ---------------------------------------------------------------------------
// Mode families — ordered by degree (root = index 0)
// ---------------------------------------------------------------------------
const MAJOR_MODES = [
  "ionian", "dorian", "phrygian", "lydian", "mixolydian", "aeolian", "locrian",
] as const

const MELODIC_MINOR_MODES = [
  "melodic minor", "dorian b2", "lydian augmented", "lydian dominant",
  "mixolydian b6", "locrian #2", "altered",
] as const

const HARMONIC_MINOR_MODES = [
  "harmonic minor", "locrian #6", "ionian #5", "dorian #4",
  "phrygian dominant", "lydian #2", "altered diminished",
] as const

// Map each mode value to its [family array, offset] for rotation
type ModeFamily = typeof MAJOR_MODES | typeof MELODIC_MINOR_MODES | typeof HARMONIC_MINOR_MODES
const MODE_FAMILY_OFFSET: Record<string, { family: ModeFamily; offset: number }> = {}

for (const [i, m] of MAJOR_MODES.entries())         MODE_FAMILY_OFFSET[m]  = { family: MAJOR_MODES,         offset: i }
for (const [i, m] of MELODIC_MINOR_MODES.entries()) MODE_FAMILY_OFFSET[m]  = { family: MELODIC_MINOR_MODES, offset: i }
for (const [i, m] of HARMONIC_MINOR_MODES.entries()) MODE_FAMILY_OFFSET[m] = { family: HARMONIC_MINOR_MODES, offset: i }

// Aliases
MODE_FAMILY_OFFSET["major"] = MODE_FAMILY_OFFSET["ionian"]
MODE_FAMILY_OFFSET["minor"] = MODE_FAMILY_OFFSET["aeolian"]

// ---------------------------------------------------------------------------
// Display names — these are shown in SoloScalesPanel and used as scaleName
// ---------------------------------------------------------------------------
const MODE_DISPLAY: Record<string, string> = {
  // Major family
  "ionian":            "Ionian (major)",
  "dorian":            "Dorian",
  "phrygian":          "Phrygian",
  "lydian":            "Lydian",
  "mixolydian":        "Mixolydian",
  "aeolian":           "Aeolian (natural minor)",
  "locrian":           "Locrian",
  // Melodic minor family
  "melodic minor":     "Melodic Minor",
  "dorian b2":         "Dorian b2",
  "lydian augmented":  "Lydian Augmented",
  "lydian dominant":   "Lydian Dominant",
  "mixolydian b6":     "Mixolydian b6",
  "locrian #2":        "Locrian #2",
  "altered":           "Altered",
  // Harmonic minor family
  "harmonic minor":    "Harmonic Minor",
  "locrian #6":        "Locrian #6",
  "ionian #5":         "Ionian #5",
  "dorian #4":         "Dorian #4",
  "phrygian dominant": "Phrygian Dominant",
  "lydian #2":         "Lydian #2",
  "altered diminished":"Altered Diminished",
}

// ---------------------------------------------------------------------------
// Additional scales by chord type — listed in preference order
// ---------------------------------------------------------------------------
const ADDITIONAL_BY_TYPE: Record<string, SoloScaleEntry[]> = {
  maj7: [
    { scaleName: "Major Pentatonic",  hint: "safe choice" },
    { scaleName: "Lydian",            hint: "lifted feel" },
    { scaleName: "Lydian Augmented",  hint: "IV chord colour" },
  ],
  "7": [
    { scaleName: "Major Pentatonic",  hint: "safe choice" },
    { scaleName: "Bebop Dominant",    hint: "passing tone" },
    { scaleName: "Minor Pentatonic",  hint: "bluesy" },
    { scaleName: "Blues Scale",       hint: "adds ♭5 colour" },
    { scaleName: "Altered",           hint: "jazz tension" },
    { scaleName: "Lydian Dominant",   hint: "bright tension" },
  ],
  m7: [
    { scaleName: "Minor Pentatonic" },
    { scaleName: "Dorian",            hint: "brighter" },
    { scaleName: "Phrygian Dominant", hint: "exotic" },
    { scaleName: "Melodic Minor",     hint: "jazz bright" },
  ],
  m7b5: [
    { scaleName: "Locrian #2",        hint: "less dissonant" },
  ],
  dim7: [
    { scaleName: "Locrian #2",            hint: "less dissonant" },
    { scaleName: "Diminished Half-Whole", hint: "symmetrical" },
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
  "Melodic Minor":           "melodic minor",
  "Dorian b2":               "dorian b2",
  "Lydian Augmented":        "lydian augmented",
  "Lydian Dominant":         "lydian dominant",
  "Mixolydian b6":           "mixolydian b6",
  "Locrian #2":              "locrian #2",
  "Altered":                 "altered",
  "Harmonic Minor":          "harmonic minor",
  "Locrian #6":              "locrian #6",
  "Ionian #5":               "ionian augmented",
  "Dorian #4":               "dorian #4",
  "Phrygian Dominant":       "phrygian dominant",
  "Lydian #2":               "lydian #2",
  "Altered Diminished":      "ultralocrian",
  "Major Pentatonic":        "major pentatonic",
  "Minor Pentatonic":        "minor pentatonic",
  "Blues Scale":             "blues",
  "Bebop Dominant":          "bebop",
  "Diminished Half-Whole":   "half-whole diminished",
}

// ---------------------------------------------------------------------------
// UI option groups for the Modal context selector
// ---------------------------------------------------------------------------
export interface SoloModeOption {
  value: string
  label: string
}

export interface SoloModeOptionGroup {
  label: string
  options: SoloModeOption[]
}

export const SOLO_MODE_OPTION_GROUPS: SoloModeOptionGroup[] = [
  {
    label: "Major scale modes",
    options: [
      { value: "ionian",        label: "Ionian (major)" },
      { value: "dorian",        label: "Dorian" },
      { value: "phrygian",      label: "Phrygian" },
      { value: "lydian",        label: "Lydian" },
      { value: "mixolydian",    label: "Mixolydian" },
      { value: "aeolian",       label: "Aeolian (natural minor)" },
      { value: "locrian",       label: "Locrian" },
    ],
  },
  {
    label: "Modes of the Melodic Minor scale",
    options: [
      { value: "melodic minor",    label: "Melodic Minor (mode 1)" },
      { value: "dorian b2",        label: "Dorian b2 (mode 2)" },
      { value: "lydian augmented", label: "Lydian Augmented (mode 3)" },
      { value: "lydian dominant",  label: "Lydian Dominant (mode 4)" },
      { value: "mixolydian b6",    label: "Mixolydian b6 (mode 5)" },
      { value: "locrian #2",       label: "Locrian #2 (mode 6)" },
      { value: "altered",          label: "Altered (mode 7)" },
    ],
  },
  {
    label: "Modes of the Harmonic Minor scale",
    options: [
      { value: "harmonic minor",    label: "Harmonic Minor (mode 1)" },
      { value: "locrian #6",        label: "Locrian #6 (mode 2)" },
      { value: "ionian #5",         label: "Ionian #5 (mode 3)" },
      { value: "dorian #4",         label: "Dorian #4 (mode 4)" },
      { value: "phrygian dominant", label: "Phrygian Dominant (mode 5)" },
      { value: "lydian #2",         label: "Lydian #2 (mode 6)" },
      { value: "altered diminished",label: "Altered Diminished (mode 7)" },
    ],
  },
]

/** Flat list — kept for callers that only need all values (e.g., defaultModeForChordType). */
export const SOLO_MODE_OPTIONS = SOLO_MODE_OPTION_GROUPS.flatMap((g) => g.options)

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
function primaryScaleType(mode: string, degree: number): string {
  const lower = mode.toLowerCase()
  const entry = MODE_FAMILY_OFFSET[lower]
  if (!entry) return MAJOR_MODES[0] // fallback: ionian
  const { family, offset } = entry
  return family[(offset + degree - 1) % 7]
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function getSoloScales(
  chord: { tonic: string; type: string; degree: number },
  mode: string
): SoloScales {
  const primaryType    = primaryScaleType(mode, chord.degree)
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

// ---------------------------------------------------------------------------
// Default modal context for a chord type
// Used by ChordPanel / InversionPanel to seed the Soloing tab's mode selector
// ---------------------------------------------------------------------------
export function defaultModeForChordType(chordType: string): string {
  const t = chordType.toLowerCase()
  if (t.startsWith("mmaj")) return "melodic minor"
  if (t === "m7b5" || t.startsWith("dim")) return "locrian"
  if (t.startsWith("maj") || t === "6" || t === "6/9" || t === "add9") return "ionian"
  if (/^(7|9|11|13)/.test(t) || t === "7 shell" || t.includes("sus")) return "mixolydian"
  return "dorian"
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/maraspeli/Build/Claude/GuitarPractice && pnpm test __tests__/theory/solo-scales.test.ts
```

Expected: All pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/maraspeli/Build/Claude/GuitarPractice
git add lib/theory/solo-scales.ts __tests__/theory/solo-scales.test.ts
git commit -m "feat: expand solo-scales to all 21 modes of major, melodic minor, and harmonic minor"
```

---

## Task 4: Update chord-panel.tsx and inversion-panel.tsx to render optgroups in the Modal context select

**Files:**
- Modify: `app/(app)/reference/_components/chord-panel.tsx`
- Modify: `app/(app)/reference/_components/inversion-panel.tsx`

Both panels render a `<select>` for the "Modal context" using `SOLO_MODE_OPTIONS`. We need to switch to `SOLO_MODE_OPTION_GROUPS` so the 21 options render as 3 optgroups.

- [ ] **Step 1: Update the import in chord-panel.tsx**

Change:
```typescript
import { defaultModeForChordType, getSoloScales, SOLO_MODE_OPTIONS } from "@/lib/theory/solo-scales"
```
To:
```typescript
import { defaultModeForChordType, getSoloScales, SOLO_MODE_OPTION_GROUPS } from "@/lib/theory/solo-scales"
```

- [ ] **Step 2: Update the Modal context `<select>` in chord-panel.tsx**

Find the select that currently renders:
```tsx
{SOLO_MODE_OPTIONS.map((opt) => (
  <option key={opt.value} value={opt.value}>{opt.label}</option>
))}
```

Replace with:
```tsx
{SOLO_MODE_OPTION_GROUPS.map((group) => (
  <optgroup key={group.label} label={group.label}>
    {group.options.map((opt) => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </optgroup>
))}
```

- [ ] **Step 3: Update the import in inversion-panel.tsx**

Same change as Step 1 but in `inversion-panel.tsx`:
```typescript
import { defaultModeForChordType, getSoloScales, SOLO_MODE_OPTION_GROUPS } from "@/lib/theory/solo-scales"
```

- [ ] **Step 4: Update the Modal context `<select>` in inversion-panel.tsx**

Same replacement as Step 2 in `inversion-panel.tsx`.

- [ ] **Step 5: Run full test suite**

```bash
cd /Users/maraspeli/Build/Claude/GuitarPractice && pnpm test
```

Expected: All pass. (The inversion-panel test mocks `SOLO_MODE_OPTIONS` — check if it needs updating.)

If `__tests__/reference/inversion-panel.test.tsx` mock needs updating: the mock currently has:
```typescript
vi.mock("@/lib/theory/solo-scales", () => ({
  defaultModeForChordType: () => "ionian",
  getSoloScales: (_chord: unknown, _mode: string) => ({ ... }),
  SOLO_MODE_OPTIONS: [
    { value: "ionian", label: "Ionian" },
    { value: "dorian", label: "Dorian" },
  ],
}))
```

Update it to also export `SOLO_MODE_OPTION_GROUPS`:
```typescript
vi.mock("@/lib/theory/solo-scales", () => ({
  defaultModeForChordType: () => "ionian",
  getSoloScales: (_chord: unknown, _mode: string) => ({
    chordTonic: "C",
    primary: { scaleName: "Ionian (major)" },
    additional: [],
  }),
  SOLO_MODE_OPTIONS: [
    { value: "ionian", label: "Ionian" },
    { value: "dorian", label: "Dorian" },
  ],
  SOLO_MODE_OPTION_GROUPS: [
    {
      label: "Major scale modes",
      options: [
        { value: "ionian", label: "Ionian (major)" },
        { value: "dorian", label: "Dorian" },
      ],
    },
  ],
}))
```

- [ ] **Step 6: Commit**

```bash
cd /Users/maraspeli/Build/Claude/GuitarPractice
git add "app/(app)/reference/_components/chord-panel.tsx" \
        "app/(app)/reference/_components/inversion-panel.tsx" \
        "__tests__/reference/inversion-panel.test.tsx"
git commit -m "feat: render Modal context select as 3 optgroups for major, melodic minor, and harmonic minor modes"
```

---

## Task 5: Update page.tsx SOLO_SCALE_TO_PANEL_TYPE with new mode names

**Files:**
- Modify: `app/(app)/reference/page.tsx`

This map lets clicking a scale in the Soloing panel navigate to that scale in the Scales tab. New mode display names from `getSoloScales` need entries here.

- [ ] **Step 1: Add new entries to SOLO_SCALE_TO_PANEL_TYPE in page.tsx**

Locate the `SOLO_SCALE_TO_PANEL_TYPE` constant and add after the existing "Melodic Minor" entry:

```typescript
// New melodic minor modes
"Dorian b2":             "Dorian b2",
"Mixolydian b6":         "Mixolydian b6",
// New harmonic minor modes
"Harmonic Minor":        "Harmonic Minor",
"Locrian #6":            "Locrian #6",
"Ionian #5":             "Ionian #5",
"Dorian #4":             "Dorian #4",
"Phrygian Dominant":     "Phrygian Dominant",
"Lydian #2":             "Lydian #2",
"Altered Diminished":    "Altered Diminished",
```

Note: several entries already exist in the map ("Locrian #2", "Altered", "Lydian Augmented", "Lydian Dominant", "Phrygian Dominant", "Melodic Minor"). Only add entries that are genuinely new.

The display names from `MODE_DISPLAY` in solo-scales.ts that are used as `scaleName` in `getSoloScales` must each appear as a key here. Cross-check the full MODE_DISPLAY map to make sure nothing is missed.

- [ ] **Step 2: Run full test suite**

```bash
cd /Users/maraspeli/Build/Claude/GuitarPractice && pnpm test
```

Expected: All pass.

- [ ] **Step 3: Commit**

```bash
cd /Users/maraspeli/Build/Claude/GuitarPractice
git add "app/(app)/reference/page.tsx"
git commit -m "feat: add new melodic/harmonic minor mode entries to SOLO_SCALE_TO_PANEL_TYPE"
```

---

## Task 6: TypeScript check

- [ ] **Step 1: Run TypeScript compiler**

```bash
cd /Users/maraspeli/Build/Claude/GuitarPractice && pnpm tsc --noEmit
```

Expected: No output (no errors). Common issues to watch for:
- `SOLO_MODE_OPTIONS` is still imported somewhere but no longer exported as a named export (it still is — it's derived from `SOLO_MODE_OPTION_GROUPS`, so it's fine)
- The `SoloModeOptionGroup` type is not imported where needed (chord-panel and inversion-panel don't need to import it — they just render the groups)

- [ ] **Step 2: Fix any TypeScript errors, then run full test suite**

```bash
cd /Users/maraspeli/Build/Claude/GuitarPractice && pnpm test
```

Expected: All tests pass.

- [ ] **Step 3: Commit if any fixes were made**

```bash
cd /Users/maraspeli/Build/Claude/GuitarPractice
git add -A
git commit -m "fix: resolve TypeScript errors after modal mode expansion"
```

---

## Verification checklist

After all tasks complete:

- [ ] `pnpm test` → all pass
- [ ] `pnpm tsc --noEmit` → no output
- [ ] Scale type select shows 5 optgroups: Major modes (7) / Melodic Minor modes (7) / Harmonic Minor modes (7) / Pentatonics (3) / Other (5)
- [ ] Each new scale type (e.g. "Dorian b2") renders a fretboard with notes
- [ ] Modal context select in Chord panel shows 3 optgroups (21 modes total)
- [ ] Selecting "melodic minor" context → degree 5 → primary scale is "Mixolydian b6" (not "Mixolydian")
- [ ] Clicking a scale in Soloing panel navigates to correct scale in Scales tab
