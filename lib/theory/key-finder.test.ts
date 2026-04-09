import { describe, it, expect } from "vitest"
import { parseChord, normalizeQuality, detectKey, analyzeChordInKey, type InputChord } from "./key-finder"

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
  it('maps "minor" to "minor"', () => {
    expect(normalizeQuality("minor")).toBe("minor")
  })
  it('maps "major" to "major"', () => {
    expect(normalizeQuality("major")).toBe("major")
  })
  it('maps "augmented" to "aug"', () => {
    expect(normalizeQuality("augmented")).toBe("aug")
  })
  it('maps "diminished" to "dim"', () => {
    expect(normalizeQuality("diminished")).toBe("dim")
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
    // Roman numeral must be relative to the tonic (C major), not the parallel key
    expect(bbAnalysis!.roman).toBe("♭VII")
  })

  it("borrowed chord roman numerals are relative to the actual tonic, not the parallel key", () => {
    // Bb in C major: interval from C = 10 semitones → ♭VII (not VII, which is B natural)
    expect(analyzeChordInKey(parseChord("Bb")!, "C", "major").roman).toBe("♭VII")
    // Eb in C major: interval from C = 3 semitones → ♭III
    expect(analyzeChordInKey(parseChord("Eb")!, "C", "major").roman).toBe("♭III")
    // Ab in C major: interval from C = 8 semitones → ♭VI
    expect(analyzeChordInKey(parseChord("Ab")!, "C", "major").roman).toBe("♭VI")
  })

  it("identifies secondary dominants", () => {
    // D7 in C major = V/V (secondary dominant of G)
    const chords = ["C", "D7", "G", "C"].map(s => parseChord(s)!)
    const results = detectKey(chords)
    const cMajor = results.find(r => r.tonic === "C" && r.mode === "major")
    expect(cMajor).toBeDefined()
    const d7Analysis = cMajor!.chordAnalysis.find(a => a.inputChord.symbol === "D7")
    expect(d7Analysis!.role).toBe("secondary-dominant")
    // D7 → G is V7/V: functional harmony post-pass boosts score from 0.5 → 0.8
    expect(d7Analysis!.score).toBe(0.8)
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
    expect(cMajor!.displayName).toBe("C Ionian (major)")
  })
})

describe("dominant '7' suffix on Roman numerals", () => {
  it("diatonic V (G7) in C major gets roman 'V7'", () => {
    const result = analyzeChordInKey(parseChord("G7")!, "C", "major")
    expect(result.roman).toBe("V7")
    expect(result.role).toBe("diatonic")
  })

  it("diatonic VII (G7) in A natural minor gets roman 'VII7'", () => {
    // G7 is the 7th diatonic chord of A natural minor
    const result = analyzeChordInKey(parseChord("G7")!, "A", "minor")
    expect(result.roman).toBe("VII7")
    expect(result.role).toBe("diatonic")
  })

  it("non-diatonic D7 in C major (secondary dominant) gets roman 'II7'", () => {
    // D7 is not diatonic to C major; chromaticRoman with dominant type appends "7"
    const result = analyzeChordInKey(parseChord("D7")!, "C", "major")
    expect(result.roman).toBe("II7")
    expect(result.role).toBe("secondary-dominant")
  })

  it("borrowed Bb7 in C major gets roman '♭VII7'", () => {
    // Bb7 is not diatonic; dominant quality → chromaticRoman appends "7"
    const result = analyzeChordInKey(parseChord("Bb7")!, "C", "major")
    expect(result.roman).toBe("♭VII7")
  })

  it("diatonic Cmaj7 in C major keeps roman 'I' (no '7' suffix for major)", () => {
    const result = analyzeChordInKey(parseChord("Cmaj7")!, "C", "major")
    expect(result.roman).toBe("I")
  })

  it("C7 in C major is non-diatonic (secondary-dominant, roman 'I7')", () => {
    // C7 is dominant; the diatonic I in C major is Cmaj7 (major) — not a dominant slot.
    // C7 is V7/IV (secondary dominant of F), so role = secondary-dominant.
    const result = analyzeChordInKey(parseChord("C7")!, "C", "major")
    expect(result.roman).toBe("I7")
    expect(result.role).toBe("secondary-dominant")
    expect(result.score).toBe(0.5)
  })

  it("G7 in C major is diatonic (dominant slot V7)", () => {
    // G7 is dominant and the diatonic V in C major is G7 — a dominant slot. Match allowed.
    const result = analyzeChordInKey(parseChord("G7")!, "C", "major")
    expect(result.role).toBe("diatonic")
    expect(result.score).toBe(1.0)
    expect(result.roman).toBe("V7")
  })

  it("G major triad in C major is still diatonic (non-dominant input allowed on dominant slot)", () => {
    // A major triad (non-dominant) can still match the dominant diatonic V slot.
    const result = analyzeChordInKey(parseChord("G")!, "C", "major")
    expect(result.role).toBe("diatonic")
    expect(result.score).toBe(1.0)
  })

  it("G7 → Cmaj7: functional override null (tonic suppression), roman stays 'V7'", () => {
    const chords = ["G7", "Cmaj7"].map(s => parseChord(s)!)
    const analyses = detectKey(chords)
    const cMajor = analyses.find(r => r.tonic === "C" && r.mode === "major")
    expect(cMajor).toBeDefined()
    const g7 = cMajor!.chordAnalysis[0]!
    expect(g7.roman).toBe("V7")   // tonic suppression: no override, but diatonic roman is V7
  })
})

describe("detectKey — triad matching", () => {
  it("C major triad + Am triad score 100% fitScore in C major", () => {
    const chords = [parseChord("C"), parseChord("Am")].filter(
      (c): c is InputChord => c !== null,
    )
    expect(chords).toHaveLength(2)
    const results = detectKey(chords)
    const cMajor = results.find(r => r.tonic === "C" && r.mode === "major")
    expect(cMajor).toBeDefined()
    expect(cMajor!.fitScore).toBe(1.0)
  })

  it("Bdim is diatonic (degree vii) in C major", () => {
    const chords = [parseChord("C"), parseChord("Bdim")].filter(
      (c): c is InputChord => c !== null,
    )
    expect(chords).toHaveLength(2)
    const results = detectKey(chords)
    const cMajor = results.find(r => r.tonic === "C" && r.mode === "major")
    expect(cMajor).toBeDefined()
    const bdim = cMajor!.chordAnalysis.find(a => a.inputChord.root === "B")
    expect(bdim?.role).toBe("diatonic")
    expect(bdim?.score).toBe(1.0)
  })
})
