import { Scale, Note } from "tonal"
import type { GuitarScale, ScalePosition, FretPosition } from "@/lib/theory/types"

// ---------------------------------------------------------------------------
// Open-string chroma values: index 0 = string 6 (low E), 5 = string 1 (high e)
// ---------------------------------------------------------------------------
const OPEN_CHROMA = [4, 9, 2, 7, 11, 4] // low E, A, D, G, B, high e

// ---------------------------------------------------------------------------
// Position windows: fret offsets relative to rootFret on string 6 (low E).
// Each window scans all 6 strings for scale notes in that fret range.
// This generates positions algorithmically — no hardcoded per-note shapes.
// ---------------------------------------------------------------------------
const POSITION_WINDOWS = [
  { label: "Position 1 (E shape)", start: -1, end: 3 },
  { label: "Position 2 (D shape)", start: 2,  end: 6 },
  { label: "Position 3 (C shape)", start: 4,  end: 8 },
  { label: "Position 4 (A shape)", start: 7,  end: 11 },
  { label: "Position 5 (G shape)", start: 9,  end: 13 },
]

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
  // Melodic Minor modes
  "Dorian b2":             "dorian b2",
  "Ionian #5":             "ionian augmented",
  "Dorian #4":             "dorian #4",
  "Mixolydian b6":         "mixolydian b6",
  "Locrian #6":            "locrian 6",
  "Altered Diminished":    "ultralocrian",
  // Harmonic Minor modes
  "Lydian #2":             "lydian #9",
  Altered:                 "altered",
  "Lydian Dominant":       "lydian dominant",
  "Lydian Augmented":      "lydian augmented",
  "Phrygian Dominant":     "phrygian dominant",
  "Bebop Dominant":        "bebop",
  "Pentatonic Major":      "major pentatonic",
  "Pentatonic Minor":      "minor pentatonic",
  Blues:                   "blues",
  "Locrian #2":            "locrian #2",
  "Whole Tone":            "whole tone",
  "Diminished Whole-Half": "diminished",
  "Diminished Half-Whole": "half-whole diminished",
  Chromatic:               "chromatic",
}

// ---------------------------------------------------------------------------
// Algorithmically build fretboard positions using fret windows.
// For each position window, scan every string for scale notes in that range.
// ---------------------------------------------------------------------------
function buildPositions(
  rootFret: number,
  scaleNotes: string[],
  scaleIntervals: string[]
): ScalePosition[] {
  return POSITION_WINDOWS.map(({ label, start, end }) => {
    let minFret = Math.max(0, rootFret + start)
    let maxFret = rootFret + end
    // If the window falls entirely above the 15-fret display, shift down one octave.
    if (minFret >= 15) {
      minFret = Math.max(0, minFret - 12)
      maxFret = maxFret - 12
    }
    const searchMax = Math.min(maxFret, 15)
    const fretPositions: FretPosition[] = []

    for (let guitarString = 6; guitarString >= 1; guitarString--) {
      const stringIndex = 6 - guitarString // 0=str6, 5=str1
      const openChroma = OPEN_CHROMA[stringIndex]

      for (let fret = minFret; fret <= searchMax; fret++) {
        const noteChroma = (openChroma + fret) % 12
        const noteIndex = scaleNotes.findIndex(
          (n) => Note.chroma(n) === noteChroma
        )
        if (noteIndex !== -1) {
          fretPositions.push({
            string: guitarString,
            fret,
            interval: intervalLabel(scaleIntervals[noteIndex]),
          })
        }
      }
    }

    return { label, positions: fretPositions }
  }).filter((pos) => pos.positions.length > 0)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function listScaleTypes(): string[] {
  return Object.keys(PATTERN_TO_TONAL)
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

  const rootFret = rootFretOnLowE(tonic)
  let positions = buildPositions(rootFret, notes, intervals)

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
