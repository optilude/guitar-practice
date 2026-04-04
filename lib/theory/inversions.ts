import type { ChordPosition } from "./chords"
import type { GuitarScale } from "@/lib/theory/types"
import { getArpeggio } from "@/lib/theory/arpeggios"
import { Chord as TonalChord, Note } from "tonal"
import rawInversions from "@/data/inversions.json"

// Open-string chroma values (C=0 … B=11), index 0 = string 6 (low E), index 5 = string 1 (high e)
const OPEN_CHROMA = [4, 9, 2, 7, 11, 4] as const

const TONAL_TYPE: Record<string, string> = {
  major: "maj", minor: "m", diminished: "dim", augmented: "aug",
}

// ---------------------------------------------------------------------------
// Inversion voicing database
//
// Source: data/inversions.json (LLM-generated, standard tuning, frets 0–12)
// Filtering: only voicings with fret span ≤ 5 are kept
// Sorting: all close string sets first (root 6→3), then all open sets (root 6→4),
//          within each string set by lowest fret
// ---------------------------------------------------------------------------

export const INVERSION_TYPES = ["major", "minor", "diminished", "augmented"] as const
export type InversionType = (typeof INVERSION_TYPES)[number]

// Canonical string-set order: root string descending (6→3), close before open
const STRING_SET_ORDER: readonly string[] = [
  // Close voicings (adjacent strings) — root string 6 → 3
  "6-5-4",
  "5-4-3",
  "4-3-2",
  "3-2-1",
  // Open/spread voicings — root string 6 → 4
  "6-5-3",
  "6-4-3",
  "5-4-2",
  "5-3-2",
  "4-3-1",
  "4-2-1",
]

const INVERSION_LABEL: Record<string, string> = {
  root:   "Root position",
  first:  "1st inversion",
  second: "2nd inversion",
}

export type NoteRole = "root" | "third" | "fifth"

export interface InversionVoicing extends ChordPosition {
  stringSet: string
  voicingType: "close" | "open"
  inversion: "root" | "first" | "second"
  minFret: number // lowest non-open fret (0 if all open), for ordering
  /** Interval role of each string (index 0 = str6). null = string not played. */
  noteRoles: Array<NoteRole | null>
  /** Note name for each string (e.g. "C", "Eb"). null = string not played. */
  noteNames: Array<string | null>
}

// ---------------------------------------------------------------------------
// Raw JSON shape (entries after the schema object)
// ---------------------------------------------------------------------------
interface RawString {
  guitar_string: number // 6=low E … 1=high e
  fret: number          // 0=open, 1–12=closed
}

interface RawEntry {
  root: string
  type: string
  inversion: string
  string_set: string
  voicing_type: string
  frets: number[]
  span: number
  strings: RawString[]
}

// ---------------------------------------------------------------------------
// Build the filtered + sorted database at module load time
// ---------------------------------------------------------------------------

function computeRolesAndNames(entry: RawEntry): {
  noteRoles: Array<NoteRole | null>
  noteNames: Array<string | null>
} {
  const symbol = `${entry.root}${TONAL_TYPE[entry.type] ?? entry.type}`
  const chordNotes = TonalChord.get(symbol).notes // ["C", "E", "G"]
  const chordChromas = chordNotes.map((n) => Note.get(n).chroma ?? 0)
  const roleOrder: NoteRole[] = ["root", "third", "fifth"]

  const noteRoles: Array<NoteRole | null> = [null, null, null, null, null, null]
  const noteNames: Array<string | null>   = [null, null, null, null, null, null]

  for (const s of entry.strings) {
    const idx    = 6 - s.guitar_string
    const chroma = (OPEN_CHROMA[idx] + s.fret) % 12
    const match  = chordChromas.indexOf(chroma)
    if (match >= 0) {
      noteRoles[idx] = roleOrder[match]
      noteNames[idx] = chordNotes[match]
    }
  }
  return { noteRoles, noteNames }
}

