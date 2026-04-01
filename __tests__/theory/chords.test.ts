import { describe, it, expect } from "vitest"
import { getChord, listChordTypes, generateDropVoicing } from "@/lib/theory/chords"

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
})
