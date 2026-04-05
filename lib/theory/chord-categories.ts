// ---------------------------------------------------------------------------
// Shared chord type grouping for ChordPanel and InversionPanel selects.
// Both panels use the same category structure applied to their own type lists.
// ---------------------------------------------------------------------------

export type ChordCategory =
  | "triads"
  | "common"
  | "shell"
  | "otherMajor"
  | "otherMinor"
  | "otherDominant"
  | "otherDiminished"
  | "otherAugmented"

export const CATEGORY_LABELS: Record<ChordCategory, string> = {
  triads:          "Triads",
  common:          "Common",
  shell:           "Shell Voicings",
  otherMajor:      "Other Major",
  otherMinor:      "Other Minor",
  otherDominant:   "Other Dominant",
  otherDiminished: "Other Diminished",
  otherAugmented:  "Other Augmented",
}

export const CATEGORY_ORDER: ChordCategory[] = [
  "triads", "common", "shell",
  "otherMajor", "otherMinor", "otherDominant", "otherDiminished", "otherAugmented",
]

// Explicit type → category assignments.
// Both naming conventions for shell voicings are handled here:
//   chords panel uses spaces ("maj7 shell"), inversions panel uses underscores ("maj7_shell").
const CATEGORY_MAP: Record<string, ChordCategory> = {
  // Triads
  major:   "triads",
  minor:   "triads",
  aug:     "triads",

  // Common
  maj7:    "common",
  "7":     "common",
  "9":     "common",
  m7:      "common",
  dim:     "common",
  dim7:    "common",
  m7b5:    "common",
  hdim7:   "common",

  // Shell voicings — chords panel (space-separated)
  "maj7 shell":    "shell",
  "m7 shell":      "shell",
  "7 shell":       "shell",
  "maj6 shell":    "shell",
  "dim7/m6 shell": "shell",
  // Shell voicings — inversions panel (underscore)
  maj7_shell:  "shell",
  "6_shell":   "shell",
  m7_shell:    "shell",
  m6_shell:    "shell",
  "7_shell":   "shell",
  dim7_shell:  "shell",

  // Other Major
  "6":         "otherMajor",
  "69":        "otherMajor",
  maj9:        "otherMajor",
  maj11:       "otherMajor",
  maj13:       "otherMajor",
  add9:        "otherMajor",
  maj7b5:      "otherMajor",
  maj_cluster: "otherMajor",
  maj7sus2:    "otherMajor",

  // Other Minor
  m6:        "otherMinor",
  m9:        "otherMinor",
  m11:       "otherMinor",
  m13:       "otherMinor",
  m69:       "otherMinor",
  mmaj7:     "otherMinor",
  mmaj9:     "otherMinor",
  mmaj11:    "otherMinor",
  mmaj7b5:   "otherMinor",
  madd9:     "otherMinor",
  m_cluster: "otherMinor",

  // Other Dominant
  "11":        "otherDominant",
  "13":        "otherDominant",
  aug7:        "otherDominant",
  aug9:        "otherDominant",
  "7b9":       "otherDominant",
  "7#9":       "otherDominant",
  "7#5":       "otherDominant",
  "7#11":      "otherDominant",
  "7alt":      "otherDominant",
  alt:         "otherDominant",
  sus2:        "otherDominant",
  sus4:        "otherDominant",
  "7sus4":     "otherDominant",
  dom_cluster: "otherDominant",
}

export interface ChordGroup {
  category: ChordCategory
  label: string
  types: string[]
}

/**
 * Groups an ordered array of chord type strings into display categories,
 * preserving the source order within each category.
 * Types not found in CATEGORY_MAP are placed in the most appropriate "Other" bucket
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
      let fallback: ChordCategory = "otherDominant"
      if (type.includes("dim"))                          fallback = "otherDiminished"
      else if (type.includes("aug"))                     fallback = "otherAugmented"
      else if (type.startsWith("maj") || type === "add9") fallback = "otherMajor"
      else if (type.startsWith("m") && !type.startsWith("maj")) fallback = "otherMinor"
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
