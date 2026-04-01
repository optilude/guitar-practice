import type { ChordPosition } from "./chords"

// ---------------------------------------------------------------------------
// Shell chord voicings — spread shapes (one string skipped between each note)
//
// 6th-string root: str6 = root,  str5 = muted, str4 = 7th/6th, str3 = 3rd
// 5th-string root: str5 = root,  str4 = muted, str3 = 7th/6th, str2 = 3rd
// 4th-string root: str4 = root,  str3 = muted, str2 = 7th/6th, str1 = 3rd
//
// Offsets are derived from standard tuning:
//   str6→str4: +10 semitones  (two ×5-semitone gaps)
//   str6→str3: +15 semitones  (three ×5-semitone gaps)
//   str5→str3: +10            str5→str2: +14  (+5+5+4 B-string)
//   str4→str2: +9  (+5+4)     str4→str1: +14  (+5+4+5)
// ---------------------------------------------------------------------------

const OPEN_CHROMAS = [4, 9, 2, 7, 11, 4] // str6…str1 (E A D G B e)

const TONIC_CHROMA: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5,
  "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
}

export const SHELL_CHORD_TYPES = [
  "maj7 shell",
  "m7 shell",
  "7 shell",
  "maj6 shell",
  "dim7/m6 shell",
] as const

export type ShellChordType = (typeof SHELL_CHORD_TYPES)[number]

// ---------------------------------------------------------------------------
// Shape tables: one entry per shell type, one row per root-string group.
// Each row is a 6-element tuple (index 0 = str6 … index 5 = str1).
//   null   → muted string
//   number → fret offset relative to the root fret
// ---------------------------------------------------------------------------
type Offset = number | null
type Shape  = [Offset, Offset, Offset, Offset, Offset, Offset]

// Root-fret offsets for each interval on each target string:
//
//  6th-string root → 4th string (Δ10): M7(+11)→+1, m7(+10)→0, M6(+9)→−1
//  6th-string root → 3rd string (Δ15): M3(+4)→+1,  m3(+3)→0
//
//  5th-string root → 3rd string (Δ10): M7→+1, m7→0, M6→−1
//  5th-string root → 2nd string (Δ14): M3→+2, m3→+1
//
//  4th-string root → 2nd string (Δ9):  M7→+2, m7→+1, M6→0
//  4th-string root → 1st string (Δ14): M3→+2, m3→+1

const SHAPES: Record<string, { str6: Shape; str5: Shape; str4: Shape }> = {
  "maj7 shell": {
    str6: [ 0, null,  1,  1, null, null], // R – M7(+1 on str4) – M3(+1 on str3)
    str5: [null,  0, null,  1,  2, null], // R – M7(+1 on str3) – M3(+2 on str2)
    str4: [null, null,  0, null,  2,  2], // R – M7(+2 on str2) – M3(+2 on str1)
  },
  "m7 shell": {
    str6: [ 0, null,  0,  0, null, null], // R – m7(0 on str4)  – m3(0 on str3)
    str5: [null,  0, null,  0,  1, null], // R – m7(0 on str3)  – m3(+1 on str2)
    str4: [null, null,  0, null,  1,  1], // R – m7(+1 on str2) – m3(+1 on str1)
  },
  "7 shell": {
    str6: [ 0, null,  0,  1, null, null], // R – m7(0 on str4)  – M3(+1 on str3)
    str5: [null,  0, null,  0,  2, null], // R – m7(0 on str3)  – M3(+2 on str2)
    str4: [null, null,  0, null,  1,  2], // R – m7(+1 on str2) – M3(+2 on str1)
  },
  "maj6 shell": {
    str6: [ 0, null, -1,  1, null, null], // R – M6(−1 on str4) – M3(+1 on str3)
    str5: [null,  0, null, -1,  2, null], // R – M6(−1 on str3) – M3(+2 on str2)
    str4: [null, null,  0, null,  0,  2], // R – M6(0 on str2)  – M3(+2 on str1)
  },
  "dim7/m6 shell": {
    str6: [ 0, null, -1,  0, null, null], // R – M6(−1 on str4) – m3(0 on str3)
    str5: [null,  0, null, -1,  1, null], // R – M6(−1 on str3) – m3(+1 on str2)
    str4: [null, null,  0, null,  0,  1], // R – M6(0 on str2)  – m3(+1 on str1)
  },
}

// ---------------------------------------------------------------------------

function buildVoicing(
  tonicChroma: number,
  rootStrIdx: number, // 0 = str6, 1 = str5, 2 = str4
  shape: Shape,
  label: string,
): ChordPosition {
  const openChroma = OPEN_CHROMAS[rootStrIdx]
  let rootFret = (tonicChroma - openChroma + 12) % 12
  if (rootFret === 0) rootFret = 12 // closed voicing — never use the open string as root

  // Compute absolute frets for every string
  const absFrets: number[] = shape.map((offset) =>
    offset === null ? -1 : rootFret + offset,
  )

  // If any sounding note falls below the nut, shift the whole voicing up an octave
  const minSounding = Math.min(...absFrets.filter((f) => f !== -1))
  if (minSounding < 1) {
    for (let i = 0; i < absFrets.length; i++) {
      if (absFrets[i] !== -1) absFrets[i] += 12
    }
  }

  const baseFret = Math.min(...absFrets.filter((f) => f !== -1))
  const frets    = absFrets.map((f) => (f === -1 ? -1 : f - baseFret + 1))

  return {
    frets,
    fingers: [0, 0, 0, 0, 0, 0],
    baseFret,
    barres: [],
    capo: false,
    label,
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns three spread shell chord voicings — 6th-string root, 5th-string root,
 * 4th-string root — for the given tonic and shell type.
 * Returns an empty array for an unknown tonic or shell type.
 */
export function getShellChordPositions(tonic: string, shellType: string): ChordPosition[] {
  const tonicChroma = TONIC_CHROMA[tonic]
  if (tonicChroma === undefined) return []

  const shapes = SHAPES[shellType]
  if (!shapes) return []

  return [
    buildVoicing(tonicChroma, 0, shapes.str6, "6th string root"),
    buildVoicing(tonicChroma, 1, shapes.str5, "5th string root"),
    buildVoicing(tonicChroma, 2, shapes.str4, "4th string root"),
  ]
}
