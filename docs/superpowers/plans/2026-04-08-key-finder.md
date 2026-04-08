# Key Finder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive key finder tool where the user builds a chord progression by clicking tiles and sees all matching keys ranked by fit quality in real time.

**Architecture:** Pure detection logic in `lib/theory/key-finder.ts` (no UI deps). Commonality tiers extracted to a shared module imported by both key-finder and scale-finder. Three UI components wired by `KeyFinderClient`: a DnD chord input row with editable tiles, and a scored results list that colour-codes the progression with degree colours when a key is selected.

**Tech Stack:** Next.js 16 (app router), React, `@dnd-kit/core` + `@dnd-kit/sortable`, TonalJS (`tonal`), Tailwind CSS, Vitest

---

## Context for implementers

### Key existing files to read before starting

- `lib/theory/scale-finder.ts` — contains `COMMONALITY_TIER` map that must be extracted (Task 1)
- `lib/theory/keys.ts` — exports `getKey(tonic, mode): Key`; returns `Key.diatonicChords: DiatonicChord[]`
- `lib/theory/types.ts` — defines `DiatonicChord { degree, roman, tonic, type, quality }`
- `lib/theory/chords.ts:63` — exports `listChordDbSuffixes(): string[]` (known chord suffixes)
- `app/(app)/reference/_components/chord-quality-block.tsx` — reusable `ChordQualityBlock` component; takes `roman`, `chordName`, `degree` (1–7), `isSelected`, `onClick`
- `app/(app)/library/manage/_components/user-lesson-list.tsx` — DnD pattern to follow (PointerSensor + KeyboardSensor)
- `app/(app)/library/manage/_components/user-lesson-card.tsx` — `useSortable` + CSS.Transform pattern
- `app/(app)/tools/scale-finder/page.tsx` — page.tsx pattern to follow
- `lib/theory/scale-finder.test.ts` — example of a well-written vitest test file

### Notes on `getKey(tonic, mode)`

Accepts lowercase mode names. Supported modes:
- `"major"`, `"minor"` (natural minor / aeolian)
- `"dorian"`, `"phrygian"`, `"lydian"`, `"mixolydian"`, `"locrian"`
- `"melodic minor"`, `"dorian b2"`, `"lydian augmented"`, `"lydian dominant"`, `"mixolydian b6"`, `"locrian #2"`, `"altered"`
- `"harmonic minor"`, `"locrian #6"`, `"ionian #5"`, `"dorian #4"`, `"phrygian dominant"`, `"lydian #2"`, `"altered diminished"`

### Notes on chord quality normalisation

Both input chords AND diatonic chords are normalised to a **quality** before matching. This lets "G" (major triad) match "G7" (V in C major) — both normalise to `"major"`. Quality families: `"major"`, `"minor"`, `"half-dim"`, `"dim"`, `"aug"`, `"mmaj7"`, `"sus"`.

### Score fields in KeyMatch

`fitScore` = average chord score (0–1, no bonuses) — used for display percentage.
`score` = fitScore + tonic/cadence bonuses — used for ranking only.

### Running tests

```bash
npx vitest run lib/theory/key-finder.test.ts
```
Run all tests:
```bash
npx vitest run
```

---

## File Map

| Action | Path |
|--------|------|
| Create | `lib/theory/commonality-tiers.ts` |
| Modify | `lib/theory/scale-finder.ts` (import from commonality-tiers) |
| Create | `lib/theory/key-finder.ts` |
| Create | `lib/theory/key-finder.test.ts` |
| Create | `app/(app)/tools/key-finder/_components/chord-tile.tsx` |
| Create | `app/(app)/tools/key-finder/_components/chord-input-row.tsx` |
| Create | `app/(app)/tools/key-finder/_components/key-finder-client.tsx` |
| Modify | `app/(app)/tools/key-finder/page.tsx` (replace "Coming soon" stub) |

---

## Task 1: Shared Commonality Tiers Module

**Files:**
- Create: `lib/theory/commonality-tiers.ts`
- Modify: `lib/theory/scale-finder.ts`

- [ ] **Step 1: Create `lib/theory/commonality-tiers.ts`**

