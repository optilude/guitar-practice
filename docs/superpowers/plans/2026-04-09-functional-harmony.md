# Functional Harmony Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "look-ahead" functional harmony analysis layer that identifies secondary dominants, tritone subs, and other context-dependent chord functions, then overrides both the Roman numeral display and the scale suggestions in the Progressions view and Key Finder.

**Architecture:** A new pure theory module `lib/theory/functional-harmony.ts` exports `analyzeFunctionalContext(chord, nextChord, tonic, mode)`. It compares current and next chord intervals to match 7 functional rules and returns a `FunctionalAnalysis` with optional `romanOverride` (e.g. `"V7/ii"`) and `scalesOverride` (a `SoloScales` result). `progressions-tab.tsx` maps this over the whole chords array on every render (a `useMemo`) and applies the overrides to chord block labels and the scale panel. `key-finder-client.tsx` does the same for the selected result's chord sequence.

**Tech Stack:** TonalJS (`Note.transpose`, `Note.pitchClass`) for interval arithmetic — same pattern already used in `lib/theory/substitutions.ts`. Vitest + React Testing Library for tests.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `lib/theory/solo-scales.ts` | Add "Whole-Half Diminished" entry to `SCALE_TONAL_NAMES` |
| Create | `lib/theory/functional-harmony.ts` | `ChordContext` type, `FunctionalAnalysis` type, `qualityFromType()`, `analyzeFunctionalContext()` — all 7 rules |
| Modify | `lib/theory/index.ts` | Re-export everything from `functional-harmony` |
| Create | `__tests__/theory/functional-harmony.test.ts` | Unit tests for all 7 rules + helpers |
| Modify | `__tests__/reference/progressions-tab.test.tsx` | Add `analyzeFunctionalContext` to the `@/lib/theory` mock |
| Modify | `__tests__/reference/harmony-study.test.tsx` | Same mock update |
| Modify | `__tests__/reference/page.test.tsx` | Same mock update |
| Modify | `app/(app)/reference/_components/progressions-tab.tsx` | Add `functionalAnalyses` memo; update chord-block Roman display; update `scales` computation; update `onChordSelect` calls |
| Modify | `app/(app)/tools/key-finder/_components/key-finder-client.tsx` | Add `functionalRomans` memo; update `ResultChordBadge` to show `romanOverride` |

---

## Task 1: Add "Whole-Half Diminished" scale to SCALE_TONAL_NAMES

**Files:**
- Modify: `lib/theory/solo-scales.ts` (SCALE_TONAL_NAMES object, around line 128)

The existing map already has `"Diminished Half-Whole"` (H-W pattern, used for dom7 chords). The functional harmony rule 6 (diminished passing chord) needs the W-H pattern. Add it.

- [ ] **Step 1: Add entry to SCALE_TONAL_NAMES**

In `lib/theory/solo-scales.ts`, in the `SCALE_TONAL_NAMES` object, add this line after `"Diminished Half-Whole": "half-whole diminished"`:

```typescript
  "Whole-Half Diminished":   "whole-half diminished",
```

The full relevant section becomes:

```typescript
  "Diminished Half-Whole":   "half-whole diminished",
  "Whole-Half Diminished":   "whole-half diminished",
```

- [ ] **Step 2: Verify TonalJS recognises the scale name**

Run this one-off check to confirm `Scale.get("C whole-half diminished").notes` is non-empty. Create a throwaway test file `__tests__/theory/scale-name-check.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { Scale } from "tonal"

describe("TonalJS scale name sanity", () => {
  it("whole-half diminished has 8 notes", () => {
    const s = Scale.get("C whole-half diminished")
    expect(s.notes.length).toBe(8)
  })
})
```

Run: `npx vitest run __tests__/theory/scale-name-check.test.ts`

Expected: PASS. If it FAILs, try `"whole half diminished"` (no hyphen) or `"diminished whole tone"` — update both the entry in `solo-scales.ts` and the scale-name-check test until green.

- [ ] **Step 3: Delete the throwaway test**

```bash
rm __tests__/theory/scale-name-check.test.ts
```

- [ ] **Step 4: Run full test suite to confirm no regressions**

Run: `npx vitest run`
Expected: same number of tests passing as before (528).

- [ ] **Step 5: Commit**

```bash
git add lib/theory/solo-scales.ts
git commit -m "feat: add Whole-Half Diminished scale to SCALE_TONAL_NAMES"
```

---

## Task 2: Create `lib/theory/functional-harmony.ts`

**Files:**
- Create: `lib/theory/functional-harmony.ts`
- Create: `__tests__/theory/functional-harmony.test.ts`

The module is pure theory — no React, no state. It imports only `Note` from tonal and `getDiatonicChords` from `@/lib/theory/harmony` (needed only for rule 3 target lookup).

- [ ] **Step 1: Write the failing tests**

