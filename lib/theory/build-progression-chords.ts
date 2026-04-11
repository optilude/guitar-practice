import type { ProgressionChord } from "@/lib/theory/types"
import type { InputChord, ChordAnalysis } from "@/lib/theory/key-finder"

function qualityFromType(type: string): ProgressionChord["quality"] {
  const t = type.toLowerCase()
  if (t === "m7b5" || t.startsWith("dim") || t === "ø" || t === "ø7") return "diminished"
  if (t.startsWith("m") && !t.startsWith("maj")) return "minor"
  if (/^(7|9|11|13|alt)/.test(t)) return "dominant"
  return "major"
}

/**
 * Converts parsed input chords + their analyses to ProgressionChord[], which
 * is the type required by getSubstitutions, getSoloScales, and related APIs.
 */
export function buildProgressionChords(
  parsedChords: InputChord[],
  displayAnalyses: ChordAnalysis[],
): ProgressionChord[] {
  return parsedChords.map((chord, i) => {
    const analysis = displayAnalyses[i]
    return {
      roman:    analysis?.roman ?? "?",
      nashville: String(analysis?.degree ?? 1),
      tonic:    chord.root,
      type:     chord.type,
      quality:  qualityFromType(chord.type),
      degree:   analysis?.degree ?? 1,
    }
  })
}