```ts
// lib/theory/commonality-tiers.ts

// ---------------------------------------------------------------------------
// Keyed by display name — used by scale-finder.ts (matches DISPLAY_TO_TONAL keys)
// ---------------------------------------------------------------------------
export const COMMONALITY_TIER: Record<string, number> = {
  // Tier 1 — ubiquitous
  "Major": 1, "Aeolian": 1, "Pentatonic Major": 1, "Pentatonic Minor": 1, "Blues": 1,
  // Tier 2 — very common in rock/jazz
  "Dorian": 2, "Mixolydian": 2,
  // Tier 3 — common in jazz/classical
  "Phrygian": 3, "Lydian": 3, "Locrian": 3, "Melodic Minor": 3, "Harmonic Minor": 3,
  // Tier 4 — jazz/fusion (Melodic Minor modes)
  "Dorian b2": 4, "Lydian Augmented": 4, "Lydian Dominant": 4,
  "Mixolydian b6": 4, "Locrian #2": 4, "Altered": 4,
  // Everything else is tier 5 (default)
}

// ---------------------------------------------------------------------------
// All (displayName, modeName, tier) entries for key-finder.ts to iterate.
// modeName is passed to getKey(); displayName is shown in the UI.
// ---------------------------------------------------------------------------
export const ALL_KEY_MODES: Array<{ displayName: string; modeName: string; tier: number }> = [
  { displayName: "Major",              modeName: "major",              tier: 1 },
  { displayName: "Aeolian",           modeName: "minor",              tier: 1 },
  { displayName: "Dorian",            modeName: "dorian",             tier: 2 },
  { displayName: "Mixolydian",        modeName: "mixolydian",         tier: 2 },
  { displayName: "Phrygian",          modeName: "phrygian",           tier: 3 },
  { displayName: "Lydian",            modeName: "lydian",             tier: 3 },
  { displayName: "Locrian",           modeName: "locrian",            tier: 3 },
  { displayName: "Melodic Minor",     modeName: "melodic minor",      tier: 3 },
  { displayName: "Harmonic Minor",    modeName: "harmonic minor",     tier: 3 },
  { displayName: "Dorian b2",         modeName: "dorian b2",          tier: 4 },
  { displayName: "Lydian Augmented",  modeName: "lydian augmented",   tier: 4 },
  { displayName: "Lydian Dominant",   modeName: "lydian dominant",    tier: 4 },
  { displayName: "Mixolydian b6",     modeName: "mixolydian b6",      tier: 4 },
  { displayName: "Locrian #2",        modeName: "locrian #2",         tier: 4 },
  { displayName: "Altered",           modeName: "altered",            tier: 4 },
  { displayName: "Locrian #6",        modeName: "locrian #6",         tier: 5 },
  { displayName: "Ionian #5",         modeName: "ionian #5",          tier: 5 },
  { displayName: "Dorian #4",         modeName: "dorian #4",          tier: 5 },
  { displayName: "Phrygian Dominant", modeName: "phrygian dominant",  tier: 5 },
  { displayName: "Lydian #2",         modeName: "lydian #2",          tier: 5 },
  { displayName: "Altered Diminished",modeName: "altered diminished", tier: 5 },
]
```

- [ ] **Step 2: Update `lib/theory/scale-finder.ts` to import `COMMONALITY_TIER` from the new module**

Open `lib/theory/scale-finder.ts`. Find the existing `COMMONALITY_TIER` const (around line 53). Replace it with an import:

```ts
// Add at top of file (with other imports):
import { COMMONALITY_TIER } from "./commonality-tiers"
```

Then delete the `const COMMONALITY_TIER: Record<string, number> = { ... }` block (lines ~53–64). The rest of the file is unchanged.

- [ ] **Step 3: Verify scale-finder tests still pass**

```bash
npx vitest run lib/theory/scale-finder.test.ts
```

Expected: all tests pass (same as before).

- [ ] **Step 4: Commit**

```bash
git add lib/theory/commonality-tiers.ts lib/theory/scale-finder.ts
git commit -m "refactor: extract COMMONALITY_TIER to shared module"
```

---

## Task 2: Key Finder — parseChord and normalizeQuality

**Files:**
- Create: `lib/theory/key-finder.ts` (partial — types + helpers only)
- Create: `lib/theory/key-finder.test.ts` (partial — helpers tests only)

- [ ] **Step 1: Write the failing tests for `parseChord` and `normalizeQuality`**