Create `__tests__/theory/functional-harmony.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest"

// Mock getDiatonicChords — used only in rule 3 to find the target chord's Roman numeral
vi.mock("@/lib/theory/harmony", () => ({
  getDiatonicChords: () => [
    { degree: 1, roman: "I",    tonic: "C", type: "maj7", quality: "major" },
    { degree: 2, roman: "ii",   tonic: "D", type: "m7",   quality: "minor" },
    { degree: 3, roman: "iii",  tonic: "E", type: "m7",   quality: "minor" },
    { degree: 4, roman: "IV",   tonic: "F", type: "maj7", quality: "major" },
    { degree: 5, roman: "V",    tonic: "G", type: "7",    quality: "dominant" },
    { degree: 6, roman: "vi",   tonic: "A", type: "m7",   quality: "minor" },
    { degree: 7, roman: "vii°", tonic: "B", type: "m7b5", quality: "diminished" },
  ],
}))

import {
  analyzeFunctionalContext,
  qualityFromType,
  type ChordContext,
} from "@/lib/theory/functional-harmony"

function c(
  tonic: string,
  type: string,
  quality: "major" | "minor" | "dominant" | "diminished",
  roman: string,
): ChordContext {
  return { tonic, type, quality, roman }
}

// ---------------------------------------------------------------------------
// qualityFromType
// ---------------------------------------------------------------------------
describe("qualityFromType", () => {
  it("maps 7 to dominant",           () => expect(qualityFromType("7")).toBe("dominant"))
  it("maps 9 to dominant",           () => expect(qualityFromType("9")).toBe("dominant"))
  it("maps 13 to dominant",          () => expect(qualityFromType("13")).toBe("dominant"))
  it("maps alt to dominant",         () => expect(qualityFromType("alt")).toBe("dominant"))
  it("maps m7 to minor",             () => expect(qualityFromType("m7")).toBe("minor"))
  it("maps m7b5 to diminished",      () => expect(qualityFromType("m7b5")).toBe("diminished"))
  it("maps dim7 to diminished",      () => expect(qualityFromType("dim7")).toBe("diminished"))
  it("maps maj7 to major",           () => expect(qualityFromType("maj7")).toBe("major"))
  it("maps empty string to major",   () => expect(qualityFromType("")).toBe("major"))
})

// ---------------------------------------------------------------------------
// No match cases
// ---------------------------------------------------------------------------
describe("analyzeFunctionalContext — no override", () => {
  it("returns null overrides when nextChord is null", () => {
    const r = analyzeFunctionalContext(c("A", "7", "dominant", "VI"), null, "C", "major")
    expect(r.romanOverride).toBeNull()
    expect(r.scalesOverride).toBeNull()
  })

  it("returns null overrides when no rule matches (I → V, P5 up)", () => {
    // P5 up, not P4 up — no rule fires
    const r = analyzeFunctionalContext(
      c("C", "maj7", "major", "I"),
      c("G", "maj7", "major", "V"),
      "C", "major",
    )
    expect(r.romanOverride).toBeNull()
    expect(r.scalesOverride).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Rule 1: Secondary dominant to minor — V7 → minor, P4 up
// ---------------------------------------------------------------------------
describe("Rule 1: secondary dominant to minor", () => {
  it("A7 → Dm7 in C major → V7/ii, Phrygian Dominant primary", () => {
    const r = analyzeFunctionalContext(
      c("A", "7", "dominant", "VI"),
      c("D", "m7", "minor", "ii"),
      "C", "major",
    )
    expect(r.romanOverride).toBe("V7/ii")
    expect(r.scalesOverride!.chordTonic).toBe("A")
    expect(r.scalesOverride!.primary.scaleName).toBe("Phrygian Dominant")
    expect(r.scalesOverride!.additional.map(a => a.scaleName)).toContain("Altered")
    expect(r.scalesOverride!.additional.map(a => a.scaleName)).toContain("Mixolydian b6")
  })

  it("E7 → Am7 → V7/vi", () => {
    const r = analyzeFunctionalContext(
      c("E", "7", "dominant", "III"),
      c("A", "m7", "minor", "vi"),
      "C", "major",
    )
    expect(r.romanOverride).toBe("V7/vi")
    expect(r.scalesOverride!.primary.scaleName).toBe("Phrygian Dominant")
  })
})

// ---------------------------------------------------------------------------
// Rule 2: Secondary dominant to major — V7 → major, P4 up
// ---------------------------------------------------------------------------
describe("Rule 2: secondary dominant to major", () => {
  it("D7 → Gmaj7 in C major → V7/V, Mixolydian primary", () => {
    const r = analyzeFunctionalContext(
      c("D", "7", "dominant", "II"),
      c("G", "maj7", "major", "V"),
      "C", "major",
    )
    expect(r.romanOverride).toBe("V7/V")
    expect(r.scalesOverride!.chordTonic).toBe("D")
    expect(r.scalesOverride!.primary.scaleName).toBe("Mixolydian")
    expect(r.scalesOverride!.additional.map(a => a.scaleName)).toContain("Lydian Dominant")
  })

  it("does not confuse with Rule 1 when next is major", () => {
    const r = analyzeFunctionalContext(
      c("A", "7", "dominant", "VI"),
      c("D", "maj7", "major", "II"),
      "C", "major",
    )
    expect(r.romanOverride).toBe("V7/II")
    expect(r.scalesOverride!.primary.scaleName).toBe("Mixolydian") // Rule 2, not Rule 1
  })
})

// ---------------------------------------------------------------------------
// Rule 3: Related ii chord — minor/half-dim → dominant, P4 up
// ---------------------------------------------------------------------------
describe("Rule 3: related ii chord", () => {
  it("Em7 → A7 → ii/ii, Dorian primary (target D = ii in C major)", () => {
    // E → A is P4 up; target (P4 above A) = D = degree 2 = "ii"
    const r = analyzeFunctionalContext(
      c("E", "m7", "minor", "iii"),
      c("A", "7", "dominant", "VI"),
      "C", "major",
    )
    expect(r.romanOverride).toBe("ii/ii")
    expect(r.scalesOverride!.primary.scaleName).toBe("Dorian")
    expect(r.scalesOverride!.additional).toHaveLength(0)
  })

  it("Bm7b5 → E7 → iiø/vi, Locrian primary (target A = vi in C major)", () => {
    // B → E is P4 up; target (P4 above E) = A = degree 6 = "vi"
    const r = analyzeFunctionalContext(
      c("B", "m7b5", "diminished", "vii°"),
      c("E", "7", "dominant", "III"),
      "C", "major",
    )
    expect(r.romanOverride).toBe("iiø/vi")
    expect(r.scalesOverride!.primary.scaleName).toBe("Locrian")
    expect(r.scalesOverride!.additional.map(a => a.scaleName)).toContain("Locrian #2")
  })
})

// ---------------------------------------------------------------------------
// Rule 4: Extended dominant chain — dominant → dominant, P4 up
// ---------------------------------------------------------------------------
describe("Rule 4: extended dominant chain", () => {
  it("B7 → E7 → V7/III, Lydian Dominant primary", () => {
    const r = analyzeFunctionalContext(
      c("B", "7", "dominant", "VII"),
      c("E", "7", "dominant", "III"),
      "C", "major",
    )
    expect(r.romanOverride).toBe("V7/III")
    expect(r.scalesOverride!.primary.scaleName).toBe("Lydian Dominant")
    expect(r.scalesOverride!.additional).toHaveLength(0)
  })

  it("A7 → D7 → V7/II", () => {
    const r = analyzeFunctionalContext(
      c("A", "7", "dominant", "VI"),
      c("D", "7", "dominant", "II"),
      "C", "major",
    )
    expect(r.romanOverride).toBe("V7/II")
    expect(r.scalesOverride!.primary.scaleName).toBe("Lydian Dominant")
  })
})

// ---------------------------------------------------------------------------
// Rule 5: Tritone substitution — dominant, nextChord root m2 DOWN from current
// ---------------------------------------------------------------------------
describe("Rule 5: tritone substitution", () => {
  it("Db7 → Cmaj7 → subV7/I, Lydian Dominant", () => {
    const r = analyzeFunctionalContext(
      c("Db", "7", "dominant", "♭II"),
      c("C", "maj7", "major", "I"),
      "C", "major",
    )
    expect(r.romanOverride).toBe("subV7/I")
    expect(r.scalesOverride!.primary.scaleName).toBe("Lydian Dominant")
    expect(r.scalesOverride!.additional).toHaveLength(0)
  })

  it("Ab7 → Gmaj7 → subV7/V", () => {
    const r = analyzeFunctionalContext(
      c("Ab", "7", "dominant", "♭VI"),
      c("G", "maj7", "major", "V"),
      "C", "major",
    )
    expect(r.romanOverride).toBe("subV7/V")
    expect(r.scalesOverride!.primary.scaleName).toBe("Lydian Dominant")
  })
})

// ---------------------------------------------------------------------------
// Rule 6: Diminished passing chord — dim7, nextChord root m2 UP from current
// ---------------------------------------------------------------------------
describe("Rule 6: diminished passing chord", () => {
  it("Db dim7 → Dm7 → vii°7/ii, Whole-Half Diminished", () => {
    // Db (= C#) + m2 up = D ✓
    const r = analyzeFunctionalContext(
      c("Db", "dim7", "diminished", "#I°"),
      c("D", "m7", "minor", "ii"),
      "C", "major",
    )
    expect(r.romanOverride).toBe("vii°7/ii")
    expect(r.scalesOverride!.primary.scaleName).toBe("Whole-Half Diminished")
    expect(r.scalesOverride!.additional).toHaveLength(0)
  })

  it("does not fire when next root is NOT m2 up (e.g. P4 up)", () => {
    // Db dim7 → Gb maj7: P4 up, not m2
    const r = analyzeFunctionalContext(
      c("Db", "dim7", "diminished", "#I°"),
      c("Gb", "maj7", "major", "IV"),
      "C", "major",
    )
    expect(r.romanOverride).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Rule 7: Deceptive resolution to minor — dominant → minor, M2 up
// ---------------------------------------------------------------------------
describe("Rule 7: deceptive resolution to minor", () => {
  it("G7 → Am7 → no roman override, Mixolydian b6 primary", () => {
    const r = analyzeFunctionalContext(
      c("G", "7", "dominant", "V"),
      c("A", "m7", "minor", "vi"),
      "C", "major",
    )
    expect(r.romanOverride).toBeNull()     // V stays as V
    expect(r.scalesOverride!.primary.scaleName).toBe("Mixolydian b6")
    expect(r.scalesOverride!.additional.map(a => a.scaleName)).toContain("Altered")
    expect(r.scalesOverride!.additional.map(a => a.scaleName)).toContain("Mixolydian")
    expect(r.scalesOverride!.chordTonic).toBe("G")
  })

  it("does not fire when next quality is major (not minor)", () => {
    // G7 → Amaj7: M2 up but major — no rule fires
    const r = analyzeFunctionalContext(
      c("G", "7", "dominant", "V"),
      c("A", "maj7", "major", "VI"),
      "C", "major",
    )
    expect(r.romanOverride).toBeNull()
    expect(r.scalesOverride).toBeNull()
  })

  it("Rule 1 takes priority over Rule 7 (P4 up is not M2 up — no conflict)", () => {
    // A7 → Dm7: P4 up to minor — Rule 1 fires (roman V7/ii)
    // Rule 7 would require M2 up (A to B), so no conflict
    const r = analyzeFunctionalContext(
      c("A", "7", "dominant", "VI"),
      c("D", "m7", "minor", "ii"),
      "C", "major",
    )
    expect(r.romanOverride).toBe("V7/ii")  // Rule 1
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run __tests__/theory/functional-harmony.test.ts`
Expected: FAIL — "Cannot find module '@/lib/theory/functional-harmony'"

