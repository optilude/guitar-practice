import { Chord, Note } from "tonal"
import SCALE_PATTERNS from "@/lib/theory/data/scale-patterns"
import type { GuitarScale, ScalePosition, FretPosition } from "@/lib/theory/types"

// Open-string chroma (index 0 = string 6 low E, 5 = string 1 high e)
const OPEN_CHROMA = [4, 9, 2, 7, 11, 4]

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

function rootFretOnLowE(tonic: string): number {
  const chroma = Note.chroma(tonic)
  if (chroma === undefined || chroma === null) return 0
  return ((chroma - OPEN_CHROMA[0] + 12) % 12)
}

// ---------------------------------------------------------------------------
// Build arpeggio positions by filtering Major scale positions to chord tones
// ---------------------------------------------------------------------------
function buildArpeggioPositions(
  tonic: string,
  chordNotes: string[],
  chordIntervals: string[],
  positionIndex?: number
): ScalePosition[] {
  const rootFret = rootFretOnLowE(tonic)
  const patterns = SCALE_PATTERNS["Major"]
  if (!patterns) return []

  // Build all positions first, then filter to chord tones
  const allPositions = patterns.map((patternPos) => {
    const fretPositions: FretPosition[] = []

    for (const [guitarString, fretOffset] of patternPos.shape) {
      const absoluteFret = rootFret + fretOffset
      const stringIndex = 6 - guitarString
      const openC = OPEN_CHROMA[stringIndex]
      const noteChroma = (openC + absoluteFret + 1200) % 12 // +1200 keeps result positive when absoluteFret is negative

      // Only include if this fret is a chord tone
      const noteIndex = chordNotes.findIndex(
        (n) => Note.chroma(n) === noteChroma
      )
      if (noteIndex === -1) continue

      fretPositions.push({
        string: guitarString,
        fret: absoluteFret,
        interval: intervalLabel(chordIntervals[noteIndex]),
      })
    }

    return {
      label: patternPos.label,
      positions: fretPositions,
    }
  }).filter((p) => p.positions.length > 0)

  // Clamp positionIndex against the filtered positions list (same pattern as scales.ts)
  if (positionIndex !== undefined) {
    if (allPositions.length === 0) return []
    const clamped = Math.max(0, Math.min(positionIndex, allPositions.length - 1))
    return [allPositions[clamped]]
  }

  return allPositions
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function getArpeggio(
  tonic: string,
  chordType: string,
  positionIndex?: number
): GuitarScale {
  const chord = Chord.get(`${tonic}${chordType}`)
  const notes     = chord.notes.length > 0 ? chord.notes : [tonic]
  const intervals = chord.intervals.length > 0 ? chord.intervals : ["1P"]

  const positions = buildArpeggioPositions(tonic, notes, intervals, positionIndex)

  return {
    tonic,
    type: chordType,
    notes,
    intervals,
    positions,
  }
}
