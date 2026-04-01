import { Note } from "tonal"
import type { GuitarScale } from "@/lib/theory/types"
import { INTERVAL_DEGREE_COLORS } from "@/lib/rendering/tab"
import SCALE_PATTERNS from "@/lib/theory/data/scale-patterns"

// ---------------------------------------------------------------------------
// Fretboard.js — imported via ESM. Rendering only runs client-side (useEffect).
// If named imports fail at runtime, adjust to: import * as fb from "..."
// ---------------------------------------------------------------------------
import { Fretboard, FretboardSystem, Systems } from "@moonwave99/fretboard.js"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
// Open-string chroma: index 0 = string 6 (low E), index 5 = string 1 (high e)
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type BoxSystem = "none" | "caged" | "3nps" | "pentatonic" | "windows"

export type FretboardDot = {
  string: number    // 1 = high e, 6 = low E
  fret: number      // 0–15
  interval: string  // display label: "R", "b3", "5", etc.
  note: string      // note name: "C", "Eb", "G", etc.
}

// ---------------------------------------------------------------------------
// Box system availability
// ---------------------------------------------------------------------------
const PENTATONIC_SCALE_TYPES = new Set(["Pentatonic Major", "Pentatonic Minor", "Blues"])
const NO_BOX_SCALE_TYPES     = new Set(["Whole Tone", "Diminished Whole-Half", "Diminished Half-Whole"])

const PENTATONIC_TYPE_MAP: Record<string, string> = {
  "Pentatonic Minor": "pentatonic minor",
  "Pentatonic Major": "major pentatonic",
  "Blues":            "minor pentatonic",
}

export const CHORD_TYPE_TO_SCALE: Record<string, string> = {
  // Major family
  maj:     "Major",  maj7: "Major",  maj9: "Major",  "6": "Major",  add9: "Major",
  // Minor family — all minor types use Dorian as parent scale (per design spec)
  m:       "Dorian",  m6:  "Dorian",  m7: "Dorian",  m9: "Dorian",  madd9: "Dorian",
  // Dominant family
  "7":     "Mixolydian", "9": "Mixolydian", "11": "Mixolydian", "13": "Mixolydian",
  // Diminished / other
  m7b5:    "Locrian",
  mmaj7:   "Melodic Minor",  mmaj9: "Melodic Minor",
}

export function getScaleBoxSystems(scaleType: string): BoxSystem[] {
  if (NO_BOX_SCALE_TYPES.has(scaleType))     return ["none"]
  if (PENTATONIC_SCALE_TYPES.has(scaleType)) return ["none", "pentatonic"]
  return ["none", "caged", "3nps"]
}

export function getArpeggioBoxSystems(chordType: string): BoxSystem[] {
  return CHORD_TYPE_TO_SCALE[chordType] ? ["none", "caged", "3nps"] : ["none", "windows"]
}

// ---------------------------------------------------------------------------
// Full fretboard position computation
// ---------------------------------------------------------------------------
export function getAllFretboardPositions(
  tonic: string,
  scaleNotes: string[],
  scaleIntervals: string[]
): FretboardDot[] {
  const scaleChroma = scaleNotes.map(n => Note.chroma(n) ?? -1)
  const intervalLabels = scaleIntervals.map(iv => INTERVAL_LABEL[iv] ?? iv)

  const dots: FretboardDot[] = []
  for (let strIdx = 0; strIdx < 6; strIdx++) {
    const guitarString = 6 - strIdx
    const openCh = OPEN_CHROMA[strIdx]
    for (let fret = 0; fret <= 15; fret++) {
      const noteChroma = (openCh + fret) % 12
      const noteIdx = scaleChroma.indexOf(noteChroma)
      if (noteIdx !== -1) {
        dots.push({
          string: guitarString,
          fret,
          interval: intervalLabels[noteIdx],
          note: scaleNotes[noteIdx],
        })
      }
    }
  }
  return dots
}

// ---------------------------------------------------------------------------
// 3NPS position computation — stubs filled in Task 3
// ---------------------------------------------------------------------------
export function build3NPSPositions(
  tonic: string,
  scaleNotes: string[],
  _scaleIntervals: string[]
): Set<string>[] {
  if (scaleNotes.length < 7) return []

  const scaleChroma = scaleNotes.map(n => Note.chroma(n) ?? -1)

  // For each string, all frets 0–17 that are scale tones (extends to 17 for positional overlap)
  const fretsByString: number[][] = OPEN_CHROMA.map(openCh => {
    const frets: number[] = []
    for (let f = 0; f <= 17; f++) {
      if (scaleChroma.includes((openCh + f) % 12)) frets.push(f)
    }
    return frets
  })

  // 7 positions: one starting on each scale degree.
  // startFret for position i = lowest fret of scale degree i on string 6.
  return scaleChroma.map(degChroma => {
    const inBox = new Set<string>()
    let startFret = ((degChroma - OPEN_CHROMA[0] + 12) % 12)

    for (let strIdx = 0; strIdx < 6; strIdx++) {
      const guitarString = 6 - strIdx
      // Take first 3 scale tones at or above startFret on this string
      const chosen = fretsByString[strIdx].filter(f => f >= startFret).slice(0, 3)
      // Only add frets within display range (0–15)
      chosen.forEach(f => { if (f <= 15) inBox.add(`${guitarString}:${f}`) })
      // Carry the lowest chosen fret forward as the anchor for the next string
      if (chosen.length > 0) startFret = chosen[0]
    }

    return inBox
  })
}

// ---------------------------------------------------------------------------
// Box membership — stub filled in Task 4
// ---------------------------------------------------------------------------
export function getBoxMembershipSet(
  tonic: string,
  scaleType: string,
  boxSystem: BoxSystem,
  boxIndex: number,
  scaleNotes: string[],
  scaleIntervals: string[]
): Set<string> {
  return new Set() // stub — implemented in Task 4
}

// ---------------------------------------------------------------------------
// renderFretboard — stub filled in Task 6
// ---------------------------------------------------------------------------
export function renderFretboard(
  containerEl: HTMLElement,
  scale: GuitarScale,
  boxSystem: BoxSystem,
  boxIndex: number,
  labelMode: "note" | "interval",
  boxScaleType?: string
): void {
  containerEl.innerHTML = "<p class='text-xs text-muted-foreground'>Fretboard coming soon</p>"
}
