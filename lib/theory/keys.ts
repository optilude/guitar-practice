import { Key as TonalKey, Scale, Note } from "tonal"
import type { CircleEntry, DiatonicChord, Key } from "@/lib/theory/types"

// ---------------------------------------------------------------------------
// Circle of fifths (clockwise from C)
// ---------------------------------------------------------------------------
const CIRCLE: CircleEntry[] = [
  { tonic: "C",  relativeMinor: "A",  sharps: 0 },
  { tonic: "G",  relativeMinor: "E",  sharps: 1 },
  { tonic: "D",  relativeMinor: "B",  sharps: 2 },
  { tonic: "A",  relativeMinor: "F#", sharps: 3 },
  { tonic: "E",  relativeMinor: "C#", sharps: 4 },
  { tonic: "B",  relativeMinor: "G#", sharps: 5 },
  { tonic: "F#", relativeMinor: "D#", sharps: 6 },
  { tonic: "Db", relativeMinor: "Bb", flats:  5 },
  { tonic: "Ab", relativeMinor: "F",  flats:  4 },
  { tonic: "Eb", relativeMinor: "C",  flats:  3 },
  { tonic: "Bb", relativeMinor: "G",  flats:  2 },
  { tonic: "F",  relativeMinor: "D",  flats:  1 },
]

export function getCircleOfFifths(): CircleEntry[] {
  return [...CIRCLE]
}

export function stepCircle(tonic: string, steps: number): string {
  const idx = CIRCLE.findIndex(
    (e) => Note.chroma(e.tonic) === Note.chroma(tonic)
  )
  if (idx === -1) return tonic
  const next = ((idx + steps) % 12 + 12) % 12
  return CIRCLE[next].tonic
}

// ---------------------------------------------------------------------------
// Quality helpers
// ---------------------------------------------------------------------------
const QUALITY_MAP: Record<string, string> = {
  maj7:  "major",
  "":    "major",
  m7:    "minor",
  m:     "minor",
  "7":   "major",
  m7b5:  "diminished",
  dim7:  "diminished",
  aug:   "augmented",
}

function chordQuality(type: string): string {
  return QUALITY_MAP[type] ?? "major"
}

// ---------------------------------------------------------------------------
// Roman numerals and Nashville numbers for degrees 1–7
// ---------------------------------------------------------------------------
const MAJOR_ROMANS    = ["I",   "ii",  "iii", "IV",  "V",   "vi",  "vii°"]
const MINOR_ROMANS    = ["i",   "ii°", "III", "iv",  "v",   "VI",  "VII"]
const NASHVILLE       = ["1",   "2",   "3",   "4",   "5",   "6",   "7"]

// ---------------------------------------------------------------------------
// Key signature sharp/flat count from circle
// ---------------------------------------------------------------------------
function signatureFor(tonic: string, mode: string): { sharps?: number; flats?: number } {
  const entry = CIRCLE.find((e) => Note.chroma(e.tonic) === Note.chroma(tonic))
  if (mode === "major" || mode === "ionian") {
    if (!entry) return {}
    return entry.sharps !== undefined ? { sharps: entry.sharps } : { flats: entry.flats }
  }
  if (mode === "minor" || mode === "aeolian") {
    // relative major is 3 semitones up
    const relChroma = (Note.chroma(tonic)! + 3) % 12
    const relEntry = CIRCLE.find((e) => Note.chroma(e.tonic) === relChroma)
    if (!relEntry) return {}
    return relEntry.sharps !== undefined ? { sharps: relEntry.sharps } : { flats: relEntry.flats }
  }
  return {}
}

