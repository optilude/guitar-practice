import { describe, it, expect } from "vitest"
import { detectScales } from "./scale-finder"
import type { ScaleMatch } from "./scale-finder"

describe("detectScales", () => {
  it("returns [] when fewer than 3 chromas are selected", () => {
    expect(detectScales(new Set([]))).toEqual([])
    expect(detectScales(new Set([0]))).toEqual([])
    expect(detectScales(new Set([0, 4]))).toEqual([])
  })

  it("returns matches for C E G (chromas 0 4 7)", () => {
    const results = detectScales(new Set([0, 4, 7]))
    expect(results.length).toBeGreaterThan(0)
    const names = results.map((r) => r.displayName)
    expect(names).toContain("C Major")
    expect(names).toContain("C Pentatonic Major")
    expect(names).toContain("G Major")
  })

  it("with key 'C', only returns C-rooted scales", () => {
    const results = detectScales(new Set([0, 4, 7]), { key: "C" })
    expect(results.every((r) => r.root === "C")).toBe(true)
    expect(results.map((r) => r.displayName)).toContain("C Major")
  })

  it("sorts by extraNotes first (fewer extra = ranked higher)", () => {
    // C D E G A = chromas 0 2 4 7 9 — exact fit for C Pentatonic Major (5 notes, 0 extra)
    // C Major has 7 notes (2 extra: F and B)
    const results = detectScales(new Set([0, 2, 4, 7, 9]), { key: "C" })
    const pentatonicIdx = results.findIndex((r) => r.type === "Pentatonic Major")
    const majorIdx = results.findIndex((r) => r.type === "Major")
    expect(pentatonicIdx).toBeGreaterThanOrEqual(0)
    expect(majorIdx).toBeGreaterThanOrEqual(0)
    expect(pentatonicIdx).toBeLessThan(majorIdx)
  })

  it("at equal extraNotes, Major (tier 1) ranks before Dorian (tier 2)", () => {
    // C D E F G A B = 0 2 4 5 7 9 11 = C Major AND D Dorian (same notes, 0 extra each)
    const results = detectScales(new Set([0, 2, 4, 5, 7, 9, 11]))
    const cMajorIdx = results.findIndex((r) => r.root === "C" && r.type === "Major")
    const dDorianIdx = results.findIndex((r) => r.root === "D" && r.type === "Dorian")
    expect(cMajorIdx).toBeGreaterThanOrEqual(0)
    expect(dDorianIdx).toBeGreaterThanOrEqual(0)
    expect(cMajorIdx).toBeLessThan(dDorianIdx)
  })

  it("returns correct notes and intervals for C Major", () => {
    const results = detectScales(new Set([0, 2, 4, 5, 7, 9, 11]), { key: "C" })
    const cMajor = results.find((r) => r.root === "C" && r.type === "Major")
    expect(cMajor).toBeDefined()
    expect(cMajor!.notes).toEqual(["C", "D", "E", "F", "G", "A", "B"])
    expect(cMajor!.intervals).toEqual(["1", "2", "3", "4", "5", "6", "7"])
    expect(cMajor!.extraNotes).toBe(0)
    expect(cMajor!.commonalityTier).toBe(1)
  })

  it("populates displayName correctly", () => {
    const results = detectScales(new Set([0, 4, 7]), { key: "C" })
    const cMajor = results.find((r) => r.root === "C" && r.type === "Major")
    expect(cMajor!.displayName).toBe("C Major")
  })
})