```ts
// lib/theory/key-finder.test.ts
import { describe, it, expect } from "vitest"
import { parseChord, normalizeQuality } from "./key-finder"

describe("parseChord", () => {
  it("parses a minor 7th chord", () => {
    expect(parseChord("Cm7")).toEqual({ root: "C", type: "m7", symbol: "Cm7" })
  })

  it("parses a major triad (empty suffix)", () => {
    const result = parseChord("G")
    expect(result).not.toBeNull()
    expect(result!.root).toBe("G")
    expect(result!.symbol).toBe("G")
  })

  it("parses a flat root", () => {
    const result = parseChord("BbMaj7")
    expect(result).not.toBeNull()
    expect(result!.root).toBe("Bb")
  })

  it("returns null for an unrecognised symbol", () => {
    expect(parseChord("xyz")).toBeNull()
    expect(parseChord("")).toBeNull()
  })
})

describe("normalizeQuality", () => {
  it("maps empty string to 'major'", () => {
    expect(normalizeQuality("")).toBe("major")
  })
  it("maps '9' to 'major'", () => {
    expect(normalizeQuality("9")).toBe("major")
  })
  it("maps 'maj9' to 'major'", () => {
    expect(normalizeQuality("maj9")).toBe("major")
  })
  it("maps 'm7' to 'minor'", () => {
    expect(normalizeQuality("m7")).toBe("minor")
  })
  it("maps 'm7b5' to 'half-dim'", () => {
    expect(normalizeQuality("m7b5")).toBe("half-dim")
  })
  it("maps '6/9' to 'major'", () => {
    expect(normalizeQuality("6/9")).toBe("major")
  })
  it("maps 'dim7' to 'dim'", () => {
    expect(normalizeQuality("dim7")).toBe("dim")
  })
  it("maps 'aug' to 'aug'", () => {
    expect(normalizeQuality("aug")).toBe("aug")
  })
  it("maps 'sus4' to 'sus'", () => {
    expect(normalizeQuality("sus4")).toBe("sus")
  })
  it("falls back to 'major' for unknown types", () => {
    expect(normalizeQuality("unknowntype")).toBe("major")
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run lib/theory/key-finder.test.ts
```

Expected: FAIL — module not found or functions not exported.

- [ ] **Step 3: Implement `parseChord` and `normalizeQuality` in `lib/theory/key-finder.ts`**

```ts
// lib/theory/key-finder.ts
import { Chord, Note } from "tonal"
import { getKey } from "./keys"
import { ALL_KEY_MODES } from "./commonality-tiers"
import type { DiatonicChord } from "./types"

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------
export type InputChord = {
  root: string    // e.g. "C", "Bb"
  type: string    // TonalJS suffix e.g. "m7", "maj9", ""
  symbol: string  // original user input e.g. "Cm7"
}

export type ChordRole = "diatonic" | "borrowed" | "secondary-dominant" | "non-diatonic"

export type ChordAnalysis = {
  inputChord: InputChord
  degree: number | null   // 1–7 when diatonic or borrowed; null otherwise
  roman: string | null    // e.g. "ii", "V"; null for non-diatonic
  score: number           // 0 | 0.5 | 0.6 | 1.0
  role: ChordRole
}

export type KeyMatch = {
  tonic: string           // e.g. "Bb"
  mode: string            // e.g. "major" (the modeName passed to getKey())
  displayName: string     // e.g. "Bb Major"
  score: number           // fitScore + bonuses — used for sorting only
  fitScore: number        // average chord score with no bonuses — used for display %
  diatonicCount: number   // number of fully diatonic input chords
  chordAnalysis: ChordAnalysis[]
  commonalityTier: number
}

// ---------------------------------------------------------------------------
// Chord type → quality family normalisation
// ---------------------------------------------------------------------------
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
  // Suspended — treated separately (matched on root presence in scale)
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
}

export function normalizeQuality(type: string): string {
  return TYPE_TO_QUALITY[type] ?? "major"
}

// ---------------------------------------------------------------------------
// Parse a chord symbol into InputChord using TonalJS
// ---------------------------------------------------------------------------
export function parseChord(symbol: string): InputChord | null {
  if (!symbol.trim()) return null
  const chord = Chord.get(symbol)
  if (chord.empty || !chord.tonic) return null
  return { root: chord.tonic, type: chord.type, symbol }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run lib/theory/key-finder.test.ts
```

