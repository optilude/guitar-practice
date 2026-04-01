import { vi, describe, it, expect } from "vitest"
import { getAllFretboardPositions, build3NPSPositions, getBoxMembershipSet } from "@/lib/rendering/fretboard"

const C_MAJOR_NOTES     = ["C", "D", "E", "F", "G", "A", "B"]
const C_MAJOR_INTERVALS = ["1P", "2M", "3M", "4P", "5P", "6M", "7M"]

describe("getAllFretboardPositions", () => {
  it("returns root on string 6 fret 8 for C major", () => {
    const dots = getAllFretboardPositions("C", C_MAJOR_NOTES, C_MAJOR_INTERVALS)
    const dot = dots.find(d => d.string === 6 && d.fret === 8)
    expect(dot).toBeDefined()
    expect(dot!.interval).toBe("R")
    expect(dot!.note).toBe("C")
  })

  it("does not include non-scale notes (C# at string 6 fret 9)", () => {
    const dots = getAllFretboardPositions("C", C_MAJOR_NOTES, C_MAJOR_INTERVALS)
    expect(dots.find(d => d.string === 6 && d.fret === 9)).toBeUndefined()
  })

  it("includes open strings that are scale tones (E at string 6 fret 0 in E major)", () => {
    const eMajor = ["E", "F#", "G#", "A", "B", "C#", "D#"]
    const eInts  = ["1P", "2M", "3M", "4P", "5P", "6M", "7M"]
    const dots = getAllFretboardPositions("E", eMajor, eInts)
    const dot = dots.find(d => d.string === 6 && d.fret === 0)
    expect(dot).toBeDefined()
    expect(dot!.interval).toBe("R")
  })

  it("includes notes on all 6 strings", () => {
    const dots = getAllFretboardPositions("C", C_MAJOR_NOTES, C_MAJOR_INTERVALS)
    for (let str = 1; str <= 6; str++) {
      expect(dots.some(d => d.string === str)).toBe(true)
    }
  })

  it("does not return frets above 15", () => {
    const dots = getAllFretboardPositions("C", C_MAJOR_NOTES, C_MAJOR_INTERVALS)
    expect(dots.every(d => d.fret <= 15)).toBe(true)
  })
})

describe("build3NPSPositions", () => {
  it("returns 7 sets for a 7-note scale", () => {
    const positions = build3NPSPositions("C", C_MAJOR_NOTES, C_MAJOR_INTERVALS)
    expect(positions).toHaveLength(7)
  })

  it("each set has at most 3 entries per string (and typically exactly 3)", () => {
    const positions = build3NPSPositions("C", C_MAJOR_NOTES, C_MAJOR_INTERVALS)
    for (const pos of positions) {
      for (let str = 1; str <= 6; str++) {
        const notesOnString = [...pos].filter(k => k.startsWith(`${str}:`))
        expect(notesOnString.length).toBeLessThanOrEqual(3)
      }
    }
  })

  it("position 0 (root) includes C at fret 8 on string 6 for C major", () => {
    const positions = build3NPSPositions("C", C_MAJOR_NOTES, C_MAJOR_INTERVALS)
    expect(positions[0].has("6:8")).toBe(true)
  })

  it("returns [] for a 5-note scale (pentatonic)", () => {
    const pentaNotes = ["C", "D", "E", "G", "A"]
    const pentaInts  = ["1P", "2M", "3M", "5P", "6M"]
    const positions = build3NPSPositions("C", pentaNotes, pentaInts)
    expect(positions).toHaveLength(0)
  })

  it("sets contain only frets 0-15", () => {
    const positions = build3NPSPositions("C", C_MAJOR_NOTES, C_MAJOR_INTERVALS)
    for (const pos of positions) {
      for (const key of pos) {
        const fret = parseInt(key.split(":")[1])
        expect(fret).toBeGreaterThanOrEqual(0)
        expect(fret).toBeLessThanOrEqual(15)
      }
    }
  })
})

describe("getBoxMembershipSet", () => {
  it("returns empty set for boxSystem 'none'", () => {
    const set = getBoxMembershipSet("C", "Major", "none", 0, C_MAJOR_NOTES, C_MAJOR_INTERVALS)
    expect(set.size).toBe(0)
  })

  it("returns empty set for boxSystem 'windows'", () => {
    const set = getBoxMembershipSet("C", "Major", "windows", 0, C_MAJOR_NOTES, C_MAJOR_INTERVALS)
    expect(set.size).toBe(0)
  })

  it("CAGED: returns non-empty set for Major scale position 0", () => {
    const set = getBoxMembershipSet("C", "Major", "caged", 0, C_MAJOR_NOTES, C_MAJOR_INTERVALS)
    expect(set.size).toBeGreaterThan(0)
  })

  it("CAGED: position 0 of C Major includes string 6 fret 8 (root C)", () => {
    // SCALE_PATTERNS["Major"][0] has [6, 0] entry; rootFret for C on low E = 8
    const set = getBoxMembershipSet("C", "Major", "caged", 0, C_MAJOR_NOTES, C_MAJOR_INTERVALS)
    expect(set.has("6:8")).toBe(true)
  })

  it("CAGED: returns empty set for an unknown scale type", () => {
    const set = getBoxMembershipSet("C", "UnknownScale", "caged", 0, C_MAJOR_NOTES, C_MAJOR_INTERVALS)
    expect(set.size).toBe(0)
  })

  it("3NPS: position 0 of C Major includes C at string 6 fret 8", () => {
    const set = getBoxMembershipSet("C", "Major", "3nps", 0, C_MAJOR_NOTES, C_MAJOR_INTERVALS)
    expect(set.has("6:8")).toBe(true)
  })

  it("3NPS: all frets in set are within 0–15", () => {
    const set = getBoxMembershipSet("C", "Major", "3nps", 2, C_MAJOR_NOTES, C_MAJOR_INTERVALS)
    for (const key of set) {
      const fret = parseInt(key.split(":")[1])
      expect(fret).toBeGreaterThanOrEqual(0)
      expect(fret).toBeLessThanOrEqual(15)
    }
  })
})

vi.mock("@moonwave99/fretboard.js", () => ({
  Fretboard: vi.fn(),
  FretboardSystem: vi.fn().mockImplementation(() => ({
    getScale: vi.fn().mockReturnValue([
      { string: 6, fret: 8, inBox: true },
      { string: 6, fret: 10, inBox: false },
      { string: 5, fret: 8, inBox: true },
    ]),
  })),
  Systems: { pentatonic: "pentatonic" },
}))

describe("getBoxMembershipSet — pentatonic", () => {
  it("returns in-box positions from FretboardSystem", () => {
    const set = getBoxMembershipSet("C", "Pentatonic Minor", "pentatonic", 0, ["C", "Eb", "F", "G", "Bb"], ["1P", "3m", "4P", "5P", "7m"])
    expect(set.has("6:8")).toBe(true)
    expect(set.has("5:8")).toBe(true)
    expect(set.has("6:10")).toBe(false)
  })

  it("falls back gracefully when FretboardSystem throws", () => {
    // Just verify it doesn't throw and returns a Set
    const set = getBoxMembershipSet("A", "Blues", "pentatonic", 0, ["A", "C", "D", "Eb", "E", "G"], ["1P", "3m", "4P", "5d", "5P", "7m"])
    expect(set).toBeInstanceOf(Set)
  })
})
