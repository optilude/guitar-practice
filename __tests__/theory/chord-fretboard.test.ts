import { describe, it, expect } from "vitest"
import { getChordAsScale } from "@/lib/theory/chords"

describe("getChordAsScale", () => {
  it("maps 'major' db suffix to tonal 'maj' and returns C E G", () => {
    const scale = getChordAsScale("C", "major")
    expect(scale.notes).toEqual(["C", "E", "G"])
    expect(scale.type).toBe("maj")
    expect(scale.tonic).toBe("C")
  })

  it("maps 'minor' db suffix to tonal 'm' and returns C Eb G", () => {
    const scale = getChordAsScale("C", "minor")
    expect(scale.notes).toEqual(["C", "Eb", "G"])
    expect(scale.type).toBe("m")
  })

  it("passes 'maj7' through unchanged and returns C E G B", () => {
    const scale = getChordAsScale("C", "maj7")
    expect(scale.notes).toEqual(["C", "E", "G", "B"])
    expect(scale.type).toBe("maj7")
  })

  it("maps 'maj7 shell' to tonal 'maj7' and returns C E G B", () => {
    const scale = getChordAsScale("C", "maj7 shell")
    expect(scale.notes).toEqual(["C", "E", "G", "B"])
    expect(scale.type).toBe("maj7")
  })

  it("maps '7 shell' to tonal '7' and returns C E G Bb", () => {
    const scale = getChordAsScale("C", "7 shell")
    expect(scale.notes).toEqual(["C", "E", "G", "Bb"])
    expect(scale.type).toBe("7")
  })

  it("maps 'm7 shell' to tonal 'm7' and returns C Eb G Bb", () => {
    const scale = getChordAsScale("C", "m7 shell")
    expect(scale.notes).toEqual(["C", "Eb", "G", "Bb"])
    expect(scale.type).toBe("m7")
  })

  it("returns a non-empty positions array", () => {
    const scale = getChordAsScale("C", "major")
    expect(scale.positions.length).toBeGreaterThan(0)
  })

  it("works for a non-C tonic", () => {
    const scale = getChordAsScale("G", "major")
    expect(scale.tonic).toBe("G")
    expect(scale.notes).toEqual(["G", "B", "D"])
    expect(scale.type).toBe("maj")
  })
})
