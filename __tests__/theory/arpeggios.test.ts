import { describe, it, expect } from "vitest"
import { getArpeggio } from "@/lib/theory/arpeggios"

describe("getArpeggio - Cmaj7", () => {
  it("returns only chord tones for Cmaj7: C E G B", () => {
    const arp = getArpeggio("C", "maj7")
    expect(arp.notes).toEqual(["C", "E", "G", "B"])
  })

  it("returns correct intervals for Cmaj7", () => {
    const arp = getArpeggio("C", "maj7")
    expect(arp.intervals).toEqual(["1P", "3M", "5P", "7M"])
  })

  it("returns tonic and type", () => {
    const arp = getArpeggio("C", "maj7")
    expect(arp.tonic).toBe("C")
    expect(arp.type).toBe("maj7")
  })

  it("returns at least one position", () => {
    const arp = getArpeggio("C", "maj7")
    expect(arp.positions.length).toBeGreaterThan(0)
  })

  it("positions only contain chord tones (R, 3, 5, 7)", () => {
    const arp = getArpeggio("C", "maj7")
    const validIntervals = new Set(["R", "3", "5", "7"])
    for (const scalePos of arp.positions) {
      for (const fp of scalePos.positions) {
        expect(validIntervals.has(fp.interval)).toBe(true)
      }
    }
  })
})

describe("getArpeggio - Am7", () => {
  it("returns notes A C E G", () => {
    const arp = getArpeggio("A", "m7")
    expect(arp.notes).toEqual(["A", "C", "E", "G"])
  })

  it("positions only contain chord tones (R, b3, 5, b7)", () => {
    const arp = getArpeggio("A", "m7")
    const validIntervals = new Set(["R", "b3", "5", "b7"])
    for (const scalePos of arp.positions) {
      for (const fp of scalePos.positions) {
        expect(validIntervals.has(fp.interval)).toBe(true)
      }
    }
  })
})

describe("getArpeggio - positionIndex", () => {
  it("returns only the requested position when positionIndex is given", () => {
    const arp = getArpeggio("C", "maj7", 0)
    expect(arp.positions).toHaveLength(1)
  })
})
