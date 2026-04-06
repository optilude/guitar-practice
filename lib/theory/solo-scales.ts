import type { SoloScaleEntry, SoloScales } from "@/lib/theory/types"

// ---------------------------------------------------------------------------
// Mode families — ordered by degree (root = index 0)
// Internal mode identifiers (lowercase, used as keys)
// ---------------------------------------------------------------------------
const MAJOR_MODES = [
  "ionian", "dorian", "phrygian", "lydian", "mixolydian", "aeolian", "locrian",
] as const

const MELODIC_MINOR_MODES = [
  "melodic minor", "dorian b2", "lydian augmented", "lydian dominant",
  "mixolydian b6", "locrian #2", "altered",
] as const

const HARMONIC_MINOR_MODES = [
  "harmonic minor", "locrian #6", "ionian #5", "dorian #4",
  "phrygian dominant", "lydian #2", "altered diminished",
] as const

// Map each mode identifier to its family and offset within that family
type ModeFamily = typeof MAJOR_MODES | typeof MELODIC_MINOR_MODES | typeof HARMONIC_MINOR_MODES
const MODE_FAMILY_OFFSET: Record<string, { family: ModeFamily; offset: number }> = {}

for (const [i, m] of MAJOR_MODES.entries())
  MODE_FAMILY_OFFSET[m] = { family: MAJOR_MODES, offset: i }
for (const [i, m] of MELODIC_MINOR_MODES.entries())
  MODE_FAMILY_OFFSET[m] = { family: MELODIC_MINOR_MODES, offset: i }
for (const [i, m] of HARMONIC_MINOR_MODES.entries())
  MODE_FAMILY_OFFSET[m] = { family: HARMONIC_MINOR_MODES, offset: i }

// Aliases
MODE_FAMILY_OFFSET["major"] = MODE_FAMILY_OFFSET["ionian"]
MODE_FAMILY_OFFSET["minor"] = MODE_FAMILY_OFFSET["aeolian"]

// ---------------------------------------------------------------------------
// Display names — shown in SoloScalesPanel and used as scaleName in results
// ---------------------------------------------------------------------------
const MODE_DISPLAY: Record<string, string> = {
  // Major family
  "ionian":             "Ionian (major)",
  "dorian":             "Dorian",
  "phrygian":           "Phrygian",
  "lydian":             "Lydian",
  "mixolydian":         "Mixolydian",
  "aeolian":            "Aeolian (natural minor)",
  "locrian":            "Locrian",
  // Melodic minor family
  "melodic minor":      "Melodic Minor",
  "dorian b2":          "Dorian b2",
  "lydian augmented":   "Lydian Augmented",
  "lydian dominant":    "Lydian Dominant",
  "mixolydian b6":      "Mixolydian b6",
  "locrian #2":         "Locrian #2",
  "altered":            "Altered",
  // Harmonic minor family
  "harmonic minor":     "Harmonic Minor",
  "locrian #6":         "Locrian #6",
  "ionian #5":          "Ionian #5",
  "dorian #4":          "Dorian #4",
  "phrygian dominant":  "Phrygian Dominant",
  "lydian #2":          "Lydian #2",
  "altered diminished": "Altered Diminished",
}

// ---------------------------------------------------------------------------
// Additional scales by chord type — listed in preference order
// ---------------------------------------------------------------------------
const ADDITIONAL_BY_TYPE: Record<string, SoloScaleEntry[]> = {
  maj7: [
    { scaleName: "Major Pentatonic",  hint: "safe choice" },
    { scaleName: "Lydian",            hint: "lifted feel" },
    { scaleName: "Lydian Augmented",  hint: "IV chord colour" },
  ],
  "7": [
    { scaleName: "Major Pentatonic",  hint: "safe choice" },
    { scaleName: "Bebop Dominant",    hint: "passing tone" },
    { scaleName: "Minor Pentatonic",  hint: "bluesy" },
    { scaleName: "Blues Scale",       hint: "adds ♭5 colour" },
    { scaleName: "Altered",           hint: "jazz tension" },
    { scaleName: "Lydian Dominant",   hint: "bright tension" },
  ],
  m7: [
    { scaleName: "Minor Pentatonic" },
    { scaleName: "Dorian",            hint: "brighter" },
    { scaleName: "Phrygian Dominant", hint: "exotic" },
    { scaleName: "Melodic Minor",     hint: "jazz bright" },
  ],
  m7b5: [
    { scaleName: "Locrian #2",        hint: "less dissonant" },
  ],
  dim7: [
    { scaleName: "Locrian #2",            hint: "less dissonant" },
    { scaleName: "Diminished Half-Whole", hint: "symmetrical" },
  ],
}

