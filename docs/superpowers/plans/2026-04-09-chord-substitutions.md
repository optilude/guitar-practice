# Chord Substitutions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a chord substitutions panel to the Reference view's Progressions tab, allowing users to explore musically valid chord substitutions with a dashed-outline visual preview.

**Architecture:** A pure theory layer (`lib/theory/substitutions.ts`) computes `ChordSubstitution[]` from the selected chord and progression context. `ProgressionsTab` gains a tab bar ("Soloing" | "Substitutions") shown when a chord is selected, preview state that re-renders the chord row with substituted chords highlighted using dashed borders, and a new `SubstitutionsPanel` component that lists and activates previews.

**Tech Stack:** TypeScript, React (Next.js App Router), TonalJS (`Note`, `Key`, `Interval` already in project), Vitest + React Testing Library (existing test setup), Tailwind CSS v4.

---

## File Map

| File | Action |
|------|--------|
| `lib/theory/types.ts` | Add `PreviewChord`, `SubstitutionResult`, `ChordSubstitution` types |
| `lib/theory/substitutions.ts` | Create — `getSubstitutions()` and all 8 rule functions |
| `lib/theory/index.ts` | Add `export * from "@/lib/theory/substitutions"` |
| `app/(app)/reference/_components/chord-quality-block.tsx` | Add `isSubstitutionPreview?: boolean` prop |
| `app/(app)/reference/_components/substitutions-panel.tsx` | Create new component |
| `app/(app)/reference/_components/progressions-tab.tsx` | Add state, tab bar, `applyPreview()`, wire substitutions panel |
| `__tests__/theory/substitutions.test.ts` | Create — unit tests for all 8 rules |
| `__tests__/reference/substitutions-panel.test.tsx` | Create — component render tests |
| `__tests__/reference/progressions-tab.test.tsx` | Add tests for tab bar and preview behaviour |

---

## Context for implementers

### Key existing files to read before starting

- `lib/theory/types.ts` — existing `ProgressionChord`, `DiatonicChord` types
- `lib/theory/harmony.ts` — `getDiatonicChords(tonic, mode): DiatonicChord[]`
- `lib/theory/solo-scales.ts` — model for how a theory module is structured
- `app/(app)/reference/_components/progressions-tab.tsx` — file being modified (311 lines)
- `app/(app)/reference/_components/solo-scales-panel.tsx` — component being moved behind a tab
- `app/(app)/reference/_components/chord-quality-block.tsx` — component receiving new prop
- `app/(app)/reference/_components/chord-panel.tsx` lines 336–369 — tab bar style to match

### TonalJS APIs used

```typescript
import { Note, Key } from "tonal"

Note.transpose("G", "P5")   // → "D"
Note.transpose("C", "A4")   // → "C#" (augmented 4th = tritone)
Note.transpose("C", "m6")   // → "Ab" (minor 6th up)
Note.transpose("C", "M3")   // → "E"  (major 3rd up)
Note.transpose("C", "M2")   // → "D"  (major 2nd up = whole step)
Note.transpose("C", "A1")   // → "C#" (augmented unison = chromatic semitone)
Note.enharmonic("F#")        // → "Gb"
Note.pitchClass("C#4")       // → "C#" (strips octave)
Key.majorKey("F").keySignature  // → "b"   (one flat)
Key.majorKey("G").keySignature  // → "#"   (one sharp)
Key.minorKey("A").keySignature  // → ""    (no accidentals)
```

### Spec note: two formula corrections vs. the design spec

The design spec (`docs/superpowers/specs/2026-04-09-chord-substitutions-design.md`) has two minor errors. Use the formulas in this plan — they are correct:

1. **ii/X root formula**: use `Note.transpose(X.tonic, "M2")` (major 2nd above X root), not "P4 from V7 root" as the spec says.
2. **Coltrane Changes bVI center**: bVI is a minor 6th above I (`Note.transpose(I_root, "m6")`), not a tritone.

---

## Task 1: Add types to `lib/theory/types.ts`

**Files:**
- Modify: `lib/theory/types.ts`

- [ ] **Step 1: Read the current types file**

```bash
cat lib/theory/types.ts
```

Confirm the file ends after the `Key` interface (line ~98). You will append to it.

- [ ] **Step 2: Add the three new types**

Append to the end of `lib/theory/types.ts`:

```typescript
/** A chord in a substitution preview. May not be diatonic to the key. */
export type PreviewChord = {
  tonic: string    // e.g. "E", "Bb"
  type: string     // e.g. "7", "m7", "m7b5", "dim7"
  roman: string    // local-function label e.g. "V7/vi", "ii/V", "bII7"
  quality: string  // "major" | "minor" | "dominant" | "diminished"
  degree?: number  // present for converted original chords; absent for substitution chords
}

export type SubstitutionResult =
  | {
      kind: "replacement"
      /** Replace chord at that index in the progression array. */
      replacements: Array<{ index: number; chord: PreviewChord }>
    }
  | {
      kind: "insertion"
      /** Splice these chords immediately before this index. */
      insertBefore: number
      chords: PreviewChord[]
    }
  | {
      kind: "range_replacement"
      /** Replace the contiguous slice [startIndex, endIndex] (inclusive) with an arbitrary list.
       *  Used for Coltrane Changes (3 chords → 7). */
      startIndex: number
      endIndex: number
      chords: PreviewChord[]
    }

export type ChordSubstitution = {
  id: string         // stable unique key, e.g. "diatonic-deg6", "tritone", "v-approach"
  ruleName: string   // group heading in SubstitutionsPanel, e.g. "Diatonic Substitution"
  label: string      // option row text, e.g. "Em7", "D7 → Gmaj7"
  effect: string     // one-liner description shown as muted text
  result: SubstitutionResult
  sortRank: number   // lower = displayed first
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/theory/types.ts
git commit -m "feat: add PreviewChord, SubstitutionResult, ChordSubstitution types"
```

---

## Task 2: Create the substitution theory layer

**Files:**
- Create: `lib/theory/substitutions.ts`
- Create: `__tests__/theory/substitutions.test.ts`

### Background

`getSubstitutions()` applies 8 rules to the selected chord and returns a sorted `ChordSubstitution[]`. Rules are pure functions; they use TonalJS interval arithmetic on chord roots — not the key-relative Roman numeral system.

`normalizeToKey()` corrects enharmonic spelling after any `Note.transpose()` call: flat keys (keySignature contains "b") get flat spellings for chromatic notes; sharp keys get sharp spellings; neutral keys (C major, A minor) are unchanged.

The **ii/X root** = `Note.transpose(chord.tonic, "M2")` — a whole step above the target chord's root. This is always the root of the ii chord in any local-key context.

The **V7/X root** = `Note.transpose(chord.tonic, "P5")` — a perfect fifth above the target chord's root.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/theory/substitutions.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { getSubstitutions } from "@/lib/theory/substitutions"
import type { ProgressionChord } from "@/lib/theory/types"

function chord(
  tonic: string, type: string, quality: string, degree: number, roman: string,
): ProgressionChord {
  return { tonic, type, quality, degree, roman, nashville: String(degree) }
}

const C_MAJOR: ProgressionChord[] = [
  chord("C", "maj7", "major",    1, "I"),
  chord("A", "m7",   "minor",    6, "vi"),
  chord("F", "maj7", "major",    4, "IV"),
  chord("G", "7",    "dominant", 5, "V"),
]

// ---------------------------------------------------------------------------
// Diatonic Substitution
// ---------------------------------------------------------------------------

