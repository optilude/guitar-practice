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
