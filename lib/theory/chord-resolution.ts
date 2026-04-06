import { Chord, Note } from "tonal"

// ---------------------------------------------------------------------------
// Shared chord resolution — used by both chords.ts (getChord) and
// arpeggios.ts (getArpeggio). Extracted to avoid a circular import:
//   chords.ts → arpeggios.ts ← chord-resolution.ts ← (tonal only)
// ---------------------------------------------------------------------------

/**
 * Maps chord type identifiers (chord-db suffixes / arpeggio-panel names) to
 * the TonalJS Chord.get() symbol when the raw identifier isn't recognised.
 */
export const TONAL_SYMBOL_MAP: Record<string, string> = {
  alt:       "7alt",
  aug9:      "9#5",
  "maj7b5":  "M7b5",
  mmaj7:     "mM7",
  "mmaj7b5": "oM7",
  mmaj9:     "mM9",
}

/**
 * Interval arrays for chord types where TonalJS returns nothing or an
 * incomplete note set. These take priority over Chord.get().
 */
export const HARDCODED_INTERVALS: Record<string, string[]> = {
  // TonalJS has no symbol for these at all:
  "maj11":    ["1P", "3M", "5P", "7M", "9M", "11P"],
  "mmaj11":   ["1P", "3m", "5P", "7M", "9M", "11P"],
  "add11":    ["1P", "3M", "5P", "11P"],
  "maj7sus2": ["1P", "2M", "5P", "7M"],
  // TonalJS omits the M3 from C11:
  "11":       ["1P", "3M", "5P", "7m", "9M", "11P"],
  // TonalJS omits notes from these extended chords:
  "13":       ["1P", "3M", "5P", "7m", "9M", "11P", "13M"],
  "maj13":    ["1P", "3M", "5P", "7M", "9M", "11P", "13M"],
  // TonalJS's 7alt only covers #5/b9/#9 — chord-db positions also use b5:
  "alt":      ["1P", "3M", "5d", "5A", "7m", "9m", "9A"],
}

/**
 * Resolves the notes and intervals for a chord, applying the full chain:
 *   1. Hardcoded intervals — for types TonalJS handles incompletely
 *   2. TonalJS with alias translation (TONAL_SYMBOL_MAP)
 *   3. TonalJS with the raw chord type name
 *   4. Root-only fallback (last resort)
 */
export function resolveChordNotes(
  tonic: string,
  chordType: string,
): { notes: string[]; intervals: string[] } {
  if (HARDCODED_INTERVALS[chordType]) {
    const intervals = HARDCODED_INTERVALS[chordType]
    const notes = intervals.map((iv) => Note.transpose(tonic, iv)).filter(Boolean) as string[]
    return { notes, intervals }
  }

  const tonalSym = TONAL_SYMBOL_MAP[chordType] ?? chordType
  const chord = Chord.get(`${tonic}${tonalSym}`)
  if (chord.notes.length > 0) {
    return { notes: chord.notes, intervals: chord.intervals }
  }

  return { notes: [tonic], intervals: ["1P"] }
}
