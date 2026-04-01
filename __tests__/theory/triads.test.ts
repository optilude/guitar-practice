import { describe, it, expect } from "vitest"
import { getTriadVoicings, TRIAD_TYPES, TRIAD_STRING_SETS } from "@/lib/theory/triads"

describe("TRIAD_TYPES", () => {
  it("contains exactly 4 types", () => {
    expect(TRIAD_TYPES).toHaveLength(4)
  })

  it("includes all expected triad qualities", () => {
    expect(TRIAD_TYPES).toContain("major")
    expect(TRIAD_TYPES).toContain("minor")
    expect(TRIAD_TYPES).toContain("diminished")
    expect(TRIAD_TYPES).toContain("augmented")
  })
})

describe("TRIAD_STRING_SETS", () => {
  it("lists 10 string sets in canonical order (close first, then open)", () => {
    expect(TRIAD_STRING_SETS).toHaveLength(10)
    // Close sets first: root 6→3
    expect(TRIAD_STRING_SETS[0]).toBe("6-5-4")
    expect(TRIAD_STRING_SETS[1]).toBe("5-4-3")
    expect(TRIAD_STRING_SETS[2]).toBe("4-3-2")
    expect(TRIAD_STRING_SETS[3]).toBe("3-2-1")
    // Open sets after: root 6→4
    expect(TRIAD_STRING_SETS[4]).toBe("6-5-3")
    expect(TRIAD_STRING_SETS[9]).toBe("4-2-1")
  })
})

describe("getTriadVoicings", () => {
  it("returns empty array for unknown tonic", () => {
    expect(getTriadVoicings("X", "major")).toHaveLength(0)
  })

  it("returns empty array for unknown type", () => {
    expect(getTriadVoicings("C", "unknown")).toHaveLength(0)
  })

  it("returns voicings for every tonic × type combination", () => {
    const tonics = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]
    for (const tonic of tonics) {
      for (const type of TRIAD_TYPES) {
        const voicings = getTriadVoicings(tonic, type)
        expect(voicings.length).toBeGreaterThan(0)
      }
    }
  })

  it("filters out voicings with span > 5", () => {
    for (const type of TRIAD_TYPES) {
      const voicings = getTriadVoicings("C", type)
      for (const v of voicings) {
        // Verify the fret spread is <= 5:
        // span = max(closed) - min(closed) where closed = frets relative to baseFret != -1 and != 0
        const closedRelative = v.frets.filter((f) => f > 0)
        if (closedRelative.length > 1) {
          const span = Math.max(...closedRelative) - Math.min(...closedRelative)
          expect(span).toBeLessThanOrEqual(5)
        }
      }
    }
  })

  it("never has muted strings within the string set", () => {
    // Every voicing has exactly 3 sounding strings
    for (const type of TRIAD_TYPES) {
      const voicings = getTriadVoicings("C", type)
      for (const v of voicings) {
        const sounding = v.frets.filter((f) => f !== -1)
        expect(sounding).toHaveLength(3)
      }
    }
  })

  it("all sounding frets are >= 0", () => {
    for (const type of TRIAD_TYPES) {
      const voicings = getTriadVoicings("C", type)
      for (const v of voicings) {
        for (const f of v.frets) {
          if (f !== -1) expect(f).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })

  it("assigns correct inversion labels", () => {
    const voicings = getTriadVoicings("C", "major")
    const labels = new Set(voicings.map((v) => v.label))
    expect(labels).toContain("Root position")
    expect(labels).toContain("1st inversion")
    expect(labels).toContain("2nd inversion")
  })

  it("assigns voicingType of 'close' or 'open'", () => {
    const voicings = getTriadVoicings("C", "major")
    for (const v of voicings) {
      expect(["close", "open"]).toContain(v.voicingType)
    }
  })

  it("assigns known string sets", () => {
    const validSets = new Set(TRIAD_STRING_SETS)
    const voicings = getTriadVoicings("C", "major")
    for (const v of voicings) {
      expect(validSets).toContain(v.stringSet)
    }
  })

  describe("sort order", () => {
    it("places 6-5-4 voicings before 5-4-3 voicings", () => {
      const voicings = getTriadVoicings("C", "major")
      const first654 = voicings.findIndex((v) => v.stringSet === "6-5-4")
      const first543 = voicings.findIndex((v) => v.stringSet === "5-4-3")
      if (first654 !== -1 && first543 !== -1) {
        expect(first654).toBeLessThan(first543)
      }
    })

    it("within a string set, close comes before open for the same root string", () => {
      const voicings = getTriadVoicings("C", "major")
      const idx654 = voicings.findIndex((v) => v.stringSet === "6-5-4")
      const idxOpen6 = voicings.findIndex((v) => ["6-5-3", "6-4-3"].includes(v.stringSet))
      if (idx654 !== -1 && idxOpen6 !== -1) {
        expect(idx654).toBeLessThan(idxOpen6)
      }
    })

    it("within each string set, voicings are sorted by ascending minFret", () => {
      const voicings = getTriadVoicings("C", "major")
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