Expected: all `parseChord` and `normalizeQuality` tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/theory/key-finder.ts lib/theory/key-finder.test.ts
git commit -m "feat: add parseChord and normalizeQuality to key-finder"
```

---

## Task 3: Key Finder — detectKey

**Files:**
- Modify: `lib/theory/key-finder.ts` (add detectKey)
- Modify: `lib/theory/key-finder.test.ts` (add detectKey tests)

- [ ] **Step 1: Write the failing `detectKey` tests**

First, update the import at the top of `lib/theory/key-finder.test.ts` to also import `detectKey`:

```ts
import { parseChord, normalizeQuality, detectKey } from "./key-finder"
```

Then append the following `describe` block to the same file:

describe("detectKey", () => {
  it("returns [] for 0 chords", () => {
    expect(detectKey([])).toEqual([])
  })

  it("returns [] for 1 chord", () => {
    expect(detectKey([parseChord("C")!])).toEqual([])
  })

  it("identifies C major for four diatonic 7th chords", () => {
    const chords = ["Cmaj7", "Dm7", "G7", "Am7"].map(s => parseChord(s)!)
    const results = detectKey(chords)
    const cMajor = results.find(r => r.tonic === "C" && r.mode === "major")
    expect(cMajor).toBeDefined()
    expect(cMajor!.fitScore).toBe(1)
    expect(cMajor!.diatonicCount).toBe(4)
    expect(cMajor!.chordAnalysis.every(a => a.role === "diatonic")).toBe(true)
  })

  it("triads match their 7th-chord diatonic counterparts", () => {
    // G (major triad) should match G7 (V of C major)
    const chords = ["C", "F", "G", "Am"].map(s => parseChord(s)!)
    const results = detectKey(chords)
    const cMajor = results.find(r => r.tonic === "C" && r.mode === "major")
    expect(cMajor).toBeDefined()
    expect(cMajor!.fitScore).toBe(1)
    expect(cMajor!.diatonicCount).toBe(4)
  })

  it("Bb is borrowed from parallel minor in C major", () => {
    const chords = ["C", "F", "G", "Bb"].map(s => parseChord(s)!)
    const results = detectKey(chords)
    const cMajor = results.find(r => r.tonic === "C" && r.mode === "major")
    expect(cMajor).toBeDefined()
    expect(cMajor!.fitScore).toBeGreaterThan(0)
    expect(cMajor!.fitScore).toBeLessThan(1)
    const bbAnalysis = cMajor!.chordAnalysis.find(a => a.inputChord.symbol === "Bb")
    expect(bbAnalysis!.role).toBe("borrowed")
    expect(bbAnalysis!.score).toBe(0.6)
  })

  it("identifies secondary dominants", () => {
    // D7 in C major = V/V (secondary dominant of G)
    const chords = ["C", "D7", "G", "C"].map(s => parseChord(s)!)
    const results = detectKey(chords)
    const cMajor = results.find(r => r.tonic === "C" && r.mode === "major")
    expect(cMajor).toBeDefined()
    const d7Analysis = cMajor!.chordAnalysis.find(a => a.inputChord.symbol === "D7")
    expect(d7Analysis!.role).toBe("secondary-dominant")
    expect(d7Analysis!.score).toBe(0.5)
  })

  it("results are sorted: higher fitScore first, lower tier first on tie", () => {
    // All-diatonic C major progression; C major (tier 1) should beat D Dorian (tier 2)
    // both have the same notes but C major tier=1 ranks above D Dorian tier=2 at equal fitScore
    const chords = ["C", "F", "G", "Am"].map(s => parseChord(s)!)
    const results = detectKey(chords)
    for (let i = 1; i < results.length; i++) {
      if (Math.abs(results[i].score - results[i - 1].score) < 0.001) {
        expect(results[i].commonalityTier).toBeGreaterThanOrEqual(results[i - 1].commonalityTier)
      } else {
        expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score)
      }
    }
  })

  it("tonic resolution bonus increases score vs identical progression without tonic resolution", () => {
    // C F G C — last chord is C (tonic resolution bonus)
    const withTonic = ["C", "F", "G", "C"].map(s => parseChord(s)!)
    // C F G Am — no tonic resolution
    const withoutTonic = ["C", "F", "G", "Am"].map(s => parseChord(s)!)
    const scoreWith = detectKey(withTonic).find(r => r.tonic === "C" && r.mode === "major")!.score
    const scoreWithout = detectKey(withoutTonic).find(r => r.tonic === "C" && r.mode === "major")!.score
    expect(scoreWith).toBeGreaterThan(scoreWithout)
  })

  it("all results have score >= 0.5", () => {
    const chords = ["C", "F", "G"].map(s => parseChord(s)!)
    const results = detectKey(chords)
    expect(results.every(r => r.score >= 0.5)).toBe(true)
  })

  it("KeyMatch has correct displayName", () => {
    const chords = ["Dm7", "G7", "Cmaj7"].map(s => parseChord(s)!)
    const results = detectKey(chords)
    const cMajor = results.find(r => r.tonic === "C" && r.mode === "major")
    expect(cMajor!.displayName).toBe("C Major")
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run lib/theory/key-finder.test.ts
```

Expected: FAIL — `detectKey` not exported.