- [ ] **Step 3: Create `lib/theory/functional-harmony.ts`**

```typescript
import { Note } from "tonal"
import { getDiatonicChords } from "@/lib/theory/harmony"
import type { SoloScales } from "@/lib/theory/types"

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ChordContext = {
  tonic: string
  type: string
  quality: "major" | "minor" | "dominant" | "diminished"
  roman: string
}

export interface FunctionalAnalysis {
  romanOverride: string | null     // null = keep existing Roman numeral display
  scalesOverride: SoloScales | null // null = fall back to getSoloScales()
}

// ---------------------------------------------------------------------------
// Interval helpers — pitch-class comparison handles enharmonic equivalents
// ---------------------------------------------------------------------------

function pc(note: string): string {
  return Note.pitchClass(note)
}

/** nextTonic is a perfect 4th UP from fromTonic (e.g. C→F, A→D, G→C) */
function isP4Up(fromTonic: string, toTonic: string): boolean {
  return pc(Note.transpose(fromTonic, "P4")) === pc(toTonic)
}

/** nextTonic is a minor 2nd DOWN from fromTonic (e.g. Db→C, Ab→G) */
function isM2Down(fromTonic: string, toTonic: string): boolean {
  // "m2 down from current" = current is m2 above next
  return pc(Note.transpose(toTonic, "m2")) === pc(fromTonic)
}

/** nextTonic is a minor 2nd UP from fromTonic (e.g. C#→D, F#→G) */
function isM2Up(fromTonic: string, toTonic: string): boolean {
  return pc(Note.transpose(fromTonic, "m2")) === pc(toTonic)
}

/** nextTonic is a major 2nd UP from fromTonic (e.g. G→A, F→G) */
function isMajor2Up(fromTonic: string, toTonic: string): boolean {
  return pc(Note.transpose(fromTonic, "M2")) === pc(toTonic)
}

// ---------------------------------------------------------------------------
// Convenience builder
// ---------------------------------------------------------------------------

function buildScales(
  tonic: string,
  primary: string,
  additional: Array<{ scaleName: string; hint?: string }>,
): SoloScales {
  return { chordTonic: tonic, primary: { scaleName: primary }, additional }
}

// ---------------------------------------------------------------------------
// Exported helper — maps a raw chord type string to quality.
// Use this when you have an InputChord/ChordAnalysis and no pre-computed quality.
// ---------------------------------------------------------------------------

export function qualityFromType(
  type: string,
): "major" | "minor" | "dominant" | "diminished" {
  const t = type.toLowerCase()
  if (t.startsWith("dim") || t === "m7b5" || t === "ø7" || t === "ø") return "diminished"
  if (t.startsWith("m") || t === "-" || t.startsWith("-m")) return "minor"
  if (/^(7|9|11|13)/.test(t) || t === "alt") return "dominant"
  return "major"
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Analyse the functional role of `chord` given `nextChord` as its resolution
 * target. Returns scale and Roman numeral overrides when a rule fires.
 * Call with `nextChord = null` for the last chord in a progression.
 */
export function analyzeFunctionalContext(
  chord: ChordContext,
  nextChord: ChordContext | null,
  tonic: string,
  mode: string,
): FunctionalAnalysis {
  const NONE: FunctionalAnalysis = { romanOverride: null, scalesOverride: null }
  if (!nextChord) return NONE

  const { tonic: ct, quality: cq } = chord
  const { tonic: nt, quality: nq, roman: nr } = nextChord

  // ------------------------------------------------------------------
  // Rule 1: Secondary dominant to minor — dominant → minor, P4 up
  // Example: A7 → Dm7  →  "V7/ii"
  // ------------------------------------------------------------------
  if (cq === "dominant" && nq === "minor" && isP4Up(ct, nt)) {
    return {
      romanOverride: `V7/${nr}`,
      scalesOverride: buildScales(ct, "Phrygian Dominant", [
        { scaleName: "Altered",       hint: "jazz tension" },
        { scaleName: "Mixolydian b6", hint: "darker" },
      ]),
    }
  }

  // ------------------------------------------------------------------
  // Rule 2: Secondary dominant to major — dominant → major, P4 up
  // Example: D7 → Gmaj7  →  "V7/V"
  // ------------------------------------------------------------------
  if (cq === "dominant" && nq === "major" && isP4Up(ct, nt)) {
    return {
      romanOverride: `V7/${nr}`,
      scalesOverride: buildScales(ct, "Mixolydian", [
        { scaleName: "Lydian Dominant", hint: "bright tension" },
      ]),
    }
  }

  // ------------------------------------------------------------------
  // Rule 3: Related ii chord — minor/half-dim → dominant, P4 up
  // Example: Em7 → A7 (resolving to Dm7)  →  "ii/ii"
  // The target chord is P4 above nextChord. We look up its Roman in the key.
  // ------------------------------------------------------------------
  if ((cq === "minor" || cq === "diminished") && nq === "dominant" && isP4Up(ct, nt)) {
    const targetPc    = pc(Note.transpose(nt, "P4"))
    const diatonic    = getDiatonicChords(tonic, mode)
    const targetChord = diatonic.find(d => pc(d.tonic) === targetPc)
    const targetRoman = targetChord?.roman ?? "?"
    const prefix      = cq === "diminished" ? "iiø" : "ii"
    return {
      romanOverride: `${prefix}/${targetRoman}`,
      scalesOverride: cq === "diminished"
        ? buildScales(ct, "Locrian", [{ scaleName: "Locrian #2", hint: "less dissonant" }])
        : buildScales(ct, "Dorian", []),
    }
  }

  // ------------------------------------------------------------------
  // Rule 4: Extended dominant chain — dominant → dominant, P4 up
  // Example: B7 → E7  →  "V7/III"
  // ------------------------------------------------------------------
  if (cq === "dominant" && nq === "dominant" && isP4Up(ct, nt)) {
    return {
      romanOverride: `V7/${nr}`,
      scalesOverride: buildScales(ct, "Lydian Dominant", []),
    }
  }

  // ------------------------------------------------------------------
  // Rule 5: Tritone substitution — dominant, next root m2 DOWN from current
  // Example: Db7 → Cmaj7  →  "subV7/I"
  // ------------------------------------------------------------------
  if (cq === "dominant" && isM2Down(ct, nt)) {
    return {
      romanOverride: `subV7/${nr}`,
      scalesOverride: buildScales(ct, "Lydian Dominant", []),
    }
  }

  // ------------------------------------------------------------------
  // Rule 6: Diminished passing chord — dim7, next root m2 UP from current
  // Example: C#dim7 → Dm7  →  "vii°7/ii"
  // ------------------------------------------------------------------
  if (cq === "diminished" && isM2Up(ct, nt)) {
    return {
      romanOverride: `vii°7/${nr}`,
      scalesOverride: buildScales(ct, "Whole-Half Diminished", []),
    }
  }

  // ------------------------------------------------------------------
  // Rule 7: Deceptive resolution to minor — dominant → minor, M2 up
  // Example: G7 → Am7 (V7 → vi)
  // No Roman override — it's already the correct diatonic Roman (e.g. "V").
  // ------------------------------------------------------------------
  if (cq === "dominant" && nq === "minor" && isMajor2Up(ct, nt)) {
    return {
      romanOverride: null,
      scalesOverride: buildScales(ct, "Mixolydian b6", [
        { scaleName: "Altered",    hint: "jazz tension" },
        { scaleName: "Mixolydian", hint: "safe choice" },
      ]),
    }
  }

  return NONE
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npx vitest run __tests__/theory/functional-harmony.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/theory/functional-harmony.ts __tests__/theory/functional-harmony.test.ts
git commit -m "feat: add functional harmony analysis with 7 look-ahead rules"
```

