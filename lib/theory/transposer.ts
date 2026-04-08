import { Note } from "tonal"
import { getKey } from "./keys"
import { analyzeChordInKey } from "./key-finder"
import type { InputChord, ChordAnalysis } from "./key-finder"

// ---------------------------------------------------------------------------
// Enharmonic root tables — flat-preferred and sharp-preferred chromatic scales
// ---------------------------------------------------------------------------
const FLAT_ROOTS  = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] as const
const SHARP_ROOTS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const

// ---------------------------------------------------------------------------
// keyPrefersSharps
// Determine whether a key uses sharp or flat spellings by counting accidentals
// in the key's diatonic note set.
// ---------------------------------------------------------------------------
export function keyPrefersSharps(tonic: string, mode: string): boolean {
  try {
    const keyData = getKey(tonic, mode)
    let sharps = 0, flats = 0
    for (const note of keyData.notes) {
      if (note.endsWith("#")) sharps++
      else if (note.endsWith("b")) flats++
    }
    return sharps > flats
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// transposeProgression
// Shifts every chord root by the semitone distance from sourceTonic to
// targetTonic, preserving chord quality (type) exactly. Enharmonic spelling
// of the transposed root is resolved by:
//   1. Checking whether the new chroma is diatonic in the target key (if so,
//      use that key's spelling of the note).
//   2. Falling back to the target key's preferred accidental convention.
// Returns the original chords unchanged when source and target are the same.
// ---------------------------------------------------------------------------
export function transposeProgression(
  chords: InputChord[],
  sourceTonic: string,
  targetTonic: string,
  mode: string,
): InputChord[] {
  const sourceChroma = Note.chroma(sourceTonic)
  const targetChroma = Note.chroma(targetTonic)
  if (typeof sourceChroma !== "number" || typeof targetChroma !== "number") return chords

  const semitones = (targetChroma - sourceChroma + 12) % 12
  if (semitones === 0) return chords

  // Build chroma → note-name lookup from the target key's diatonic notes
  const targetDiatonicByChroma = new Map<number, string>()
  try {
    const targetKeyData = getKey(targetTonic, mode)
    for (const note of targetKeyData.notes) {
      const chroma = Note.chroma(note)
      if (typeof chroma === "number") targetDiatonicByChroma.set(chroma, note)
    }
  } catch { /* skip — fall back to accidental preference */ }

  const roots = keyPrefersSharps(targetTonic, mode) ? SHARP_ROOTS : FLAT_ROOTS

  return chords.map(chord => {
    const sourceRootChroma = Note.chroma(chord.root)
    if (typeof sourceRootChroma !== "number") return chord
    const newChroma = (sourceRootChroma + semitones) % 12
    const newRoot = targetDiatonicByChroma.get(newChroma) ?? roots[newChroma]
    return { root: newRoot, type: chord.type, symbol: `${newRoot}${chord.type}` }
  })
}

// ---------------------------------------------------------------------------
// analyzeProgression
// Analyse each chord against a specific key, returning a ChordAnalysis for
// each (always with a non-null roman numeral). Delegates to analyzeChordInKey
// in key-finder.ts — no duplication of analysis logic here.
// ---------------------------------------------------------------------------
export function analyzeProgression(
  chords: InputChord[],
  tonic: string,
  mode: string,
): ChordAnalysis[] {
  return chords.map(c => analyzeChordInKey(c, tonic, mode))
}