- [ ] **Step 3: Implement `detectKey` — add to `lib/theory/key-finder.ts`**

Append after the existing code in `lib/theory/key-finder.ts`:

```ts
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const ALL_ROOTS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] as const

type DiatonicEntry = { chord: DiatonicChord; quality: string }
type DiatonicLookup = Map<number, DiatonicEntry[]>  // rootChroma → entries

function buildDiatonicLookup(diatonicChords: DiatonicChord[]): DiatonicLookup {
  const map: DiatonicLookup = new Map()
  for (const chord of diatonicChords) {
    const chroma = Note.chroma(chord.tonic)
    if (typeof chroma !== "number" || !Number.isFinite(chroma)) continue
    const quality = normalizeQuality(chord.type)
    const existing = map.get(chroma) ?? []
    existing.push({ chord, quality })
    map.set(chroma, existing)
  }
  return map
}

function analyzeChord(
  inputChord: InputChord,
  diatonicLookup: DiatonicLookup,
  parallelMajorLookup: DiatonicLookup,
  parallelMinorLookup: DiatonicLookup,
): ChordAnalysis {
  const rootChroma = Note.chroma(inputChord.root)
  if (typeof rootChroma !== "number" || !Number.isFinite(rootChroma)) {
    return { inputChord, degree: null, roman: null, score: 0, role: "non-diatonic" }
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
        return { inputChord, degree: null, roman: null, score: 0.5, role: "secondary-dominant" }
      }
    }
  }

  return { inputChord, degree: null, roman: null, score: 0, role: "non-diatonic" }
}

// ---------------------------------------------------------------------------
// detectKey — main export
// ---------------------------------------------------------------------------
export function detectKey(chords: InputChord[]): KeyMatch[] {
  if (chords.length < 2) return []

  const results: KeyMatch[] = []

  for (const root of ALL_ROOTS) {
    for (const { displayName, modeName, tier } of ALL_KEY_MODES) {
      let keyData
      try {
        keyData = getKey(root, modeName)
      } catch {
        continue
      }

      const diatonicLookup = buildDiatonicLookup(keyData.diatonicChords)

      // Build parallel lookups (same tonic, major + minor) for borrow detection
      let parallelMajorData
      let parallelMinorData
      try { parallelMajorData = getKey(root, "major") } catch { /* skip */ }
      try { parallelMinorData = getKey(root, "minor") } catch { /* skip */ }
      const parallelMajorLookup = parallelMajorData
        ? buildDiatonicLookup(parallelMajorData.diatonicChords)
        : new Map()
      const parallelMinorLookup = parallelMinorData
        ? buildDiatonicLookup(parallelMinorData.diatonicChords)
        : new Map()

      // Score each chord
      const analyses = chords.map(c =>
        analyzeChord(c, diatonicLookup, parallelMajorLookup, parallelMinorLookup)
      )

      const fitScore = analyses.reduce((sum, a) => sum + a.score, 0) / chords.length
      const diatonicCount = analyses.filter(a => a.role === "diatonic").length

      // Bonuses
      const tonicChroma = Note.chroma(root)
      let bonus = 0
      if (typeof tonicChroma === "number") {
        const firstChroma = Note.chroma(chords[0].root)
        const lastChroma = Note.chroma(chords[chords.length - 1].root)
        if (firstChroma === tonicChroma || lastChroma === tonicChroma) bonus += 0.10

        // V→I cadence at end?
        if (chords.length >= 2) {
          const secondLastChroma = Note.chroma(chords[chords.length - 2].root)
          if (
            typeof secondLastChroma === "number" &&
            typeof lastChroma === "number" &&
            lastChroma === tonicChroma &&
            (secondLastChroma + 7) % 12 === tonicChroma
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
            (secondLastChroma + 7) % 12 === tonicChroma &&
            (thirdLastChroma + 5) % 12 === tonicChroma
          ) {
            bonus += 0.05
          }
        }
      }

      const totalScore = fitScore + bonus

      if (totalScore < 0.5) continue

      results.push({
        tonic: root,
        mode: modeName,
        displayName: `${root} ${displayName}`,
        score: totalScore,
        fitScore,
        diatonicCount,
        chordAnalysis: analyses,
        commonalityTier: tier,
      })
    }
  }

  results.sort((a, b) => {
    if (Math.abs(a.score - b.score) > 0.001) return b.score - a.score
    if (a.commonalityTier !== b.commonalityTier) return a.commonalityTier - b.commonalityTier
    return a.displayName.localeCompare(b.displayName)
  })

  return results
}
```