---

## Task 3: Export from `lib/theory/index.ts` and update test mocks

**Files:**
- Modify: `lib/theory/index.ts`
- Modify: `__tests__/reference/progressions-tab.test.tsx`
- Modify: `__tests__/reference/harmony-study.test.tsx`
- Modify: `__tests__/reference/page.test.tsx`

- [ ] **Step 1: Add export to `lib/theory/index.ts`**

At the end of `lib/theory/index.ts`, add:

```typescript
export * from "@/lib/theory/functional-harmony"
```

- [ ] **Step 2: Update `__tests__/reference/progressions-tab.test.tsx` mock**

In the `vi.mock("@/lib/theory", () => ({` block, add this line after `getSubstitutions: () => [],`:

```typescript
  analyzeFunctionalContext: () => ({ romanOverride: null, scalesOverride: null }),
```

- [ ] **Step 3: Update `__tests__/reference/harmony-study.test.tsx` mock**

Same addition in that file's `vi.mock("@/lib/theory", ...)` block — add after `getSubstitutions: () => [],`:

```typescript
  analyzeFunctionalContext: () => ({ romanOverride: null, scalesOverride: null }),
```

- [ ] **Step 4: Update `__tests__/reference/page.test.tsx` mock**

Same addition in the `vi.mock("@/lib/theory", ...)` block — add after `getSubstitutions: () => [],`:

