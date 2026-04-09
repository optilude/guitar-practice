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
  category: string      // "Pop" | "Blues" | "Jazz" | "Rock" | "Folk / Country" | "Classical / Modal"
  romanDisplay: string  // "I – V – vi – IV"
  description: string   // short prose
  examples: string      // comma-separated song examples
  notes: string         // explanatory note for the info popover
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

/** A chord in a substitution preview. May not be diatonic to the key. */
export type PreviewChord = {
  tonic: string    // e.g. "E", "Bb"
  type: string     // e.g. "7", "m7", "m7b5", "dim7"
  roman: string    // local-function label e.g. "V7/vi", "ii/V", "bII7"
  quality: string  // "major" | "minor" | "dominant" | "diminished"
  degree?: number  // present for converted original chords; absent for substitution chords
}

export type SubstitutionResult =
  | {
      kind: "replacement"
      /** Replace chord at that index in the progression array. */
      replacements: Array<{ index: number; chord: PreviewChord }>
    }
  | {
      kind: "insertion"
      /** Splice these chords immediately before this index. */
      insertBefore: number
      chords: PreviewChord[]
    }
  | {
      kind: "range_replacement"
      /** Replace the contiguous slice [startIndex, endIndex] (inclusive) with an arbitrary list.
       *  Used for Coltrane Changes (3 chords → 7). */
      startIndex: number
      endIndex: number
      chords: PreviewChord[]
    }

export type ChordSubstitution = {
  id: string         // stable unique key, e.g. "diatonic-deg6", "tritone", "v-approach"
  ruleName: string   // group heading in SubstitutionsPanel, e.g. "Diatonic Substitution"
  label: string      // option row text, e.g. "Em7", "D7 → Gmaj7"
  effect: string     // one-liner description shown as muted text
  result: SubstitutionResult
  sortRank: number   // lower = displayed first
}
