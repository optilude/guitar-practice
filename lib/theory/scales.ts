import { Scale, Note } from "tonal"
import SCALE_PATTERNS from "@/lib/theory/data/scale-patterns"
import type { GuitarScale, ScalePosition, FretPosition } from "@/lib/theory/types"

// ---------------------------------------------------------------------------
// Open-string chroma values: index 0 = string 6 (low E), 5 = string 1 (high e)
// ---------------------------------------------------------------------------
const OPEN_CHROMA = [4, 9, 2, 7, 11, 4] // low E, A, D, G, B, high e

// ---------------------------------------------------------------------------
// Interval display labels (TonalJS interval → guitar interval name)
// ---------------------------------------------------------------------------
const INTERVAL_LABEL: Record<string, string> = {
  "1P": "R",
  "2m": "b2", "2M": "2",
  "3m": "b3", "3M": "3",
  "4P": "4",  "4A": "#4",
  "5d": "b5", "5P": "5", "5A": "#5",
  "6m": "b6", "6M": "6",
  "7m": "b7", "7M": "7",
}

function intervalLabel(tonalInterval: string): string {
  return INTERVAL_LABEL[tonalInterval] ?? tonalInterval
}

// ---------------------------------------------------------------------------
// Root fret on low E (string 6) for a given tonic
// ---------------------------------------------------------------------------
function rootFretOnLowE(tonic: string): number {
  const chroma = Note.chroma(tonic)
  if (chroma === undefined || chroma === null) return 0
  return ((chroma - OPEN_CHROMA[0] + 12) % 12)
}

// ---------------------------------------------------------------------------
// Map TonalJS scale type name → our pattern key
// ---------------------------------------------------------------------------
const TONAL_TO_PATTERN: Record<string, string> = {
  major:                   "Major",
  ionian:                  "Major",
  dorian:                  "Dorian",
  phrygian:                "Phrygian",
  lydian:                  "Lydian",
  mixolydian:              "Mixolydian",
  aeolian:                 "Aeolian",
  minor:                   "Aeolian",
  locrian:                 "Locrian",
  "harmonic minor":        "Harmonic Minor",
  "melodic minor":         "Melodic Minor",
  altered:                 "Altered",
  "major pentatonic":      "Pentatonic Major",
  "minor pentatonic":      "Pentatonic Minor",
  blues:                   "Blues",
  "whole tone":            "Whole Tone",
  "diminished whole half": "Diminished Whole-Half",
  "diminished half whole": "Diminished Half-Whole",
}

// Our display type → TonalJS scale name (for Scale.get())
const PATTERN_TO_TONAL: Record<string, string> = {
  Major:                   "major",
  Dorian:                  "dorian",
  Phrygian:                "phrygian",
  Lydian:                  "lydian",
  Mixolydian:              "mixolydian",
  Aeolian:                 "aeolian",
  Locrian:                 "locrian",
  "Harmonic Minor":        "harmonic minor",
  "Melodic Minor":         "melodic minor",
  Altered:                 "altered",
  "Pentatonic Major":      "major pentatonic",
  "Pentatonic Minor":      "minor pentatonic",
  Blues:                   "blues",
  "Whole Tone":            "whole tone",
  "Diminished Whole-Half": "diminished whole half",
  "Diminished Half-Whole": "diminished half whole",
}

// ---------------------------------------------------------------------------
// Build fretboard positions from a pattern shape
// IMPORTANT: Only include fret positions where the note is in the scale.
// Non-scale notes (due to imperfect pattern data) are skipped.
// ---------------------------------------------------------------------------
function buildPositions(
  patternKey: string,
  rootFret: number,
  scaleNotes: string[],
  scaleIntervals: string[]
): ScalePosition[] {
  const patterns = SCALE_PATTERNS[patternKey]
  if (!patterns) return []

  return patterns.map((patternPos) => {
    const fretPositions: FretPosition[] = []

    for (const [guitarString, fretOffset] of patternPos.shape) {
      const absoluteFret = rootFret + fretOffset
      const stringIndex = 6 - guitarString // 0=str6, 5=str1
      const openC = OPEN_CHROMA[stringIndex]
      const noteChroma = (openC + absoluteFret + 1200) % 12 // +1200 keeps result positive when absoluteFret is negative

      // Only include notes that are actually in the scale
      const noteIndex = scaleNotes.findIndex(
        (n) => Note.chroma(n) === noteChroma
      )
      if (noteIndex === -1) continue  // Skip non-scale notes

      fretPositions.push({
        string: guitarString,
        fret: absoluteFret,
        interval: intervalLabel(scaleIntervals[noteIndex]),
      })
    }

    return {
      label: patternPos.label,
      positions: fretPositions,
    }
  }).filter((pos) => pos.positions.length > 0)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function listScaleTypes(): string[] {
  return Object.keys(SCALE_PATTERNS)
}

export function getScale(
  tonic: string,
  type: string,
  positionIndex?: number
): GuitarScale {
  // Normalize our display type to TonalJS name
  const tonalName = PATTERN_TO_TONAL[type] ?? type.toLowerCase()
  const scale = Scale.get(`${tonic} ${tonalName}`)

  // Fall back gracefully if TonalJS doesn't know the scale
  const notes     = scale.notes.length > 0 ? scale.notes : [tonic]
  const intervals = scale.intervals.length > 0 ? scale.intervals : ["1P"]

  // Find pattern key (try display type first, then normalize)
  const patternKey =
    SCALE_PATTERNS[type] ? type :
    TONAL_TO_PATTERN[tonalName] ?? type

  const rootFret = rootFretOnLowE(tonic)
  let positions = buildPositions(patternKey, rootFret, notes, intervals)

  if (positionIndex !== undefined) {
    const clamped = Math.max(0, Math.min(positionIndex, positions.length - 1))
    positions = positions.slice(clamped, clamped + 1)
  }

  return {
    tonic,
    type,
    notes,
    intervals,
    positions,
  }
}