```typescript
  analyzeFunctionalContext: () => ({ romanOverride: null, scalesOverride: null }),
```

- [ ] **Step 5: Run test suite to confirm no regressions**

Run: `npx vitest run`
Expected: All tests pass (same count as before).

- [ ] **Step 6: Commit**

```bash
git add lib/theory/index.ts \
  __tests__/reference/progressions-tab.test.tsx \
  __tests__/reference/harmony-study.test.tsx \
  __tests__/reference/page.test.tsx
git commit -m "feat: export functional-harmony from lib/theory; update test mocks"
```

---

## Task 4: Update `progressions-tab.tsx` for functional Romans and context-aware scales

**Files:**
- Modify: `app/(app)/reference/_components/progressions-tab.tsx`

The changes are:
1. Import `analyzeFunctionalContext` and `FunctionalAnalysis` from `@/lib/theory`
2. Add a `functionalAnalyses` useMemo that analyses every chord against its neighbour
3. Update the `scales` computation to use `scalesOverride` when present
4. Update the chord block Roman rendering to show `romanOverride` when not in substitution preview mode
5. Update the three `onChordSelect` call sites to use the functional primary scale

- [ ] **Step 1: Add import**

In `app/(app)/reference/_components/progressions-tab.tsx`, in the import from `@/lib/theory` (line 6), add `getSubstitutions` is already there. Add `analyzeFunctionalContext` to that same import:

