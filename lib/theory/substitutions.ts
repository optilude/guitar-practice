import { Note, Key } from "tonal"
import { getDiatonicChords } from "@/lib/theory/harmony"
import type { ProgressionChord, PreviewChord, ChordSubstitution } from "@/lib/theory/types"

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Correct enharmonic spelling for the given key. */
function normalizeToKey(note: string, tonic: string, mode: string): string {
  const sig = (mode === "major" || mode === "ionian")
    ? Key.majorKey(tonic).keySignature
    : Key.minorKey(tonic).keySignature
  if (sig.includes("b") && note.includes("#")) return Note.enharmonic(note) || note
  if (sig.includes("#") && note.includes("b")) return Note.enharmonic(note) || note
  return note
}

/** Derive quality string from chord type. */
function qualityFor(type: string): string {
  if (type.startsWith("maj") || type === "" || type === "6") return "major"
  if (type === "m7b5" || type.startsWith("dim")) return "diminished"
  if (type.startsWith("m")) return "minor"
  if (/^(7|9|11|13)/.test(type)) return "dominant"
  return "major"
}

/** Build a PreviewChord, normalising the root to the key's enharmonic preference. */
function mkChord(
  rawRoot: string,
  type: string,
  roman: string,
  tonic: string,
  mode: string,
  degree?: number,
): PreviewChord {
  return {
    tonic: normalizeToKey(rawRoot, tonic, mode),
    type,
    roman,
    quality: qualityFor(type),
    degree,
  }
}

// ---------------------------------------------------------------------------
// Rule 1: Diatonic Substitution
// ---------------------------------------------------------------------------

function diatonicSubstitution(
  chord: ProgressionChord,
  selectedIndex: number,
  tonic: string,
  mode: string,
): ChordSubstitution[] {
  if (chord.degree < 1 || chord.degree > 7) return []
  const diatonic = getDiatonicChords(tonic, mode)
  const deg = chord.degree

  // Diatonic third above and below (1–7, wrapping)
  const above3 = ((deg - 1 + 2) % 7) + 1
  const below3 = ((deg - 1 - 2 + 7) % 7) + 1

  // Conventional commonality: which third is the more typical substitution
  const FIRST: Record<number, number> = { 1: 6, 2: 4, 3: 1, 4: 2, 5: 7, 6: 1, 7: 5 }
  const firstDeg  = FIRST[deg] ?? above3
  const secondDeg = firstDeg === above3 ? below3 : above3

  return [firstDeg, secondDeg].flatMap((targetDeg, i) => {
    const dc = diatonic.find(d => d.degree === targetDeg)
    if (!dc) return []
    return [{
      id: `diatonic-deg${targetDeg}`,
      ruleName: "Diatonic Substitution",
      label: `${dc.tonic}${dc.type}`,
      effect: `${dc.roman} — parallel function`,
      result: {
        kind: "replacement" as const,
        replacements: [{
          index: selectedIndex,
          chord: { tonic: dc.tonic, type: dc.type, roman: dc.roman, quality: dc.quality, degree: dc.degree },
        }],
      },
      sortRank: 10 + i,
    } satisfies ChordSubstitution]
  })
}

// ---------------------------------------------------------------------------
// Rule 2: Tritone Substitution
// ---------------------------------------------------------------------------

function tritoneSubstitution(
  chord: ProgressionChord,
  selectedIndex: number,
  tonic: string,
  mode: string,
): ChordSubstitution[] {
  if (chord.type !== "7") return []
  const rawRoot = Note.transpose(chord.tonic, "A4") // augmented 4th = tritone
  return [{
    id: "tritone",
    ruleName: "Tritone Substitution",
    label: `${normalizeToKey(rawRoot, tonic, mode)}7`,
    effect: "bII7 — chromatic descending bass to resolution",
    result: {
      kind: "replacement",
      replacements: [{ index: selectedIndex, chord: mkChord(rawRoot, "7", "bII7", tonic, mode) }],
    },
    sortRank: 20,
  }]
}

// ---------------------------------------------------------------------------
// Rule 3: Modal Mixture (Borrowed Chords)
// ---------------------------------------------------------------------------