describe("Diatonic Substitution", () => {
  it("offers vi (Am7) and iii (Em7) for I in C major", () => {
    const subs = getSubstitutions(C_MAJOR[0]!, C_MAJOR, 0, "C", "major")
    const rule = subs.filter(s => s.ruleName === "Diatonic Substitution")
    expect(rule).toHaveLength(2)
    const tonics = rule.map(s => {
      const r = s.result as { kind: "replacement"; replacements: Array<{ chord: { tonic: string } }> }
      return r.replacements[0]!.chord.tonic
    })
    expect(tonics).toContain("A") // vi
    expect(tonics).toContain("E") // iii
  })

  it("lists vi before iii for I chord (vi is more common sub)", () => {
    const subs = getSubstitutions(C_MAJOR[0]!, C_MAJOR, 0, "C", "major")
    const rule = subs.filter(s => s.ruleName === "Diatonic Substitution")
    const first = rule[0]!.result as { kind: "replacement"; replacements: Array<{ chord: { tonic: string } }> }
    expect(first.replacements[0]!.chord.tonic).toBe("A") // vi before iii
  })

  it("offers ii (Dm7) and vi (Am7) for IV in C major", () => {
    const subs = getSubstitutions(C_MAJOR[2]!, C_MAJOR, 2, "C", "major")
    const rule = subs.filter(s => s.ruleName === "Diatonic Substitution")
    const tonics = rule.map(s => {
      const r = s.result as { kind: "replacement"; replacements: Array<{ chord: { tonic: string } }> }
      return r.replacements[0]!.chord.tonic
    })
    expect(tonics).toContain("D") // ii
    expect(tonics).toContain("A") // vi
  })

  it("result kind is 'replacement'", () => {
    const subs = getSubstitutions(C_MAJOR[0]!, C_MAJOR, 0, "C", "major")
    const rule = subs.filter(s => s.ruleName === "Diatonic Substitution")
    for (const s of rule) expect(s.result.kind).toBe("replacement")
  })
})

// ---------------------------------------------------------------------------
// Tritone Substitution
// ---------------------------------------------------------------------------

describe("Tritone Substitution", () => {
  it("fires only for dominant 7th chords", () => {
    const maj7Subs = getSubstitutions(C_MAJOR[0]!, C_MAJOR, 0, "C", "major")
    expect(maj7Subs.filter(s => s.ruleName === "Tritone Substitution")).toHaveLength(0)
    const domSubs = getSubstitutions(C_MAJOR[3]!, C_MAJOR, 3, "C", "major")
    expect(domSubs.filter(s => s.ruleName === "Tritone Substitution")).toHaveLength(1)
  })

  it("result kind is 'replacement' with type '7'", () => {
    const subs = getSubstitutions(C_MAJOR[3]!, C_MAJOR, 3, "C", "major")
    const sub = subs.find(s => s.ruleName === "Tritone Substitution")!
    expect(sub.result.kind).toBe("replacement")
    const r = sub.result as { kind: "replacement"; replacements: Array<{ chord: { type: string } }> }
    expect(r.replacements[0]!.chord.type).toBe("7")
  })

  it("normalises to Gb7 for C7 in F major (flat key — not F#7)", () => {
    const fMajor: ProgressionChord[] = [
      chord("F", "maj7", "major",    1, "I"),
      chord("C", "7",    "dominant", 5, "V"),
    ]
    const subs = getSubstitutions(fMajor[1]!, fMajor, 1, "F", "major")
    const sub = subs.find(s => s.ruleName === "Tritone Substitution")!
    const r = sub.result as { kind: "replacement"; replacements: Array<{ chord: { tonic: string } }> }
    expect(r.replacements[0]!.chord.tonic).toBe("Gb")
  })

  it("normalises to C#7 for G7 in E major (sharp key — not Db7)", () => {
    const eMajor: ProgressionChord[] = [
      chord("E", "maj7", "major",    1, "I"),
      chord("G", "7",    "dominant", 3, "III7"),
    ]
    const subs = getSubstitutions(eMajor[1]!, eMajor, 1, "E", "major")
    const sub = subs.find(s => s.ruleName === "Tritone Substitution")!
    const r = sub.result as { kind: "replacement"; replacements: Array<{ chord: { tonic: string } }> }
    expect(r.replacements[0]!.chord.tonic).toBe("C#")
  })
})

// ---------------------------------------------------------------------------
// Modal Mixture
// ---------------------------------------------------------------------------

describe("Modal Mixture", () => {
  it("fires for IV chord (degree 4) in major", () => {
    const subs = getSubstitutions(C_MAJOR[2]!, C_MAJOR, 2, "C", "major")
    expect(subs.filter(s => s.ruleName === "Modal Mixture").length).toBeGreaterThan(0)
  })

  it("does not fire for I chord in major", () => {
    const subs = getSubstitutions(C_MAJOR[0]!, C_MAJOR, 0, "C", "major")
    expect(subs.filter(s => s.ruleName === "Modal Mixture")).toHaveLength(0)
  })

  it("offers iv-7 (same root as IV, type m7) in C major", () => {
    const subs = getSubstitutions(C_MAJOR[2]!, C_MAJOR, 2, "C", "major")
    const mixture = subs.filter(s => s.ruleName === "Modal Mixture")
    const ivM7 = mixture.find(s => s.id === "mixture-iv7")!
    const r = ivM7.result as { kind: "replacement"; replacements: Array<{ chord: { tonic: string; type: string } }> }
    expect(r.replacements[0]!.chord.tonic).toBe("F") // same root as Fmaj7
    expect(r.replacements[0]!.chord.type).toBe("m7")
  })

  it("all Modal Mixture results have kind 'replacement'", () => {
    const subs = getSubstitutions(C_MAJOR[2]!, C_MAJOR, 2, "C", "major")
    for (const s of subs.filter(s => s.ruleName === "Modal Mixture")) {
      expect(s.result.kind).toBe("replacement")
    }
  })
})

// ---------------------------------------------------------------------------
// Secondary Dominant (V approach)
// ---------------------------------------------------------------------------

describe("Secondary Dominant", () => {
  it("fires for any chord", () => {
    for (const [i, c] of C_MAJOR.entries()) {
      const subs = getSubstitutions(c, C_MAJOR, i, "C", "major")
      expect(subs.filter(s => s.ruleName === "Secondary Dominant")).toHaveLength(1)
    }
  })

  it("inserts G7 before Cmaj7 (V7/I in C major)", () => {
    const subs = getSubstitutions(C_MAJOR[0]!, C_MAJOR, 0, "C", "major")
    const sub = subs.find(s => s.ruleName === "Secondary Dominant")!
    expect(sub.result.kind).toBe("insertion")
    const ins = sub.result as { kind: "insertion"; insertBefore: number; chords: Array<{ tonic: string; type: string }> }
    expect(ins.insertBefore).toBe(0)
    expect(ins.chords).toHaveLength(1)
    expect(ins.chords[0]!.tonic).toBe("G")
    expect(ins.chords[0]!.type).toBe("7")
  })
})

// ---------------------------------------------------------------------------
// ii-V Approach
// ---------------------------------------------------------------------------

