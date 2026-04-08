import { Chord, Note } from "tonal"
import { getKey } from "./keys"
import { ALL_KEY_MODES } from "./commonality-tiers"
import type { DiatonicChord } from "./types"

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------
export type InputChord = {
  root: string    // e.g. "C", "Bb"
  type: string    // TonalJS suffix e.g. "m7", "maj9", ""
  symbol: string  // original user input e.g. "Cm7"
}

export type ChordRole = "diatonic" | "borrowed" | "secondary-dominant" | "non-diatonic"

export type ChordAnalysis = {
  inputChord: InputChord
  degree: number | null   // 1–7 when diatonic or borrowed; null otherwise
  roman: string | null    // e.g. "ii", "V"; null for non-diatonic
  score: number           // 0 | 0.5 | 0.6 | 1.0
  role: ChordRole
}

export type KeyMatch = {
  tonic: string           // e.g. "Bb"
  mode: string            // e.g. "major" (the modeName passed to getKey())
  displayName: string     // e.g. "Bb Major"
  score: number           // fitScore + bonuses — used for sorting only
  fitScore: number        // average chord score with no bonuses — used for display %
  diatonicCount: number   // number of fully diatonic input chords
  chordAnalysis: ChordAnalysis[]
  commonalityTier: number
}

// ---------------------------------------------------------------------------
// Chord type → quality family normalisation
// ---------------------------------------------------------------------------
const TYPE_TO_QUALITY: Record<string, string> = {
  // Major quality
  "": "major", "maj": "major", "M": "major", "5": "major",
  "7": "major", "9": "major", "11": "major", "13": "major",
  "7b5": "major", "7#5": "major", "7#11": "major",
  "9#11": "major", "13b9": "major", "alt": "major",
  "7b9": "major", "7#9": "major",
  "maj7": "major", "maj9": "major", "maj11": "major", "maj13": "major",
  "maj7#11": "major",
  "6": "major", "69": "major", "6/9": "major",
  "add9": "major", "add11": "major",
  // Suspended
  "7sus4": "sus", "9sus4": "sus", "13sus4": "sus", "sus2": "sus", "sus4": "sus",
  // Minor quality
  "m": "minor", "min": "minor", "-": "minor",
  "m7": "minor", "m9": "minor", "m11": "minor", "m13": "minor", "-7": "minor",
  "m6": "minor", "m69": "minor", "m6/9": "minor",
  // Minor-major
  "mmaj7": "mmaj7", "mM7": "mmaj7", "-maj7": "mmaj7",
  // Half-diminished
  "m7b5": "half-dim", "ø": "half-dim", "ø7": "half-dim",
  // Diminished
  "dim": "dim", "dim7": "dim", "°7": "dim",
  // Augmented
  "aug": "aug", "+": "aug", "aug7": "aug", "maj7#5": "aug",
  // Full-word aliases (TonalJS may return these as chord types)
  "minor": "minor", "major": "major",
  "augmented": "aug", "diminished": "dim",
}

export function normalizeQuality(type: string): string {
  return TYPE_TO_QUALITY[type] ?? "major"
}

// ---------------------------------------------------------------------------
// Parse a chord symbol into InputChord using TonalJS
// ---------------------------------------------------------------------------
export function parseChord(symbol: string): InputChord | null {
  if (!symbol.trim()) return null
  const chord = Chord.get(symbol)
  if (chord.empty || !chord.tonic) return null

  // Extract the type suffix from the original symbol
  // e.g., "Cm7" -> "m7", "G" -> "", "BbMaj7" -> "Maj7"
  const root = chord.tonic
  const typeFromSymbol = symbol.substring(root.length)

  return { root, type: typeFromSymbol, symbol }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const ALL_ROOTS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] as const

type DiatonicEntry = { chord: DiatonicChord; quality: string }
type DiatonicLookup = Map<number, DiatonicEntry[]>  // rootChroma → entries

function buildDiatonicLookup(diatonicChords: DiatonicChord[]): DiatonicLookup {
  const map: DiatonicLookup = new Map()
  for (const chord of diatonicChords) {
    const chroma = Note.chroma(chord.tonic)
    if (typeof chroma !== "number" || !Number.isFinite(chroma)) continue
    const quality = normalizeQuality(chord.type)
    const existing = map.get(chroma) ?? []
    existing.push({ chord, quality })
    // Half-diminished seventh also accepts its triad (diminished triad)
    if (chord.type === "m7b5") {
      existing.push({ chord, quality: "dim" })
    }
    map.set(chroma, existing)
  }
  return map
}

