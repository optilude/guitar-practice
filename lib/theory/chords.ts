import { Chord } from "tonal"
import guitarDb from "@tombatossals/chords-db/lib/guitar.json"
import type { ChordVoicing, GuitarChord } from "@/lib/theory/types"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = guitarDb as any

// ---------------------------------------------------------------------------
// Chord type list — sourced from TonalJS chord types for arpeggio panel
// ---------------------------------------------------------------------------
const CHORD_TYPES = [
  // Major
  "maj", "6", "maj7", "maj9", "add9",
  // Minor
  "m", "m6", "m7", "m9", "madd9",
  // Dominant
  "7", "9", "11", "13",
  // Diminished
  "dim", "dim7", "m7b5",
  // Augmented
  "aug",
  // Sus
  "sus2", "sus4", "7sus4",
]

export function listChordTypes(): string[] {
  return CHORD_TYPES
}

// ---------------------------------------------------------------------------
// All chord suffixes available in chords-db across every key (intersection).
// Ordered to match the C-key listing on tombatossals.github.io/react-chords.
// Excludes slash chords and key-specific entries (e.g. "7sg").
// Used by the chord panel to populate the full type dropdown.
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DB_SUFFIXES: string[] = (() => {
  const keys = Object.keys(db.chords) as string[]

  // Build the intersection: suffixes present in every key
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const intersection = new Set<string>((Object.values(db.chords[keys[0]]) as any[]).map((c) => c.suffix as string))
  for (const key of keys.slice(1)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const keySuffixes = new Set<string>((Object.values(db.chords[key]) as any[]).map((c) => c.suffix as string))
    for (const s of intersection) {
      if (!keySuffixes.has(s)) intersection.delete(s)
    }
  }

  // Return in the order they appear in the C key, filtered to the intersection
  // and excluding slash chords (start with "/")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (Object.values(db.chords["C"]) as any[])
    .map((c) => c.suffix as string)
    .filter((s) => intersection.has(s) && !s.startsWith("/"))
})()

export function listChordDbSuffixes(): string[] {
  return DB_SUFFIXES
}

// ---------------------------------------------------------------------------
// Key name mapping: TonalJS tonic → chords-db key
// ---------------------------------------------------------------------------
const TONIC_TO_DB_KEY: Record<string, string> = {
  C:    "C",
  "C#": "Csharp", Db: "Csharp",
  D:    "D",
  "D#": "Eb",     Eb: "Eb",
  E:    "E",
  F:    "F",
  "F#": "Fsharp", Gb: "Fsharp",
  G:    "G",
  "G#": "Ab",     Ab: "Ab",
  A:    "A",
  "A#": "Bb",     Bb: "Bb",
  B:    "B",
}

// ---------------------------------------------------------------------------
// Chord type mapping: our type → chords-db suffix
// ---------------------------------------------------------------------------
const TYPE_TO_DB_SUFFIX: Record<string, string> = {
  maj7:    "maj7",
  maj:     "major",
  m7:      "m7",
  m:       "minor",
  "7":     "7",
  m7b5:    "m7b5",
  dim7:    "dim7",
  dim:     "dim",
  aug:     "aug",
  sus2:    "sus2",
  sus4:    "sus4",
  "9":     "9",
  maj9:    "maj9",
  m9:      "m9",
  "6":     "6",
  m6:      "m6",
  add9:    "add9",
  madd9:   "madd9",
  "7sus4": "7sus4",
}

// ---------------------------------------------------------------------------
// Map a chords-db position entry to our ChordVoicing type.
// The DB stores frets with -1 = muted, values relative to baseFret.
// frets[0] = low E (string 6), frets[5] = high e (string 1)
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapVoicing(pos: any): ChordVoicing {
  const baseFret: number = pos.baseFret ?? 1

  const frets: (number | null)[] = (pos.frets as number[]).map((f: number) =>
    f === -1 ? null : (f === 0 ? 0 : f + baseFret - 1)
  )
  const fingers: (number | null)[] = (pos.fingers as number[]).map((f: number) =>
    f === 0 ? null : f
  )

  const voicing: ChordVoicing = { frets, fingers }

  const barres: number[] = pos.barres ?? []
  if (barres.length > 0) {
    const barreRawFret = barres[0]
    // Find which array indices have this barre fret (not muted, not open)
    const participatingIndices = (pos.frets as number[])
      .map((f: number, i: number) => ({ f, i }))
      .filter(({ f }) => f === barreRawFret)
      .map(({ i }) => i)

    if (participatingIndices.length > 0) {
      const minIdx = Math.min(...participatingIndices)
      const maxIdx = Math.max(...participatingIndices)
      // String number = 6 - arrayIndex (frets[0]=low E=string 6, frets[5]=high e=string 1)
      // fromString = smallest string number (highest pitch = highest array index)
      // toString  = largest string number (lowest pitch  = lowest array index)
      voicing.barre = {
        fret: barreRawFret + baseFret - 1,
        fromString: 6 - maxIdx,
        toString: 6 - minIdx,
      }
    }
    voicing.label = "Barre"
  } else if (baseFret === 1) {
    voicing.label = "Open"
  }

  return voicing
}

