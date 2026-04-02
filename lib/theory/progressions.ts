import { getDiatonicChords } from "@/lib/theory/harmony"
import type { Progression, ProgressionChord, DiatonicChord } from "@/lib/theory/types"

// ---------------------------------------------------------------------------
// Progression library — 15 progressions
// ---------------------------------------------------------------------------
const PROGRESSIONS: Progression[] = [
  {
    name: "pop-standard",
    displayName: "Pop Standard",
    romanDisplay: "I – V – vi – IV",
    description: "The most common pop progression",
    degrees: ["I", "V", "vi", "IV"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "sensitive-pop",
    displayName: "Sensitive Pop",
    romanDisplay: "vi – IV – I – V",
    description: "Minor-feel variant of the pop progression",
    degrees: ["vi", "IV", "I", "V"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "doo-wop",
    displayName: "50s / Doo-Wop",
    romanDisplay: "I – vi – IV – V",
    description: "Classic 1950s progression",
    degrees: ["I", "vi", "IV", "V"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "folk-rock",
    displayName: "Folk Rock",
    romanDisplay: "I – IV – V",
    description: "Simple three-chord foundation",
    degrees: ["I", "IV", "V"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "jazz-turnaround",
    displayName: "Jazz Turnaround",
    romanDisplay: "ii – V – I",
    description: "The most important cadence in jazz",
    degrees: ["ii", "V", "I"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "extended-turnaround",
    displayName: "Extended Turnaround",
    romanDisplay: "vi – ii – V – I",
    description: "Jazz turnaround extended one step back",
    degrees: ["vi", "ii", "V", "I"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "blues-rock",
    displayName: "Blues Rock",
    romanDisplay: "I – ♭VII – IV",
    description: "Rock staple with the ♭VII chord (diatonic in mixolydian)",
    degrees: ["I", "♭VII", "IV"],
    mode: "mixolydian",
    recommendedScaleType: "Mixolydian Scale",
  },
  {
    name: "classic-rock-loop",
    displayName: "Classic Rock Loop",
    romanDisplay: "I – IV – I – V",
    description: "Looping rock pattern with repeated tonic",
    degrees: ["I", "IV", "I", "V"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "climactic-rise",
    displayName: "Climactic Rise",
    romanDisplay: "I – IV – V – IV",
    description: "Rising tension then releasing back through IV",
    degrees: ["I", "IV", "V", "IV"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "dark-ballad",
    displayName: "Dark / Emo Ballad",
    romanDisplay: "i – ♭VI – ♭III – ♭VII",
    description: "Descending minor progression",
    degrees: ["i", "♭VI", "♭III", "♭VII"],
    mode: "aeolian",
    recommendedScaleType: "Natural Minor Scale",
  },
  {
    name: "driving-rock",
    displayName: "Driving Rock",
    romanDisplay: "vi – V – IV – V",
    description: "Descending major pattern starting on vi",
    degrees: ["vi", "V", "IV", "V"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "epic-cadence",
    displayName: "Epic Cadence",
    romanDisplay: "IV – V – iii – vi",
    description: "Ascending then landing on vi",
    degrees: ["IV", "V", "iii", "vi"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "pachelbel",
    displayName: "Pachelbel's Canon",
    romanDisplay: "I – V – vi – iii – IV – I – IV – V",
    description: "Classical progression, basis for many modern songs",
    degrees: ["I", "V", "vi", "iii", "IV", "I", "IV", "V"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "gospel-rb",
    displayName: "Gospel / R&B Loop",
    romanDisplay: "I – vi – ii – V",
    description: "Smooth loop common in gospel and R&B",
    degrees: ["I", "vi", "ii", "V"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "progressive-ballad",
    displayName: "Progressive Ballad",
    romanDisplay: "vi – iii – IV – I",
    description: "Descending through the major scale",
    degrees: ["vi", "iii", "IV", "I"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
]

export function listProgressions(): Progression[] {
  return PROGRESSIONS
}

// ---------------------------------------------------------------------------
// Roman numeral → degree (1-based), including ♭-prefixed
// ---------------------------------------------------------------------------
const ROMAN_TO_DEGREE: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7,
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7,
  "♭II": 2, "♭III": 3, "♭IV": 4, "♭V": 5, "♭VI": 6, "♭VII": 7,
  "♭ii": 2, "♭iii": 3, "♭iv": 4, "♭v": 5, "♭vi": 6, "♭vii": 7,
}

function romanToDegree(roman: string): number {
  // Strip decoration symbols (°, +) but NOT ♭ — ♭VII must match as-is
  const normalized = roman.replace(/[°+]/g, "")
  return ROMAN_TO_DEGREE[normalized] ?? 1
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function getProgression(name: string, tonic: string): ProgressionChord[] {
  const prog = PROGRESSIONS.find((p) => p.name === name)
  if (!prog) return []

  // Use the progression's own mode (not hardcoded "major")
  const diatonic = getDiatonicChords(tonic, prog.mode)
  const byDegree: Record<number, DiatonicChord> = {}
  for (const dc of diatonic) byDegree[dc.degree] = dc

  return prog.degrees.map((roman) => {
    const degree = romanToDegree(roman)
    const dc = byDegree[degree]
    if (!dc) {
      return { roman, nashville: String(degree), tonic, type: "maj7", quality: "major", degree }
    }
    return {
      roman,
      nashville: dc.nashville,
      tonic: dc.tonic,
      type: dc.type,
      quality: dc.quality,
      degree: dc.degree,
    }
  })
}
