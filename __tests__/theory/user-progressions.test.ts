import { describe, it, expect, vi } from "vitest"

// Provide diatonic chords for C major
vi.mock("@/lib/theory/harmony", () => ({
  getDiatonicChords: () => [
    { degree: 1, roman: "I",    nashville: "1", tonic: "C", type: "maj7", quality: "major" },
    { degree: 2, roman: "ii",   nashville: "2", tonic: "D", type: "m7",   quality: "minor" },
    { degree: 3, roman: "iii",  nashville: "3", tonic: "E", type: "m7",   quality: "minor" },
    { degree: 4, roman: "IV",   nashville: "4", tonic: "F", type: "maj7", quality: "major" },
    { degree: 5, roman: "V",    nashville: "5", tonic: "G", type: "7",    quality: "dominant" },
    { degree: 6, roman: "vi",   nashville: "6", tonic: "A", type: "m7",   quality: "minor" },
    { degree: 7, roman: "vii°", nashville: "7", tonic: "B", type: "m7b5", quality: "diminished" },
  ],
}))
vi.mock("@/lib/theory/transposer", () => ({
  keyPrefersSharps: () => false,
}))

import { getUserProgressionChords } from "@/lib/theory/user-progressions"

// ---------------------------------------------------------------------------
// Backward-compatibility: plain Roman numerals without ":type" suffix
// ---------------------------------------------------------------------------
describe("getUserProgressionChords — plain Roman numerals (backward compat)", () => {
  it("I → Cmaj7", () => {
    const [c] = getUserProgressionChords(["I"], "major", "C")
    expect(c!.tonic).toBe("C")
    expect(c!.type).toBe("maj7")
    expect(c!.quality).toBe("major")
  })

  it("V → G7 (diatonic dominant type)", () => {
    const [c] = getUserProgressionChords(["V"], "major", "C")
    expect(c!.tonic).toBe("G")
    expect(c!.type).toBe("7")
    expect(c!.quality).toBe("dominant")
  })

  it("IV → Fmaj7", () => {
    const [c] = getUserProgressionChords(["IV"], "major", "C")
    expect(c!.tonic).toBe("F")
    expect(c!.type).toBe("maj7")
  })
})

// ---------------------------------------------------------------------------
// "roman:type" format — fixes the round-trip preservation bug
// ---------------------------------------------------------------------------
describe("getUserProgressionChords — roman:type format", () => {
  it("v:m7 → Gm7 (not G7)", () => {
    // Bug scenario: Gm7 entered → stored as "v:m7" → must reconstruct as Gm7
    const [c] = getUserProgressionChords(["v:m7"], "major", "C")
    expect(c!.tonic).toBe("G")
    expect(c!.type).toBe("m7")
    expect(c!.quality).toBe("minor")
  })

  it("I:7 → C7 (not Cmaj7)", () => {
    // Bug scenario: C7 entered as a secondary dominant → stored as "I:7" → must reconstruct as C7
    const [c] = getUserProgressionChords(["I:7"], "major", "C")
    expect(c!.tonic).toBe("C")
    expect(c!.type).toBe("7")
    expect(c!.quality).toBe("dominant")
  })

  it("I:maj7 → Cmaj7 (explicit type matching diatonic default)", () => {
    const [c] = getUserProgressionChords(["I:maj7"], "major", "C")
    expect(c!.tonic).toBe("C")
    expect(c!.type).toBe("maj7")
    expect(c!.quality).toBe("major")
  })

  it("IV:maj7 → Fmaj7", () => {
    const [c] = getUserProgressionChords(["IV:maj7"], "major", "C")
    expect(c!.tonic).toBe("F")
    expect(c!.type).toBe("maj7")
  })

  it("full progression: Cmaj7, Gm7, C7, Fmaj7 round-trips correctly", () => {
    // This is the exact bug scenario reported by the user
    const chords = getUserProgressionChords(
      ["I:maj7", "v:m7", "I:7", "IV:maj7"],
      "major",
      "C",
    )
    expect(chords[0]).toMatchObject({ tonic: "C", type: "maj7", quality: "major" })
    expect(chords[1]).toMatchObject({ tonic: "G", type: "m7",   quality: "minor" })
    expect(chords[2]).toMatchObject({ tonic: "C", type: "7",    quality: "dominant" })
    expect(chords[3]).toMatchObject({ tonic: "F", type: "maj7", quality: "major" })
  })

  it("stored type overrides diatonic type for quality", () => {
    // "II:7" = non-standard dominant chord on degree 2 (normally Dm7 diatonically)
    const [c] = getUserProgressionChords(["II:7"], "major", "C")
    expect(c!.tonic).toBe("D")
    expect(c!.type).toBe("7")
    expect(c!.quality).toBe("dominant")
  })
})

// ---------------------------------------------------------------------------
// Accidental (borrowed/chromatic) chords — still work with stored type
// ---------------------------------------------------------------------------
describe("getUserProgressionChords — accidental chords with stored type", () => {
  it("♭VII:7 → Bb7 (borrowed dominant)", () => {
    const [c] = getUserProgressionChords(["♭VII:7"], "major", "C")
    expect(c!.tonic).toBe("Bb")
    expect(c!.type).toBe("7")
    expect(c!.quality).toBe("dominant")
  })

  it("♭VII (plain, no stored type) falls back to parseRoman quality", () => {
    // Backward compat: no ":type" → uses parseRoman quality/type
    const [c] = getUserProgressionChords(["♭VII"], "major", "C")
    expect(c!.tonic).toBe("Bb")
    // parseRoman gives type: "" (major, no suffix) — existing behavior
    expect(c!.quality).toBe("major")
  })
})
