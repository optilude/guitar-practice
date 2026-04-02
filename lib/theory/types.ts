export type NoteName = string // "C", "D#", "Bb"
export type IntervalName = string // "1P", "3M", "7m" (TonalJS format)
export type ScaleType = string // "Major", "Dorian", "Altered", "Blues", etc.
export type ChordType = string // "maj7", "m7", "7", "m7b5", "dim7", "aug", etc.

export interface FretPosition {
  string: number // 1 = high e, 6 = low E
  fret: number
  interval: string // "R", "2", "b3", "3", "4", "b5", "5", "6", "b7", "7"
}

export interface ScalePosition {
  label: string // "Position 1", "Position 2", etc.
  positions: FretPosition[]
}

export interface GuitarScale {
  tonic: NoteName
  type: ScaleType
  notes: NoteName[]
  intervals: IntervalName[]
  positions: ScalePosition[]
}

export interface ChordVoicing {
  frets: (number | null)[] // index 0 = low E string, null = muted
  fingers: (number | null)[]
  barre?: { fret: number; fromString: number; toString: number }
  label?: string // "Drop 2", "Drop 3", "Open", "Barre Xfr", etc.
}

export interface GuitarChord {
  tonic: NoteName
  type: ChordType
  notes: NoteName[]
  intervals: IntervalName[]
  voicings: ChordVoicing[]
}

export interface DiatonicChord {
  degree: number // 1–7
  roman: string // "I", "ii", "iii", "IV", "V", "vi", "vii°"
  nashville: string // "1", "2", "3", "4", "5", "6", "7"
  tonic: NoteName
  type: ChordType
  quality: string // "major", "minor", "diminished", "augmented"
}

export interface CircleEntry {
  tonic: NoteName
  relativeMajor?: NoteName
  relativeMinor?: NoteName
  sharps?: number
  flats?: number
}

export interface Progression {
  name: string          // slug identifier: "pop-standard"
  displayName: string   // "Pop Standard"
  romanDisplay: string  // "I – V – vi – IV"
  description: string   // short prose
  degrees: string[]     // ["I", "V", "vi", "IV"] — may include "♭VII"
  mode: string          // TonalJS mode name: "ionian", "aeolian", "mixolydian"
  recommendedScaleType: string // "Major Scale", "Natural Minor Scale", "Mixolydian Scale"
}

export interface ProgressionChord {
  roman: string
  nashville: string
  tonic: NoteName
  type: ChordType
  quality: string  // "major" | "minor" | "dominant" | "diminished"
  degree: number   // 1–7
}

export interface SoloScaleEntry {
  scaleName: string  // type only, no tonic: "Mixolydian", "Minor Pentatonic"
  hint?: string      // "bluesy", "lifted feel", "brighter", "adds ♭5 colour"
}

export interface SoloScales {
  chordTonic: NoteName        // e.g. "G" — prepend to scale name for display
  primary: SoloScaleEntry
  additional: SoloScaleEntry[]
}

export interface Key {
  tonic: NoteName
  mode: string
  notes: NoteName[]
  signature: { sharps?: number; flats?: number }
  diatonicChords: DiatonicChord[]
  relativeKey: { tonic: NoteName; mode: string }
}
