import { describe, it, expect } from "vitest"
import { getUserProgressionChords } from "./user-progressions"

describe("getUserProgressionChords", () => {
  it("resolves diatonic I-V-vi-IV in C major to C G Am F", () => {
    const chords = getUserProgressionChords(["I", "V", "vi", "IV"], "major", "C")
    expect(chords.map(c => c.tonic)).toEqual(["C", "G", "A", "F"])
    expect(chords.map(c => c.quality)).toEqual(["major", "major", "minor", "major"])
  })

  it("resolves degrees in G major by transposing", () => {
    const chords = getUserProgressionChords(["I", "V", "vi", "IV"], "major", "G")
    expect(chords.map(c => c.tonic)).toEqual(["G", "D", "E", "C"])
  })

  it("resolves i-VII-VI-VII in C minor (aeolian) to Cm Bb Ab Bb", () => {
    const chords = getUserProgressionChords(["i", "VII", "VI", "VII"], "minor", "C")
    expect(chords.map(c => c.tonic)).toEqual(["C", "Bb", "Ab", "Bb"])
  })

  it("resolves borrowed ♭VII in C major to Bb", () => {
    const chords = getUserProgressionChords(["I", "♭VII", "IV"], "major", "C")
    expect(chords[1].tonic).toBe("Bb")
    expect(chords[1].quality).toBe("major")
  })

  it("resolves borrowed ♭VII in G major to F", () => {
    const chords = getUserProgressionChords(["I", "♭VII", "IV"], "major", "G")
    expect(chords[1].tonic).toBe("F")
  })

  it("uses the roman field from the stored degrees for display", () => {
    const chords = getUserProgressionChords(["I", "♭VII", "IV"], "major", "C")
    expect(chords[0].roman).toBe("I")
    expect(chords[1].roman).toBe("♭VII")
    expect(chords[2].roman).toBe("IV")
  })

  it("returns empty array for empty degrees", () => {
    expect(getUserProgressionChords([], "major", "C")).toEqual([])
  })
})
