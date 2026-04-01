import { describe, it, expect } from "vitest"
import { getAllFretboardPositions } from "@/lib/rendering/fretboard"

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
