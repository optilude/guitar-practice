import { describe, it, expect } from "vitest"
import { getSoloScales } from "@/lib/theory/solo-scales"

describe("getSoloScales", () => {
  it("returns G Mixolydian as primary for G7 (degree 5) in ionian", () => {
    const result = getSoloScales({ tonic: "G", type: "7", degree: 5 }, "ionian")
    expect(result.chordTonic).toBe("G")
    expect(result.primary.scaleName).toBe("Mixolydian")
  })

  it("returns A Aeolian as primary for Am7 (degree 6) in ionian", () => {
    const result = getSoloScales({ tonic: "A", type: "m7", degree: 6 }, "ionian")
    expect(result.primary.scaleName).toBe("Aeolian (natural minor)")
  })

  it("does not include the primary scale in additional", () => {
    const result = getSoloScales({ tonic: "G", type: "7", degree: 5 }, "ionian")
    expect(result.additional.map((a) => a.scaleName)).not.toContain("Mixolydian")
  })

  it("returns Minor Pentatonic and Blues Scale as additional for dominant 7", () => {
    const result = getSoloScales({ tonic: "G", type: "7", degree: 5 }, "ionian")
    const names = result.additional.map((a) => a.scaleName)
    expect(names).toContain("Minor Pentatonic")
    expect(names).toContain("Blues Scale")
  })

  it("returns Dorian as primary for Am7 (degree 1) in dorian", () => {
    const result = getSoloScales({ tonic: "A", type: "m7", degree: 1 }, "dorian")
    expect(result.primary.scaleName).toBe("Dorian")
  })

  it("returns Lydian as primary for Fmaj7 (degree 4) in ionian", () => {
    const result = getSoloScales({ tonic: "F", type: "maj7", degree: 4 }, "ionian")
    expect(result.primary.scaleName).toBe("Lydian")
  })

  it("filters Lydian from additional when primary is already Lydian", () => {
    const result = getSoloScales({ tonic: "F", type: "maj7", degree: 4 }, "ionian")
    // primary is Lydian; additional for maj7 includes Lydian — should be filtered out
    expect(result.additional.map((a) => a.scaleName)).not.toContain("Lydian")
  })
})
