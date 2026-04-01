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
