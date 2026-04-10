import { describe, it, expect } from "vitest"
import { buildProgressionChords } from "@/app/(app)/tools/progression-analyser/_lib/build-progression-chords"
import type { InputChord, ChordAnalysis } from "@/lib/theory/key-finder"

function inputChord(root: string, type: string): InputChord {
  return { root, type, symbol: `${root}${type}` }
}

function analysis(degree: number | null, roman: string, role: ChordAnalysis["role"] = "diatonic"): ChordAnalysis {
  return {
    inputChord: { root: "C", type: "", symbol: "C" },
    degree,
    roman,
    score: 1,
    role,
  }
}

describe("buildProgressionChords", () => {
  it("maps diatonic chord with known degree", () => {
    const result = buildProgressionChords(
      [inputChord("C", "maj7")],
      [analysis(1, "I")],
    )
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      tonic: "C",
      type: "maj7",
      roman: "I",
      degree: 1,
      quality: "major",
      nashville: "1",
    })
  })

  it("falls back degree to 1 when analysis degree is null", () => {
    const result = buildProgressionChords(
      [inputChord("Db", "7")],
      [analysis(null, "♭II", "non-diatonic")],
    )
    expect(result[0]!.degree).toBe(1)
    expect(result[0]!.roman).toBe("♭II")
    expect(result[0]!.nashville).toBe("1")
  })

  it("derives quality 'minor' for m7 type", () => {
    const result = buildProgressionChords(
      [inputChord("A", "m7")],
      [analysis(6, "vi")],
    )
    expect(result[0]!.quality).toBe("minor")
  })

  it("derives quality 'diminished' for m7b5 type", () => {
    const result = buildProgressionChords(
      [inputChord("B", "m7b5")],
      [analysis(7, "vii°")],
    )
    expect(result[0]!.quality).toBe("diminished")
  })

  it("derives quality 'dominant' for type '7'", () => {
    const result = buildProgressionChords(
      [inputChord("G", "7")],
      [analysis(5, "V7")],
    )
    expect(result[0]!.quality).toBe("dominant")
  })

  it("handles multiple chords in order", () => {
    const result = buildProgressionChords(
      [inputChord("C", "maj7"), inputChord("A", "m7"), inputChord("F", "maj7"), inputChord("G", "7")],
      [analysis(1, "I"), analysis(6, "vi"), analysis(4, "IV"), analysis(5, "V7")],
    )
    expect(result).toHaveLength(4)
    expect(result.map(c => c.roman)).toEqual(["I", "vi", "IV", "V7"])
  })
})