- [ ] **Step 4: Run all key-finder tests**

```bash
npx vitest run lib/theory/key-finder.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass (no regressions in scale-finder or other modules).

- [ ] **Step 6: Commit**

```bash
git add lib/theory/key-finder.ts lib/theory/key-finder.test.ts
git commit -m "feat: implement detectKey with scoring and borrow/secondary-dominant analysis"
```

---

## Task 4: ChordTile Component

**Files:**
- Create: `app/(app)/tools/key-finder/_components/chord-tile.tsx`

This is a client component. No automated tests — verify manually by running the dev server.

- [ ] **Step 1: Create the `_components` directory and `chord-tile.tsx`**

```bash
mkdir -p "app/(app)/tools/key-finder/_components"
```

```tsx
// app/(app)/tools/key-finder/_components/chord-tile.tsx
"use client"

import { useRef, useEffect, useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ChordQualityBlock } from "@/app/(app)/reference/_components/chord-quality-block"
import { listChordDbSuffixes } from "@/lib/theory/chords"
import type { ChordAnalysis } from "@/lib/theory/key-finder"

const ROOT_NOTES = ["Ab", "A", "Bb", "B", "C", "Db", "D", "Eb", "E", "F", "Gb", "G"] as const

interface ChordTileProps {
  id: string
  symbol: string
  analysis: ChordAnalysis | null  // null = no key selected
  isEditing: boolean
  onCommit: (symbol: string) => void
  onRemove: () => void
  onStartEdit: () => void
}

