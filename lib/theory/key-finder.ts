import { Chord, Note } from "tonal"
import { getKey } from "./keys"
import { ALL_KEY_MODES } from "./commonality-tiers"
import type { DiatonicChord } from "./types"
import { analyzeFunctionalContext, qualityFromType } from "./functional-harmony"

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
  roman: string           // chromatic roman numeral, always set (e.g. "♭VII", "II")
  score: number           // 0 | 0.5 | 0.6 | 1.0
  role: ChordRole
}

export type KeyMatch = {
  tonic: string           // e.g. "Bb"
  mode: string            // e.g. "major" (the modeName passed to getKey())
  displayName: string     // e.g. "Bb Ionian (major)"
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
// Chromatic roman numeral (works for any chord relative to any tonic)
// ---------------------------------------------------------------------------
const CHROMATIC_UPPER = ["I", "♭II", "II", "♭III", "III", "IV", "♭V", "V", "♭VI", "VI", "♭VII", "VII"] as const
const CHROMATIC_LOWER = ["i", "♭ii", "ii", "♭iii", "iii", "iv", "♭v", "v", "♭vi", "vi", "♭vii", "vii"] as const

export function chromaticRoman(rootChroma: number, tonicChroma: number, quality: string): string {
  const interval = (rootChroma - tonicChroma + 12) % 12
  const q = normalizeQuality(quality)
  const isMinorLike = q === "minor" || q === "dim" || q === "half-dim"
  const base = isMinorLike ? CHROMATIC_LOWER[interval] : CHROMATIC_UPPER[interval]
  if (q === "dim") return base + "°"
  if (q === "aug") return base + "+"
  if (q === "half-dim") return base + "ø"
  return base
}

// ---------------------------------------------------------------------------
// Parse a chord symbol into InputChord using TonalJS
// ---------------------------------------------------------------------------
// Roots ordered longest-first so Array.find picks the longest match (e.g. "C#" before "C")
const PARSE_ROOTS = ["Ab", "A#", "A", "Bb", "B", "C#", "C", "Db", "D#", "D", "Eb", "E", "F#", "F", "Gb", "G#", "G"] as const

export function parseChord(symbol: string): InputChord | null {
  if (!symbol.trim()) return null
  const chord = Chord.get(symbol)
  if (!chord.empty && chord.tonic) {
    const root = chord.tonic
    const typeFromSymbol = symbol.substring(root.length)
    return { root, type: typeFromSymbol, symbol }
  }

  // Fallback for chords TonalJS doesn't recognise (e.g. "Dmaj11"): accept if the
  // suffix is in TYPE_TO_QUALITY (our quality normalisation table).
  const root = PARSE_ROOTS.find(r => symbol.startsWith(r))
  if (!root) return null
  const type = symbol.substring(root.length)
  if (type in TYPE_TO_QUALITY) return { root, type, symbol }

  return null
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const FLAT_ROOTS  = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] as const
const SHARP_ROOTS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const

function prefersSharps(chords: InputChord[]): boolean {
  let sharps = 0, flats = 0
  for (const c of chords) {
    if (c.root.endsWith("#")) sharps++
    else if (c.root.endsWith("b")) flats++
  }
  return sharps > flats
}

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
  tonicChroma: number,
): ChordAnalysis {
  const rootChroma = Note.chroma(inputChord.root)
  if (typeof rootChroma !== "number" || !Number.isFinite(rootChroma)) {
    return { inputChord, degree: null, roman: "?", score: 0, role: "non-diatonic" }
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
        roman: chromaticRoman(rootChroma, tonicChroma, inputChord.type),
        score: 0.6,
        role: "borrowed",
      }
    }
  }

  // 3. Secondary dominant? (input root = diatonic chord root + 7 semitones, quality === "major")
  if (quality === "major") {
    for (const [diatonicChroma] of diatonicLookup) {
      if ((diatonicChroma + 7) % 12 === rootChroma) {
        return {
          inputChord,
          degree: null,
          roman: chromaticRoman(rootChroma, tonicChroma, inputChord.type),
          score: 0.5,
          role: "secondary-dominant",
        }
      }
    }
  }

  return {
    inputChord,
    degree: null,
    roman: chromaticRoman(rootChroma, tonicChroma, inputChord.type),
    score: 0,
    role: "non-diatonic",
  }
}

// ---------------------------------------------------------------------------
// detectKey — main export
// ---------------------------------------------------------------------------
export function countDistinctChords(chords: InputChord[]): number {
  const seen = new Set<string>()
  for (const c of chords) {
    const chroma = Note.chroma(c.root)
    if (typeof chroma !== "number") continue
    seen.add(`${chroma}:${normalizeQuality(c.type)}`)
  }
  return seen.size
}

