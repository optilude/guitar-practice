import { describe, it, expect } from "vitest"
import { getScale, listScaleTypes } from "@/lib/theory/scales"

describe("listScaleTypes", () => {
  it("returns an array of strings", () => {
    const types = listScaleTypes()
    expect(Array.isArray(types)).toBe(true)
    expect(types.length).toBeGreaterThan(0)
  })

  it("includes Major and Blues", () => {
    const types = listScaleTypes()
    expect(types).toContain("Major")
    expect(types).toContain("Blues")
  })

  it("includes all 7 diatonic modes", () => {
    const types = listScaleTypes()
    expect(types).toContain("Major")
    expect(types).toContain("Dorian")
    expect(types).toContain("Phrygian")
    expect(types).toContain("Lydian")
    expect(types).toContain("Mixolydian")
    expect(types).toContain("Aeolian")
    expect(types).toContain("Locrian")
  })
})

describe("getScale - C Major", () => {
  it("returns correct tonic and type", () => {
    const scale = getScale("C", "Major")
    expect(scale.tonic).toBe("C")
    expect(scale.type).toBe("Major")
  })

  it("returns 7 notes for C major", () => {
    const scale = getScale("C", "Major")
    expect(scale.notes).toHaveLength(7)
  })

  it("C major notes are C D E F G A B", () => {
    const scale = getScale("C", "Major")
    expect(scale.notes).toEqual(["C", "D", "E", "F", "G", "A", "B"])
  })

  it("returns 7 intervals", () => {
    const scale = getScale("C", "Major")
    expect(scale.intervals).toHaveLength(7)
  })

  it("first interval is 1P (root)", () => {
    const scale = getScale("C", "Major")
    expect(scale.intervals[0]).toBe("1P")
  })

  it("returns at least 1 position", () => {
    const scale = getScale("C", "Major")
    expect(scale.positions.length).toBeGreaterThan(0)
  })

  it("each position has a label and positions array", () => {
    const scale = getScale("C", "Major")
    for (const pos of scale.positions) {
      expect(typeof pos.label).toBe("string")
      expect(Array.isArray(pos.positions)).toBe(true)
    }
  })

  it("each FretPosition has string, fret, and interval", () => {
    const scale = getScale("C", "Major")
    const pos = scale.positions[0]
    for (const fp of pos.positions) {
      expect(typeof fp.string).toBe("number")
      expect(typeof fp.fret).toBe("number")
      expect(typeof fp.interval).toBe("string")
    }
  })

  it("fret position strings are in range 1-6", () => {
    const scale = getScale("C", "Major")
    for (const scalePos of scale.positions) {
      for (const fp of scalePos.positions) {
        expect(fp.string).toBeGreaterThanOrEqual(1)
        expect(fp.string).toBeLessThanOrEqual(6)
      }
    }
  })

  it("all interval labels in positions are recognized (not empty)", () => {
    const scale = getScale("C", "Major")
    for (const scalePos of scale.positions) {
      for (const fp of scalePos.positions) {
        expect(fp.interval.length).toBeGreaterThan(0)
      }
    }
  })
})

describe("getScale - C Dorian", () => {
  it("C Dorian notes are C D Eb F G A Bb", () => {
    const scale = getScale("C", "Dorian")
    expect(scale.notes).toEqual(["C", "D", "Eb", "F", "G", "A", "Bb"])
  })

  it("returns positions", () => {
    const scale = getScale("C", "Dorian")
    expect(scale.positions.length).toBeGreaterThan(0)
  })
})

describe("getScale - positionIndex", () => {
  it("returns only the requested position when positionIndex is given", () => {
    const scale = getScale("C", "Major", 0)
    expect(scale.positions).toHaveLength(1)
  })

  it("position 0 label matches Position 1", () => {
    const scale = getScale("C", "Major", 0)
    expect(scale.positions[0].label).toContain("Position 1")
  })

  it("clamps out-of-bounds positionIndex to last valid position", () => {
    const scale = getScale("C", "Major", 99)
    expect(scale.positions).toHaveLength(1)
  })
})

describe("getScale - G Major fret positions sanity", () => {
  it("G major position 1 contains root at fret 3 on string 6", () => {
    const scale = getScale("G", "Major", 0)
    const rootFret = scale.positions[0].positions.find(
      (fp) => fp.string === 6 && fp.interval === "R"
    )
    expect(rootFret).toBeDefined()
    expect(rootFret?.fret).toBe(3)
  })
})

describe("New melodic/harmonic minor mode scale types", () => {
  const newTypes = [
    "Dorian b2",
    "Mixolydian b6",
    "Locrian #6",
    "Ionian #5",
    "Dorian #4",
    "Lydian #2",
    "Altered Diminished",
  ]

  for (const type of newTypes) {
    it(`listScaleTypes() includes "${type}"`, () => {
      expect(listScaleTypes()).toContain(type)
    })

    it(`getScale("C", "${type}") returns notes and intervals`, () => {
      const scale = getScale("C", type)
      expect(scale.notes.length).toBeGreaterThan(0)
      expect(scale.intervals.length).toBeGreaterThan(0)
      expect(scale.intervals[0]).toBe("1P")
    })
  }
})
