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

  it("returns Major Pentatonic, Bebop Dominant, Altered and Lydian Dominant as additional for dominant 7", () => {
    const result = getSoloScales({ tonic: "G", type: "7", degree: 5 }, "ionian")
    const names = result.additional.map((a) => a.scaleName)
    expect(names).toContain("Major Pentatonic")
    expect(names).toContain("Bebop Dominant")
    expect(names).toContain("Altered")
    expect(names).toContain("Lydian Dominant")
  })

  it("returns Major Pentatonic and Lydian Augmented as additional for maj7", () => {
    const result = getSoloScales({ tonic: "C", type: "maj7", degree: 1 }, "ionian")
    const names = result.additional.map((a) => a.scaleName)
    expect(names).toContain("Major Pentatonic")
    expect(names).toContain("Lydian Augmented")
  })

  it("returns Phrygian Dominant and Melodic Minor as additional for m7", () => {
    const result = getSoloScales({ tonic: "A", type: "m7", degree: 6 }, "ionian")
    const names = result.additional.map((a) => a.scaleName)
    expect(names).toContain("Minor Pentatonic")
    expect(names).toContain("Phrygian Dominant")
    expect(names).toContain("Melodic Minor")
  })

  it("returns Locrian #2 and Diminished Half-Whole as additional for dim7", () => {
    const result = getSoloScales({ tonic: "B", type: "dim7", degree: 7 }, "ionian")
    const names = result.additional.map((a) => a.scaleName)
    expect(names).toContain("Locrian #2")
    expect(names).toContain("Diminished Half-Whole")
  })
})

describe("getSoloScales — melodic minor modal family", () => {
  it("degree 1 in melodic minor context returns Melodic Minor", () => {
    const result = getSoloScales({ tonic: "C", type: "m7", degree: 1 }, "melodic minor")
    expect(result.primary.scaleName).toBe("Melodic Minor")
  })

  it("degree 2 in melodic minor context returns Dorian b2", () => {
    const result = getSoloScales({ tonic: "D", type: "m7b5", degree: 2 }, "melodic minor")
    expect(result.primary.scaleName).toBe("Dorian b2")
  })

  it("degree 3 in melodic minor context returns Lydian Augmented", () => {
    const result = getSoloScales({ tonic: "Eb", type: "maj7", degree: 3 }, "melodic minor")
    expect(result.primary.scaleName).toBe("Lydian Augmented")
  })

  it("degree 4 in melodic minor context returns Lydian Dominant", () => {
    const result = getSoloScales({ tonic: "F", type: "7", degree: 4 }, "melodic minor")
    expect(result.primary.scaleName).toBe("Lydian Dominant")
  })

  it("degree 5 in melodic minor context returns Mixolydian b6", () => {
    const result = getSoloScales({ tonic: "G", type: "7", degree: 5 }, "melodic minor")
    expect(result.primary.scaleName).toBe("Mixolydian b6")
  })

  it("degree 6 in melodic minor context returns Locrian #2", () => {
    const result = getSoloScales({ tonic: "A", type: "m7b5", degree: 6 }, "melodic minor")
    expect(result.primary.scaleName).toBe("Locrian #2")
  })

  it("degree 7 in melodic minor context returns Altered", () => {
    const result = getSoloScales({ tonic: "B", type: "7", degree: 7 }, "melodic minor")
    expect(result.primary.scaleName).toBe("Altered")
  })

  it("degree 1 in 'dorian b2' context returns Dorian b2", () => {
    const result = getSoloScales({ tonic: "D", type: "m7", degree: 1 }, "dorian b2")
    expect(result.primary.scaleName).toBe("Dorian b2")
  })

  it("degree 3 in 'dorian b2' context returns Lydian Dominant", () => {
    // dorian b2 = offset 1, degree 3 → (1+3-1) % 7 = 3 → MELODIC_MINOR_MODES[3] = "lydian dominant" → "Lydian Dominant"
    const result = getSoloScales({ tonic: "F", type: "7", degree: 3 }, "dorian b2")
    expect(result.primary.scaleName).toBe("Lydian Dominant")
  })
})

describe("getSoloScales — harmonic minor modal family", () => {
  it("degree 1 in harmonic minor context returns Harmonic Minor", () => {
    const result = getSoloScales({ tonic: "A", type: "m7", degree: 1 }, "harmonic minor")
    expect(result.primary.scaleName).toBe("Harmonic Minor")
  })

  it("degree 2 in harmonic minor context returns Locrian #6", () => {
    const result = getSoloScales({ tonic: "B", type: "m7b5", degree: 2 }, "harmonic minor")
    expect(result.primary.scaleName).toBe("Locrian #6")
  })

  it("degree 3 in harmonic minor context returns Ionian #5", () => {
    const result = getSoloScales({ tonic: "C", type: "maj7", degree: 3 }, "harmonic minor")
    expect(result.primary.scaleName).toBe("Ionian #5")
  })

  it("degree 4 in harmonic minor context returns Dorian #4", () => {
    const result = getSoloScales({ tonic: "D", type: "m7", degree: 4 }, "harmonic minor")
    expect(result.primary.scaleName).toBe("Dorian #4")
  })

  it("degree 5 in harmonic minor context returns Phrygian Dominant", () => {
    const result = getSoloScales({ tonic: "E", type: "7", degree: 5 }, "harmonic minor")
    expect(result.primary.scaleName).toBe("Phrygian Dominant")
  })

  it("degree 6 in harmonic minor context returns Lydian #2", () => {
    const result = getSoloScales({ tonic: "F", type: "maj7", degree: 6 }, "harmonic minor")
    expect(result.primary.scaleName).toBe("Lydian #2")
  })

  it("degree 7 in harmonic minor context returns Altered Diminished", () => {
    const result = getSoloScales({ tonic: "G#", type: "dim7", degree: 7 }, "harmonic minor")
    expect(result.primary.scaleName).toBe("Altered Diminished")
  })
})
