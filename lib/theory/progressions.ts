import { getDiatonicChords } from "@/lib/theory/harmony"
import type { Progression, ProgressionChord, DiatonicChord } from "@/lib/theory/types"

// ---------------------------------------------------------------------------
// Progression library — 26 progressions, grouped by category
// ---------------------------------------------------------------------------
const PROGRESSIONS: Progression[] = [
  // ── Pop ──────────────────────────────────────────────────────────────────
  {
    name: "pop-standard",
    displayName: "Pop Axis",
    category: "Pop",
    romanDisplay: "I – V7 – vi – IV",
    description: "The most widely used progression in modern pop",
    examples: "Let It Be, No Woman No Cry, With or Without You",
    notes: "The most widely used progression in modern pop.",
    degrees: ["I", "V", "vi", "IV"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "sensitive-pop",
    displayName: "Relative Minor Loop",
    category: "Pop",
    romanDisplay: "vi – IV – I – V7",
    description: "Same chords as the Pop Axis, starting on the minor",
    examples: "Africa (Toto), Decode (Paramore)",
    notes: "Same chords as the Pop Axis, starting on the minor; darker feel.",
    degrees: ["vi", "IV", "I", "V"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "folk-rock",
    displayName: "Three-Chord Pop",
    category: "Pop",
    romanDisplay: "I – IV – V7",
    description: "The simplest complete progression; backbone of early rock 'n' roll",
    examples: "La Bamba, Twist and Shout, Johnny B. Goode",
    notes: "The simplest complete progression; backbone of early rock 'n' roll.",
    degrees: ["I", "IV", "V"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "doo-wop",
    displayName: "50s Progression",
    category: "Pop",
    romanDisplay: "I – vi – IV – V7",
    description: "Also called the Doo-Wop progression; ubiquitous in 1950s pop",
    examples: "Stand By Me, Blue Moon, Heart and Soul",
    notes: "Also called the Doo-Wop progression; ubiquitous in 1950s pop.",
    degrees: ["I", "vi", "IV", "V"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "ii-v-i-pop",
    displayName: "ii–V–I (Pop)",
    category: "Pop",
    romanDisplay: "ii – V7 – I",
    description: "Borrowed from jazz; adds harmonic sophistication",
    examples: "Common in pop bridges and pre-choruses",
    notes: "Borrowed from jazz; adds harmonic sophistication. Usually played with 7th voicings.",
    degrees: ["ii", "V", "I"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  // ── Blues ─────────────────────────────────────────────────────────────────
  {
    name: "12-bar-blues",
    displayName: "12-Bar Blues",
    category: "Blues",
    romanDisplay: "I7 – I7 – I7 – I7 / IV7 – IV7 – I7 – I7 / V7 – IV7 – I7 – V7",
    description: "The foundation of the blues",
    examples: "Sweet Home Chicago, Pride and Joy, La Grange",
    notes: "The foundation of the blues. All chords are dominant 7ths.",
    degrees: ["I","I","I","I","IV","IV","I","I","V","IV","I","V"],
    mode: "mixolydian",
    recommendedScaleType: "Blues Scale",
  },
  {
    name: "quick-change-blues",
    displayName: "Quick-Change Blues",
    category: "Blues",
    romanDisplay: "I7 – IV7 – I7 – I7 / IV7 – IV7 – I7 – I7 / V7 – IV7 – I7 – V7",
    description: "12-bar with IV in bar 2 for added early tension",
    examples: "Pride and Joy (SRV), Sweet Little Angel",
    notes: "12-bar with IV in bar 2 for added early tension.",
    degrees: ["I","IV","I","I","IV","IV","I","I","V","IV","I","V"],
    mode: "mixolydian",
    recommendedScaleType: "Blues Scale",
  },
  {
    name: "8-bar-blues",
    displayName: "8-Bar Blues",
    category: "Blues",
    romanDisplay: "I7 – V – IV – IV / I7 – V – I7 – V",
    description: "Compressed form; feels more urgent and stripped-back",
    examples: "Key to the Highway, Worried Life Blues",
    notes: "Compressed form; feels more urgent and stripped-back.",
    degrees: ["I","V","IV","IV","I","V","I","V"],
    mode: "mixolydian",
    recommendedScaleType: "Blues Scale",
  },
  {
    name: "minor-blues",
    displayName: "Minor Blues",
    category: "Blues",
    romanDisplay: "i – i – i – i / iv – iv – i – i / V – iv – i – V",
    description: "12-bar in minor; more mournful and tense than the major form",
    examples: "The Thrill Is Gone (BB King), All Your Love",
    notes: "12-bar in minor; more mournful and tense than the major form.",
    degrees: ["i","i","i","i","iv","iv","i","i","V","iv","i","V"],
    mode: "aeolian",
    recommendedScaleType: "Blues Scale",
  },
  // ── Jazz ──────────────────────────────────────────────────────────────────
  {
    name: "ii-v-i-major",
    displayName: "ii–V–I Major",
    category: "Jazz",
    romanDisplay: "ii7 – V7 – Imaj7",
    description: "The core jazz cadence",
    examples: "Autumn Leaves, All The Things You Are",
    notes: "The core jazz cadence. Appears constantly in standards; played with 7th/9th extensions.",
    degrees: ["ii", "V", "I"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "ii-v-i-minor",
    displayName: "ii–V–i Minor",
    category: "Jazz",
    romanDisplay: "iiø7 – V7 – im7",
    description: "Half-diminished ii gives a darker, minor flavour",
    examples: "Autumn Leaves (minor sections), Alone Together",
    notes: "Half-diminished ii chord gives a darker, minor flavour.",
    degrees: ["ii", "V", "i"],
    mode: "aeolian",
    recommendedScaleType: "Natural Minor Scale",
  },
  {
    name: "jazz-turnaround",
    displayName: "Jazz Turnaround",
    category: "Jazz",
    romanDisplay: "Imaj7 – VI7 – II7 – V7",
    description: "Secondary dominants create harmonic momentum",
    examples: "Rhythm Changes endings, many standard codas",
    notes: "Secondary dominants replace diatonic chords to create harmonic momentum.",
    degrees: ["I", "VI", "II", "V"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "rhythm-changes",
    displayName: "Rhythm Changes",
    category: "Jazz",
    romanDisplay: "I–vi–ii–V7 (A) / III–VI–II–V7 (B)",
    description: "32-bar AABA form; a rite of passage for jazz players",
    examples: "I Got Rhythm (Gershwin), Oleo, Anthropology",
    notes: "32-bar AABA form; a rite of passage for jazz players.",
    degrees: ["I","vi","ii","V","III","VI","II","V"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "tritone-sub",
    displayName: "Tritone Substitution",
    category: "Jazz",
    romanDisplay: "♭II7 – Imaj7",
    description: "♭II7 replaces V7 for chromatic descending bass motion",
    examples: "Bebop standards, Charlie Parker compositions",
    notes: "♭II7 replaces V7 (a tritone away) for chromatic descending bass motion.",
    degrees: ["♭II", "I"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  // ── Rock ──────────────────────────────────────────────────────────────────
  {
    name: "three-chord-rock",
    displayName: "Three-Chord Rock",
    category: "Rock",
    romanDisplay: "I – IV – V7",
    description: "Same numerals as Three-Chord Pop but played as power chords",
    examples: "Rock Around the Clock, many punk/rock songs",
    notes: "Same numerals as Three-Chord Pop but played as power chords for a harder sound.",
    degrees: ["I", "IV", "V"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "blues-rock",
    displayName: "Mixolydian Vamp",
    category: "Rock",
    romanDisplay: "I7 – ♭VII – IV",
    description: "♭VII borrowed from the Mixolydian mode; the quintessential rock flavour",
    examples: "Sweet Home Alabama, Knockin' on Heaven's Door, Hey Joe",
    notes: "♭VII borrowed from the Mixolydian mode; the quintessential rock flavour.",
    degrees: ["I", "♭VII", "IV"],
    mode: "mixolydian",
    recommendedScaleType: "Mixolydian Scale",
  },
  {
    name: "aeolian-vamp",
    displayName: "Aeolian Vamp",
    category: "Rock",
    romanDisplay: "i – ♭VII7 – ♭VI – ♭VII7",
    description: "Natural minor rocking between ♭VI and ♭VII; dark and anthemic",
    examples: "Stairway to Heaven, All Along the Watchtower",
    notes: "Natural minor rocking between ♭VI and ♭VII; dark and anthemic.",
    degrees: ["i", "♭VII", "♭VI", "♭VII"],
    mode: "aeolian",
    recommendedScaleType: "Natural Minor Scale",
  },
  {
    name: "dark-ballad",
    displayName: "Minor Rock Loop",
    category: "Rock",
    romanDisplay: "i – ♭VI – ♭III – ♭VII7",
    description: "Aeolian loop with a resolving quality; huge in stadium rock",
    examples: "Stairway to Heaven (chorus), many alt-rock anthems",
    notes: "Aeolian loop with a resolving quality; huge in stadium rock.",
    degrees: ["i", "♭VI", "♭III", "♭VII"],
    mode: "aeolian",
    recommendedScaleType: "Natural Minor Scale",
  },
  // ── Folk / Country ────────────────────────────────────────────────────────
  {
    name: "folk-three-chord",
    displayName: "Folk Three-Chord",
    category: "Folk / Country",
    romanDisplay: "I – IV – V7 – I",
    description: "Open-position acoustic shapes; the most natural fit for guitar",
    examples: "Wagon Wheel, Take Me Home Country Roads, Blowin' in the Wind",
    notes: "Open-position G, C, D shapes — the most natural fit for acoustic guitar.",
    degrees: ["I", "IV", "V", "I"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "two-chord-vamp",
    displayName: "Two-Chord Vamp",
    category: "Folk / Country",
    romanDisplay: "I – V7",
    description: "Simplest vehicle for a melody; works well with fingerpicking",
    examples: "Many traditional folk and children's songs",
    notes: "Simplest vehicle for a melody; works well with fingerpicking patterns.",
    degrees: ["I", "V"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "bluegrass-loop",
    displayName: "Bluegrass Loop",
    category: "Folk / Country",
    romanDisplay: "I – IV – I – V7",
    description: "Common in bluegrass and old-time; pairs well with alternating bass",
    examples: "Deep River Blues, many bluegrass standards",
    notes: "Common in bluegrass and old-time; pairs well with alternating bass picking.",
    degrees: ["I", "IV", "I", "V"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "pachelbel",
    displayName: "Pachelbel Canon",
    category: "Folk / Country",
    romanDisplay: "I – V7 – vi – iii – IV – I – IV – V7",
    description: "Stepwise descending bass; especially rich fingerpicked",
    examples: "Pachelbel's Canon, many folk-inspired songs",
    notes: "Stepwise descending bass sounds especially rich fingerpicked.",
    degrees: ["I", "V", "vi", "iii", "IV", "I", "IV", "V"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  // ── Classical / Modal ─────────────────────────────────────────────────────
  {
    name: "andalusian",
    displayName: "Andalusian Cadence",
    category: "Classical / Modal",
    romanDisplay: "i – ♭VII7 – ♭VI – V",
    description: "Descending bass line; V is major for Phrygian tension",
    examples: "Flamenco tradition, Sultans of Swing, Hit the Road Jack",
    notes: "Descending bass line; V is major for Phrygian tension. Deeply dramatic.",
    degrees: ["i", "♭VII", "♭VI", "V"],
    mode: "aeolian",
    recommendedScaleType: "Natural Minor Scale",
  },
  {
    name: "lamento-bass",
    displayName: "Lamento Bass",
    category: "Classical / Modal",
    romanDisplay: "I – VII – VI – V7",
    description: "Stepwise descending bass in the root position; elegant for fingerstyle",
    examples: "Air on G String, many Baroque pieces",
    notes: "Stepwise descending bass in the root position; elegant for fingerstyle.",
    degrees: ["I", "vii", "vi", "V"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "plagal-cadence",
    displayName: "Plagal Cadence",
    category: "Classical / Modal",
    romanDisplay: "IV – I",
    description: "The \"Amen\" cadence; restful and conclusive",
    examples: "Hymns, gospel, many rock outros",
    notes: "The \"Amen\" cadence; restful and conclusive without the leading-tone pull of V–I.",
    degrees: ["IV", "I"],
    mode: "ionian",
    recommendedScaleType: "Major Scale",
  },
  {
    name: "phrygian-vamp",
    displayName: "Phrygian Vamp",
    category: "Classical / Modal",
    romanDisplay: "i – ♭II (repeat)",
    description: "The ♭II (Neapolitan) chord creates an exotic, suspended tension",
    examples: "Flamenco, Middle Eastern-influenced passages",
    notes: "The ♭II (Neapolitan) chord creates an exotic, suspended tension.",
    degrees: ["i", "♭II", "i", "♭II"],
    mode: "phrygian",
    recommendedScaleType: "Phrygian Scale",
  },
]

export function listProgressions(): Progression[] {
  return PROGRESSIONS
}

// ---------------------------------------------------------------------------
// Roman numeral → degree (1-based), including ♭-prefixed
// ---------------------------------------------------------------------------
const ROMAN_TO_DEGREE: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7,
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7,
  "♭II": 2, "♭III": 3, "♭IV": 4, "♭V": 5, "♭VI": 6, "♭VII": 7,
  "♭ii": 2, "♭iii": 3, "♭iv": 4, "♭v": 5, "♭vi": 6, "♭vii": 7,
}

function romanToDegree(roman: string): number {
  // Strip decoration symbols (°, +) but NOT ♭ — ♭VII must match as-is
  const normalized = roman.replace(/[°+]/g, "")
  return ROMAN_TO_DEGREE[normalized] ?? 1
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function getProgression(name: string, tonic: string): ProgressionChord[] {
  const prog = PROGRESSIONS.find((p) => p.name === name)
  if (!prog) return []

  // Use the progression's own mode (not hardcoded "major")
  const diatonic = getDiatonicChords(tonic, prog.mode)
  const byDegree: Record<number, DiatonicChord> = {}
  for (const dc of diatonic) byDegree[dc.degree] = dc

  return prog.degrees.map((roman) => {
    const degree = romanToDegree(roman)
    const dc = byDegree[degree]
    if (!dc) {
      return { roman, nashville: String(degree), tonic, type: "maj7", quality: "major", degree }
    }
    // Append "7" to the roman when the diatonic chord is dominant and roman doesn't already end in "7"
    const displayRoman = /^(7|9|11|13)/.test(dc.type) && !roman.endsWith("7") ? roman + "7" : roman
    return {
      roman: displayRoman,
      nashville: dc.nashville,
      tonic: dc.tonic,
      type: dc.type,
      quality: dc.quality,
      degree: dc.degree,
    }
  })
}