function modalMixture(
  chord: ProgressionChord,
  selectedIndex: number,
  tonic: string,
  mode: string,
): ChordSubstitution[] {
  // Subdominant function: degree IV in major-family modes
  const majorFamilyModes = new Set(["major", "ionian", "lydian", "mixolydian", "dorian"])
  if (chord.degree !== 4 || !majorFamilyModes.has(mode)) return []

  const bVII7Root   = Note.transpose(tonic, "m7")  // minor 7th above tonic
  const bVImaj7Root = Note.transpose(tonic, "m6")  // minor 6th above tonic

  return [
    {
      id: "mixture-iv7",
      ruleName: "Modal Mixture",
      label: `${chord.tonic}m7`,
      effect: "iv-7 — parallel minor darkens the colour",
      result: {
        kind: "replacement",
        replacements: [{ index: selectedIndex, chord: mkChord(chord.tonic, "m7", "iv-7", tonic, mode) }],
      },
      sortRank: 30,
    },
    {
      id: "mixture-bvii7",
      ruleName: "Modal Mixture",
      label: `${normalizeToKey(bVII7Root, tonic, mode)}7`,
      effect: "bVII7 — borrowed flat-seven dominant",
      result: {
        kind: "replacement",
        replacements: [{ index: selectedIndex, chord: mkChord(bVII7Root, "7", "bVII7", tonic, mode) }],
      },
      sortRank: 31,
    },
    {
      id: "mixture-bvimaj7",
      ruleName: "Modal Mixture",
      label: `${normalizeToKey(bVImaj7Root, tonic, mode)}maj7`,
      effect: "bVImaj7 — borrowed from parallel minor",
      result: {
        kind: "replacement",
        replacements: [{ index: selectedIndex, chord: mkChord(bVImaj7Root, "maj7", "bVImaj7", tonic, mode) }],
      },
      sortRank: 32,
    },
  ]
}

// ---------------------------------------------------------------------------
// Rule 4: Secondary Dominant (V approach)
// ---------------------------------------------------------------------------

function secondaryDominant(
  chord: ProgressionChord,
  selectedIndex: number,
  tonic: string,
  mode: string,
): ChordSubstitution[] {
  const v7Root = Note.transpose(chord.tonic, "P5")
  const norm   = normalizeToKey(v7Root, tonic, mode)
  return [{
    id: "secondary-dominant",
    ruleName: "Secondary Dominant",
    label: `${norm}7 → ${chord.tonic}${chord.type}`,
    effect: "Strong dominant pull into the chord",
    result: {
      kind: "insertion",
      insertBefore: selectedIndex,
      chords: [mkChord(v7Root, "7", `V7/${chord.roman}`, tonic, mode)],
    },
    sortRank: 40,
  }]
}

// ---------------------------------------------------------------------------
// Rule 5: ii-V Approach
// ---------------------------------------------------------------------------

function iiVApproach(
  chord: ProgressionChord,
  selectedIndex: number,
  tonic: string,
  mode: string,
): ChordSubstitution[] {
  // ii root = major 2nd (whole step) above the target chord's root
  const iiRoot = Note.transpose(chord.tonic, "M2")
  const v7Root = Note.transpose(chord.tonic, "P5")
  // Minor quality targets take m7b5 as their ii; major/dominant take m7
  const iiType = (chord.quality === "minor" || chord.quality === "diminished") ? "m7b5" : "m7"

  const normIi = normalizeToKey(iiRoot, tonic, mode)
  const normV7 = normalizeToKey(v7Root, tonic, mode)

  return [{
    id: "ii-v-approach",
    ruleName: "ii-V Approach",
    label: `${normIi}${iiType} → ${normV7}7 → ${chord.tonic}${chord.type}`,
    effect: "Classic jazz preparation",
    result: {
      kind: "insertion",
      insertBefore: selectedIndex,
      chords: [
        mkChord(iiRoot, iiType, `ii/${chord.roman}`,  tonic, mode),
        mkChord(v7Root, "7",    `V7/${chord.roman}`,  tonic, mode),
      ],
    },
    sortRank: 41,
  }]
}

// ---------------------------------------------------------------------------
// Rule 6: Diminished Passing
// ---------------------------------------------------------------------------

function diminishedPassing(
  chord: ProgressionChord,
  chords: ProgressionChord[],
  selectedIndex: number,
  tonic: string,
  mode: string,
): ChordSubstitution[] {
  if (selectedIndex >= chords.length - 1) return []
  const rawRoot = Note.transpose(chord.tonic, "A1") // chromatic semitone up
  const norm    = normalizeToKey(rawRoot, tonic, mode)
  return [{
    id: "dim-passing",
    ruleName: "Diminished Passing",
    label: `${norm}°7`,
    effect: "Chromatic passing chord — leading tone into next chord",
    result: {
      kind: "insertion",
      insertBefore: selectedIndex + 1,
      chords: [mkChord(rawRoot, "dim7", `#${chord.roman}°7`, tonic, mode)],
    },
    sortRank: 50,
  }]
}

// ---------------------------------------------------------------------------
// Rule 7: Cycle of 5ths
// ---------------------------------------------------------------------------

