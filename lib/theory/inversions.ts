import type { ChordPosition } from "./chords"
import type { GuitarScale } from "@/lib/theory/types"
import { getArpeggio } from "@/lib/theory/arpeggios"
import { resolveChordNotes } from "@/lib/theory/chord-resolution"
import { Note } from "tonal"
import inversionsDb from "@/data/inversions-db.json"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = inversionsDb as Record<string, any[]>

// Open-string chroma values (C=0 … B=11), index 0 = string 6 (low E), index 5 = string 1 (high e)
const OPEN_CHROMA = [4, 9, 2, 7, 11, 4] as const

// Interval name → short display label
const INTERVAL_LABEL: Record<string, string> = {
  "1P": "R",
  "2m": "b2", "2M": "2",
  "3m": "b3", "3M": "3",
  "4P": "4",  "4A": "#4",
  "5d": "b5", "5P": "5", "5A": "#5",
  "6m": "b6", "6M": "6",
  "7m": "b7", "7M": "7",
  "8P": "R",
  "9m": "b9", "9M": "9", "9A": "#9",
  "11P": "11", "11A": "#11",
  "13M": "13",
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NoteRole = "root" | "third" | "fifth" | "seventh" | "ninth" | "other"

export interface InversionVoicing extends ChordPosition {
  stringSet: string
  voicingType: "close" | "open"
  inversion: "root" | "first" | "second" | "third" | null
  minFret: number
  /** Interval role of each string (index 0 = str6). null = string not played. */
  noteRoles: Array<NoteRole | null>
  /** Note name for each string (e.g. "C", "Eb"). null = string not played. */
  noteNames: Array<string | null>
  /** Short interval label for each string (e.g. "R", "b3", "b7"). null = string not played. */
  noteIntervals: Array<string | null>
}

// ---------------------------------------------------------------------------
// Suffix → TonalJS symbol mapping (for arpeggio overlay and note computation)
// ---------------------------------------------------------------------------

const SUFFIX_TO_TONAL: Record<string, string> = {
  major:       "maj",
  minor:       "m",
  dim:         "dim",
  dim7:        "dim7",
  aug:         "aug",
  "6":         "6",
  "69":        "69",
  "7":         "7",
  aug7:        "7#5",
  "9":         "9",
  aug9:        "9#5",
  "7b9":       "7b9",
  "7#9":       "7#9",
  "11":        "11",
  maj7:        "maj7",
  maj9:        "maj9",
  m6:          "m6",
  m7:          "m7",
  m7b5:        "m7b5",
  m9:          "m9",
  m69:         "m69",
  mmaj7:       "mM7",
  "7#5":       "7#5",
  dom_cluster: "7",
  maj_cluster: "maj7",
  m_cluster:   "m7",
  maj7_shell:  "maj7",
  "6_shell":   "6",
  m7_shell:    "m7",
  m6_shell:    "m6",
  "7_shell":   "7",
  dim7_shell:  "dim7",
}

// ---------------------------------------------------------------------------
// Inversion number (from DB) → typed string key
// ---------------------------------------------------------------------------

const INVERSION_KEY: Record<number, InversionVoicing["inversion"]> = {
  0: "root",
  1: "first",
  2: "second",
  3: "third",
}

const INVERSION_DISPLAY: Record<string, string> = {
  root:   "Root position",
  first:  "1st inversion",
  second: "2nd inversion",
  third:  "3rd inversion",
}

// ---------------------------------------------------------------------------
// Helpers: derive string set, voicing type, and per-string note info
// ---------------------------------------------------------------------------

function computeStringSet(frets: number[]): string {
  // frets[0] = str6 (low E), frets[5] = str1 (high e)
  return frets
    .map((f, i) => (f !== -1 ? 6 - i : null))
    .filter((s): s is number => s !== null)
    .sort((a, b) => b - a)
    .join("-")
}

function computeVoicingType(frets: number[]): "close" | "open" {
  const idx = frets
    .map((f, i) => (f !== -1 ? i : null))
    .filter((x): x is number => x !== null)
  for (let k = 0; k < idx.length - 1; k++) {
    if (idx[k + 1] - idx[k] > 1) return "open"
  }
  return "close"
}

function intervalToRole(iv: string): NoteRole {
  if (iv === "1P" || iv === "8P") return "root"
  if (iv.startsWith("3"))         return "third"
  if (iv.startsWith("5"))         return "fifth"
  if (iv.startsWith("7"))         return "seventh"
  if (iv.startsWith("9") || iv.startsWith("2")) return "ninth"
  return "other"
}

function computeNoteInfo(
  frets: number[],
  baseFret: number,
  tonalSymbol: string,
  tonic: string,
): {
  noteRoles:     Array<NoteRole | null>
  noteNames:     Array<string | null>
  noteIntervals: Array<string | null>
} {
  const { notes: chordNotes, intervals: chordIntervals } = resolveChordNotes(tonic, tonalSymbol)
  const chordChromas = chordNotes.map((n) => Note.get(n).chroma ?? -1)

  const noteRoles:     Array<NoteRole | null> = Array(6).fill(null)
  const noteNames:     Array<string | null>   = Array(6).fill(null)
  const noteIntervals: Array<string | null>   = Array(6).fill(null)

  frets.forEach((relFret, idx) => {
    if (relFret === -1) return // muted
    const absFret = relFret === 0 ? 0 : relFret + baseFret - 1
    const chroma  = (OPEN_CHROMA[idx] + absFret) % 12
    const match   = chordChromas.indexOf(chroma)
    if (match >= 0) {
      const iv           = chordIntervals[match] ?? "1P"
      noteRoles[idx]     = intervalToRole(iv)
      noteNames[idx]     = chordNotes[match]
      noteIntervals[idx] = INTERVAL_LABEL[iv] ?? iv
    }
  })

  return { noteRoles, noteNames, noteIntervals }
}

// ---------------------------------------------------------------------------
// Convert a DB position entry to InversionVoicing
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertPosition(pos: any, suffix: string, tonic: string): InversionVoicing {
  const frets:   number[] = pos.frets
  const fingers: number[] = pos.fingers
  const baseFret: number  = pos.baseFret ?? 1
  const barres:  number[] = pos.barres ?? []

  const stringSet   = computeStringSet(frets)
  const voicingType = computeVoicingType(frets)
  const inversion   = INVERSION_KEY[pos.inversion as number] ?? null
  const label       = inversion ? (INVERSION_DISPLAY[inversion] ?? inversion) : "Voicing"

  // minFret: baseFret is the absolute lowest closed fret (used for ordering)
  const hasClosedFrets = frets.some((f) => f > 0)
  const minFret        = hasClosedFrets ? baseFret : 0

  const tonalSymbol = SUFFIX_TO_TONAL[suffix] ?? suffix
  const { noteRoles, noteNames, noteIntervals } = computeNoteInfo(frets, baseFret, tonalSymbol, tonic)

  return {
    frets,
    fingers,
    baseFret,
    barres,
    capo: false,
    label,
    stringSet,
    voicingType,
    inversion,
    minFret,
    noteRoles,
    noteNames,
    noteIntervals,
  }
}

// ---------------------------------------------------------------------------
// Build canonical string-set ordering from the C-key positions
// (shapes are transposition-invariant, so C covers all)
// ---------------------------------------------------------------------------

function buildStringSetsOrder(): string[] {
  const seen = new Set<string>()
  for (const entry of (db["C"] ?? [])) {
    for (const pos of entry.positions ?? []) {
      seen.add(computeStringSet(pos.frets))
    }
  }

  function isClose(set: string): boolean {
    const parts = set.split("-").map(Number)
    for (let i = 0; i < parts.length - 1; i++) {
      if (parts[i] - parts[i + 1] !== 1) return false
    }
    return true
  }

  // Compare: more strings first, higher root string first, then secondary strings ascending
  function cmp(a: string, b: string): number {
    const ap = a.split("-").map(Number)
    const bp = b.split("-").map(Number)
    if (ap.length !== bp.length) return bp.length - ap.length
    if (ap[0] !== bp[0]) return bp[0] - ap[0]
    for (let i = 1; i < Math.min(ap.length, bp.length); i++) {
      if (ap[i] !== bp[i]) return ap[i] - bp[i]
    }
    return 0
  }

  const closeSets = [...seen].filter(isClose).sort(cmp)
  const openSets  = [...seen].filter((s) => !isClose(s)).sort(cmp)
  return [...closeSets, ...openSets]
}

const SORTED_STRING_SETS = buildStringSetsOrder()
const STRING_SET_RANK    = new Map(SORTED_STRING_SETS.map((s, i) => [s, i]))

// ---------------------------------------------------------------------------
// Build the in-memory DB index at module load time
// ---------------------------------------------------------------------------

const DB = new Map<string, InversionVoicing[]>()

;(function buildDB() {
  for (const [tonic, entries] of Object.entries(db)) {
    for (const entry of entries) {
      const { suffix } = entry as { suffix: string }
      const key = `${tonic}::${suffix}`
      if (!DB.has(key)) DB.set(key, [])
      for (const pos of entry.positions ?? []) {
        DB.get(key)!.push(convertPosition(pos, suffix, tonic))
      }
    }
  }

  // Sort: canonical string-set order → min fret
  for (const voicings of DB.values()) {
    voicings.sort((a, b) => {
      const sr = (STRING_SET_RANK.get(a.stringSet) ?? 99) - (STRING_SET_RANK.get(b.stringSet) ?? 99)
      return sr !== 0 ? sr : a.minFret - b.minFret
    })
  }
})()

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * All chord type suffixes available in the inversions database, in DB order.
 */
export const INVERSION_TYPES: readonly string[] = (() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db["C"] ?? []).map((e: any) => e.suffix as string)
})()

