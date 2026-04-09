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
import { applyFunctionalRomanOverrides, type ChordAnalysis } from "@/lib/theory/key-finder"

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
  it("maps -7 to minor (jazz notation)",   () => expect(qualityFromType("-7")).toBe("minor"))
  it("maps -9 to minor (jazz notation)",   () => expect(qualityFromType("-9")).toBe("minor"))
  it("maps °7 to diminished",              () => expect(qualityFromType("°7")).toBe("diminished"))
  it("maps M to major (uppercase shorthand)", () => expect(qualityFromType("M")).toBe("major"))
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

// ---------------------------------------------------------------------------
// Tonic suppression — rules 1, 2, 3, 4 do NOT fire when the resolution target
// is the key tonic (that would produce meaningless "V7/I", "ii/I" labels).
// ---------------------------------------------------------------------------
describe("analyzeFunctionalContext — tonic suppression", () => {
  it("Rule 2 suppressed: G7 → Cmaj7 in C (P4 up but target C = tonic)", () => {
    // Standard V7 → I cadence; G→C is P4 up and C IS the tonic → no override
    const r = analyzeFunctionalContext(
      c("G", "7", "dominant", "V"),
      c("C", "maj7", "major", "I"),
      "C", "major",
    )
    expect(r.romanOverride).toBeNull()
    expect(r.scalesOverride).toBeNull()
  })

  it("Rule 2 NOT suppressed: C7 → Fmaj7 in C (P4 up, F is IV not tonic)", () => {
    // C7 is a secondary dominant resolving to IV — C→F is P4 up, F ≠ tonic C
    const r = analyzeFunctionalContext(
      c("C", "7", "dominant", "I"),
      c("F", "maj7", "major", "IV"),
      "C", "major",
    )
    expect(r.romanOverride).toBe("V7/IV")
    expect(r.scalesOverride!.primary.scaleName).toBe("Mixolydian")
  })

  it("Rule 1 suppressed: E7 → Am7 in A minor (Am7 root = tonic A)", () => {
    // Standard V7 → i in minor — E→A is P4 up but A IS the tonic in Am
    const r = analyzeFunctionalContext(
      c("E", "7", "dominant", "V"),
      c("A", "m7", "minor", "i"),
      "A", "minor",
    )
    expect(r.romanOverride).toBeNull()
  })

  it("Rule 3 suppressed: Dm7 → G7 in C (target = C = tonic, standard ii-V-I)", () => {
    // D→G is P4 up; target (P4 above G) = C = degree 1 → no secondary override
    const r = analyzeFunctionalContext(
      c("D", "m7", "minor", "ii"),
      c("G", "7", "dominant", "V"),
      "C", "major",
    )
    expect(r.romanOverride).toBeNull()
    expect(r.scalesOverride).toBeNull()
  })

  it("Rule 3 NOT suppressed: Gm7 → C7 in C (target = F = IV, not tonic)", () => {
    // G→C is P4 up; target (P4 above C) = F = degree 4 → fires as ii/IV
    const r = analyzeFunctionalContext(
      c("G", "m7", "minor", "v"),
      c("C", "7", "dominant", "I"),
      "C", "major",
    )
    expect(r.romanOverride).toBe("ii/IV")
    expect(r.scalesOverride!.primary.scaleName).toBe("Dorian")
  })

  it("Rule 4 suppressed: G7 → C7 in C (dominant→dominant P4 up, C = tonic)", () => {
    const r = analyzeFunctionalContext(
      c("G", "7", "dominant", "V"),
      c("C", "7", "dominant", "I"),
      "C", "major",
    )
    expect(r.romanOverride).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// applyFunctionalRomanOverrides — shared post-pass used across the whole app
// ---------------------------------------------------------------------------

function analysis(
  root: string, type: string, roman: string,
  score: number, role: ChordAnalysis["role"],
): ChordAnalysis {
  return {
    inputChord: { root, type, symbol: `${root}${type}` },
    degree: null,
    roman,
    score,
    role,
  }
}

describe("applyFunctionalRomanOverrides", () => {
  it("C7 (score 1.0 diatonic) → Fmaj7: gets V7/IV override (no score-gate)", () => {
    // Core regression: the old guard skipped diatonic chords (score >= 1.0),
    // letting C7 show as "I" instead of "V7/IV"
    const analyses: ChordAnalysis[] = [
      analysis("C", "7",    "I",  1.0, "diatonic"),
      analysis("F", "maj7", "IV", 1.0, "diatonic"),
    ]
    const result = applyFunctionalRomanOverrides(analyses, "C", "major")
    expect(result[0]!.roman).toBe("V7/IV")
    expect(result[1]!.roman).toBe("IV")
  })

  it("Cmaj7-Gm7-C7-Fmaj7 in C major: I, ii/IV, V7/IV, IV", () => {
    const analyses: ChordAnalysis[] = [
      analysis("C", "maj7", "I",  1.0, "diatonic"),
      analysis("G", "m7",   "v",  0.6, "borrowed"),
      analysis("C", "7",    "I",  1.0, "diatonic"),
      analysis("F", "maj7", "IV", 1.0, "diatonic"),
    ]
    const result = applyFunctionalRomanOverrides(analyses, "C", "major")
    expect(result[0]!.roman).toBe("I")      // no secondary role
    expect(result[1]!.roman).toBe("ii/IV")  // rule 3
    expect(result[2]!.roman).toBe("V7/IV")  // rule 2
    expect(result[3]!.roman).toBe("IV")     // last chord — no next
  })

  it("standard ii-V-I Dm7-G7-Cmaj7 in C: no overrides (tonic suppression)", () => {
    const analyses: ChordAnalysis[] = [
      analysis("D", "m7",   "ii", 1.0, "diatonic"),
      analysis("G", "7",    "V",  1.0, "diatonic"),
      analysis("C", "maj7", "I",  1.0, "diatonic"),
    ]
    const result = applyFunctionalRomanOverrides(analyses, "C", "major")
    expect(result[0]!.roman).toBe("ii")
    expect(result[1]!.roman).toBe("V")
    expect(result[2]!.roman).toBe("I")
  })

  it("secondary ii-V-I to IV: Em7-A7-Dm7 → ii/ii, V7/ii, ii", () => {
    const analyses: ChordAnalysis[] = [
      analysis("E", "m7",  "iii", 1.0, "diatonic"),
      analysis("A", "7",   "VI",  0.5, "secondary-dominant"),
      analysis("D", "m7",  "ii",  1.0, "diatonic"),
    ]
    const result = applyFunctionalRomanOverrides(analyses, "C", "major")
    expect(result[0]!.roman).toBe("ii/ii")   // rule 3 (Em7→A7, target=D=ii)
    expect(result[1]!.roman).toBe("V7/ii")   // rule 1 (A7→Dm7, minor target, P4 up)
    expect(result[2]!.roman).toBe("ii")      // last chord — no override
  })

  it("A7-D7 secondary chain: V7/II then V7/V in G context", () => {
    // In C major: A7→D7 (dom→dom, P4 up, D≠tonic C) → V7/II
    //             D7→G7 (dom→dom, P4 up, G≠tonic C) → V7/V
    const analyses: ChordAnalysis[] = [
      analysis("A", "7", "VI", 0.5, "secondary-dominant"),
      analysis("D", "7", "II", 0.5, "secondary-dominant"),
      analysis("G", "7", "V",  1.0, "diatonic"),
    ]
    const result = applyFunctionalRomanOverrides(analyses, "C", "major")
    expect(result[0]!.roman).toBe("V7/II")
    expect(result[1]!.roman).toBe("V7/V")
    expect(result[2]!.roman).toBe("V")      // G7→nothing, no next chord
  })
})
