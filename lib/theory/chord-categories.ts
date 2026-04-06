// ---------------------------------------------------------------------------
// Shared chord type grouping for ChordPanel, InversionPanel, and ArpeggioPanel selects.
// All three panels use the same category structure applied to their own type lists.
// ---------------------------------------------------------------------------

export type ChordCategory =
  | "major"
  | "minor"
  | "dominant"
  | "suspended"
  | "diminished"
  | "augmented"

export const CATEGORY_LABELS: Record<ChordCategory, string> = {
  major:      "Major",
  minor:      "Minor",
  dominant:   "Dominant",
  suspended:  "Suspended",
  diminished: "Diminished",
  augmented:  "Augmented",
}

export const CATEGORY_ORDER: ChordCategory[] = [
  "major", "minor", "dominant", "suspended", "diminished", "augmented",
]

// Explicit type → category assignments.
// Covers chord-db suffixes (chord/inversion panels) and TonalJS names (arpeggio panel).
// Shell voicings are distributed into their parent family rather than a separate group.
const CATEGORY_MAP: Record<string, ChordCategory> = {
  // --- Major ---
  // Triads first (chord-db suffix and TonalJS alias)
  major:   "major",
  maj:     "major",
  // Extensions
  "6":         "major",
  "69":        "major",
  maj7:        "major",
  maj9:        "major",
  maj11:       "major",
  maj13:       "major",
  add9:        "major",
  maj7b5:      "major",
  maj_cluster: "major",
  maj7sus2:    "major",
  // Shell voicings — chord panel (space-separated)
  "maj7 shell":    "major",
  "maj6 shell":    "major",
  // Shell voicings — inversion panel (underscore)
  maj7_shell:      "major",
  "6_shell":       "major",

  // --- Minor ---
  // Triads first
  minor:   "minor",
  m:       "minor",
  // Extensions
  m6:        "minor",
  m7:        "minor",
  m9:        "minor",
  m11:       "minor",
  m13:       "minor",
  m69:       "minor",
  mmaj7:     "minor",
  mmaj9:     "minor",
  mmaj11:    "minor",
  mmaj7b5:   "minor",
  madd9:     "minor",
  m_cluster: "minor",
  // Shell voicings — chord panel
  "m7 shell":  "minor",
  // Shell voicings — inversion panel
  m7_shell:    "minor",
  m6_shell:    "minor",

  // --- Dominant ---
  "7":         "dominant",
  "9":         "dominant",
  "11":        "dominant",
  "13":        "dominant",
  "7b9":       "dominant",
  "7#9":       "dominant",
  "7#5":       "dominant",
  "7#11":      "dominant",
  "7alt":      "dominant",
  alt:         "dominant",
  dom_cluster: "dominant",
  // Shell voicings — chord panel
  "7 shell":   "dominant",
  // Shell voicings — inversion panel
  "7_shell":   "dominant",

  // --- Suspended ---
  sus2:    "suspended",
  sus4:    "suspended",
  "7sus4": "suspended",

  // --- Diminished ---
  dim:     "diminished",
  dim7:    "diminished",
  m7b5:    "diminished",
  hdim7:   "diminished",
  // Shell voicings — chord panel
  "dim7/m6 shell": "diminished",
  // Shell voicings — inversion panel
  dim7_shell:      "diminished",

  // --- Augmented ---
  aug:     "augmented",
  aug7:    "augmented",
  aug9:    "augmented",
}

export interface ChordGroup {
  category: ChordCategory
  label: string
  types: string[]
}

/**
 * Groups an ordered array of chord type strings into display categories,
 * preserving the source order within each category.
 * Types not found in CATEGORY_MAP are placed in the most appropriate bucket
 * based on name-pattern heuristics.
 * Empty categories are omitted from the result.
 */
export function groupChordTypes(types: string[]): ChordGroup[] {
  const groups = new Map<ChordCategory, string[]>()
  for (const cat of CATEGORY_ORDER) groups.set(cat, [])

  for (const type of types) {
    const cat = CATEGORY_MAP[type]
    if (cat !== undefined) {
      groups.get(cat)!.push(type)
    } else {
      // Heuristic fallback for uncategorised types
      let fallback: ChordCategory = "dominant"
      if (type.includes("dim"))                                   fallback = "diminished"
      else if (type.includes("aug"))                              fallback = "augmented"
      else if (type.includes("sus"))                              fallback = "suspended"
      else if (type.startsWith("maj") || type === "add9")         fallback = "major"
      else if (type.startsWith("m") && !type.startsWith("maj"))  fallback = "minor"
      groups.get(fallback)!.push(type)
    }
  }

  return CATEGORY_ORDER
    .filter((cat) => groups.get(cat)!.length > 0)
    .map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      types: groups.get(cat)!,
    }))
}
