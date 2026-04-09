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

  // Suffix decorator branches (hasDim / hasHalfDim / hasAug in parseRoman)

  it("handles vii° (diminished suffix, diatonic path) — returns degree-7 chord of C major", () => {
    const chords = getUserProgressionChords(["vii°"], "major", "C")
    expect(chords[0].tonic).toBe("B")
    expect(chords[0].roman).toBe("vii°")
    // quality comes from the diatonic lookup (m7b5 → "diminished" via QUALITY_MAP)
    expect(chords[0].quality).toBe("diminished")
  })

  it("handles ♭II° (diminished suffix, non-diatonic path) — Dbdim in C major", () => {
    // accidentals=-1, baseDegree=2, hasDim → type="dim", quality="diminished"
    // degree 2 in C major = D (chroma 2); shift -1 → chroma 1 = Db (flat key, no sharps)
    const chords = getUserProgressionChords(["♭II°"], "major", "C")
    expect(chords[0].tonic).toBe("Db")
    expect(chords[0].type).toBe("dim")
    expect(chords[0].quality).toBe("diminished")
    expect(chords[0].roman).toBe("♭II°")
  })

  it("handles #IVø (half-diminished suffix, non-diatonic path) — F#m7b5 in G major", () => {
    // G major prefers sharps; degree 4 = C (chroma 0); shift +1 → chroma 1 = C# → type="m7b5"
    // Wait: in G major degree 4 = C (chroma 0). shift +1 → chroma 1 = C# in SHARP_ROOTS
    const chords = getUserProgressionChords(["#IVø"], "major", "G")
    expect(chords[0].type).toBe("m7b5")
    expect(chords[0].quality).toBe("half-dim")
    expect(chords[0].roman).toBe("#IVø")
  })

  it("handles #I+ (augmented suffix, non-diatonic path) — Dbaug in C major", () => {
    // C major uses flat roots; degree 1 = C (chroma 0); shift +1 → chroma 1 = Db
    const chords = getUserProgressionChords(["#I+"], "major", "C")
    expect(chords[0].tonic).toBe("Db")
    expect(chords[0].type).toBe("aug")
    expect(chords[0].quality).toBe("augmented")
    expect(chords[0].roman).toBe("#I+")
  })
})