function cycleOfFifths(
  chord: ProgressionChord,
  chords: ProgressionChord[],
  selectedIndex: number,
  tonic: string,
  mode: string,
): ChordSubstitution[] {
  if (selectedIndex >= chords.length - 1) return []
  const nextChord  = chords[selectedIndex + 1]!
  const v7YRoot    = Note.transpose(nextChord.tonic, "P5")  // V7 of next chord
  const v7V7YRoot  = Note.transpose(v7YRoot, "P5")          // V7 of V7 of next chord
  const normV7Y    = normalizeToKey(v7YRoot,   tonic, mode)
  const normV7V7Y  = normalizeToKey(v7V7YRoot, tonic, mode)
  return [{
    id: "cycle-of-5ths",
    ruleName: "Cycle of 5ths",
    label: `${normV7V7Y}7 → ${normV7Y}7 → ${nextChord.tonic}${nextChord.type}`,
    effect: "Two-step dominant chain into next chord",
    result: {
      kind: "insertion",
      insertBefore: selectedIndex + 1,
      chords: [
        mkChord(v7V7YRoot, "7", `V7/V7/${nextChord.roman}`, tonic, mode),
        mkChord(v7YRoot,   "7", `V7/${nextChord.roman}`,    tonic, mode),
      ],
    },
    sortRank: 60,
  }]
}

// ---------------------------------------------------------------------------
// Rule 8: Coltrane Changes
// ---------------------------------------------------------------------------

function coltraneChanges(
  chord: ProgressionChord,
  chords: ProgressionChord[],
  selectedIndex: number,
  tonic: string,
  mode: string,
): ChordSubstitution[] {
  // Need at least 2 more chords after selectedIndex
  if (selectedIndex + 2 >= chords.length) return []
  const c0 = chord
  const c1 = chords[selectedIndex + 1]!
  const c2 = chords[selectedIndex + 2]!

  // Type check: ii-7 → V7 → Imaj7
  if (c0.type !== "m7" || c1.type !== "7" || c2.type !== "maj7") return []

  // Interval check via pitch class (handles enharmonic equivalents: C# = Db)
  const pc = (n: string) => Note.pitchClass(n)
  // c0 is the ii: its root should be a P4 below c1 (V7 root is P4 above ii root)
  if (pc(Note.transpose(c0.tonic, "P4")) !== pc(c1.tonic)) return []
  // c1 is the V: its root should be a P4 below c2 (I root is P4 above V root)
  if (pc(Note.transpose(c1.tonic, "P4")) !== pc(c2.tonic)) return []

  const I_root    = c2.tonic
  const bVI_root  = Note.transpose(I_root, "m6")  // minor 6th above I = bVI
  const III_root  = Note.transpose(I_root, "M3")  // major 3rd above I = III
  const ii_I_root  = Note.transpose(I_root, "M2") // ii of I (whole step above)
  const V7bVI_root = Note.transpose(bVI_root, "P5")
  const V7III_root = Note.transpose(III_root, "P5")
  const V7I_root   = Note.transpose(I_root, "P5")

  // Classic Coltrane sequence: [Dm7, Eb7, Abmaj7, B7, Emaj7, G7, Cmaj7] for ii-V-I in C
  const coltraneSeq: PreviewChord[] = [
    mkChord(ii_I_root,  "m7",   "ii/I",    tonic, mode),
    mkChord(V7bVI_root, "7",    "V7/bVI",  tonic, mode),
    mkChord(bVI_root,   "maj7", "bVImaj7", tonic, mode),
    mkChord(V7III_root, "7",    "V7/III",  tonic, mode),
    mkChord(III_root,   "maj7", "IIImaj7", tonic, mode),
    mkChord(V7I_root,   "7",    "V7/I",    tonic, mode),
    mkChord(I_root,     "maj7", "Imaj7",   tonic, mode),
  ]

  const label = coltraneSeq.map(c => `${c.tonic}${c.type}`).join(" → ")

  return [{
    id: "coltrane-changes",
    ruleName: "Coltrane Changes",
    label,
    effect: "Cycles through three tonal centres a major third apart",
    result: {
      kind: "range_replacement",
      startIndex: selectedIndex,
      endIndex: selectedIndex + 2,
      chords: coltraneSeq,
    },
    sortRank: 70,
  }]
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getSubstitutions(
  chord: ProgressionChord,
  chords: ProgressionChord[],
  selectedIndex: number,
  tonic: string,
  mode: string,
): ChordSubstitution[] {
  const all = [
    ...diatonicSubstitution(chord, selectedIndex, tonic, mode),
    ...tritoneSubstitution(chord, selectedIndex, tonic, mode),
    ...modalMixture(chord, selectedIndex, tonic, mode),
    ...secondaryDominant(chord, selectedIndex, tonic, mode),
    ...iiVApproach(chord, selectedIndex, tonic, mode),
    ...diminishedPassing(chord, chords, selectedIndex, tonic, mode),
    ...cycleOfFifths(chord, chords, selectedIndex, tonic, mode),
    ...coltraneChanges(chord, chords, selectedIndex, tonic, mode),
  ]
  return all.sort((a, b) => a.sortRank - b.sortRank)
}
