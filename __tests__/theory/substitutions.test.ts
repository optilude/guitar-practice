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
// Modal Mixture (generalised parallel borrow)
// ---------------------------------------------------------------------------

describe("Modal Mixture", () => {
  it("fires for every degree in C major (parallel minor always differs)", () => {
    for (const [i, c] of C_MAJOR.entries()) {
      const subs = getSubstitutions(c, C_MAJOR, i, "C", "major")
      expect(subs.filter(s => s.ruleName === "Modal Mixture").length).toBeGreaterThan(0)
    }
  })

  it("offers Cm7 (i) from parallel minor for I (Cmaj7) in C major", () => {
    const subs = getSubstitutions(C_MAJOR[0]!, C_MAJOR, 0, "C", "major")
    const sub = subs.find(s => s.id === "modal-mixture-aeolian-deg1")!
    expect(sub).toBeDefined()
    const r = sub.result as { kind: "replacement"; replacements: Array<{ chord: { tonic: string; type: string } }> }
    expect(r.replacements[0]!.chord.tonic).toBe("C")
    expect(r.replacements[0]!.chord.type).toBe("m7")
  })

  it("offers Fm7 (iv) from parallel minor for IV (Fmaj7) in C major", () => {
    const subs = getSubstitutions(C_MAJOR[2]!, C_MAJOR, 2, "C", "major")
    const sub = subs.find(s => s.id === "modal-mixture-aeolian-deg4")!
    expect(sub).toBeDefined()
    const r = sub.result as { kind: "replacement"; replacements: Array<{ chord: { tonic: string; type: string } }> }
    expect(r.replacements[0]!.chord.tonic).toBe("F")
    expect(r.replacements[0]!.chord.type).toBe("m7")
  })

  it("offers Ebmaj7 (III) from parallel minor for iii (Em7) in C major", () => {
    const iiiChord = chord("E", "m7", "minor", 3, "iii")
    const progression = [...C_MAJOR, iiiChord]
    const subs = getSubstitutions(iiiChord, progression, 4, "C", "major")
    const sub = subs.find(s => s.id === "modal-mixture-aeolian-deg3")!
    expect(sub).toBeDefined()
    const r = sub.result as { kind: "replacement"; replacements: Array<{ chord: { tonic: string; type: string } }> }
    expect(r.replacements[0]!.chord.tonic).toBe("Eb")
    expect(r.replacements[0]!.chord.type).toBe("maj7")
  })

  it("does not offer parallel ionian when mode is already major/ionian", () => {
    const subs = getSubstitutions(C_MAJOR[0]!, C_MAJOR, 0, "C", "major")
    const mixture = subs.filter(s => s.ruleName === "Modal Mixture")
    expect(mixture.every(s => !s.id.includes("ionian"))).toBe(true)
  })

  it("offers both parallel minor and major when in a non-ionian/aeolian mode", () => {
    // C Dorian degree IV = F7. Parallel Ionian → Fmaj7, Parallel Aeolian → Fm7 (both differ)
    const fSeventh = chord("F", "7", "dominant", 4, "IV")
    const dorian: ProgressionChord[] = [chord("C", "m7", "minor", 1, "i"), fSeventh]
    const subs = getSubstitutions(fSeventh, dorian, 1, "C", "dorian")
    const mixture = subs.filter(s => s.ruleName === "Modal Mixture")
    expect(mixture).toHaveLength(2)
    expect(mixture.map(s => s.id)).toContain("modal-mixture-aeolian-deg4")
    expect(mixture.map(s => s.id)).toContain("modal-mixture-ionian-deg4")
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
  it("fires for any chord in the progression", () => {
    const subs = getSubstitutions(C_MAJOR[0]!, C_MAJOR, 0, "C", "major")
    expect(subs.filter(s => s.ruleName === "Diminished Passing")).toHaveLength(1)
  })

  it("fires for the last chord in the progression", () => {
    const subs = getSubstitutions(C_MAJOR[3]!, C_MAJOR, 3, "C", "major")
    expect(subs.filter(s => s.ruleName === "Diminished Passing")).toHaveLength(1)
  })

  it("inserts a dim7 chord before the selected chord (index 0)", () => {
    const subs = getSubstitutions(C_MAJOR[0]!, C_MAJOR, 0, "C", "major")
    const sub = subs.find(s => s.ruleName === "Diminished Passing")!
    const ins = sub.result as { kind: "insertion"; insertBefore: number; chords: Array<{ type: string }> }
    expect(ins.insertBefore).toBe(0)
    expect(ins.chords[0]!.type).toBe("dim7")
  })

  it("dim7 root is the leading tone (semitone below) the selected chord root", () => {
    // B is a semitone below C — the natural leading tone approaching Cmaj7
    const subs = getSubstitutions(C_MAJOR[0]!, C_MAJOR, 0, "C", "major")
    const sub = subs.find(s => s.ruleName === "Diminished Passing")!
    const ins = sub.result as { kind: "insertion"; chords: Array<{ tonic: string }> }
    expect(ins.chords[0]!.tonic).toBe("B")
  })

  it("leading tone is G# approaching A in A major (sharp key)", () => {
    // G# is a semitone below A, the leading tone approaching Amaj7
    const aMajor: ProgressionChord[] = [
      chord("A", "maj7", "major", 1, "I"),
      chord("E", "7",    "dominant", 5, "V"),
    ]
    const subs = getSubstitutions(aMajor[0]!, aMajor, 0, "A", "major")
    const sub = subs.find(s => s.ruleName === "Diminished Passing")!
    const ins = sub.result as { kind: "insertion"; chords: Array<{ tonic: string }> }
    expect(ins.chords[0]!.tonic).toBe("G#")
  })
})

// ---------------------------------------------------------------------------
// Cycle of 5ths
// ---------------------------------------------------------------------------

describe("Cycle of 5ths", () => {
  it("fires for any chord in the progression", () => {
    const subs = getSubstitutions(C_MAJOR[0]!, C_MAJOR, 0, "C", "major")
    expect(subs.filter(s => s.ruleName === "Cycle of 5ths")).toHaveLength(1)
  })

  it("fires for the last chord in the progression", () => {
    const subs = getSubstitutions(C_MAJOR[3]!, C_MAJOR, 3, "C", "major")
    expect(subs.filter(s => s.ruleName === "Cycle of 5ths")).toHaveLength(1)
  })

  it("inserts [D7, G7] before Cmaj7 (2-step dominant chain into C)", () => {
    // Selected chord = Cmaj7 (root C). V7/C = G7. V7/G = D7.
    const subs = getSubstitutions(C_MAJOR[0]!, C_MAJOR, 0, "C", "major")
    const sub = subs.find(s => s.ruleName === "Cycle of 5ths")!
    const ins = sub.result as { kind: "insertion"; insertBefore: number; chords: Array<{ tonic: string; type: string }> }
    expect(ins.insertBefore).toBe(0)
    expect(ins.chords).toHaveLength(2)
    expect(ins.chords[0]!.tonic).toBe("D")  // V7/V7/C = D7
    expect(ins.chords[1]!.tonic).toBe("G")  // V7/C = G7
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