describe("ii-V Approach", () => {
  it("fires for any chord", () => {
    for (const [i, c] of C_MAJOR.entries()) {
      const subs = getSubstitutions(c, C_MAJOR, i, "C", "major")
      expect(subs.filter(s => s.ruleName === "ii-V Approach")).toHaveLength(1)
    }
  })

  it("inserts [Dm7, G7] before Cmaj7", () => {
    const subs = getSubstitutions(C_MAJOR[0]!, C_MAJOR, 0, "C", "major")
    const sub = subs.find(s => s.ruleName === "ii-V Approach")!
    const ins = sub.result as { kind: "insertion"; chords: Array<{ tonic: string; type: string }> }
    expect(ins.chords).toHaveLength(2)
    expect(ins.chords[0]!.tonic).toBe("D")   // ii of C = Dm7
    expect(ins.chords[0]!.type).toBe("m7")   // major target → m7
    expect(ins.chords[1]!.tonic).toBe("G")   // V7 of C = G7
    expect(ins.chords[1]!.type).toBe("7")
  })

  it("uses m7b5 for ii when target chord is minor", () => {
    // Am7 is minor → ii/Am = Bm7b5
    const subs = getSubstitutions(C_MAJOR[1]!, C_MAJOR, 1, "C", "major")
    const sub = subs.find(s => s.ruleName === "ii-V Approach")!
    const ins = sub.result as { kind: "insertion"; chords: Array<{ tonic: string; type: string }> }
    expect(ins.chords[0]!.type).toBe("m7b5")
    expect(ins.chords[0]!.tonic).toBe("B")   // M2 above A = B
  })
})

// ---------------------------------------------------------------------------
// Diminished Passing
// ---------------------------------------------------------------------------

describe("Diminished Passing", () => {
  it("fires when a next chord exists", () => {
    const subs = getSubstitutions(C_MAJOR[0]!, C_MAJOR, 0, "C", "major")
    expect(subs.filter(s => s.ruleName === "Diminished Passing")).toHaveLength(1)
  })

  it("does not fire for the last chord in the progression", () => {
    const subs = getSubstitutions(C_MAJOR[3]!, C_MAJOR, 3, "C", "major")
    expect(subs.filter(s => s.ruleName === "Diminished Passing")).toHaveLength(0)
  })

  it("inserts a dim7 chord before the next chord (index + 1)", () => {
    const subs = getSubstitutions(C_MAJOR[0]!, C_MAJOR, 0, "C", "major")
    const sub = subs.find(s => s.ruleName === "Diminished Passing")!
    const ins = sub.result as { kind: "insertion"; insertBefore: number; chords: Array<{ type: string }> }
    expect(ins.insertBefore).toBe(1)
    expect(ins.chords[0]!.type).toBe("dim7")
  })

  it("dim7 root is a chromatic semitone above the selected chord root", () => {
    // C + augmented unison = C# (C major is neutral — no normalization)
    const subs = getSubstitutions(C_MAJOR[0]!, C_MAJOR, 0, "C", "major")
    const sub = subs.find(s => s.ruleName === "Diminished Passing")!
    const ins = sub.result as { kind: "insertion"; chords: Array<{ tonic: string }> }
    expect(ins.chords[0]!.tonic).toBe("C#")
  })

  it("normalises dim7 root to A# in A major (sharp key)", () => {
    const aMajor: ProgressionChord[] = [
      chord("A", "maj7", "major", 1, "I"),
      chord("E", "7",    "dominant", 5, "V"),
    ]
    const subs = getSubstitutions(aMajor[0]!, aMajor, 0, "A", "major")
    const sub = subs.find(s => s.ruleName === "Diminished Passing")!
    const ins = sub.result as { kind: "insertion"; chords: Array<{ tonic: string }> }
    expect(ins.chords[0]!.tonic).toBe("A#")
  })
})

// ---------------------------------------------------------------------------
// Cycle of 5ths
// ---------------------------------------------------------------------------

describe("Cycle of 5ths", () => {
  it("fires when a next chord exists", () => {
    const subs = getSubstitutions(C_MAJOR[0]!, C_MAJOR, 0, "C", "major")
    expect(subs.filter(s => s.ruleName === "Cycle of 5ths")).toHaveLength(1)
  })

  it("does not fire for the last chord", () => {
    const subs = getSubstitutions(C_MAJOR[3]!, C_MAJOR, 3, "C", "major")
    expect(subs.filter(s => s.ruleName === "Cycle of 5ths")).toHaveLength(0)
  })

  it("inserts [B7, E7] before Am7 (2-step chain into Am)", () => {
    // Next chord = Am7 (root A). V7/A = E7. V7/E = B7.
    const subs = getSubstitutions(C_MAJOR[0]!, C_MAJOR, 0, "C", "major")
    const sub = subs.find(s => s.ruleName === "Cycle of 5ths")!
    const ins = sub.result as { kind: "insertion"; insertBefore: number; chords: Array<{ tonic: string; type: string }> }
    expect(ins.insertBefore).toBe(1)
    expect(ins.chords).toHaveLength(2)
    expect(ins.chords[0]!.tonic).toBe("B")  // V7/V7/Am = B7
    expect(ins.chords[1]!.tonic).toBe("E")  // V7/Am = E7
    expect(ins.chords[0]!.type).toBe("7")
    expect(ins.chords[1]!.type).toBe("7")
  })
})

// ---------------------------------------------------------------------------
// Coltrane Changes
// ---------------------------------------------------------------------------

describe("Coltrane Changes", () => {
  const jazzChords: ProgressionChord[] = [
    chord("D", "m7",   "minor",    2, "ii"),
    chord("G", "7",    "dominant", 5, "V"),
    chord("C", "maj7", "major",    1, "I"),
  ]

  it("fires when selected chord starts a ii-7 → V7 → Imaj7 pattern", () => {
    const subs = getSubstitutions(jazzChords[0]!, jazzChords, 0, "C", "major")
    expect(subs.filter(s => s.ruleName === "Coltrane Changes")).toHaveLength(1)
  })

  it("does not fire on C_MAJOR[0] (no ii-V-I pattern starting there)", () => {
    const subs = getSubstitutions(C_MAJOR[0]!, C_MAJOR, 0, "C", "major")
    expect(subs.filter(s => s.ruleName === "Coltrane Changes")).toHaveLength(0)
  })

  it("uses range_replacement kind", () => {
    const subs = getSubstitutions(jazzChords[0]!, jazzChords, 0, "C", "major")
    const sub = subs.find(s => s.ruleName === "Coltrane Changes")!
    expect(sub.result.kind).toBe("range_replacement")
  })

  it("replaces indices 0–2 with 7 chords", () => {
    const subs = getSubstitutions(jazzChords[0]!, jazzChords, 0, "C", "major")
    const sub = subs.find(s => s.ruleName === "Coltrane Changes")!
    const rr = sub.result as { kind: "range_replacement"; startIndex: number; endIndex: number; chords: unknown[] }
    expect(rr.startIndex).toBe(0)
    expect(rr.endIndex).toBe(2)
    expect(rr.chords).toHaveLength(7)
  })

  it("Coltrane sequence for Dm7–G7–Cmaj7 matches classic pattern", () => {
    // Expected: Dm7, Eb7, Abmaj7, B7, Emaj7, G7, Cmaj7
    const subs = getSubstitutions(jazzChords[0]!, jazzChords, 0, "C", "major")
    const sub = subs.find(s => s.ruleName === "Coltrane Changes")!
    const rr = sub.result as { kind: "range_replacement"; chords: Array<{ tonic: string; type: string }> }
    expect(rr.chords[0]!).toMatchObject({ tonic: "D",  type: "m7"   })
    expect(rr.chords[1]!).toMatchObject({ tonic: "Eb", type: "7"    })
    expect(rr.chords[2]!).toMatchObject({ tonic: "Ab", type: "maj7" })
    expect(rr.chords[3]!).toMatchObject({ tonic: "B",  type: "7"    })
    expect(rr.chords[4]!).toMatchObject({ tonic: "E",  type: "maj7" })
    expect(rr.chords[5]!).toMatchObject({ tonic: "G",  type: "7"    })
    expect(rr.chords[6]!).toMatchObject({ tonic: "C",  type: "maj7" })
  })

  it("sortRank places Coltrane last (highest sortRank)", () => {
    const subs = getSubstitutions(jazzChords[0]!, jazzChords, 0, "C", "major")
    const coltrane = subs.find(s => s.ruleName === "Coltrane Changes")!
    const maxOtherRank = subs
      .filter(s => s.ruleName !== "Coltrane Changes")
      .reduce((max, s) => Math.max(max, s.sortRank), 0)
    expect(coltrane.sortRank).toBeGreaterThan(maxOtherRank)
  })
})

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

