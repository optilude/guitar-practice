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