export function detectKey(chords: InputChord[]): KeyMatch[] {
  if (chords.length < 2 || countDistinctChords(chords) < 2) return []

  const results: KeyMatch[] = []
  const roots = prefersSharps(chords) ? SHARP_ROOTS : FLAT_ROOTS

  for (const root of roots) {
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

      // Compute tonic chroma early — needed for analyzeChord and bonuses
      const tonicChroma = Note.chroma(root)
      if (typeof tonicChroma !== "number" || !Number.isFinite(tonicChroma)) continue

      // Score each chord
      const analyses = chords.map(c =>
        analyzeChord(c, diatonicLookup, parallelMajorLookup, parallelMinorLookup, tonicChroma)
      )

      // Functional harmony post-pass: override Romans, then boost score for
      // non-diatonic chords that are now functionally explained.
      const withOverrides = applyFunctionalRomanOverrides(analyses, root, modeName)
      const finalAnalyses = withOverrides.map((a, i) => {
        // Only boost if the roman actually changed (a rule fired) AND the original
        // score was sub-diatonic (don't reduce a 1.0 to 0.8 for C7 etc.)
        if (a.roman !== analyses[i]!.roman && analyses[i]!.score < 1.0) {
          return { ...a, score: 0.8 }
        }
        return a
      })

      const fitScore = finalAnalyses.reduce((sum, a) => sum + a.score, 0) / chords.length
      const diatonicCount = finalAnalyses.filter(a => a.role === "diatonic").length

      // Bonuses
      let bonus = 0
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

      const totalScore = fitScore + bonus

      if (totalScore < 0.5) continue

      results.push({
        tonic: root,
        mode: modeName,
        displayName: `${root} ${displayName}`,
        score: totalScore,
        fitScore,
        diatonicCount,
        chordAnalysis: finalAnalyses,
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

// ---------------------------------------------------------------------------
// applyFunctionalRomanOverrides
// Applies functional harmony look-ahead rules to a ChordAnalysis array and
// returns a new array with roman fields overridden where a rule fires.
//
// Unlike the diatonic scoring in analyzeChord/analyzeChordInKey, this check is
// NOT gated on whether a chord scored 1.0. This matters for chords like C7 in
// C major: the scorer treats "7" and "maj7" both as "major" quality and gives
// C7 a diatonic score of 1.0, but C7 is dominant quality and CAN be a
// secondary dominant (V7/IV when followed by Fmaj7).
//
// Tonic suppression is handled inside analyzeFunctionalContext: rules 1/2/3/4
// do not fire when the resolution target IS the key tonic (so G7→Cmaj7 stays
// as "V7" rather than becoming "V7/I").
// ---------------------------------------------------------------------------
export function applyFunctionalRomanOverrides(
  analyses: ChordAnalysis[],
  tonic: string,
  mode: string,
): ChordAnalysis[] {
  const contexts = analyses.map(a => ({
    tonic:   a.inputChord.root,
    type:    a.inputChord.type,
    quality: qualityFromType(a.inputChord.type),
    roman:   a.roman,
  }))
  return analyses.map((a, i) => {
    const fa = analyzeFunctionalContext(contexts[i]!, contexts[i + 1] ?? null, tonic, mode)
    if (!fa.romanOverride) return a
    return { ...a, roman: fa.romanOverride, role: "secondary-dominant" as const }
  })
}

// ---------------------------------------------------------------------------
// Public single-chord analysis (used by transposer.ts)
// ---------------------------------------------------------------------------
export function analyzeChordInKey(chord: InputChord, tonic: string, mode: string): ChordAnalysis {
  const tonicChroma = Note.chroma(tonic)
  if (typeof tonicChroma !== "number" || !Number.isFinite(tonicChroma)) {
    return { inputChord: chord, degree: null, roman: "?", score: 0, role: "non-diatonic" }
  }
  let keyData
  try { keyData = getKey(tonic, mode) } catch {
    return { inputChord: chord, degree: null, roman: "?", score: 0, role: "non-diatonic" }
  }
  const diatonicLookup = buildDiatonicLookup(keyData.diatonicChords)
  let parallelMajorData
  let parallelMinorData
  try { parallelMajorData = getKey(tonic, "major") } catch { /* skip */ }
  try { parallelMinorData = getKey(tonic, "minor") } catch { /* skip */ }
  const parallelMajorLookup = parallelMajorData
    ? buildDiatonicLookup(parallelMajorData.diatonicChords)
    : new Map<number, DiatonicEntry[]>()
  const parallelMinorLookup = parallelMinorData
    ? buildDiatonicLookup(parallelMinorData.diatonicChords)
    : new Map<number, DiatonicEntry[]>()
  return analyzeChord(chord, diatonicLookup, parallelMajorLookup, parallelMinorLookup, tonicChroma)
}