function convertEntry(entry: RawEntry): InversionVoicing {
  // Build 6-element fret array (index 0 = str6, index 5 = str1)
  const absFrets: number[] = [-1, -1, -1, -1, -1, -1]
  for (const s of entry.strings) {
    absFrets[6 - s.guitar_string] = s.fret // 0=open, 1+=closed absolute
  }

  // baseFret = lowest closed (fret>0) note; 1 if all open
  const closedFrets = absFrets.filter((f) => f > 0)
  const baseFret = closedFrets.length > 0 ? Math.min(...closedFrets) : 1

  // Convert to react-chords relative format:
  //   -1 = muted, 0 = open string, 1+ = relative to baseFret
  const frets = absFrets.map((f) => {
    if (f === -1) return -1   // muted
    if (f === 0)  return 0    // open string (always 0, never relative)
    return f - baseFret + 1   // relative to baseFret
  })

  const minFret = closedFrets.length > 0 ? Math.min(...closedFrets) : 0
  const label = INVERSION_LABEL[entry.inversion] ?? entry.inversion

  const { noteRoles, noteNames } = computeRolesAndNames(entry)

  return {
    frets,
    fingers: [0, 0, 0, 0, 0, 0],
    baseFret,
    barres: [],
    capo: false,
    label,
    stringSet: entry.string_set,
    voicingType: entry.voicing_type as "close" | "open",
    inversion: entry.inversion as "root" | "first" | "second",
    minFret,
    noteRoles,
    noteNames,
  }
}

// Index by "root::type" → InversionVoicing[]
const DB = new Map<string, InversionVoicing[]>()

;(function buildDB() {
  const setOrder = new Map(STRING_SET_ORDER.map((s, i) => [s, i]))

  // rawInversions[0] is the schema object — skip entries without a "root" field
  const entries = (rawInversions as unknown[]).filter(
    (e): e is RawEntry =>
      typeof e === "object" &&
      e !== null &&
      "root" in e &&
      "span" in e &&
      (e as RawEntry).span <= 5,
  )

  // Sort: STRING_SET_ORDER position, then minFret
  entries.sort((a, b) => {
    const si =
      (setOrder.get(a.string_set) ?? 99) - (setOrder.get(b.string_set) ?? 99)
    if (si !== 0) return si
    const aMin = a.frets.filter((f) => f > 0)
    const bMin = b.frets.filter((f) => f > 0)
    const aFret = aMin.length > 0 ? Math.min(...aMin) : 0
    const bFret = bMin.length > 0 ? Math.min(...bMin) : 0
    return aFret - bFret
  })

  for (const entry of entries) {
    const key = `${entry.root}::${entry.type}`
    if (!DB.has(key)) DB.set(key, [])
    DB.get(key)!.push(convertEntry(entry))
  }
})()

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns all spread-filtered inversion voicings for a given tonic and type,
 * pre-sorted (lower root string first, close before open, lower fret first).
 * Returns [] for unknown tonic or type.
 */
export function getInversionVoicings(tonic: string, type: string): InversionVoicing[] {
  return DB.get(`${tonic}::${type}`) ?? []
}

/**
 * All string sets in canonical display order.
 */
export const INVERSION_STRING_SETS: readonly string[] = STRING_SET_ORDER

// ---------------------------------------------------------------------------
// Mapping from inversion type display strings to tonal.js chord symbols.
// ---------------------------------------------------------------------------
const INVERSION_TO_TONAL: Record<string, string> = {
  major:      "maj",
  minor:      "m",
  diminished: "dim",
  augmented:  "aug",
}

/**
 * Returns a GuitarScale containing all positions of an inversion's tones across
 * the full fretboard. Accepts the same type strings as INVERSION_TYPES
 * ("major", "minor", "diminished", "augmented").
 */
export function getInversionAsScale(tonic: string, type: string): GuitarScale {
  const tonalSym = INVERSION_TO_TONAL[type] ?? type
  return getArpeggio(tonic, tonalSym)
}