export function ChordTile({ id, symbol, analysis, isEditing, onCommit, onRemove, onStartEdit }: ChordTileProps) {
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
  const allSuffixes = listChordDbSuffixes()

  useEffect(() => {
    if (isEditing) {
      setInputValue(symbol)
      setSuggestions([])
      setActiveIdx(-1)
      // Focus after paint
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [isEditing, symbol])

  function detectSuggestions(value: string) {
    if (!value) { setSuggestions([]); return }
    const root = ROOT_NOTES.find(r => value.startsWith(r))
    if (!root) { setSuggestions([]); return }
    const suffix = value.slice(root.length)
    setSuggestions(
      allSuffixes.filter(s => s.startsWith(suffix)).slice(0, 10).map(s => `${root}${s}`)
    )
  }

  function commit(value: string) {
    setSuggestions([])
    setActiveIdx(-1)
    onCommit(value.trim())
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
      onCommit(symbol) // revert — caller keeps original symbol
    }
  }

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style} className="relative flex-shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => { setInputValue(e.target.value); detectSuggestions(e.target.value); setActiveIdx(-1) }}
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
                  i === activeIdx ? "bg-accent text-accent-foreground" : "hover:bg-muted text-foreground"
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

  return (
    <div ref={setNodeRef} style={style} className="relative flex-shrink-0 flex items-center gap-0.5">
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="drag to reorder"
        className="p-0.5 cursor-grab text-muted-foreground hover:text-foreground touch-none select-none"
      >
        ⠿
      </button>

      {/* Tile body */}
      {analysis && isDiatonic ? (
        <ChordQualityBlock
          roman={analysis.roman ?? ""}
          chordName={symbol}
          degree={analysis.degree ?? 1}
          isSelected={false}
          onClick={onStartEdit}
        />
      ) : analysis ? (
        // Non-diatonic or secondary-dominant: greyed out
        <button
          type="button"
          onClick={onStartEdit}
          className="flex flex-col items-center rounded-lg border-2 border-border px-3 py-2.5 text-center min-w-[68px] bg-card opacity-40 hover:opacity-60 transition-opacity"
        >
          <span className="text-[10px] text-muted-foreground mb-1">—</span>
          <span className="text-sm font-semibold text-muted-foreground leading-tight">{symbol}</span>
        </button>
      ) : (
        // No key selected: neutral
        <button
          type="button"
          onClick={onStartEdit}
          className="flex flex-col items-center rounded-lg border-2 border-border px-3 py-2.5 text-center min-w-[68px] bg-card hover:bg-muted transition-colors"
        >
          <span className="text-[10px] text-muted-foreground mb-1">&nbsp;</span>
          <span className="text-sm font-semibold text-foreground leading-tight">{symbol}</span>
        </button>
      )}

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`remove ${symbol}`}
        className="p-0.5 text-muted-foreground hover:text-destructive text-xs leading-none"
      >
        ✕
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(app)/tools/key-finder/_components/chord-tile.tsx"
git commit -m "feat: add ChordTile component"
```

---

## Task 5: ChordInputRow Component

**Files:**
- Create: `app/(app)/tools/key-finder/_components/chord-input-row.tsx`

- [ ] **Step 1: Create `chord-input-row.tsx`**

```tsx
// app/(app)/tools/key-finder/_components/chord-input-row.tsx
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
  const sensors = useSensors(
    useSensor(PointerSensor),
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
          {chords.map(chord => (
            <ChordTile
              key={chord.id}
              id={chord.id}
              symbol={chord.symbol}
              analysis={getAnalysis(chord.id)}
              isEditing={editingId === chord.id}
              onCommit={symbol => onCommit(chord.id, symbol)}
              onRemove={() => onRemove(chord.id)}
              onStartEdit={() => onStartEdit(chord.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Add button — outside SortableContext so it cannot be dragged */}
      <button
        type="button"
        onClick={onAdd}
        className="flex items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-accent hover:text-foreground transition-colors px-3 py-2.5 min-w-[44px] text-sm"
        aria-label="add chord"
      >
        +
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(app)/tools/key-finder/_components/chord-input-row.tsx"
git commit -m "feat: add ChordInputRow with DnD sortable tiles"
```

---

## Task 6: KeyFinderClient Component

**Files:**
- Create: `app/(app)/tools/key-finder/_components/key-finder-client.tsx`

This is the main orchestrator. It holds all state, wires input ↔ detection ↔ results, and renders the results list with grouping by commonality tier.

- [ ] **Step 1: Create `key-finder-client.tsx`**

```tsx
// app/(app)/tools/key-finder/_components/key-finder-client.tsx
"use client"

import { useCallback, useMemo, useState } from "react"
import { ChordQualityBlock } from "@/app/(app)/reference/_components/chord-quality-block"
import { parseChord, detectKey } from "@/lib/theory/key-finder"
import type { KeyMatch, ChordAnalysis } from "@/lib/theory/key-finder"
import { ChordInputRow } from "./chord-input-row"
import { btn } from "@/lib/button-styles"

interface ChordEntry {
  id: string
  symbol: string
}

// Map tier number → group label
const TIER_GROUP: Record<number, string> = {
  1: "Common keys",
  2: "Modal keys",
  3: "Modal keys",
  4: "Exotic keys",
  5: "Exotic keys",
}

function tierGroup(tier: number): string {
  return TIER_GROUP[tier] ?? "Exotic keys"
}

export function KeyFinderClient() {
  const [chords, setChords] = useState<ChordEntry[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedResult, setSelectedResult] = useState<KeyMatch | null>(null)

  const parsedChords = useMemo(
    () => chords.map(c => parseChord(c.symbol)).filter((c): c is NonNullable<typeof c> => c !== null),
    [chords],
  )

  const results = useMemo(
    () => (parsedChords.length >= 2 ? detectKey(parsedChords) : []),
    [parsedChords],
  )

  // Group results by tier label, preserving order
  const groupedResults = useMemo(() => {
    const groups: Array<{ label: string; items: KeyMatch[] }> = []
    for (const result of results) {
      const label = tierGroup(result.commonalityTier)
      const existing = groups.find(g => g.label === label)
      if (existing) {
        existing.items.push(result)
      } else {
        groups.push({ label, items: [result] })
      }
    }
    return groups
  }, [results])

  const handleAdd = useCallback(() => {
    const id = crypto.randomUUID()
    setChords(prev => [...prev, { id, symbol: "" }])
    setEditingId(id)
    setSelectedResult(null)
  }, [])

  const handleCommit = useCallback((id: string, symbol: string) => {
    setEditingId(null)
    if (!symbol) {
      setChords(prev => prev.filter(c => c.id !== id))
    } else {
      setChords(prev => prev.map(c => c.id === id ? { ...c, symbol } : c))
    }
    setSelectedResult(null)
  }, [])

  const handleRemove = useCallback((id: string) => {
    setChords(prev => prev.filter(c => c.id !== id))
    setSelectedResult(null)
  }, [])

  const handleStartEdit = useCallback((id: string) => {
    setEditingId(id)
    setSelectedResult(null)
  }, [])

  const handleResultClick = useCallback((result: KeyMatch) => {
    setSelectedResult(prev => prev?.displayName === result.displayName ? null : result)
  }, [])

  function handleClear() {
    setChords([])
    setEditingId(null)
    setSelectedResult(null)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Chord input row */}
      <ChordInputRow
        chords={chords}
        editingId={editingId}
        selectedResult={selectedResult}
        onChordChange={setChords}
        onCommit={handleCommit}
        onRemove={handleRemove}
        onStartEdit={handleStartEdit}
        onAdd={handleAdd}
      />

      {/* Clear button */}
      {chords.length > 0 && (
        <div>
          <button type="button" onClick={handleClear} className={btn("destructive", "sm")}>
            Clear
          </button>
        </div>
      )}

      {/* Results */}
      <div aria-live="polite">
        {parsedChords.length < 2 ? (
          chords.length > 0 && parsedChords.length < 2 && (
            <p className="text-sm text-muted-foreground">
              Add at least 2 chords to identify possible keys.
            </p>
          )
        ) : results.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No matching keys found — try removing or changing a chord.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {groupedResults.map(group => (
              <div key={group.label}>
                {groupedResults.length > 1 && (
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                    {group.label}
                  </p>
                )}
                <div className="divide-y divide-border">
                  {group.items.map(result => {
                    const isActive = selectedResult?.displayName === result.displayName
                    const pct = Math.round(Math.min(result.fitScore, 1) * 100)
                    return (
                      <button
                        key={result.displayName}
                        type="button"
                        onClick={() => handleResultClick(result)}
                        className={`w-full text-left px-3 py-2.5 transition-colors rounded ${
                          isActive ? "bg-accent/10 border border-accent/20" : "hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-medium text-foreground">
                            {result.displayName}
                          </span>
                          <span className="text-xs text-muted-foreground">{pct}%</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {result.chordAnalysis.map((analysis, i) => (
                            <ResultChordBadge
                              key={i}
                              analysis={analysis}
                              symbol={analysis.inputChord.symbol}
                            />
                          ))}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inline display-only badge for results list
// ---------------------------------------------------------------------------
interface ResultChordBadgeProps {
  analysis: ChordAnalysis
  symbol: string
}

function ResultChordBadge({ analysis, symbol }: ResultChordBadgeProps) {
  const isDiatonic = analysis.role === "diatonic" || analysis.role === "borrowed"

  if (isDiatonic && analysis.degree !== null && analysis.roman !== null) {
    return (
      <ChordQualityBlock
        roman={analysis.roman}
        chordName={symbol}
        degree={analysis.degree}
        isSelected={false}
        onClick={() => {}}
      />
    )
  }

  return (
    <div className="flex flex-col items-center rounded-lg border-2 border-border px-3 py-2.5 text-center min-w-[68px] bg-card opacity-40">
      <span className="text-[10px] text-muted-foreground mb-1">—</span>
      <span className="text-sm font-semibold text-muted-foreground leading-tight">{symbol}</span>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(app)/tools/key-finder/_components/key-finder-client.tsx"
git commit -m "feat: add KeyFinderClient with results grouped by tier"
```

---

## Task 7: Page Route

**Files:**
- Modify: `app/(app)/tools/key-finder/page.tsx`

- [ ] **Step 1: Replace the "Coming soon" stub**

The current `app/(app)/tools/key-finder/page.tsx` shows a "Coming soon" message. Replace it entirely:

```tsx
// app/(app)/tools/key-finder/page.tsx
import Link from "next/link"
import { KeyFinderClient } from "./_components/key-finder-client"

export default function KeyFinderPage() {
  return (
    <div className="pt-6">
      <Link
        href="/tools"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-1"
      >
        ← Tools
      </Link>
      <h1 className="text-2xl font-semibold text-foreground mb-6">Key Finder</h1>
      <KeyFinderClient />
    </div>
  )
}
```

- [ ] **Step 2: Run the full test suite one final time**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/tools/key-finder/page.tsx"
git commit -m "feat: implement key finder page route"
```

---

## Manual Smoke Test Checklist

After all tasks are complete, start the dev server (`npm run dev`) and navigate to `/tools/key-finder`:

- [ ] Page renders with no JS errors
- [ ] Clicking `+` adds a tile in edit mode with a text input
- [ ] Typing `Cm` shows autocomplete suggestions; selecting one commits
- [ ] Pressing Escape while editing a new tile removes it; for existing tiles reverts to original symbol
- [ ] With 2+ valid chords, results appear ranked by percentage
- [ ] Clicking a result row highlights it and applies degree colours to the chord tiles
- [ ] Clicking the same result again deselects and reverts tiles to neutral style
- [ ] Dragging a tile reorders the progression and re-runs detection
- [ ] `[✕]` on a tile removes it and clears selected result
- [ ] Clear button resets everything
- [ ] Fewer than 2 chords: "Add at least 2 chords" placeholder visible
- [ ] No matching keys: "No matching keys found" message visible (try very unusual combinations)