// ---------------------------------------------------------------------------
// Build diatonic chords for a major key using TonalJS
// ---------------------------------------------------------------------------
function buildMajorDiatonicChords(
  chordNames: string[],
  romans: string[]
): DiatonicChord[] {
  return chordNames.map((chordName, i) => {
    // chordName e.g. "Cmaj7", "Dm7", "G7"
    const match = chordName.match(/^([A-G][#b]?)(.*)$/)
    const noteName = match?.[1] ?? "C"
    const type     = match?.[2] ?? "maj7"
    return {
      degree:   i + 1,
      roman:    romans[i],
      nashville: NASHVILLE[i],
      tonic:    noteName,
      type,
      quality:  chordQuality(type),
    }
  })
}

// ---------------------------------------------------------------------------
// Modal scale diatonic chords — computed from scale notes + quality pattern
// ---------------------------------------------------------------------------
const MODE_CHORD_TYPES: Record<string, string[]> = {
  dorian:      ["m7",    "m7",    "maj7",   "7",     "m7",    "m7b5",  "maj7"],
  phrygian:    ["m7",    "maj7",  "7",      "m7",    "m7b5",  "maj7",  "m7"],
  lydian:      ["maj7",  "7",     "m7",     "m7b5",  "maj7",  "m7",    "m7"],
  mixolydian:  ["7",     "m7",    "m7b5",   "maj7",  "m7",    "m7",    "maj7"],
  locrian:     ["m7b5",  "maj7",  "m7",     "m7",    "maj7",  "7",     "m7"],
}

const MODE_ROMANS: Record<string, string[]> = {
  dorian:      ["i",   "ii",  "III", "IV",  "v",   "vi°",  "VII"],
  phrygian:    ["i",   "II",  "III", "iv",  "v°",  "VI",   "vii"],
  lydian:      ["I",   "II",  "iii", "iv°", "V",   "vi",   "vii"],
  mixolydian:  ["I",   "ii",  "iii°","IV",  "v",   "vi",   "VII"],
  locrian:     ["i°",  "II",  "iii", "iv",  "V",   "VI",   "vii"],
}

function buildModalDiatonicChords(tonic: string, mode: string): DiatonicChord[] {
  const scale = Scale.get(`${tonic} ${mode}`)
  const types  = MODE_CHORD_TYPES[mode] ?? MODE_CHORD_TYPES.dorian
  const romans = MODE_ROMANS[mode]     ?? MAJOR_ROMANS
  return scale.notes.map((note, i) => ({
    degree:    i + 1,
    roman:     romans[i],
    nashville: NASHVILLE[i],
    tonic:     note,
    type:      types[i],
    quality:   chordQuality(types[i]),
  }))
}

// ---------------------------------------------------------------------------
// Relative key helper
// ---------------------------------------------------------------------------
const MODE_SEMITONES_FROM_ROOT: Record<string, number> = {
  dorian: 2, phrygian: 4, lydian: 5, mixolydian: 7, locrian: 11,
}

function relativeKey(tonic: string, mode: string): { tonic: string; mode: string } {
  if (mode === "major" || mode === "ionian") {
    const entry = CIRCLE.find((e) => Note.chroma(e.tonic) === Note.chroma(tonic))
    return { tonic: entry?.relativeMinor ?? tonic, mode: "minor" }
  }
  if (mode === "minor" || mode === "aeolian") {
    const relChroma = (Note.chroma(tonic)! + 3) % 12
    const entry = CIRCLE.find((e) => Note.chroma(e.tonic) === relChroma)
    return { tonic: entry?.tonic ?? tonic, mode: "major" }
  }
  // Modal keys: find parent major by subtracting mode offset
  const semitones = MODE_SEMITONES_FROM_ROOT[mode]
  if (semitones !== undefined) {
    const parentChroma = (Note.chroma(tonic)! - semitones + 12) % 12
    const entry = CIRCLE.find((e) => Note.chroma(e.tonic) === parentChroma)
    return { tonic: entry?.tonic ?? tonic, mode: "major" }
  }
  return { tonic, mode: "major" }
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------
export function getKey(tonic: string, mode: string): Key {
  const normalMode = mode.toLowerCase()

  if (normalMode === "major" || normalMode === "ionian") {
    const k = TonalKey.majorKey(tonic)
    const chords = buildMajorDiatonicChords([...k.chords], MAJOR_ROMANS)
    return {
      tonic,
      mode: "major",
      notes: k.scale,
      signature: signatureFor(tonic, "major"),
      diatonicChords: chords,
      relativeKey: relativeKey(tonic, "major"),
    }
  }

  if (normalMode === "minor" || normalMode === "aeolian") {
    const k = TonalKey.minorKey(tonic)
    const chords = buildMajorDiatonicChords([...k.natural.chords], MINOR_ROMANS)
    return {
      tonic,
      mode: "minor",
      notes: k.natural.scale,
      signature: signatureFor(tonic, "minor"),
      diatonicChords: chords,
      relativeKey: relativeKey(tonic, "minor"),
    }
  }

  // Modal keys
  const scale = Scale.get(`${tonic} ${normalMode}`)
  const chords = buildModalDiatonicChords(tonic, normalMode)
  return {
    tonic,
    mode: normalMode,
    notes: scale.notes,
    signature: {},
    diatonicChords: chords,
    relativeKey: relativeKey(tonic, normalMode),
  }
}
