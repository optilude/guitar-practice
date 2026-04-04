import { Chord, Note } from "tonal"
import type { GuitarScale, ScalePosition, FretPosition } from "@/lib/theory/types"

// Open-string chroma (index 0 = string 6 low E, 5 = string 1 high e)
const OPEN_CHROMA = [4, 9, 2, 7, 11, 4]

const POSITION_WINDOWS = [
  { label: "Position 1 (E shape)", start: -1, end: 3 },
  { label: "Position 2 (D shape)", start: 2,  end: 6 },
  { label: "Position 3 (C shape)", start: 4,  end: 8 },
  { label: "Position 4 (A shape)", start: 7,  end: 11 },
  { label: "Position 5 (G shape)", start: 9,  end: 13 },
]

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
// Build arpeggio positions algorithmically using fret windows
// ---------------------------------------------------------------------------
function buildArpeggioPositions(
  tonic: string,
  chordNotes: string[],
  chordIntervals: string[],
  positionIndex?: number
): ScalePosition[] {
  const rootFret = rootFretOnLowE(tonic)

  const allPositions = POSITION_WINDOWS.map(({ label, start, end }) => {
    let minFret = Math.max(0, rootFret + start)
    let maxFret = rootFret + end
    // If the window falls entirely above the 15-fret display, shift down one octave.
    // CAGED/position shapes repeat every 12 frets, so this remains musically correct.
    if (minFret >= 15) {
      minFret = Math.max(0, minFret - 12)
      maxFret = maxFret - 12
    }
    const searchMax = Math.min(maxFret, 15)
    const fretPositions: FretPosition[] = []

    for (let guitarString = 6; guitarString >= 1; guitarString--) {
      const stringIndex = 6 - guitarString
      const openChroma = OPEN_CHROMA[stringIndex]

      for (let fret = minFret; fret <= searchMax; fret++) {
        const noteChroma = (openChroma + fret) % 12
        const noteIndex = chordNotes.findIndex(
          (n) => Note.chroma(n) === noteChroma
        )
        if (noteIndex !== -1) {
          fretPositions.push({
            string: guitarString,
            fret,
            interval: intervalLabel(chordIntervals[noteIndex]),
          })
        }
      }
    }

    return { label, positions: fretPositions }
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
