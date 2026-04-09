import { Note } from "tonal"
import { getDiatonicChords } from "@/lib/theory/harmony"
import { keyPrefersSharps } from "@/lib/theory/transposer"
import type { ProgressionChord } from "@/lib/theory/types"

// ---------------------------------------------------------------------------
// Roman numeral base (uppercase) → scale degree 1–7
// ---------------------------------------------------------------------------
const ROMAN_BASE_TO_DEGREE: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7,
}

const FLAT_ROOTS  = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
const SHARP_ROOTS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

// Parse a roman numeral string (as produced by analyzeProgression) into parts.
// Examples: "I" → {acc:0, base:"I", deg:1, quality:"major"}
//           "♭VII" → {acc:-1, base:"VII", deg:7, quality:"major"}
//           "♭vii" → {acc:-1, base:"VII", deg:7, quality:"minor"}
//           "ii°"  → {acc:0,  base:"II",  deg:2, quality:"diminished"}
function parseRoman(roman: string): {
  accidentals: number
  baseDegree: number
  quality: string
  type: string
} {
  let s = roman
  let accidentals = 0
  while (s.startsWith("♭")) { accidentals -= 1; s = s.slice(1) }
  while (s.startsWith("#")) { accidentals += 1; s = s.slice(1) }

  const hasDim     = s.includes("°")
  const hasAug     = s.includes("+")
  const hasHalfDim = s.includes("ø")
  // Strip suffix decorators — keep only the letter(s)
  const letters = s.replace(/[°+ø0-9bmaj]/g, "")
  const isLower = letters === letters.toLowerCase() && letters !== ""

  const baseDegree = ROMAN_BASE_TO_DEGREE[letters.toUpperCase()] ?? 1
  const quality    = hasHalfDim ? "half-dim"
    : hasDim    ? "diminished"
    : hasAug    ? "augmented"
    : isLower   ? "minor"
    : "major"
  const type       = hasHalfDim ? "m7b5"
    : hasDim    ? "dim"
    : hasAug    ? "aug"
    : isLower   ? "m"
    : ""

  return { accidentals, baseDegree, quality, type }
}

// ---------------------------------------------------------------------------
// getUserProgressionChords
// Resolves an array of roman numeral degree strings (as stored in
// UserProgression.degrees) to ProgressionChord[] in the given tonic.
//
// For diatonic chords (no accidentals): uses the full diatonic chord type
// (including 7th extensions) from getDiatonicChords().
// For borrowed/non-diatonic chords (with accidentals): shifts the diatonic
// root by the accidental semitones and uses the quality from the roman case.
// ---------------------------------------------------------------------------
export function getUserProgressionChords(
  degrees: string[],
  mode: string,
  tonic: string,
): ProgressionChord[] {
  const diatonic = getDiatonicChords(tonic, mode)
  const byDegree = new Map(diatonic.map(dc => [dc.degree, dc]))

  const preferSharps = keyPrefersSharps(tonic, mode)
  const roots = preferSharps ? SHARP_ROOTS : FLAT_ROOTS

  return degrees.map(roman => {
    const { accidentals, baseDegree, quality, type } = parseRoman(roman)
    const baseDc = byDegree.get(baseDegree)

    if (!baseDc) {
      // Fallback: return tonic with major quality
      return { roman, nashville: String(baseDegree), tonic, type: "", quality: "major", degree: baseDegree }
    }

    if (accidentals === 0) {
      // Diatonic chord — use full type from getDiatonicChords (preserves maj7, m7, etc.)
      return {
        roman,
        nashville: baseDc.nashville,
        tonic: baseDc.tonic,
        type:  baseDc.type,
        quality: baseDc.quality,
        degree: baseDc.degree,
      }
    }

    // Non-diatonic: shift the diatonic root by accidental semitones
    const baseChroma = Note.chroma(baseDc.tonic)
    if (typeof baseChroma !== "number") {
      return { roman, nashville: baseDc.nashville, tonic: baseDc.tonic, type: baseDc.type, quality: baseDc.quality, degree: baseDc.degree }
    }
    const newChroma  = (baseChroma + accidentals + 12) % 12
    const chordTonic = roots[newChroma]

    return {
      roman,
      nashville: String(baseDegree),
      tonic:     chordTonic,
      type,
      quality,
      degree:    baseDegree,
    }
  })
}
