import { Scale, Note } from "tonal"

// ---------------------------------------------------------------------------
// Interval conversion (mirrors chord-finder-client.tsx — kept local to avoid
// coupling two independent modules)
// ---------------------------------------------------------------------------
const TONAL_TO_DEGREE: Record<string, string> = {
  "1P": "1", "2m": "b2", "2M": "2", "2A": "#2",
  "3m": "b3", "3M": "3", "4P": "4", "4A": "#4",
  "5d": "b5", "5P": "5", "5A": "#5",
  "6m": "b6", "6M": "6", "7m": "b7", "7M": "7",
}

// ---------------------------------------------------------------------------
// Scale type name mapping (mirrors scales.ts PATTERN_TO_TONAL — kept local
// so this module has no dependency on lib/theory/scales.ts)
// ---------------------------------------------------------------------------
const DISPLAY_TO_TONAL: Record<string, string> = {
  "Major":                   "major",
  "Dorian":                  "dorian",
  "Phrygian":                "phrygian",
  "Lydian":                  "lydian",
  "Mixolydian":              "mixolydian",
  "Aeolian":                 "aeolian",
  "Locrian":                 "locrian",
  "Harmonic Minor":          "harmonic minor",
  "Melodic Minor":           "melodic minor",
  "Dorian b2":               "dorian b2",
  "Ionian #5":               "ionian augmented",
  "Dorian #4":               "dorian #4",
  "Mixolydian b6":           "mixolydian b6",
  "Locrian #6":              "locrian 6",
  "Altered Diminished":      "ultralocrian",
  "Lydian #2":               "lydian #9",
  "Altered":                 "altered",
  "Lydian Dominant":         "lydian dominant",
  "Lydian Augmented":        "lydian augmented",
  "Phrygian Dominant":       "phrygian dominant",
  "Bebop Dominant":          "bebop",
  "Pentatonic Major":        "major pentatonic",
  "Pentatonic Minor":        "minor pentatonic",
  "Blues":                   "blues",
  "Locrian #2":              "locrian #2",
  "Whole Tone":              "whole tone",
  "Diminished Whole-Half":   "diminished",
  "Diminished Half-Whole":   "half-whole diminished",
}

// ---------------------------------------------------------------------------
// Commonality tiers (1 = most common in blues/rock/pop/jazz, 5 = most exotic)
// Anything not listed defaults to tier 5.
// ---------------------------------------------------------------------------
const COMMONALITY_TIER: Record<string, number> = {
  // Tier 1 — ubiquitous
  "Major": 1, "Aeolian": 1, "Pentatonic Major": 1, "Pentatonic Minor": 1, "Blues": 1,
  // Tier 2 — very common in rock/jazz
  "Dorian": 2, "Mixolydian": 2,
  // Tier 3 — common in jazz/classical
  "Phrygian": 3, "Lydian": 3, "Locrian": 3, "Melodic Minor": 3, "Harmonic Minor": 3,
  // Tier 4 — jazz/fusion (Melodic Minor modes)
  "Dorian b2": 4, "Lydian Augmented": 4, "Lydian Dominant": 4,
  "Mixolydian b6": 4, "Locrian #2": 4, "Altered": 4,
  // Everything else is tier 5 (default)
}

const ALL_ROOTS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] as const

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------
export type ScaleMatch = {
  readonly root: string          // e.g. "C"
  readonly type: string          // e.g. "Dorian"
  readonly displayName: string   // e.g. "C Dorian"
  readonly notes: readonly string[]       // e.g. ["C", "D", "Eb", "F", "G", "A", "Bb"]
  readonly intervals: readonly string[]   // e.g. ["1", "2", "b3", "4", "5", "6", "b7"]
  readonly extraNotes: number    // scale size − selectedChromas.size
  readonly commonalityTier: number  // 1–5
}

// ---------------------------------------------------------------------------
// detectScales
// ---------------------------------------------------------------------------
export function detectScales(
  selectedChromas: Set<number>,
  options?: { key?: string },
): ScaleMatch[] {
  if (selectedChromas.size < 3) return []

  const roots: readonly string[] = options?.key ? [options.key] : ALL_ROOTS
  const scaleTypes = Object.keys(DISPLAY_TO_TONAL)
  const results: Array<{ match: ScaleMatch; sortKey: [number, number, string] }> = []

  for (const root of roots) {
    for (const type of scaleTypes) {
      const tonalName = DISPLAY_TO_TONAL[type]
      const scaleData = Scale.get(`${root} ${tonalName}`)
      if (scaleData.empty || scaleData.notes.length === 0) continue

      // Build chroma set for this scale
      const scaleChromas = new Set(
        scaleData.notes
          .map((n) => Note.chroma(n))
          .filter((c): c is number => typeof c === "number" && Number.isFinite(c)),
      )

      // Skip if scale doesn't contain ALL selected chromas
      const isSuperset = [...selectedChromas].every((c) => scaleChromas.has(c))
      if (!isSuperset) continue

      const extraNotes = scaleChromas.size - selectedChromas.size
      const commonalityTier = COMMONALITY_TIER[type] ?? 5
      const displayName = `${root} ${type}`
      const intervals = scaleData.intervals.map((iv) => TONAL_TO_DEGREE[iv] ?? iv)

      results.push({
        match: { root, type, displayName, notes: scaleData.notes, intervals, extraNotes, commonalityTier },
        sortKey: [extraNotes, commonalityTier, displayName],
      })
    }
  }

  results.sort((a, b) => {
    if (a.sortKey[0] !== b.sortKey[0]) return a.sortKey[0] - b.sortKey[0]
    if (a.sortKey[1] !== b.sortKey[1]) return a.sortKey[1] - b.sortKey[1]
    return a.sortKey[2].localeCompare(b.sortKey[2])
  })

  return results.map((r) => r.match)
}
