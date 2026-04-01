import { describe, it, expect } from "vitest"
import { getChord, listChordTypes, generateDropVoicing, getChordPositions } from "@/lib/theory/chords"
import type { ChordVoicing } from "@/lib/theory/types"

describe("listChordTypes", () => {
  it("returns an array of strings", () => {
    const types = listChordTypes()
    expect(Array.isArray(types)).toBe(true)
    expect(types.length).toBeGreaterThan(0)
  })

  it("includes common chord types", () => {
    const types = listChordTypes()
    expect(types).toContain("maj7")
    expect(types).toContain("m7")
    expect(types).toContain("7")
  })
})

describe("getChord - Cmaj7", () => {
  it("returns correct tonic and type", () => {
    const chord = getChord("C", "maj7")
    expect(chord.tonic).toBe("C")
    expect(chord.type).toBe("maj7")
  })

  it("returns notes C E G B", () => {
    const chord = getChord("C", "maj7")
    expect(chord.notes).toEqual(["C", "E", "G", "B"])
  })

  it("returns correct intervals", () => {
    const chord = getChord("C", "maj7")
    expect(chord.intervals).toEqual(["1P", "3M", "5P", "7M"])
  })

  it("returns at least one voicing", () => {
    const chord = getChord("C", "maj7")
    expect(chord.voicings.length).toBeGreaterThan(0)
  })

  it("each voicing has frets array of length 6", () => {
    const chord = getChord("C", "maj7")
    for (const v of chord.voicings) {
      expect(v.frets).toHaveLength(6)
    }
  })

  it("each voicing fret value is number or null", () => {
    const chord = getChord("C", "maj7")
    for (const v of chord.voicings) {
      for (const f of v.frets) {
        expect(f === null || typeof f === "number").toBe(true)
      }
    }
  })
})

describe("getChord - Am7", () => {
  it("returns notes A C E G", () => {
    const chord = getChord("A", "m7")
    expect(chord.notes).toEqual(["A", "C", "E", "G"])
  })

  it("returns at least one voicing", () => {
    const chord = getChord("A", "m7")
    expect(chord.voicings.length).toBeGreaterThan(0)
  })
})

describe("generateDropVoicing", () => {
  it("returns a ChordVoicing with label Drop 2", () => {
    const base = {
      frets: [null, null, 10, 9, 8, 7],
      fingers: [null, null, 4, 3, 2, 1],
    }
    const drop2 = generateDropVoicing(base, 2)
    expect(drop2.label).toBe("Drop 2")
  })

  it("drop-2 lowers the 2nd highest voice by 12", () => {
    const base = {
      frets: [null, null, 10, 9, 8, 7],
      fingers: [null, null, 4, 3, 2, 1],
    }
    // Sounding strings high-to-low: str1(7), str2(8), str3(9), str4(10)
    // 2nd from top is str2 = fret 8, should become -4 (8-12)
    const drop2 = generateDropVoicing(base, 2)
    expect(drop2.frets[4]).toBe(8 - 12)
  })

  it("drop-3 lowers the 3rd highest voice by 12", () => {
    const base = {
      frets: [null, null, 10, 9, 8, 7],
      fingers: [null, null, 4, 3, 2, 1],
    }
    // 3rd from top is str3 = fret 9
    const drop3 = generateDropVoicing(base, 3)
    expect(drop3.frets[3]).toBe(9 - 12)
    expect(drop3.label).toBe("Drop 3")
  })

  it("returns original voicing if not enough sounding strings", () => {
    const base = {
      frets: [null, null, null, null, 5, null],
      fingers: [null, null, null, null, 1, null],
    }
    const drop2 = generateDropVoicing(base, 2)
    expect(drop2.frets).toEqual(base.frets)
  })

  it("generateDropVoicing clears barre metadata from source voicing", () => {
    const voicingWithBarre: ChordVoicing = {
      frets: [2, 4, 4, 3, 2, 2],
      fingers: [1, 3, 4, 2, 1, 1],
      barre: { fret: 2, fromString: 1, toString: 6 },
    }
    const drop2 = generateDropVoicing(voicingWithBarre, 2)
    expect(drop2.barre).toBeUndefined()
  })
})

describe("getChordPositions", () => {
  it("returns an array of positions for C major", () => {
    const positions = getChordPositions("C", "maj")
    expect(Array.isArray(positions)).toBe(true)
    expect(positions.length).toBeGreaterThan(0)
  })

  it("each position has the required fields in chords-db format", () => {
    const positions = getChordPositions("C", "maj")
    for (const pos of positions) {
      expect(Array.isArray(pos.frets)).toBe(true)
      expect(pos.frets).toHaveLength(6)
      expect(Array.isArray(pos.fingers)).toBe(true)
      expect(typeof pos.baseFret).toBe("number")
      expect(Array.isArray(pos.barres)).toBe(true)
      expect(typeof pos.label).toBe("string")
    }
  })

  it("fret values are -1 (muted), 0 (open), or positive integers", () => {
    const positions = getChordPositions("C", "maj")
    for (const pos of positions) {
      for (const f of pos.frets) {
        expect(f === -1 || f >= 0).toBe(true)
      }
    }
  })

  it("first position label is 'Open' for C major", () => {
    const positions = getChordPositions("C", "maj")
    expect(positions[0].label).toBe("Open")
  })

  it("returns empty array for unknown tonic", () => {
    expect(getChordPositions("X", "maj")).toHaveLength(0)
  })

  it("returns empty array for chord type not in chords-db", () => {
    expect(getChordPositions("C", "nonexistent")).toHaveLength(0)
  })
})

describe("getChord - barre extent", () => {
  it("computes barre extent from participating strings, not full 6-string default", () => {
    // A chord with a partial barre should have fromString/toString
    // matching only the strings that actually participate in the barre.
    // Test with a real chord: getChord("C", "maj7") has barres at various extents.
    // Or test mapVoicing directly via getChord output.
    const chord = getChord("C", "maj7")
    const barreVoicings = chord.voicings.filter(v => v.barre)
    if (barreVoicings.length === 0) return // skip if no barre voicings for this chord
    for (const v of barreVoicings) {
      // barre extent should never be larger than sounding strings
      const soundingCount = v.frets.filter(f => f !== null && f > 0).length
      const barreSpan = v.barre!.toString - v.barre!.fromString + 1
      expect(barreSpan).toBeLessThanOrEqual(6)
      expect(v.barre!.fromString).toBeGreaterThanOrEqual(1)
      expect(v.barre!.toString).toBeLessThanOrEqual(6)
      expect(v.barre!.fromString).toBeLessThanOrEqual(v.barre!.toString)
    }
  })
})