```typescript
import { listProgressions, getProgression, getSoloScales, getSubstitutions, analyzeFunctionalContext } from "@/lib/theory"
```

Also add `FunctionalAnalysis` to the type import from `@/lib/theory/types` — find the line:

```typescript
import type { ChordSubstitution, PreviewChord } from "@/lib/theory/types"
```

Change it to:

```typescript
import type { ChordSubstitution, FunctionalAnalysis, PreviewChord } from "@/lib/theory/types"
```

Wait — `FunctionalAnalysis` is defined in `functional-harmony.ts` and exported from `@/lib/theory`. It is NOT in `types.ts`. So keep the type import from `@/lib/theory/types` unchanged, and instead import the type from `@/lib/theory` as a type:

```typescript
import type { FunctionalAnalysis } from "@/lib/theory"
```

Add this line after the existing type imports.

- [ ] **Step 2: Add `functionalAnalyses` useMemo**

In `progressions-tab.tsx`, after the existing `substitutions` useMemo (around line 185), add:

```typescript
  const functionalAnalyses = useMemo(
    (): FunctionalAnalysis[] =>
      chords.map((chord, i) =>
        analyzeFunctionalContext(chord, chords[i + 1] ?? null, tonic, mode)
      ),
    [chords, tonic, mode],
  )
```

- [ ] **Step 3: Update `scales` computation**

Find the existing `scales` computation (around line 166):

```typescript
  const scales = selectedChord
    ? getSoloScales(
        { tonic: selectedChord.tonic, type: selectedChord.type, degree: selectedChord.degree },
        mode
      )
    : null
```

Replace with:

```typescript
  const scales = selectedChord
    ? (functionalAnalyses[selectedIndex]?.scalesOverride ??
        getSoloScales(
          { tonic: selectedChord.tonic, type: selectedChord.type, degree: selectedChord.degree },
          mode,
        ))
    : null
```

Note: `selectedIndex` is computed just above this (line 135 in the original). No change needed there — it remains `const selectedIndex = selectedChord ? chords.indexOf(...) : -1` or equivalent. Verify the variable name is in scope; it is, from the existing code.

Wait — in the original `progressions-tab.tsx`, `selectedIndex` is the state variable (`const [selectedIndex, setSelectedIndex] = useState<number | null>(0)`). The actual index in the chords array is derived differently. Re-examine: `selectedIndex` is the state (an index into the `chords` array, or null). So `functionalAnalyses[selectedIndex!]` should work when `selectedIndex !== null`.