describe("sort order", () => {
  it("results are sorted ascending by sortRank", () => {
    const subs = getSubstitutions(C_MAJOR[0]!, C_MAJOR, 0, "C", "major")
    for (let i = 1; i < subs.length; i++) {
      expect(subs[i]!.sortRank).toBeGreaterThanOrEqual(subs[i - 1]!.sortRank)
    }
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm vitest run __tests__/theory/substitutions.test.ts
```

Expected: many failures with "Cannot find module '@/lib/theory/substitutions'".

- [ ] **Step 3: Create `lib/theory/substitutions.ts`**

```typescript
import { Note, Key } from "tonal"
import { getDiatonicChords } from "@/lib/theory/harmony"
import type { ProgressionChord, PreviewChord, ChordSubstitution } from "@/lib/theory/types"

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Correct enharmonic spelling for the given key. */
function normalizeToKey(note: string, tonic: string, mode: string): string {
  const sig = (mode === "major" || mode === "ionian")
    ? Key.majorKey(tonic).keySignature
    : Key.minorKey(tonic).keySignature
  if (sig.includes("b") && note.includes("#")) return Note.enharmonic(note) || note
  if (sig.includes("#") && note.includes("b")) return Note.enharmonic(note) || note
  return note
}

/** Derive quality string from chord type. */
function qualityFor(type: string): string {
  if (type.startsWith("maj") || type === "" || type === "6") return "major"
  if (type === "m7b5" || type.startsWith("dim")) return "diminished"
  if (type.startsWith("m")) return "minor"
  if (/^(7|9|11|13)/.test(type)) return "dominant"
  return "major"
}

/** Build a PreviewChord, normalising the root to the key's enharmonic preference. */
function mkChord(
  rawRoot: string,
  type: string,
  roman: string,
  tonic: string,
  mode: string,
  degree?: number,
): PreviewChord {
  return {
    tonic: normalizeToKey(rawRoot, tonic, mode),
    type,
    roman,
    quality: qualityFor(type),
    degree,
  }
}

// ---------------------------------------------------------------------------
// Rule 1: Diatonic Substitution
// ---------------------------------------------------------------------------

function diatonicSubstitution(
  chord: ProgressionChord,
  selectedIndex: number,
  tonic: string,
  mode: string,
): ChordSubstitution[] {
  if (chord.degree < 1 || chord.degree > 7) return []
  const diatonic = getDiatonicChords(tonic, mode)
  const deg = chord.degree

  // Diatonic third above and below (1–7, wrapping)
  const above3 = ((deg - 1 + 2) % 7) + 1
  const below3 = ((deg - 1 - 2 + 7) % 7) + 1

  // Conventional commonality: which third is the more typical substitution
  const FIRST: Record<number, number> = { 1: 6, 2: 4, 3: 1, 4: 2, 5: 7, 6: 1, 7: 5 }
  const firstDeg  = FIRST[deg] ?? above3
  const secondDeg = firstDeg === above3 ? below3 : above3

  return [firstDeg, secondDeg].flatMap((targetDeg, i) => {
    const dc = diatonic.find(d => d.degree === targetDeg)
    if (!dc) return []
    return [{
      id: `diatonic-deg${targetDeg}`,
      ruleName: "Diatonic Substitution",
      label: `${dc.tonic}${dc.type}`,
      effect: `${dc.roman} — parallel function`,
      result: {
        kind: "replacement" as const,
        replacements: [{
          index: selectedIndex,
          chord: { tonic: dc.tonic, type: dc.type, roman: dc.roman, quality: dc.quality, degree: dc.degree },
        }],
      },
      sortRank: 10 + i,
    } satisfies ChordSubstitution]
  })
}

// ---------------------------------------------------------------------------
// Rule 2: Tritone Substitution
// ---------------------------------------------------------------------------

function tritoneSubstitution(
  chord: ProgressionChord,
  selectedIndex: number,
  tonic: string,
  mode: string,
): ChordSubstitution[] {
  if (chord.type !== "7") return []
  const rawRoot = Note.transpose(chord.tonic, "A4") // augmented 4th = tritone
  return [{
    id: "tritone",
    ruleName: "Tritone Substitution",
    label: `${normalizeToKey(rawRoot, tonic, mode)}7`,
    effect: "bII7 — chromatic descending bass to resolution",
    result: {
      kind: "replacement",
      replacements: [{ index: selectedIndex, chord: mkChord(rawRoot, "7", "bII7", tonic, mode) }],
    },
    sortRank: 20,
  }]
}

// ---------------------------------------------------------------------------
// Rule 3: Modal Mixture (Borrowed Chords)
// ---------------------------------------------------------------------------

function modalMixture(
  chord: ProgressionChord,
  selectedIndex: number,
  tonic: string,
  mode: string,
): ChordSubstitution[] {
  // Subdominant function: degree IV in major-family modes
  const majorFamilyModes = new Set(["major", "ionian", "lydian", "mixolydian", "dorian"])
  if (chord.degree !== 4 || !majorFamilyModes.has(mode)) return []

  const bVII7Root   = Note.transpose(tonic, "m7")  // minor 7th above tonic
  const bVImaj7Root = Note.transpose(tonic, "m6")  // minor 6th above tonic

  return [
    {
      id: "mixture-iv7",
      ruleName: "Modal Mixture",
      label: `${chord.tonic}m7`,
      effect: "iv-7 — parallel minor darkens the colour",
      result: {
        kind: "replacement",
        replacements: [{ index: selectedIndex, chord: mkChord(chord.tonic, "m7", "iv-7", tonic, mode) }],
      },
      sortRank: 30,
    },
    {
      id: "mixture-bvii7",
      ruleName: "Modal Mixture",
      label: `${normalizeToKey(bVII7Root, tonic, mode)}7`,
      effect: "bVII7 — borrowed flat-seven dominant",
      result: {
        kind: "replacement",
        replacements: [{ index: selectedIndex, chord: mkChord(bVII7Root, "7", "bVII7", tonic, mode) }],
      },
      sortRank: 31,
    },
    {
      id: "mixture-bvimaj7",
      ruleName: "Modal Mixture",
      label: `${normalizeToKey(bVImaj7Root, tonic, mode)}maj7`,
      effect: "bVImaj7 — borrowed from parallel minor",
      result: {
        kind: "replacement",
        replacements: [{ index: selectedIndex, chord: mkChord(bVImaj7Root, "maj7", "bVImaj7", tonic, mode) }],
      },
      sortRank: 32,
    },
  ]
}

// ---------------------------------------------------------------------------
// Rule 4: Secondary Dominant (V approach)
// ---------------------------------------------------------------------------

function secondaryDominant(
  chord: ProgressionChord,
  selectedIndex: number,
  tonic: string,
  mode: string,
): ChordSubstitution[] {
  const v7Root = Note.transpose(chord.tonic, "P5")
  const norm   = normalizeToKey(v7Root, tonic, mode)
  return [{
    id: "secondary-dominant",
    ruleName: "Secondary Dominant",
    label: `${norm}7 → ${chord.tonic}${chord.type}`,
    effect: "Strong dominant pull into the chord",
    result: {
      kind: "insertion",
      insertBefore: selectedIndex,
      chords: [mkChord(v7Root, "7", `V7/${chord.roman}`, tonic, mode)],
    },
    sortRank: 40,
  }]
}

// ---------------------------------------------------------------------------
// Rule 5: ii-V Approach
// ---------------------------------------------------------------------------

function iiVApproach(
  chord: ProgressionChord,
  selectedIndex: number,
  tonic: string,
  mode: string,
): ChordSubstitution[] {
  // ii root = major 2nd (whole step) above the target chord's root
  const iiRoot = Note.transpose(chord.tonic, "M2")
  const v7Root = Note.transpose(chord.tonic, "P5")
  // Minor quality targets take m7b5 as their ii; major/dominant take m7
  const iiType = (chord.quality === "minor" || chord.quality === "diminished") ? "m7b5" : "m7"

  const normIi = normalizeToKey(iiRoot, tonic, mode)
  const normV7 = normalizeToKey(v7Root, tonic, mode)

  return [{
    id: "ii-v-approach",
    ruleName: "ii-V Approach",
    label: `${normIi}${iiType} → ${normV7}7 → ${chord.tonic}${chord.type}`,
    effect: "Classic jazz preparation",
    result: {
      kind: "insertion",
      insertBefore: selectedIndex,
      chords: [
        mkChord(iiRoot, iiType, `ii/${chord.roman}`,  tonic, mode),
        mkChord(v7Root, "7",    `V7/${chord.roman}`,  tonic, mode),
      ],
    },
    sortRank: 41,
  }]
}

// ---------------------------------------------------------------------------
// Rule 6: Diminished Passing
// ---------------------------------------------------------------------------

function diminishedPassing(
  chord: ProgressionChord,
  chords: ProgressionChord[],
  selectedIndex: number,
  tonic: string,
  mode: string,
): ChordSubstitution[] {
  if (selectedIndex >= chords.length - 1) return []
  const rawRoot = Note.transpose(chord.tonic, "A1") // chromatic semitone up
  const norm    = normalizeToKey(rawRoot, tonic, mode)
  return [{
    id: "dim-passing",
    ruleName: "Diminished Passing",
    label: `${norm}°7`,
    effect: "Chromatic passing chord — leading tone into next chord",
    result: {
      kind: "insertion",
      insertBefore: selectedIndex + 1,
      chords: [mkChord(rawRoot, "dim7", `#${chord.roman}°7`, tonic, mode)],
    },
    sortRank: 50,
  }]
}

// ---------------------------------------------------------------------------
// Rule 7: Cycle of 5ths
// ---------------------------------------------------------------------------

function cycleOfFifths(
  chord: ProgressionChord,
  chords: ProgressionChord[],
  selectedIndex: number,
  tonic: string,
  mode: string,
): ChordSubstitution[] {
  if (selectedIndex >= chords.length - 1) return []
  const nextChord  = chords[selectedIndex + 1]!
  const v7YRoot    = Note.transpose(nextChord.tonic, "P5")  // V7 of next chord
  const v7V7YRoot  = Note.transpose(v7YRoot, "P5")          // V7 of V7 of next chord
  const normV7Y    = normalizeToKey(v7YRoot,   tonic, mode)
  const normV7V7Y  = normalizeToKey(v7V7YRoot, tonic, mode)
  return [{
    id: "cycle-of-5ths",
    ruleName: "Cycle of 5ths",
    label: `${normV7V7Y}7 → ${normV7Y}7 → ${nextChord.tonic}${nextChord.type}`,
    effect: "Two-step dominant chain into next chord",
    result: {
      kind: "insertion",
      insertBefore: selectedIndex + 1,
      chords: [
        mkChord(v7V7YRoot, "7", `V7/V7/${nextChord.roman}`, tonic, mode),
        mkChord(v7YRoot,   "7", `V7/${nextChord.roman}`,    tonic, mode),
      ],
    },
    sortRank: 60,
  }]
}

// ---------------------------------------------------------------------------
// Rule 8: Coltrane Changes
// ---------------------------------------------------------------------------

function coltraneChanges(
  chord: ProgressionChord,
  chords: ProgressionChord[],
  selectedIndex: number,
  tonic: string,
  mode: string,
): ChordSubstitution[] {
  // Need at least 2 more chords after selectedIndex
  if (selectedIndex + 2 >= chords.length) return []
  const c0 = chord
  const c1 = chords[selectedIndex + 1]!
  const c2 = chords[selectedIndex + 2]!

  // Type check: ii-7 → V7 → Imaj7
  if (c0.type !== "m7" || c1.type !== "7" || c2.type !== "maj7") return []

  // Interval check via pitch class (handles enharmonic equivalents: C# = Db)
  const pc = (n: string) => Note.pitchClass(n)
  // c0 is the ii: its root should be a P4 below c1 (V7 root is P4 above ii root)
  if (pc(Note.transpose(c0.tonic, "P4")) !== pc(c1.tonic)) return []
  // c1 is the V: its root should be a P4 below c2 (I root is P4 above V root)
  if (pc(Note.transpose(c1.tonic, "P4")) !== pc(c2.tonic)) return []

  const I_root    = c2.tonic
  const bVI_root  = Note.transpose(I_root, "m6")  // minor 6th above I = bVI
  const III_root  = Note.transpose(I_root, "M3")  // major 3rd above I = III
  const ii_I_root  = Note.transpose(I_root, "M2") // ii of I (whole step above)
  const V7bVI_root = Note.transpose(bVI_root, "P5")
  const V7III_root = Note.transpose(III_root, "P5")
  const V7I_root   = Note.transpose(I_root, "P5")

  // Classic Coltrane sequence: [Dm7, Eb7, Abmaj7, B7, Emaj7, G7, Cmaj7] for ii-V-I in C
  const coltraneSeq: PreviewChord[] = [
    mkChord(ii_I_root,  "m7",   "ii/I",    tonic, mode),
    mkChord(V7bVI_root, "7",    "V7/bVI",  tonic, mode),
    mkChord(bVI_root,   "maj7", "bVImaj7", tonic, mode),
    mkChord(V7III_root, "7",    "V7/III",  tonic, mode),
    mkChord(III_root,   "maj7", "IIImaj7", tonic, mode),
    mkChord(V7I_root,   "7",    "V7/I",    tonic, mode),
    mkChord(I_root,     "maj7", "Imaj7",   tonic, mode),
  ]

  const label = coltraneSeq.map(c => `${c.tonic}${c.type}`).join(" → ")

  return [{
    id: "coltrane-changes",
    ruleName: "Coltrane Changes",
    label,
    effect: "Cycles through three tonal centres a major third apart",
    result: {
      kind: "range_replacement",
      startIndex: selectedIndex,
      endIndex: selectedIndex + 2,
      chords: coltraneSeq,
    },
    sortRank: 70,
  }]
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getSubstitutions(
  chord: ProgressionChord,
  chords: ProgressionChord[],
  selectedIndex: number,
  tonic: string,
  mode: string,
): ChordSubstitution[] {
  const all = [
    ...diatonicSubstitution(chord, selectedIndex, tonic, mode),
    ...tritoneSubstitution(chord, selectedIndex, tonic, mode),
    ...modalMixture(chord, selectedIndex, tonic, mode),
    ...secondaryDominant(chord, selectedIndex, tonic, mode),
    ...iiVApproach(chord, selectedIndex, tonic, mode),
    ...diminishedPassing(chord, chords, selectedIndex, tonic, mode),
    ...cycleOfFifths(chord, chords, selectedIndex, tonic, mode),
    ...coltraneChanges(chord, chords, selectedIndex, tonic, mode),
  ]
  return all.sort((a, b) => a.sortRank - b.sortRank)
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
pnpm vitest run __tests__/theory/substitutions.test.ts
```

Expected: all tests pass. If any fail, diagnose using TonalJS REPL:

```bash
node -e "const { Note } = require('tonal'); console.log(Note.transpose('D', 'P4'))"
```

- [ ] **Step 5: Commit**

```bash
git add lib/theory/substitutions.ts __tests__/theory/substitutions.test.ts
git commit -m "feat: add getSubstitutions theory layer with 8 substitution rules"
```

---

## Task 3: Export from theory index

**Files:**
- Modify: `lib/theory/index.ts`

- [ ] **Step 1: Add the export line**

In `lib/theory/index.ts`, append:

```typescript
export * from "@/lib/theory/substitutions"
```

The file currently has 14 lines ending with `export * from "@/lib/theory/solo-scales"`. Add one line after it.

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/theory/index.ts
git commit -m "feat: export getSubstitutions from theory public API"
```

---

## Task 4: Add `isSubstitutionPreview` prop to `ChordQualityBlock`

**Files:**
- Modify: `app/(app)/reference/_components/chord-quality-block.tsx`

- [ ] **Step 1: Read the current file**

```bash
cat app/\(app\)/reference/_components/chord-quality-block.tsx
```

Note: the component is 75 lines. The `ChordQualityBlockProps` interface starts at line 46. The `className` on the `<button>` uses `border-2` from Tailwind. The border colour comes from the inline `style={chordBlockStyle(...)}`.

- [ ] **Step 2: Add the prop and apply dashed styling**

Make two changes:

1. Add `isSubstitutionPreview?: boolean` to `ChordQualityBlockProps` (after `variant?`):

```typescript
interface ChordQualityBlockProps {
  roman: string
  chordName: string
  degree: number
  isSelected: boolean
  onClick: () => void
  variant?: "diatonic" | "borrowed" | "non-diatonic"
  isSubstitutionPreview?: boolean
}
```

2. Destructure the new prop and apply it in the button's `style`:

```typescript
export function ChordQualityBlock({
  roman,
  chordName,
  degree,
  isSelected,
  onClick,
  variant = "diatonic",
  isSubstitutionPreview = false,
}: ChordQualityBlockProps) {
  const baseStyle = chordBlockStyle(degree, variant, isSelected)
  const style = isSubstitutionPreview
    ? { ...baseStyle, borderStyle: "dashed" as const, borderColor: "var(--color-accent)" }
    : baseStyle

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onClick}
      className="flex flex-col items-center rounded-lg border-2 px-3 py-2.5 text-center min-w-[68px] flex-shrink-0 transition-colors focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
      style={style}
    >
      <span className="text-[10px] text-muted-foreground mb-1">{roman}</span>
      <span className="text-sm font-semibold text-foreground leading-tight">{chordName}</span>
    </button>
  )
}
```

The accent CSS variable is `--color-accent` (confirmed in `app/globals.css`).

- [ ] **Step 3: Run all tests to confirm nothing broke**

```bash
pnpm vitest run
```

Expected: all existing tests still pass.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/reference/_components/chord-quality-block.tsx
git commit -m "feat: add isSubstitutionPreview prop to ChordQualityBlock"
```

---

## Task 5: Create `SubstitutionsPanel` component

**Files:**
- Create: `app/(app)/reference/_components/substitutions-panel.tsx`
- Create: `__tests__/reference/substitutions-panel.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/reference/substitutions-panel.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { SubstitutionsPanel } from "@/app/(app)/reference/_components/substitutions-panel"
import type { ChordSubstitution } from "@/lib/theory/types"

function makeSub(id: string, ruleName: string, label: string, sortRank = 10): ChordSubstitution {
  return {
    id,
    ruleName,
    label,
    effect: `Effect for ${label}`,
    result: { kind: "replacement", replacements: [{ index: 0, chord: { tonic: "E", type: "m7", roman: "iii", quality: "minor" } }] },
    sortRank,
  }
}

const subs: ChordSubstitution[] = [
  makeSub("diatonic-deg6", "Diatonic Substitution", "Am7",  10),
  makeSub("diatonic-deg3", "Diatonic Substitution", "Em7",  11),
  makeSub("tritone",        "Tritone Substitution",  "Db7",  20),
]

describe("SubstitutionsPanel", () => {
  it("renders the chord name heading", () => {
    render(<SubstitutionsPanel substitutions={subs} chordName="Cmaj7" previewedId={null} onPreview={vi.fn()} />)
    expect(screen.getByText(/substitutions for cmaj7/i)).toBeDefined()
  })

  it("renders rule group headings", () => {
    render(<SubstitutionsPanel substitutions={subs} chordName="Cmaj7" previewedId={null} onPreview={vi.fn()} />)
    expect(screen.getByText("Diatonic Substitution")).toBeDefined()
    expect(screen.getByText("Tritone Substitution")).toBeDefined()
  })

  it("renders all substitution labels", () => {
    render(<SubstitutionsPanel substitutions={subs} chordName="Cmaj7" previewedId={null} onPreview={vi.fn()} />)
    expect(screen.getByText("Am7")).toBeDefined()
    expect(screen.getByText("Em7")).toBeDefined()
    expect(screen.getByText("Db7")).toBeDefined()
  })

  it("calls onPreview with the sub when a row is clicked", () => {
    const onPreview = vi.fn()
    render(<SubstitutionsPanel substitutions={subs} chordName="Cmaj7" previewedId={null} onPreview={onPreview} />)
    fireEvent.click(screen.getByText("Am7"))
    expect(onPreview).toHaveBeenCalledWith(subs[0])
  })

  it("calls onPreview(null) when the active sub is clicked again (toggle off)", () => {
    const onPreview = vi.fn()
    render(<SubstitutionsPanel substitutions={subs} chordName="Cmaj7" previewedId="diatonic-deg6" onPreview={onPreview} />)
    fireEvent.click(screen.getByText("Am7"))
    expect(onPreview).toHaveBeenCalledWith(null)
  })

  it("shows empty message when no substitutions", () => {
    render(<SubstitutionsPanel substitutions={[]} chordName="Cmaj7" previewedId={null} onPreview={vi.fn()} />)
    expect(screen.getByText(/no substitutions available/i)).toBeDefined()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm vitest run __tests__/reference/substitutions-panel.test.tsx
```

Expected: fails with "Cannot find module".

- [ ] **Step 3: Create `substitutions-panel.tsx`**

```typescript
"use client"

import { cn } from "@/lib/utils"
import type { ChordSubstitution } from "@/lib/theory/types"

interface SubstitutionsPanelProps {
  substitutions: ChordSubstitution[]
  chordName: string       // e.g. "Gmaj7" — used in heading
  previewedId: string | null
  onPreview: (sub: ChordSubstitution | null) => void
}

export function SubstitutionsPanel({
  substitutions,
  chordName,
  previewedId,
  onPreview,
}: SubstitutionsPanelProps) {
  if (substitutions.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No substitutions available for {chordName}.
      </p>
    )
  }

  // Group by ruleName, preserving insertion (sortRank) order
  const groups: { ruleName: string; items: ChordSubstitution[] }[] = []
  for (const sub of substitutions) {
    const existing = groups.find(g => g.ruleName === sub.ruleName)
    if (existing) {
      existing.items.push(sub)
    } else {
      groups.push({ ruleName: sub.ruleName, items: [sub] })
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        Substitutions for {chordName}
      </p>

      {groups.map(group => (
        <div key={group.ruleName} className="space-y-1.5">
          <p className="text-xs text-muted-foreground">{group.ruleName}</p>
          {group.items.map(sub => {
            const isActive = sub.id === previewedId
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => onPreview(isActive ? null : sub)}
                className={cn(
                  "flex items-baseline gap-2 flex-wrap text-left w-full rounded px-2 py-1 border transition-colors cursor-pointer",
                  isActive
                    ? "border-dashed border-accent bg-accent/5"
                    : "border-transparent hover:bg-muted",
                )}
              >
                <span className="text-sm font-semibold text-foreground">{sub.label}</span>
                <span className="text-xs text-muted-foreground">· {sub.effect}</span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run the new tests**

```bash
pnpm vitest run __tests__/reference/substitutions-panel.test.tsx
```

Expected: all pass.

- [ ] **Step 5: Run all tests to confirm nothing regressed**

```bash
pnpm vitest run
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/reference/_components/substitutions-panel.tsx \
        __tests__/reference/substitutions-panel.test.tsx
git commit -m "feat: add SubstitutionsPanel component"
```

---

## Task 6: Update `ProgressionsTab` with tab bar, preview state, and wiring

**Files:**
- Modify: `app/(app)/reference/_components/progressions-tab.tsx`
- Modify: `__tests__/reference/progressions-tab.test.tsx`

This is the largest task. Read the existing file in full before making changes. The key areas to modify:
1. Imports (top)
2. New state variables inside the component
3. New `handleIndexClick` (add preview clear)
4. New `handleSelectionChange` (add preview clear)
5. New `useMemo` for `previewChords`, `highlightIndices`, `substitutions`
6. Chord row render (use `previewChords`, pass `isSubstitutionPreview`)
7. Tab bar + conditional Soloing/Substitutions panels

### Helper functions (module-level, before the component)

These are pure functions — define them before `export function ProgressionsTab`.

- [ ] **Step 1: Add failing tests for the new ProgressionsTab behaviour**

Append to `__tests__/reference/progressions-tab.test.tsx` (do not replace existing tests):

```typescript
// Add getSubstitutions to the existing vi.mock("@/lib/theory", ...) mock object:
// Inside the mock factory, add:
//   getSubstitutions: () => [],
// Then add these new describe blocks at the bottom of the file.
```

First update the existing mock in `__tests__/reference/progressions-tab.test.tsx`. Find the `vi.mock("@/lib/theory", ...)` block and add `getSubstitutions: () => []` to the returned object. The mock currently returns `listProgressions`, `getProgression`, `getSoloScales`. Add the new entry so the full mock is:

```typescript
vi.mock("@/lib/theory", () => ({
  listProgressions: () => [ /* existing mock data */ ],
  getProgression: (_name: string, tonic: string) => [ /* existing mock data */ ],
  getSoloScales: (_chord: unknown, _mode: string) => ({
    chordTonic: "G",
    primary: { scaleName: "Mixolydian" },
    additional: [{ scaleName: "Minor Pentatonic", hint: "bluesy" }],
  }),
  getSubstitutions: () => [],   // ← add this line
}))
```

Then append these tests at the bottom of the describe block:

```typescript
  it("shows Soloing and Substitutions tabs when a chord is selected", async () => {
    const user = userEvent.setup()
    render(<ProgressionsTab tonic="C" userProgressions={[]} />)
    // First chord is auto-selected on mount; tabs should be visible
    expect(screen.getByRole("button", { name: /soloing/i })).toBeDefined()
    expect(screen.getByRole("button", { name: /substitutions/i })).toBeDefined()
  })

  it("does not show tabs when no chord is selected", async () => {
    const user = userEvent.setup()
    render(<ProgressionsTab tonic="C" userProgressions={[]} />)
    // The first chord is auto-selected; click it again to deselect
    const chordButtons = screen.getAllByRole("button", { name: /cmaj7|gmaj7|amaj7|fmaj7/i })
    if (chordButtons[0]) await user.click(chordButtons[0])
    expect(screen.queryByRole("button", { name: /^soloing$/i })).toBeNull()
    expect(screen.queryByRole("button", { name: /^substitutions$/i })).toBeNull()
  })

  it("switches to Substitutions tab on click", async () => {
    const user = userEvent.setup()
    render(<ProgressionsTab tonic="C" userProgressions={[]} />)
    await user.click(screen.getByRole("button", { name: /substitutions/i }))
    // SubstitutionsPanel heading should appear (empty state since mock returns [])
    expect(screen.getByText(/no substitutions available/i)).toBeDefined()
  })
```

- [ ] **Step 2: Run only the new tests to confirm they fail**

```bash
pnpm vitest run __tests__/reference/progressions-tab.test.tsx
```

Expected: the three new tests fail; existing tests still pass.

- [ ] **Step 3: Add module-level helpers before the component**

At the top of `progressions-tab.tsx`, add these imports:

```typescript
import { useMemo, useState, useEffect, useRef } from "react"  // already there, just confirming
import { getSubstitutions } from "@/lib/theory"
import { SubstitutionsPanel } from "./substitutions-panel"
import type { ChordSubstitution, PreviewChord } from "@/lib/theory/types"
import { cn } from "@/lib/utils"
```

Note: `cn` may already be imported; add it only if missing.

Add these pure helpers immediately before `export function ProgressionsTab`:

```typescript
// ---------------------------------------------------------------------------
// Preview helpers (pure, module-level for testability)
// ---------------------------------------------------------------------------

function chordToPreview(c: import("@/lib/theory/types").ProgressionChord): PreviewChord {
  return { tonic: c.tonic, type: c.type, roman: c.roman, quality: c.quality, degree: c.degree }
}

function applyPreview(
  chords: import("@/lib/theory/types").ProgressionChord[],
  sub: ChordSubstitution,
): { previewChords: PreviewChord[]; highlightIndices: Set<number> } {
  const base = chords.map(chordToPreview)
  const { result } = sub

  if (result.kind === "replacement") {
    const preview = [...base]
    const indices = new Set<number>()
    for (const { index, chord } of result.replacements) {
      preview[index] = chord
      indices.add(index)
    }
    return { previewChords: preview, highlightIndices: indices }
  }

  if (result.kind === "insertion") {
    const preview = [
      ...base.slice(0, result.insertBefore),
      ...result.chords,
      ...base.slice(result.insertBefore),
    ]
    const count = result.chords.length
    const indices = new Set(
      Array.from({ length: count + 1 }, (_, i) => result.insertBefore + i),
    )
    return { previewChords: preview, highlightIndices: indices }
  }

  // range_replacement
  const preview = [
    ...base.slice(0, result.startIndex),
    ...result.chords,
    ...base.slice(result.endIndex + 1),
  ]
  const indices = new Set(
    Array.from({ length: result.chords.length }, (_, i) => result.startIndex + i),
  )
  return { previewChords: preview, highlightIndices: indices }
}
```

- [ ] **Step 4: Add state variables inside the component**

Inside `ProgressionsTab`, after the existing `useState` declarations (after `const [infoOpen, setInfoOpen] = useState(false)`), add:

```typescript
const [previewedSub, setPreviewedSub] = useState<ChordSubstitution | null>(null)
const [chordDetailTab, setChordDetailTab] = useState<"soloing" | "substitutions">("soloing")
```

- [ ] **Step 5: Add `useMemo` for derived preview state and substitutions**

After the existing `const scales = ...` line (around line 115), add:

```typescript
const { previewChords, highlightIndices } = useMemo(() => {
  if (!previewedSub) {
    return { previewChords: chords.map(chordToPreview), highlightIndices: new Set<number>() }
  }
  return applyPreview(chords, previewedSub)
}, [chords, previewedSub])

const substitutions = useMemo(
  () => selectedIndex !== null && selectedChord
    ? getSubstitutions(selectedChord, chords, selectedIndex, tonic, mode)
    : [],
  [selectedChord, chords, selectedIndex, tonic, mode],
)
```

- [ ] **Step 6: Update `handleIndexClick` to clear preview**

Replace the existing `handleIndexClick` with:

```typescript
function handleIndexClick(index: number) {
  setPreviewedSub(null)
  if (selectedIndex !== index) {
    const chord = chords[index]
    if (chord) {
      const soloScales = getSoloScales({ tonic: chord.tonic, type: chord.type, degree: chord.degree }, mode)
      onChordSelect?.(chord.tonic, chord.type, chord.quality, soloScales.primary.scaleName)
    }
  }
  setSelectedIndex(prev => prev === index ? null : index)
}
```

- [ ] **Step 7: Update `handleSelectionChange` to clear preview**

Add `setPreviewedSub(null)` at the top of `handleSelectionChange`:

```typescript
function handleSelectionChange(newSelected: string) {
  setPreviewedSub(null)        // ← add this line
  setSelected(newSelected)
  setSelectedIndex(0)
  setInfoOpen(false)
  // ... rest of function unchanged
```

- [ ] **Step 8: Replace the chord block row render with preview-aware version**

Find the existing chord row render (the `<div role="group" ...>` containing the `{chords.map(...)}` call). Replace the entire block:

```tsx
{/* Chord blocks — renders previewChords when a substitution preview is active */}
<div role="group" aria-label="Progression chords" className="flex flex-wrap items-center gap-1">
  {previewChords.map((chord, i) => (
    <div key={i} className="flex items-center gap-1 flex-shrink-0">
      {i > 0 && <span className="text-muted-foreground text-sm flex-shrink-0">→</span>}
      <ChordQualityBlock
        roman={chord.roman}
        chordName={`${chord.tonic}${chord.type}`}
        degree={chord.degree ?? 1}
        isSelected={!previewedSub && selectedIndex === i}
        onClick={() => {
          if (previewedSub) {
            setPreviewedSub(null)
            return
          }
          handleIndexClick(i)
        }}
        variant={chord.degree !== undefined ? "diatonic" : "non-diatonic"}
        isSubstitutionPreview={highlightIndices.has(i)}
      />
    </div>
  ))}
</div>
```

- [ ] **Step 9: Replace the per-chord detail area with tab bar + conditional panels**

Find the existing per-chord scale section (lines ~291–298):

```tsx
{/* Per-chord scale recommendation */}
{scales && selectedChord && (
  <SoloScalesPanel
    scales={scales}
    chordName={`${selectedChord.tonic}${selectedChord.type}`}
    onScaleSelect={onScaleSelect}
  />
)}
```

Replace it with:

```tsx
{/* Per-chord detail: tab bar + Soloing / Substitutions panels */}
{selectedChord && (
  <div className="space-y-3">
    {/* Tab bar — same style as ChordPanel sub-tabs */}
    <div className="flex rounded border border-border overflow-hidden text-sm w-fit">
      <button
        type="button"
        onClick={() => setChordDetailTab("soloing")}
        className={cn(
          "px-3 py-1.5 transition-colors",
          chordDetailTab === "soloing"
            ? "bg-accent text-accent-foreground"
            : "bg-card text-muted-foreground hover:bg-muted",
        )}
      >
        Soloing
      </button>
      <button
        type="button"
        onClick={() => setChordDetailTab("substitutions")}
        className={cn(
          "px-3 py-1.5 transition-colors border-l border-border",
          chordDetailTab === "substitutions"
            ? "bg-accent text-accent-foreground"
            : "bg-card text-muted-foreground hover:bg-muted",
        )}
      >
        Substitutions
      </button>
    </div>

    {chordDetailTab === "soloing" && scales && (
      <SoloScalesPanel
        scales={scales}
        chordName={`${selectedChord.tonic}${selectedChord.type}`}
        onScaleSelect={onScaleSelect}
      />
    )}

    {chordDetailTab === "substitutions" && (
      <SubstitutionsPanel
        substitutions={substitutions}
        chordName={`${selectedChord.tonic}${selectedChord.type}`}
        previewedId={previewedSub?.id ?? null}
        onPreview={setPreviewedSub}
      />
    )}
  </div>
)}
```

- [ ] **Step 10: Run all tests**

```bash
pnpm vitest run
```

Expected: all tests pass (including the three new ProgressionsTab tests).

If the existing `progressions-tab.test.tsx` test "shows per-chord scale panel by default (first chord pre-selected)" now fails because the panel is behind a tab — update it:

```typescript
it("shows Soloing tab content by default when first chord is pre-selected", () => {
  render(<ProgressionsTab tonic="C" userProgressions={[]} />)
  // Soloing tab is the default active tab
  expect(screen.getByRole("button", { name: /^soloing$/i })).toBeDefined()
  // SoloScalesPanel content is rendered (mocked getSoloScales returns "Mixolydian")
  expect(screen.getByText(/scales to solo over/i)).toBeDefined()
})
```

- [ ] **Step 11: Commit**

```bash
git add app/\(app\)/reference/_components/progressions-tab.tsx \
        __tests__/reference/progressions-tab.test.tsx
git commit -m "feat: wire chord substitutions tab bar and preview into ProgressionsTab"
```

---

## Final verification

- [ ] **Run the full test suite one more time**

```bash
pnpm vitest run
```

Expected: all tests pass, no regressions.

- [ ] **Type-check the whole project**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Manual smoke test (dev server)**

```bash
pnpm dev
```

Open the reference page, select a progression, click a chord:
1. "Soloing" and "Substitutions" tabs appear
2. Soloing tab shows the existing "Scales to solo over" content
3. Substitutions tab shows substitution options grouped by rule
4. Clicking a substitution item highlights it and the chord row updates with dashed-outline preview tiles
5. Clicking the active substitution again clears the preview
6. Clicking a different chord clears the preview and moves selection
7. Changing the progression clears the preview

---

## Appendix: Key enharmonic cases to check manually

| Key | Chord | Rule | Expected sub tonic |
|-----|-------|------|--------------------|
| F major | C7 | Tritone | Gb7 (not F#7) |
| E major | G7 | Tritone | C#7 (not Db7) |
| C major | C | Diminished Passing | C#°7 (neutral key) |
| A major | A | Diminished Passing | A#°7 (sharp key) |
| Bb major | Bb | Secondary Dominant | F7 (natural, no change) |
