import { describe, it, expect } from "vitest"
import { getShellChordPositions, SHELL_CHORD_TYPES } from "@/lib/theory/shells"

// ---------------------------------------------------------------------------
// Spread shell voicing layout (one string skipped between each note):
//
//   6th-string root: str6 = root, str4 = 7th/6th, str3 = 3rd
//   5th-string root: str5 = root, str3 = 7th/6th, str2 = 3rd
//   4th-string root: str4 = root, str2 = 7th/6th, str1 = 3rd
//
// C maj7 shell (offsets: 7th=+1, 3rd=+1 on both str4→str6-root and str3→str6-root):
//   6th root: C@8, M7(B)@9 on str4, M3(E)@9 on str3
//             baseFret=8 → frets [1,-1,2,2,-1,-1]
//   5th root: C@3, M7(B)@4 on str3, M3(E)@5 on str2
//             baseFret=3 → frets [-1,1,-1,2,3,-1]
//   4th root: C@10, M7(B)@12 on str2, M3(E)@12 on str1
//             baseFret=10 → frets [-1,-1,1,-1,3,3]
// ---------------------------------------------------------------------------

describe("SHELL_CHORD_TYPES", () => {
  it("contains exactly 5 types", () => {
    expect(SHELL_CHORD_TYPES).toHaveLength(5)
  })

  it("includes all expected shell types", () => {
    expect(SHELL_CHORD_TYPES).toContain("maj7 shell")
    expect(SHELL_CHORD_TYPES).toContain("m7 shell")
    expect(SHELL_CHORD_TYPES).toContain("7 shell")
    expect(SHELL_CHORD_TYPES).toContain("maj6 shell")
    expect(SHELL_CHORD_TYPES).toContain("dim7/m6 shell")
  })
})

describe("getShellChordPositions", () => {
  it("returns 3 voicings for a valid tonic and shell type", () => {
    const positions = getShellChordPositions("C", "maj7 shell")
    expect(positions).toHaveLength(3)
  })

  it("labels the three voicings by root string", () => {
    const positions = getShellChordPositions("C", "maj7 shell")
    expect(positions[0].label).toBe("6th string root")
    expect(positions[1].label).toBe("5th string root")
    expect(positions[2].label).toBe("4th string root")
  })

  it("returns empty array for an unknown tonic", () => {
    expect(getShellChordPositions("X", "maj7 shell")).toHaveLength(0)
  })

  it("returns empty array for an unknown shell type", () => {
    expect(getShellChordPositions("C", "unknown shell")).toHaveLength(0)
  })

  it("mutes the correct strings for each spread voicing", () => {
    for (const type of SHELL_CHORD_TYPES) {
      const [v6, v5, v4] = getShellChordPositions("C", type)
      // 6th-string root: sounds str6(0), str4(2), str3(3); mutes str5(1), str2(4), str1(5)
      expect(v6.frets[1]).toBe(-1)
      expect(v6.frets[4]).toBe(-1)
      expect(v6.frets[5]).toBe(-1)
      // 5th-string root: sounds str5(1), str3(3), str2(4); mutes str6(0), str4(2), str1(5)
      expect(v5.frets[0]).toBe(-1)
      expect(v5.frets[2]).toBe(-1)
      expect(v5.frets[5]).toBe(-1)
      // 4th-string root: sounds str4(2), str2(4), str1(5); mutes str6(0), str5(1), str3(3)
      expect(v4.frets[0]).toBe(-1)
      expect(v4.frets[1]).toBe(-1)
      expect(v4.frets[3]).toBe(-1)
    }
  })

  it("all sounding strings have fret value >= 1", () => {
    for (const tonic of ["C", "F", "G", "Bb", "E", "F#"]) {
      for (const type of SHELL_CHORD_TYPES) {
        const positions = getShellChordPositions(tonic, type)
        for (const pos of positions) {
          for (const fret of pos.frets) {
            if (fret !== -1) {
              expect(fret).toBeGreaterThanOrEqual(1)
            }
          }
        }
      }
    }
  })

  describe("C maj7 shell — exact fret values", () => {
    it("6th string root: baseFret=8, frets [1,-1,2,2,-1,-1]", () => {
      const pos = getShellChordPositions("C", "maj7 shell")[0]
      expect(pos.baseFret).toBe(8)
      expect(pos.frets).toEqual([1, -1, 2, 2, -1, -1])
    })

    it("5th string root: baseFret=3, frets [-1,1,-1,2,3,-1]", () => {
      const pos = getShellChordPositions("C", "maj7 shell")[1]
      expect(pos.baseFret).toBe(3)
      expect(pos.frets).toEqual([-1, 1, -1, 2, 3, -1])
    })

    it("4th string root: baseFret=10, frets [-1,-1,1,-1,3,3]", () => {
      const pos = getShellChordPositions("C", "maj7 shell")[2]
      expect(pos.baseFret).toBe(10)
      expect(pos.frets).toEqual([-1, -1, 1, -1, 3, 3])
    })
  })

  describe("C m7 shell — 6th string root: baseFret=8, frets [1,-1,1,1,-1,-1]", () => {
    it("produces correct frets", () => {
      const pos = getShellChordPositions("C", "m7 shell")[0]
      expect(pos.baseFret).toBe(8)
      expect(pos.frets).toEqual([1, -1, 1, 1, -1, -1])
    })
  })

  describe("edge case: F dim7/m6 shell (str4 fret would be 0, needs +12 shift)", () => {
    it("shifts up so no fret is below 1", () => {
      // str6 root: F at fret 1, M6 offset=-1 on str4 → would be fret 0 → shift by 12
      const pos = getShellChordPositions("F", "dim7/m6 shell")[0]
      expect(pos.baseFret).toBeGreaterThanOrEqual(1)
      for (const fret of pos.frets) {
        if (fret !== -1) expect(fret).toBeGreaterThanOrEqual(1)
      }
    })
  })

  describe("edge case: E maj7 shell (rootFret=0 on str6, becomes 12)", () => {
    it("uses closed voicing (no open strings as root)", () => {
      const pos = getShellChordPositions("E", "maj7 shell")[0]
      // baseFret should be > 1 since root is forced to fret 12
      expect(pos.baseFret).toBeGreaterThan(1)
      for (const fret of pos.frets) {
        if (fret !== -1) expect(fret).toBeGreaterThanOrEqual(1)
      }
    })
  })
})
