import { describe, it, expect } from "vitest"
import { getTriadAsScale } from "@/lib/theory/triads"

describe("getTriadAsScale", () => {
  it("C major returns notes C E G and type 'maj'", () => {
    const scale = getTriadAsScale("C", "major")
    expect(scale.notes).toEqual(["C", "E", "G"])
    expect(scale.type).toBe("maj")
    expect(scale.tonic).toBe("C")
  })

  it("C minor returns notes C Eb G and type 'm'", () => {
    const scale = getTriadAsScale("C", "minor")
    expect(scale.notes).toEqual(["C", "Eb", "G"])
    expect(scale.type).toBe("m")
  })

  it("C diminished returns notes C Eb Gb and type 'dim'", () => {
    const scale = getTriadAsScale("C", "diminished")
    expect(scale.notes).toEqual(["C", "Eb", "Gb"])
    expect(scale.type).toBe("dim")
  })

  it("C augmented returns 3 notes starting with C E and type 'aug'", () => {
    const scale = getTriadAsScale("C", "augmented")
    expect(scale.type).toBe("aug")
    expect(scale.notes).toHaveLength(3)
    expect(scale.notes[0]).toBe("C")
    expect(scale.notes[1]).toBe("E")
    // tonal returns G# (not Ab) for Caug
    expect(scale.notes[2]).toBe("G#")
  })

  it("returns a non-empty positions array", () => {
    const scale = getTriadAsScale("C", "major")
    expect(scale.positions.length).toBeGreaterThan(0)
  })

  it("works for a non-C tonic", () => {
    const scale = getTriadAsScale("A", "minor")
    expect(scale.tonic).toBe("A")
    expect(scale.notes).toEqual(["A", "C", "E"])
    expect(scale.type).toBe("m")
  })
})
