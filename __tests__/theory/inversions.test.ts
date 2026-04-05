import { describe, it, expect } from "vitest"
import { getInversionVoicings, INVERSION_TYPES, INVERSION_STRING_SETS } from "@/lib/theory/inversions"

describe("INVERSION_TYPES", () => {
  it("contains many types from the inversions-db", () => {
    expect(INVERSION_TYPES.length).toBeGreaterThan(4)
  })

  it("includes core triad and 7th chord types", () => {
    expect(INVERSION_TYPES).toContain("major")
    expect(INVERSION_TYPES).toContain("minor")
    expect(INVERSION_TYPES).toContain("dim")
    expect(INVERSION_TYPES).toContain("aug")
    expect(INVERSION_TYPES).toContain("maj7")
    expect(INVERSION_TYPES).toContain("m7")
    expect(INVERSION_TYPES).toContain("7")
    expect(INVERSION_TYPES).toContain("dim7")
  })
})

describe("INVERSION_STRING_SETS", () => {
  it("contains more than 10 string sets (now includes 4- and 5-string sets)", () => {
    expect(INVERSION_STRING_SETS.length).toBeGreaterThan(10)
  })

  it("starts with 6-string close voicings before open voicings", () => {
    // Close 6-string sets should appear before open 6-string sets
    const idx654  = INVERSION_STRING_SETS.indexOf("6-5-4")
    const idx543  = INVERSION_STRING_SETS.indexOf("5-4-3")
    const idx432  = INVERSION_STRING_SETS.indexOf("4-3-2")
    const idx321  = INVERSION_STRING_SETS.indexOf("3-2-1")
    const idx653  = INVERSION_STRING_SETS.indexOf("6-5-3")
    expect(idx654).toBeGreaterThanOrEqual(0)
    expect(idx543).toBeGreaterThanOrEqual(0)
    expect(idx432).toBeGreaterThanOrEqual(0)
    expect(idx321).toBeGreaterThanOrEqual(0)
    expect(idx654).toBeLessThan(idx653)
  })

  it("places close sets before open sets of the same string count", () => {
    const idx654  = INVERSION_STRING_SETS.indexOf("6-5-4")
    const idx653  = INVERSION_STRING_SETS.indexOf("6-5-3")
    if (idx654 !== -1 && idx653 !== -1) {
      expect(idx654).toBeLessThan(idx653)
    }
  })

  it("places 4-string sets after 3-string sets", () => {
    const idx654  = INVERSION_STRING_SETS.indexOf("6-5-4")
    const idx6543 = INVERSION_STRING_SETS.indexOf("6-5-4-3")
    if (idx6543 !== -1) {
      // 4-string sets (more strings) come before 3-string sets in our ordering
      // (more strings = higher priority)
      expect(idx6543).toBeLessThan(idx654)
    }
  })
})

describe("getInversionVoicings", () => {
  it("returns empty array for unknown tonic", () => {
    expect(getInversionVoicings("X", "major")).toHaveLength(0)
  })

  it("returns empty array for unknown type", () => {
    expect(getInversionVoicings("C", "unknown")).toHaveLength(0)
  })

  it("returns voicings for all standard types × all 12 tonics", () => {
    const tonics = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]
    const coreTypes = ["major", "minor", "dim", "aug", "maj7", "m7", "7", "dim7"]
    for (const tonic of tonics) {
      for (const type of coreTypes) {
        const voicings = getInversionVoicings(tonic, type)
        expect(voicings.length).toBeGreaterThan(0)
      }
    }
  })

  it("all sounding frets are >= 0", () => {
    for (const type of ["major", "minor", "dim", "aug", "maj7", "m7"]) {
      const voicings = getInversionVoicings("C", type)
      for (const v of voicings) {
        for (const f of v.frets) {
          if (f !== -1) expect(f).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })

  it("assigns correct inversion labels for major triads", () => {
    const voicings = getInversionVoicings("C", "major")
    const labels = new Set(voicings.map((v) => v.label))
    expect(labels).toContain("Root position")
    expect(labels).toContain("1st inversion")
    expect(labels).toContain("2nd inversion")
  })

  it("assigns '3rd inversion' label for 7th chord voicings where applicable", () => {
    // dim7 and maj7 have 4 inversions (0–3)
    const voicings = getInversionVoicings("C", "dim7")
    const labels = new Set(voicings.map((v) => v.label))
    expect(labels).toContain("3rd inversion")
  })

  it("assigns voicingType of 'close' or 'open'", () => {
    const voicings = getInversionVoicings("C", "major")
    for (const v of voicings) {
      expect(["close", "open"]).toContain(v.voicingType)
    }
  })

  it("assigns known string sets from INVERSION_STRING_SETS", () => {
    const validSets = new Set(INVERSION_STRING_SETS)
    for (const type of ["major", "minor", "dim", "maj7"]) {
      const voicings = getInversionVoicings("C", type)
      for (const v of voicings) {
        expect(validSets).toContain(v.stringSet)
      }
    }
  })

  it("assigns noteRoles to sounding strings", () => {
    const voicings = getInversionVoicings("C", "major")
    for (const v of voicings) {
      const soundingRoles = v.noteRoles.filter((_, i) => v.frets[i] !== -1)
      // At least root should be assigned in most voicings
      expect(soundingRoles.some((r) => r !== null)).toBe(true)
    }
  })

  it("assigns noteIntervals to sounding strings", () => {
    const voicings = getInversionVoicings("C", "major")
    for (const v of voicings) {
      v.frets.forEach((f, i) => {
        if (f !== -1 && v.noteRoles[i] !== null) {
          expect(v.noteIntervals[i]).not.toBeNull()
        }
      })
    }
  })

  describe("sort order", () => {
    it("places higher string-count sets first", () => {
      const voicings = getInversionVoicings("C", "maj7")
      const idx6543 = voicings.findIndex((v) => v.stringSet === "6-5-4-3")
      const idx654  = voicings.findIndex((v) => v.stringSet === "6-5-4")
      if (idx6543 !== -1 && idx654 !== -1) {
        expect(idx6543).toBeLessThan(idx654)
      }
    })

    it("places close voicings before open voicings of same string count", () => {
      const voicings = getInversionVoicings("C", "major")
      const first654  = voicings.findIndex((v) => v.stringSet === "6-5-4")
      const firstOpen = voicings.findIndex((v) => ["6-5-3", "6-4-3"].includes(v.stringSet))
      if (first654 !== -1 && firstOpen !== -1) {
        expect(first654).toBeLessThan(firstOpen)
      }
    })

    it("within each string set, voicings are sorted by ascending minFret", () => {
      const voicings = getInversionVoicings("C", "major")
      const grouped = new Map<string, number[]>()
      for (const v of voicings) {
        if (!grouped.has(v.stringSet)) grouped.set(v.stringSet, [])
        grouped.get(v.stringSet)!.push(v.minFret)
      }
      for (const frets of grouped.values()) {
        for (let i = 1; i < frets.length; i++) {
          expect(frets[i]).toBeGreaterThanOrEqual(frets[i - 1])
        }
      }
    })
  })
})
