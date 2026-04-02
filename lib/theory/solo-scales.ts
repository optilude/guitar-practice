import type { SoloScaleEntry, SoloScales } from "@/lib/theory/types"

// ---------------------------------------------------------------------------
// Mode rotation tables
// ---------------------------------------------------------------------------
const MODES = [
  "ionian",
  "dorian",
  "phrygian",
  "lydian",
  "mixolydian",
  "aeolian",
  "locrian",
] as const

const MODE_OFFSET: Record<string, number> = {
  ionian: 0, major: 0,
  dorian: 1,
  phrygian: 2,
  lydian: 3,
  mixolydian: 4,
  aeolian: 5, minor: 5,
  locrian: 6,
}

const MODE_DISPLAY: Record<string, string> = {
  ionian:     "Ionian (major)",
  dorian:     "Dorian",
  phrygian:   "Phrygian",
  lydian:     "Lydian",
  mixolydian: "Mixolydian",
  aeolian:    "Aeolian (natural minor)",
  locrian:    "Locrian",
}

// ---------------------------------------------------------------------------
// Additional scales by chord type — listed in preference order
// ---------------------------------------------------------------------------
const ADDITIONAL_BY_TYPE: Record<string, SoloScaleEntry[]> = {
  maj7: [
    { scaleName: "Lydian",           hint: "lifted feel" },
    { scaleName: "Major Pentatonic", hint: "safe choice" },
  ],
  "7": [
    { scaleName: "Minor Pentatonic", hint: "bluesy" },
    { scaleName: "Blues Scale",      hint: "adds ♭5 colour" },
  ],
  m7: [
    { scaleName: "Minor Pentatonic" },
    { scaleName: "Dorian",           hint: "brighter" },
  ],
  m7b5: [
    { scaleName: "Locrian #2", hint: "less dissonant" },
  ],
}

// ---------------------------------------------------------------------------
// TonalJS scale name mapping — exported for SoloScalesPanel to call Scale.get()
// ---------------------------------------------------------------------------
export const SCALE_TONAL_NAMES: Record<string, string> = {
  "Ionian (major)":          "ionian",
  "Dorian":                  "dorian",
  "Phrygian":                "phrygian",
  "Lydian":                  "lydian",
  "Mixolydian":              "mixolydian",
  "Aeolian (natural minor)": "aeolian",
  "Locrian":                 "locrian",
  "Major Pentatonic":        "major pentatonic",
  "Minor Pentatonic":        "minor pentatonic",
  "Blues Scale":             "blues",
  "Locrian #2":              "locrian #2",
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
function primaryScaleType(mode: string, degree: number): string {
  const offset = MODE_OFFSET[mode.toLowerCase()] ?? 0
  return MODES[(offset + degree - 1) % 7]
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function getSoloScales(
  chord: { tonic: string; type: string; degree: number },
  mode: string
): SoloScales {
  const primaryType = primaryScaleType(mode, chord.degree)
  const primaryDisplay = MODE_DISPLAY[primaryType] ?? primaryType

  const additional = (ADDITIONAL_BY_TYPE[chord.type] ?? []).filter(
    (a) => a.scaleName.toLowerCase() !== primaryDisplay.toLowerCase()
  )

  return {
    chordTonic: chord.tonic,
    primary: { scaleName: primaryDisplay },
    additional,
  }
}
