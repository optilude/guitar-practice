// lib/theory/commonality-tiers.ts

// ---------------------------------------------------------------------------
// Keyed by display name — used by scale-finder.ts (matches DISPLAY_TO_TONAL keys)
// ---------------------------------------------------------------------------
export const COMMONALITY_TIER: Record<string, number> = {
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

// ---------------------------------------------------------------------------
// All (displayName, modeName, tier) entries for key-finder.ts to iterate.
// modeName is passed to getKey(); displayName is shown in the UI.
// ---------------------------------------------------------------------------
export const ALL_KEY_MODES: Array<{ displayName: string; modeName: string; tier: number }> = [
  { displayName: "Major",              modeName: "major",              tier: 1 },
  { displayName: "Aeolian",           modeName: "minor",              tier: 1 },
  { displayName: "Dorian",            modeName: "dorian",             tier: 2 },
  { displayName: "Mixolydian",        modeName: "mixolydian",         tier: 2 },
  { displayName: "Phrygian",          modeName: "phrygian",           tier: 3 },
  { displayName: "Lydian",            modeName: "lydian",             tier: 3 },
  { displayName: "Locrian",           modeName: "locrian",            tier: 3 },
  { displayName: "Melodic Minor",     modeName: "melodic minor",      tier: 3 },
  { displayName: "Harmonic Minor",    modeName: "harmonic minor",     tier: 3 },
  { displayName: "Dorian b2",         modeName: "dorian b2",          tier: 4 },
  { displayName: "Lydian Augmented",  modeName: "lydian augmented",   tier: 4 },
  { displayName: "Lydian Dominant",   modeName: "lydian dominant",    tier: 4 },
  { displayName: "Mixolydian b6",     modeName: "mixolydian b6",      tier: 4 },
  { displayName: "Locrian #2",        modeName: "locrian #2",         tier: 4 },
  { displayName: "Altered",           modeName: "altered",            tier: 4 },
  { displayName: "Locrian #6",        modeName: "locrian #6",         tier: 5 },
  { displayName: "Ionian #5",         modeName: "ionian #5",          tier: 5 },
  { displayName: "Dorian #4",         modeName: "dorian #4",          tier: 5 },
  { displayName: "Phrygian Dominant", modeName: "phrygian dominant",  tier: 5 },
  { displayName: "Lydian #2",         modeName: "lydian #2",          tier: 5 },
  { displayName: "Altered Diminished",modeName: "altered diminished", tier: 5 },
]