function analyzeChord(
  inputChord: InputChord,
  diatonicLookup: DiatonicLookup,
  parallelMajorLookup: DiatonicLookup,
  parallelMinorLookup: DiatonicLookup,
): ChordAnalysis {
  const rootChroma = Note.chroma(inputChord.root)
  if (typeof rootChroma !== "number" || !Number.isFinite(rootChroma)) {
    return { inputChord, degree: null, roman: null, score: 0, role: "non-diatonic" }
  }

  const quality = normalizeQuality(inputChord.type)

  // 1. Diatonic?
  const diatonicEntries = diatonicLookup.get(rootChroma) ?? []
  const diatonicMatch = diatonicEntries.find(e => e.quality === quality)
  if (diatonicMatch) {
    return {
      inputChord,
      degree: diatonicMatch.chord.degree,
      roman: diatonicMatch.chord.roman,
      score: 1.0,
      role: "diatonic",
    }
  }

  // 2. Borrowed (parallel major or parallel minor)?
  for (const parallelLookup of [parallelMajorLookup, parallelMinorLookup]) {
    const parallelEntries = parallelLookup.get(rootChroma) ?? []
    const parallelMatch = parallelEntries.find(e => e.quality === quality)
    if (parallelMatch) {
      return {
        inputChord,
        degree: parallelMatch.chord.degree,
        roman: parallelMatch.chord.roman,
        score: 0.6,
        role: "borrowed",
      }
    }
  }

  // 3. Secondary dominant? (input root = diatonic chord root + 7 semitones, quality === "major")
  if (quality === "major") {
    for (const [diatonicChroma] of diatonicLookup) {
      if ((diatonicChroma + 7) % 12 === rootChroma) {
        return { inputChord, degree: null, roman: null, score: 0.5, role: "secondary-dominant" }
      }
    }
  }

  return { inputChord, degree: null, roman: null, score: 0, role: "non-diatonic" }
}

// ---------------------------------------------------------------------------
// detectKey — main export
// ---------------------------------------------------------------------------
export function detectKey(chords: InputChord[]): KeyMatch[] {
  if (chords.length < 2) return []

  const results: KeyMatch[] = []

  for (const root of ALL_ROOTS) {
    for (const { displayName, modeName, tier } of ALL_KEY_MODES) {
      let keyData
      try {
        keyData = getKey(root, modeName)
      } catch {
        continue
      }

      const diatonicLookup = buildDiatonicLookup(keyData.diatonicChords)

      // Build parallel lookups (same tonic, major + minor) for borrow detection
      let parallelMajorData
      let parallelMinorData
      try { parallelMajorData = getKey(root, "major") } catch { /* skip */ }
      try { parallelMinorData = getKey(root, "minor") } catch { /* skip */ }
      const parallelMajorLookup = parallelMajorData
        ? buildDiatonicLookup(parallelMajorData.diatonicChords)
        : new Map<number, DiatonicEntry[]>()
      const parallelMinorLookup = parallelMinorData
        ? buildDiatonicLookup(parallelMinorData.diatonicChords)
        : new Map<number, DiatonicEntry[]>()

      // Score each chord
      const analyses = chords.map(c =>
        analyzeChord(c, diatonicLookup, parallelMajorLookup, parallelMinorLookup)
      )

      const fitScore = analyses.reduce((sum, a) => sum + a.score, 0) / chords.length
      const diatonicCount = analyses.filter(a => a.role === "diatonic").length

      // Bonuses
      const tonicChroma = Note.chroma(root)
      let bonus = 0
      if (typeof tonicChroma === "number") {
        const firstChroma = Note.chroma(chords[0].root)
        const lastChroma = Note.chroma(chords[chords.length - 1].root)
        if (firstChroma === tonicChroma) bonus += 0.05
        if (lastChroma === tonicChroma) bonus += 0.10

        // V→I cadence at end?
        if (chords.length >= 2) {
          const secondLastChroma = Note.chroma(chords[chords.length - 2].root)
          if (
            typeof secondLastChroma === "number" &&
            typeof lastChroma === "number" &&
            lastChroma === tonicChroma &&
            (secondLastChroma + 5) % 12 === tonicChroma
          ) {
            bonus += 0.05
          }
        }

        // ii→V→I at end?
        if (chords.length >= 3) {
          const thirdLastChroma = Note.chroma(chords[chords.length - 3].root)
          const secondLastChroma = Note.chroma(chords[chords.length - 2].root)
          if (
            typeof thirdLastChroma === "number" &&
            typeof secondLastChroma === "number" &&
            typeof lastChroma === "number" &&
            lastChroma === tonicChroma &&
            (secondLastChroma + 5) % 12 === tonicChroma &&
            (thirdLastChroma + 10) % 12 === tonicChroma
          ) {
            bonus += 0.05
          }
        }
      }

      const totalScore = fitScore + bonus

      if (totalScore < 0.5) continue

      results.push({
        tonic: root,
        mode: modeName,
        displayName: `${root} ${displayName}`,
        score: totalScore,
        fitScore,
        diatonicCount,
        chordAnalysis: analyses,
        commonalityTier: tier,
      })
    }
  }

  results.sort((a, b) => {
    if (Math.abs(a.score - b.score) > 0.001) return b.score - a.score
    if (a.commonalityTier !== b.commonalityTier) return a.commonalityTier - b.commonalityTier
    return a.displayName.localeCompare(b.displayName)
  })

  return results
}
