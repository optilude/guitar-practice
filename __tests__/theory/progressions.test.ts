import { describe, it, expect } from "vitest"
import { listProgressions, getProgression } from "@/lib/theory/progressions"

describe("listProgressions", () => {
  it("returns exactly 15 progressions", () => {
    expect(listProgressions()).toHaveLength(15)
  })

  it("every progression has required fields", () => {
    for (const p of listProgressions()) {
      expect(typeof p.name).toBe("string")
      expect(typeof p.displayName).toBe("string")
      expect(typeof p.romanDisplay).toBe("string")
      expect(typeof p.description).toBe("string")
      expect(Array.isArray(p.degrees)).toBe(true)
      expect(p.degrees.length).toBeGreaterThan(0)
      expect(typeof p.mode).toBe("string")
      expect(typeof p.recommendedScaleType).toBe("string")
    }
  })

  it("includes pop-standard, jazz-turnaround, and folk-rock", () => {
    const names = listProgressions().map((p) => p.name)
    expect(names).toContain("pop-standard")
    expect(names).toContain("jazz-turnaround")
    expect(names).toContain("folk-rock")
  })
})

describe("getProgression", () => {
  it("returns empty array for unknown name", () => {
    expect(getProgression("unknown-progression", "C")).toEqual([])
  })

  it("resolves pop-standard chords in C: C G Am F", () => {
    const chords = getProgression("pop-standard", "C")
    expect(chords.map((c) => c.tonic)).toEqual(["C", "G", "A", "F"])
    expect(chords.map((c) => c.type)).toEqual(["maj7", "7", "m7", "maj7"])
  })

  it("returns degree on each chord", () => {
    const chords = getProgression("pop-standard", "C")
    expect(chords.map((c) => c.degree)).toEqual([1, 5, 6, 4])
  })

  it("returns quality on each chord", () => {
    const chords = getProgression("pop-standard", "C")
    expect(typeof chords[0].quality).toBe("string")
    expect(chords[0].quality.length).toBeGreaterThan(0)
  })

  it("resolves blues-rock ♭VII in C: C → Bb → F (mixolydian mode)", () => {
    const chords = getProgression("blues-rock", "C")
    expect(chords).toHaveLength(3)
    expect(chords[0].tonic).toBe("C")
    expect(chords[1].tonic).toBe("Bb")
    expect(chords[2].tonic).toBe("F")
  })

  it("resolves dark-ballad in A: A F C G (aeolian mode)", () => {
    const chords = getProgression("dark-ballad", "A")
    expect(chords.map((c) => c.tonic)).toEqual(["A", "F", "C", "G"])
  })

  it("resolves jazz-turnaround in C: Dm7 → G7 → Cmaj7", () => {
    const chords = getProgression("jazz-turnaround", "C")
    expect(chords).toHaveLength(3)
    expect(chords[0].tonic).toBe("D")
    expect(chords[0].type).toBe("m7")
    expect(chords[1].tonic).toBe("G")
    expect(chords[1].type).toBe("7")
    expect(chords[2].tonic).toBe("C")
    expect(chords[2].type).toBe("maj7")
  })

  it("pachelbel has 8 chords (I appears twice)", () => {
    const chords = getProgression("pachelbel", "C")
    expect(chords).toHaveLength(8)
  })
})