export type InversionType = string

// Enharmonic normalization: the DB uses flat spellings (Db, Eb, Gb, Ab, Bb)
const TONIC_NORMALIZE: Record<string, string> = {
  "C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab", "A#": "Bb",
}

/**
 * Returns all inversion voicings for a given tonic and type suffix,
 * sorted by canonical string-set order then minimum fret.
 * Returns [] for unknown tonic or type.
 * Automatically normalizes sharp tonics to their flat equivalents (e.g. C# → Db).
 */
export function getInversionVoicings(tonic: string, type: string): InversionVoicing[] {
  const normalized = TONIC_NORMALIZE[tonic] ?? tonic
  const rawVoicings = DB.get(`${normalized}::${type}`) ?? []

  // When the tonic was normalized (e.g. C# → Db) the pre-built note names use the
  // flat spelling. Re-derive them from the actual requested tonic so that the
  // correct enharmonic spelling is shown (C# E# G# rather than Db F Ab).
  if (normalized === tonic) return rawVoicings
  const tonalSymbol = SUFFIX_TO_TONAL[type] ?? type
  return rawVoicings.map((v) => {
    const { noteRoles, noteNames, noteIntervals } = computeNoteInfo(v.frets, v.baseFret, tonalSymbol, tonic)
    return { ...v, noteRoles, noteNames, noteIntervals }
  })
}

/**
 * All string sets present in the database, in canonical display order
 * (close before open, more strings first, higher root string first).
 */
export const INVERSION_STRING_SETS: readonly string[] = SORTED_STRING_SETS

/**
 * Returns a GuitarScale containing all positions of an inversion type's tones
 * across the full fretboard.
 */
export function getInversionAsScale(tonic: string, type: string): GuitarScale {
  const tonalSym = SUFFIX_TO_TONAL[type] ?? type
  return getArpeggio(tonic, tonalSym)
}