// ---------------------------------------------------------------------------
// TonalJS scale name mapping — for SoloScalesPanel to call Scale.get()
// Note: "Locrian #6" maps to TonalJS "locrian 6" (no #); "Lydian #2" maps to "lydian #9"
// ---------------------------------------------------------------------------
export const SCALE_TONAL_NAMES: Record<string, string> = {
  "Ionian (major)":          "ionian",
  "Dorian":                  "dorian",
  "Phrygian":                "phrygian",
  "Lydian":                  "lydian",
  "Mixolydian":              "mixolydian",
  "Aeolian (natural minor)": "aeolian",
  "Locrian":                 "locrian",
  "Melodic Minor":           "melodic minor",
  "Dorian b2":               "dorian b2",
  "Lydian Augmented":        "lydian augmented",
  "Lydian Dominant":         "lydian dominant",
  "Mixolydian b6":           "mixolydian b6",
  "Locrian #2":              "locrian #2",
  "Altered":                 "altered",
  "Harmonic Minor":          "harmonic minor",
  "Locrian #6":              "locrian 6",
  "Ionian #5":               "ionian augmented",
  "Dorian #4":               "dorian #4",
  "Phrygian Dominant":       "phrygian dominant",
  "Lydian #2":               "lydian #9",
  "Altered Diminished":      "ultralocrian",
  "Major Pentatonic":        "major pentatonic",
  "Minor Pentatonic":        "minor pentatonic",
  "Blues Scale":             "blues",
  "Bebop Dominant":          "bebop",
  "Diminished Half-Whole":   "half-whole diminished",
}

// ---------------------------------------------------------------------------
// UI option groups for the Modal context selector
// Exported as groups for optgroup rendering; SOLO_MODE_OPTIONS is flat for backward compat
// ---------------------------------------------------------------------------
export interface SoloModeOption {
  value: string
  label: string
}

export interface SoloModeOptionGroup {
  label: string
  options: SoloModeOption[]
}

export const SOLO_MODE_OPTION_GROUPS: SoloModeOptionGroup[] = [
  {
    label: "Modes of the Major scale",
    options: [
      { value: "ionian",        label: "Ionian (major)" },
      { value: "dorian",        label: "Dorian" },
      { value: "phrygian",      label: "Phrygian" },
      { value: "lydian",        label: "Lydian" },
      { value: "mixolydian",    label: "Mixolydian" },
      { value: "aeolian",       label: "Aeolian (natural minor)" },
      { value: "locrian",       label: "Locrian" },
    ],
  },
  {
    label: "Modes of the Melodic Minor scale",
    options: [
      { value: "melodic minor",    label: "Melodic Minor" },
      { value: "dorian b2",        label: "Dorian b2" },
      { value: "lydian augmented", label: "Lydian Augmented" },
      { value: "lydian dominant",  label: "Lydian Dominant" },
      { value: "mixolydian b6",    label: "Mixolydian b6" },
      { value: "locrian #2",       label: "Locrian #2" },
      { value: "altered",          label: "Altered" },
    ],
  },
  {
    label: "Modes of the Harmonic Minor scale",
    options: [
      { value: "harmonic minor",     label: "Harmonic Minor" },
      { value: "locrian #6",         label: "Locrian #6" },
      { value: "ionian #5",          label: "Ionian #5" },
      { value: "dorian #4",          label: "Dorian #4" },
      { value: "phrygian dominant",  label: "Phrygian Dominant" },
      { value: "lydian #2",          label: "Lydian #2" },
      { value: "altered diminished", label: "Altered Diminished" },
    ],
  },
]

/** Flat list — kept for backward compatibility. */
export const SOLO_MODE_OPTIONS = SOLO_MODE_OPTION_GROUPS.flatMap((g) => g.options)

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
function primaryScaleType(mode: string, degree: number): string {
  const lower = mode.toLowerCase()
  const entry = MODE_FAMILY_OFFSET[lower]
  if (!entry) return MAJOR_MODES[0]
  const { family, offset } = entry
  return family[(offset + degree - 1) % 7]
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function getSoloScales(
  chord: { tonic: string; type: string; degree: number },
  mode: string
): SoloScales {
  const primaryType    = primaryScaleType(mode, chord.degree)
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

// ---------------------------------------------------------------------------
// Default modal context for a chord type
// ---------------------------------------------------------------------------
export function defaultModeForChordType(chordType: string): string {
  const t = chordType.toLowerCase()
  if (t.startsWith("mmaj")) return "melodic minor"
  if (t === "m7b5" || t.startsWith("dim")) return "locrian"
  if (t.startsWith("maj") || t === "6" || t === "6/9" || t === "add9") return "ionian"
  if (/^(7|9|11|13)/.test(t) || t === "7 shell" || t.includes("sus")) return "mixolydian"
  return "dorian"
}
