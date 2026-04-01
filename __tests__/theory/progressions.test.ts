import { describe, it, expect } from "vitest"
import { listProgressions, getProgression } from "@/lib/theory/progressions"

describe("listProgressions", () => {
  it("returns an array of Progression objects", () => {
    const progs = listProgressions()
    expect(Array.isArray(progs)).toBe(true)
    expect(progs.length).toBeGreaterThan(0)
  })

  it("each progression has name, description, and degrees array", () => {
    const progs = listProgressions()
    for (const p of progs) {
      expect(typeof p.name).toBe("string")
      expect(typeof p.description).toBe("string")
      expect(Array.isArray(p.degrees)).toBe(true)
      expect(p.degrees.length).toBeGreaterThan(0)
    }
  })

  it("includes ii-V-I and I-IV-V", () => {
    const progs = listProgressions()
    const names = progs.map((p) => p.name)
    expect(names).toContain("ii-V-I")
    expect(names).toContain("I-IV-V")
  })
})

describe("getProgression - ii-V-I in C", () => {
  it("returns 3 chords", () => {
    const chords = getProgression("ii-V-I", "C")
    expect(chords).toHaveLength(3)
  })

  it("first chord is Dm7 (ii)", () => {
    const chords = getProgression("ii-V-I", "C")
    expect(chords[0].tonic).toBe("D")
    expect(chords[0].type).toBe("m7")
    expect(chords[0].roman).toBe("ii")
    expect(chords[0].nashville).toBe("2")
  })

  it("second chord is G7 (V)", () => {
    const chords = getProgression("ii-V-I", "C")
    expect(chords[1].tonic).toBe("G")
    expect(chords[1].type).toBe("7")
    expect(chords[1].roman).toBe("V")
    expect(chords[1].nashville).toBe("5")
  })

  it("third chord is Cmaj7 (I)", () => {
    const chords = getProgression("ii-V-I", "C")
    expect(chords[2].tonic).toBe("C")
    expect(chords[2].type).toBe("maj7")
    expect(chords[2].roman).toBe("I")
    expect(chords[2].nashville).toBe("1")
  })
})

describe("getProgression - I-IV-V in G", () => {
  it("returns 3 chords", () => {
    const chords = getProgression("I-IV-V", "G")
    expect(chords).toHaveLength(3)
  })

  it("first chord is G (I)", () => {
    const chords = getProgression("I-IV-V", "G")
    expect(chords[0].tonic).toBe("G")
    expect(chords[0].roman).toBe("I")
  })

  it("second chord is C (IV)", () => {
    const chords = getProgression("I-IV-V", "G")
    expect(chords[1].tonic).toBe("C")
    expect(chords[1].roman).toBe("IV")
  })

  it("third chord is D (V)", () => {
    const chords = getProgression("I-IV-V", "G")
    expect(chords[2].tonic).toBe("D")
    expect(chords[2].roman).toBe("V")
  })
})

describe("getProgression - unknown name", () => {
  it("returns empty array for unknown progression name", () => {
    const chords = getProgression("Unknown-Progression", "C")
    expect(chords).toEqual([])
  })
})