The updated scales computation:

```typescript
  const scales = selectedChord
    ? (selectedIndex !== null
        ? (functionalAnalyses[selectedIndex]?.scalesOverride ?? getSoloScales(
            { tonic: selectedChord.tonic, type: selectedChord.type, degree: selectedChord.degree },
            mode,
          ))
        : getSoloScales(
            { tonic: selectedChord.tonic, type: selectedChord.type, degree: selectedChord.degree },
            mode,
          ))
    : null
```

- [ ] **Step 4: Update chord block Roman rendering**

In the chord block render (the `previewChords.map(...)` section, around line 349), the `ChordQualityBlock` currently receives:

```tsx
roman={chord.roman}
```

Change to:

```tsx
roman={
  !previewedSub && selectedIndex !== null
    ? (functionalAnalyses[i]?.romanOverride ?? chord.roman)
    : chord.roman
}
```

Note: `functionalAnalyses` has the same length as `chords` (the original chords). When `previewedSub === null`, `previewChords` and `chords` have the same length and the same indices, so `functionalAnalyses[i]` is always defined. When `previewedSub !== null`, we use `chord.roman` (the substitution preview's own Roman), so the out-of-bounds access doesn't matter.

- [ ] **Step 5: Update the three `onChordSelect` call sites**

**Site 1 — mount effect (around line 158):**

Find:
```typescript
  useEffect(() => {
    const chord = chords[0]
    if (chord) {
      const soloScales = getSoloScales({ tonic: chord.tonic, type: chord.type, degree: chord.degree }, mode)
      onChordSelect?.(chord.tonic, chord.type, chord.quality, soloScales.primary.scaleName)
    }
  }, []) // intentionally empty: only on mount
```

Replace with:
```typescript
  useEffect(() => {
    const chord = chords[0]
    if (chord) {
      const firstAnalysis = analyzeFunctionalContext(chord, chords[1] ?? null, tonic, mode)
      const soloScales = firstAnalysis.scalesOverride ??
        getSoloScales({ tonic: chord.tonic, type: chord.type, degree: chord.degree }, mode)
      onChordSelect?.(chord.tonic, chord.type, chord.quality, soloScales.primary.scaleName)
    }
  }, []) // intentionally empty: only on mount
```

**Site 2 — `handleIndexClick` (around line 192):**

Find:
```typescript
      const soloScales = getSoloScales({ tonic: chord.tonic, type: chord.type, degree: chord.degree }, mode)
      onChordSelect?.(chord.tonic, chord.type, chord.quality, soloScales.primary.scaleName)
```

Replace with:
```typescript
      const analysis  = functionalAnalyses[index]
      const soloScales = analysis?.scalesOverride ??
        getSoloScales({ tonic: chord.tonic, type: chord.type, degree: chord.degree }, mode)
      onChordSelect?.(chord.tonic, chord.type, chord.quality, soloScales.primary.scaleName)
```

(Note: `handleIndexClick` receives `index: number` as its parameter.)

**Site 3 — `handleSelectionChange` (around line 213):**

Find:
```typescript
    const chord0 = newChords[0]
    if (chord0) {
      const soloScales = getSoloScales({ tonic: chord0.tonic, type: chord0.type, degree: chord0.degree }, newMode)
      onChordSelect?.(chord0.tonic, chord0.type, chord0.quality, soloScales.primary.scaleName)
    }
```

Replace with:
```typescript
    const chord0 = newChords[0]
    if (chord0) {
      const firstAnalysis = analyzeFunctionalContext(chord0, newChords[1] ?? null, tonic, newMode)
      const soloScales = firstAnalysis.scalesOverride ??
        getSoloScales({ tonic: chord0.tonic, type: chord0.type, degree: chord0.degree }, newMode)
      onChordSelect?.(chord0.tonic, chord0.type, chord0.quality, soloScales.primary.scaleName)
    }
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add app/(app)/reference/_components/progressions-tab.tsx
git commit -m "feat: show functional Roman numerals and context-aware scales in Progressions tab"
```

---

## Task 5: Update Key Finder to show functional Roman numerals

**Files:**
- Modify: `app/(app)/tools/key-finder/_components/key-finder-client.tsx`

When a key result is selected, compute functional analysis for the ordered chord sequence and pass the `romanOverride` to each `ResultChordBadge`.

- [ ] **Step 1: Add imports to `key-finder-client.tsx`**

At the top of `key-finder-client.tsx`, add:

```typescript
import { analyzeFunctionalContext, qualityFromType } from "@/lib/theory"
import type { FunctionalAnalysis } from "@/lib/theory"
```

- [ ] **Step 2: Add `functionalRomans` useMemo**

Inside `KeyFinderClient`, after the `groupedResults` useMemo (around line 53), add:

```typescript
  // Compute functional Roman numeral overrides for the selected result's chord sequence
  const functionalRomans = useMemo((): FunctionalAnalysis[] | null => {
    if (!selectedResult) return null
    const contexts = selectedResult.chordAnalysis.map(a => ({
      tonic:   a.inputChord.root,
      type:    a.inputChord.type,
      quality: qualityFromType(a.inputChord.type),
      roman:   a.roman,
    }))
    return contexts.map((ctx, i) =>
      analyzeFunctionalContext(
        ctx,
        contexts[i + 1] ?? null,
        selectedResult.tonic,
        selectedResult.mode,
      )
    )
  }, [selectedResult])
```

- [ ] **Step 3: Pass `romanOverride` to `ResultChordBadge`**

In the JSX where `ResultChordBadge` is rendered (around line 165), change:

```tsx
                          {result.chordAnalysis.map((analysis, i) => (
                            <ResultChordBadge
                              key={i}
                              analysis={analysis}
                              symbol={analysis.inputChord.symbol}
                            />
                          ))}
```

To:

```tsx
                          {result.chordAnalysis.map((analysis, i) => (
                            <ResultChordBadge
                              key={i}
                              analysis={analysis}
                              symbol={analysis.inputChord.symbol}
                              romanOverride={
                                isActive && functionalRomans
                                  ? (functionalRomans[i]?.romanOverride ?? null)
                                  : null
                              }
                            />
                          ))}
```

The `isActive` guard ensures functional Romans only display when the result row is expanded/selected.

- [ ] **Step 4: Update `ResultChordBadgeProps` and the component**

Find the `ResultChordBadgeProps` interface (around line 189):

```typescript
interface ResultChordBadgeProps {
  analysis: ChordAnalysis
  symbol: string
}
```

Change to:

```typescript
interface ResultChordBadgeProps {
  analysis: ChordAnalysis
  symbol: string
  romanOverride?: string | null
}
```

Find the `ResultChordBadge` function signature and destructuring:

```typescript
function ResultChordBadge({ analysis, symbol }: ResultChordBadgeProps) {
```

Change to:

```typescript
function ResultChordBadge({ analysis, symbol, romanOverride }: ResultChordBadgeProps) {
```

Find the Roman numeral span (around line 206):

```tsx
      <span className="text-[10px] text-muted-foreground mb-1">{analysis.roman}</span>
```

Change to:

```tsx
      <span className="text-[10px] text-muted-foreground mb-1">
        {romanOverride ?? analysis.roman}
      </span>
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/(app)/tools/key-finder/_components/key-finder-client.tsx
git commit -m "feat: show functional Roman numerals in Key Finder chord badges"
```

---

## Self-Review

### 1. Spec coverage

| Requirement | Covered by |
|-------------|-----------|
| Rule 1: Secondary dominant to minor (V7→min, P4) | Task 2 `functional-harmony.ts` |
| Rule 2: Secondary dominant to major (V7→maj, P4) | Task 2 |
| Rule 3: Related ii chord (m7→dom7, P4) | Task 2 |
| Rule 4: Extended dominant chain (dom7→dom7, P4) | Task 2 |
| Rule 5: Tritone substitution (dom7, m2 down) | Task 2 |
| Rule 6: Diminished passing chord (dim7, m2 up) | Task 2 (+ "Whole-Half Diminished" scale in Task 1) |
| Rule 7: Deceptive resolution to minor (dom7→min, M2 up) | Task 2 |
| Roman numeral display overrides | Task 4 (progressions-tab) + Task 5 (key-finder) |
| Context-aware scale suggestions | Task 4 (progressions-tab) |
| Progressions view coverage | Task 4 |
| Key Finder coverage (once key selected) | Task 5 |
| My Progressions editor | Covered by Task 4 — saved progressions are viewed through `progressions-tab.tsx` with `userProgressions` prop |
| Look-ahead on next chord | All rules in Task 2 check `nextChord` |

### 2. Placeholder scan

No TBDs. Every step has complete code.

### 3. Type consistency

- `ChordContext` defined in `functional-harmony.ts`, used in progressions-tab.tsx via structural compatibility with `ProgressionChord` (same field names), and explicitly constructed in key-finder-client.tsx. ✓
- `FunctionalAnalysis` defined in `functional-harmony.ts`, imported as a type everywhere it's used. ✓
- `SoloScales` from `@/lib/theory/types` — imported in `functional-harmony.ts` and used as the `scalesOverride` type. The shape matches what `SoloScalesPanel` consumes. ✓
- `functionalAnalyses[i]` is a `FunctionalAnalysis`, so accessing `.romanOverride` and `.scalesOverride` is type-safe. ✓
- In progressions-tab.tsx, `functionalAnalyses` is always the same length as `chords` (both originate from the same `chords` array). When `previewedSub === null`, `previewChords` also has the same length. Safe. ✓

### 4. Test gap: `FunctionalAnalysis` type not in `types.ts`

`FunctionalAnalysis` is exported from `functional-harmony.ts`, re-exported via `index.ts`. The mock in the three test files returns an object of that shape — this works with vitest's type-erased runtime mocking. No issue. ✓
