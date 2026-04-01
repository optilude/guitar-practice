import { getDiatonicChords } from "@/lib/theory/harmony"
import type { Progression, ProgressionChord, DiatonicChord } from "@/lib/theory/types"

// ---------------------------------------------------------------------------
// Static progression library
// ---------------------------------------------------------------------------
const PROGRESSIONS: Progression[] = [
  { name: "I-IV-V",     description: "Blues / rock foundation",        degrees: ["I",  "IV", "V"] },
  { name: "I-V-vi-IV",  description: "Pop progression",                degrees: ["I",  "V",  "vi", "IV"] },
  { name: "ii-V-I",     description: "Jazz turnaround",                degrees: ["ii", "V",  "I"] },
  { name: "I-vi-IV-V",  description: "50s progression",                degrees: ["I",  "vi", "IV", "V"] },
  { name: "I-IV-I-V",   description: "12-bar blues (simplified)",      degrees: ["I",  "IV", "I",  "V"] },
  { name: "vi-IV-I-V",  description: "Minor variation",                degrees: ["vi", "IV", "I",  "V"] },
  { name: "ii-V-I-VI",  description: "Jazz turnaround with VI",        degrees: ["ii", "V",  "I",  "VI"] },
  { name: "I-iii-IV-V", description: "Classic rock",                   degrees: ["I",  "iii","IV", "V"] },
]

export function listProgressions(): Progression[] {
  return PROGRESSIONS
}

// ---------------------------------------------------------------------------
// Roman numeral → degree index (1-based)
// ---------------------------------------------------------------------------
const ROMAN_TO_DEGREE: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7,
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7,
}

function romanToDegree(roman: string): number {
  // Strip decoration symbols to find the numeral
  const normalized = roman.replace(/[°+]/g, "")
  return ROMAN_TO_DEGREE[normalized] ?? 1
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function getProgression(name: string, tonic: string): ProgressionChord[] {
  const prog = PROGRESSIONS.find((p) => p.name === name)
  if (!prog) return []

  const diatonic = getDiatonicChords(tonic, "major")
  // Index diatonic chords by degree number
  const byDegree: Record<number, DiatonicChord> = {}
  for (const dc of diatonic) {
    byDegree[dc.degree] = dc
  }

  return prog.degrees.map((roman) => {
    const degree = romanToDegree(roman)
    const dc = byDegree[degree]
    if (!dc) {
      return { roman, nashville: String(degree), tonic, type: "maj7" }
    }
    return {
      roman,
      nashville: dc.nashville,
      tonic: dc.tonic,
      type: dc.type,
    }
  })
}
