import { describe, it, expect } from "vitest"
import { parseChord, normalizeQuality, detectKey } from "./key-finder"

describe("parseChord", () => {
  it("parses a minor 7th chord", () => {
    expect(parseChord("Cm7")).toEqual({ root: "C", type: "m7", symbol: "Cm7" })
  })

  it("parses a major triad (empty suffix)", () => {
    const result = parseChord("G")
    expect(result).not.toBeNull()
    expect(result!.root).toBe("G")
    expect(result!.symbol).toBe("G")
  })

  it("parses a flat root", () => {
    const result = parseChord("BbMaj7")
    expect(result).not.toBeNull()
    expect(result!.root).toBe("Bb")
  })

  it("returns null for an unrecognised symbol", () => {
    expect(parseChord("xyz")).toBeNull()
    expect(parseChord("")).toBeNull()
  })
})

describe("normalizeQuality", () => {
  it("maps empty string to 'major'", () => {
    expect(normalizeQuality("")).toBe("major")
  })
  it("maps '9' to 'major'", () => {
    expect(normalizeQuality("9")).toBe("major")
  })
  it("maps 'maj9' to 'major'", () => {
    expect(normalizeQuality("maj9")).toBe("major")
  })
  it("maps 'm7' to 'minor'", () => {
    expect(normalizeQuality("m7")).toBe("minor")
  })
  it("maps 'm7b5' to 'half-dim'", () => {
    expect(normalizeQuality("m7b5")).toBe("half-dim")
  })
  it("maps '6/9' to 'major'", () => {
    expect(normalizeQuality("6/9")).toBe("major")
  })
  it("maps 'dim7' to 'dim'", () => {
    expect(normalizeQuality("dim7")).toBe("dim")
  })
  it("maps 'aug' to 'aug'", () => {
    expect(normalizeQuality("aug")).toBe("aug")
  })
  it("maps 'sus4' to 'sus'", () => {
    expect(normalizeQuality("sus4")).toBe("sus")
  })
  it("falls back to 'major' for unknown types", () => {
    expect(normalizeQuality("unknowntype")).toBe("major")
  })
})

describe("detectKey", () => {
  it("returns [] for 0 chords", () => {
    expect(detectKey([])).toEqual([])
  })

  it("returns [] for 1 chord", () => {
    expect(detectKey([parseChord("C")!])).toEqual([])
  })

  it("identifies C major for four diatonic 7th chords", () => {
    const chords = ["Cmaj7", "Dm7", "G7", "Am7"].map(s => parseChord(s)!)
    const results = detectKey(chords)
    const cMajor = results.find(r => r.tonic === "C" && r.mode === "major")
    expect(cMajor).toBeDefined()
    expect(cMajor!.fitScore).toBe(1)
    expect(cMajor!.diatonicCount).toBe(4)
    expect(cMajor!.chordAnalysis.every(a => a.role === "diatonic")).toBe(true)
  })

  it("triads match their 7th-chord diatonic counterparts", () => {
    // G (major triad) should match G7 (V of C major) because both normalise to 'major' quality
    const chords = ["C", "F", "G", "Am"].map(s => parseChord(s)!)
    const results = detectKey(chords)
    const cMajor = results.find(r => r.tonic === "C" && r.mode === "major")
    expect(cMajor).toBeDefined()
    expect(cMajor!.fitScore).toBe(1)
    expect(cMajor!.diatonicCount).toBe(4)
  })

  it("Bb is borrowed from parallel minor in C major", () => {
    const chords = ["C", "F", "G", "Bb"].map(s => parseChord(s)!)
    const results = detectKey(chords)
    const cMajor = results.find(r => r.tonic === "C" && r.mode === "major")
    expect(cMajor).toBeDefined()
    expect(cMajor!.fitScore).toBeGreaterThan(0)
    expect(cMajor!.fitScore).toBeLessThan(1)
    const bbAnalysis = cMajor!.chordAnalysis.find(a => a.inputChord.symbol === "Bb")
    expect(bbAnalysis!.role).toBe("borrowed")
    expect(bbAnalysis!.score).toBe(0.6)
  })

  it("identifies secondary dominants", () => {
    // D7 in C major = V/V (secondary dominant of G)
    const chords = ["C", "D7", "G", "C"].map(s => parseChord(s)!)
    const results = detectKey(chords)
    const cMajor = results.find(r => r.tonic === "C" && r.mode === "major")
    expect(cMajor).toBeDefined()
    const d7Analysis = cMajor!.chordAnalysis.find(a => a.inputChord.symbol === "D7")
    expect(d7Analysis!.role).toBe("secondary-dominant")
    expect(d7Analysis!.score).toBe(0.5)
  })

  it("results are sorted: higher score first, lower tier first on tie", () => {
    const chords = ["C", "F", "G", "Am"].map(s => parseChord(s)!)
    const results = detectKey(chords)
    for (let i = 1; i < results.length; i++) {
      if (Math.abs(results[i].score - results[i - 1].score) < 0.001) {
        expect(results[i].commonalityTier).toBeGreaterThanOrEqual(results[i - 1].commonalityTier)
      } else {
        expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score)
      }
    }
  })

  it("tonic resolution bonus increases score vs identical progression without tonic resolution", () => {
    // C F G C — last chord is C (tonic resolution bonus)
    const withTonic = ["C", "F", "G", "C"].map(s => parseChord(s)!)
    // C F G Am — no tonic resolution
    const withoutTonic = ["C", "F", "G", "Am"].map(s => parseChord(s)!)
    const scoreWith = detectKey(withTonic).find(r => r.tonic === "C" && r.mode === "major")!.score
    const scoreWithout = detectKey(withoutTonic).find(r => r.tonic === "C" && r.mode === "major")!.score
    expect(scoreWith).toBeGreaterThan(scoreWithout)
  })

  it("all results have score >= 0.5", () => {
    const chords = ["C", "F", "G"].map(s => parseChord(s)!)
    const results = detectKey(chords)
    expect(results.every(r => r.score >= 0.5)).toBe(true)
  })

  it("KeyMatch has correct displayName", () => {
    const chords = ["Dm7", "G7", "Cmaj7"].map(s => parseChord(s)!)
    const results = detectKey(chords)
    const cMajor = results.find(r => r.tonic === "C" && r.mode === "major")
    expect(cMajor!.displayName).toBe("C Major")
  })
})
