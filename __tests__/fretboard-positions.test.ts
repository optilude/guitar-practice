import { describe, it, expect } from "vitest"
import { getAllFretboardPositions, build3NPSPositions } from "@/lib/rendering/fretboard"

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