// ---------------------------------------------------------------------------
// Look up voicings from chords-db for a given tonic and chord type
// ---------------------------------------------------------------------------
function getVoicingsFromDb(tonic: string, type: string): ChordVoicing[] {
  const dbKey = TONIC_TO_DB_KEY[tonic]
  if (!dbKey) return []

  const dbSuffix = TYPE_TO_DB_SUFFIX[type] ?? type
  const chordsArr = db.chords?.[dbKey]
  if (!chordsArr) return []

  // The chords array is indexed by integer keys — find the matching suffix
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chordEntry = Object.values(chordsArr).find((c: any) => c.suffix === dbSuffix) as any
  if (!chordEntry) return []

  const positions: unknown[] = chordEntry.positions ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return positions.map((pos: any) => mapVoicing(pos))
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function getChord(tonic: string, type: string): GuitarChord {
  const chord = Chord.get(`${tonic}${type}`)
  const notes     = chord.notes.length > 0 ? chord.notes : [tonic]
  const intervals = chord.intervals.length > 0 ? chord.intervals : ["1P"]

  const voicings = getVoicingsFromDb(tonic, type)

  return {
    tonic,
    type,
    notes,
    intervals,
    voicings,
  }
}

// ---------------------------------------------------------------------------
// Raw chord positions for direct use with @tombatossals/react-chords.
// Passes chords-db data through without transformation; fret values are
// relative to baseFret (-1 = muted, 0 = open, 1+ = fret within window).
// ---------------------------------------------------------------------------
export interface ChordPosition {
  frets: number[]
  fingers: number[]
  baseFret: number
  barres: number[]
  capo?: boolean
  label: string
}

export function getChordPositions(tonic: string, type: string): ChordPosition[] {
  const dbKey = TONIC_TO_DB_KEY[tonic]
  if (!dbKey) return []

  const dbSuffix = TYPE_TO_DB_SUFFIX[type] ?? type
  const chordsArr = db.chords?.[dbKey]
  if (!chordsArr) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chordEntry = Object.values(chordsArr).find((c: any) => c.suffix === dbSuffix) as any
  if (!chordEntry) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (chordEntry.positions ?? []).map((pos: any) => {
    const barres: number[] = pos.barres ?? []
    const isOpen = pos.baseFret === 1 && barres.length === 0
    const label = isOpen ? "Open" : `Barre – ${pos.baseFret}fr`
    return {
      frets: pos.frets,
      fingers: pos.fingers,
      baseFret: pos.baseFret ?? 1,
      barres,
      capo: pos.capo ?? false,
      label,
    }
  })
}

/**
 * Generates a drop-2 or drop-3 voicing by lowering the target voice by one octave
 * (subtracting 12 from its fret value on the same string).
 *
 * Note: This can produce negative fret values for low-fret voicings. Consumers should
 * treat negative frets as "this drop voicing is not physically playable in this key" and
 * filter them out or display them as unavailable.
 */
export function generateDropVoicing(voicing: ChordVoicing, drop: 2 | 3): ChordVoicing {
  const frets = [...voicing.frets]

  // Collect sounding string indices sorted highest-pitched first (high string index = low index)
  // frets[0] = low E (string 6, lowest pitch), frets[5] = high e (string 1, highest pitch)
  const soundingIndices = frets
    .map((f, i) => ({ f, i }))
    .filter((x) => x.f !== null)
    .reverse() // now index 0 = highest pitched string

  const targetIndex = drop - 1 // drop-2 → index 1, drop-3 → index 2
  if (soundingIndices.length <= targetIndex) return voicing

  const target = soundingIndices[targetIndex]
  const newFrets = [...frets]
  newFrets[target.i] = (target.f as number) - 12

  return {
    ...voicing,
    frets: newFrets,
    fingers: voicing.fingers,
    barre: undefined, // drop operation invalidates barre layout
    label: `Drop ${drop}`,
  }
}
