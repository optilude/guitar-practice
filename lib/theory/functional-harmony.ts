import { Note } from "tonal"
import { getDiatonicChords } from "@/lib/theory/harmony"
import type { SoloScales } from "@/lib/theory/types"

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ChordContext = {
  tonic: string
  type: string
  quality: "major" | "minor" | "dominant" | "diminished"
  roman: string
}

export interface FunctionalAnalysis {
  romanOverride: string | null     // null = keep existing Roman numeral display
  scalesOverride: SoloScales | null // null = fall back to getSoloScales()
}

// ---------------------------------------------------------------------------
// Interval helpers — pitch-class comparison handles enharmonic equivalents
// ---------------------------------------------------------------------------

/** Compare by chroma (0–11) to handle enharmonic equivalents robustly. */
function sameChroma(a: string, b: string): boolean {
  const ca = Note.chroma(a)
  const cb = Note.chroma(b)
  return ca !== undefined && cb !== undefined && ca === cb
}

/** nextTonic is a perfect 4th UP from fromTonic (e.g. C→F, A→D, G→C) */
function isP4Up(fromTonic: string, toTonic: string): boolean {
  return sameChroma(Note.transpose(fromTonic, "P4"), toTonic)
}

/** nextTonic is a minor 2nd DOWN from fromTonic (e.g. Db→C, Ab→G) */
function isM2Down(fromTonic: string, toTonic: string): boolean {
  // "m2 down from current" = current is m2 above next
  return sameChroma(Note.transpose(toTonic, "m2"), fromTonic)
}

/** nextTonic is a minor 2nd UP from fromTonic (e.g. C#→D, F#→G) */
function isM2Up(fromTonic: string, toTonic: string): boolean {
  return sameChroma(Note.transpose(fromTonic, "m2"), toTonic)
}

/** nextTonic is a major 2nd UP from fromTonic (e.g. G→A, F→G) */
function isMajor2Up(fromTonic: string, toTonic: string): boolean {
  return sameChroma(Note.transpose(fromTonic, "M2"), toTonic)
}

// ---------------------------------------------------------------------------
// Convenience builder
// ---------------------------------------------------------------------------

function buildScales(
  tonic: string,
  primary: string,
  additional: Array<{ scaleName: string; hint?: string }>,
): SoloScales {
  return { chordTonic: tonic, primary: { scaleName: primary }, additional }
}

// ---------------------------------------------------------------------------
// Exported helper — maps a raw chord type string to quality.
// Use this when you have an InputChord/ChordAnalysis and no pre-computed quality.
// ---------------------------------------------------------------------------

export function qualityFromType(
  type: string,
): "major" | "minor" | "dominant" | "diminished" {
  const t = type.toLowerCase()
  if (t.startsWith("dim") || t === "m7b5" || t === "ø7" || t === "ø") return "diminished"
  if ((t.startsWith("m") && !t.startsWith("maj")) || t === "-" || t.startsWith("-m")) return "minor"
  if (/^(7|9|11|13)/.test(t) || t === "alt") return "dominant"
  return "major"
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Analyse the functional role of `chord` given `nextChord` as its resolution
 * target. Returns scale and Roman numeral overrides when a rule fires.
 * Call with `nextChord = null` for the last chord in a progression.
 */
export function analyzeFunctionalContext(
  chord: ChordContext,
  nextChord: ChordContext | null,
  tonic: string,
  mode: string,
): FunctionalAnalysis {
  const NONE: FunctionalAnalysis = { romanOverride: null, scalesOverride: null }
  if (!nextChord) return NONE

  const { tonic: ct, quality: cq } = chord
  const { tonic: nt, quality: nq, roman: nr } = nextChord

  // ------------------------------------------------------------------
  // Rule 1: Secondary dominant to minor — dominant → minor, P4 up
  // Example: A7 → Dm7  →  "V7/ii"
  // ------------------------------------------------------------------
  if (cq === "dominant" && nq === "minor" && isP4Up(ct, nt)) {
    return {
      romanOverride: `V7/${nr}`,
      scalesOverride: buildScales(ct, "Phrygian Dominant", [
        { scaleName: "Altered",       hint: "jazz tension" },
        { scaleName: "Mixolydian b6", hint: "darker" },
      ]),
    }
  }

  // ------------------------------------------------------------------
  // Rule 2: Secondary dominant to major — dominant → major, P4 up
  // Example: D7 → Gmaj7  →  "V7/V"
  // ------------------------------------------------------------------
  if (cq === "dominant" && nq === "major" && isP4Up(ct, nt)) {
    return {
      romanOverride: `V7/${nr}`,
      scalesOverride: buildScales(ct, "Mixolydian", [
        { scaleName: "Lydian Dominant", hint: "bright tension" },
      ]),
    }
  }

  // ------------------------------------------------------------------
  // Rule 3: Related ii chord — minor/half-dim → dominant, P4 up
  // Example: Em7 → A7 (resolving to Dm7)  →  "ii/ii"
  // The target chord is P4 above nextChord. We look up its Roman in the key.
  // ------------------------------------------------------------------
  if ((cq === "minor" || cq === "diminished") && nq === "dominant" && isP4Up(ct, nt)) {
    const targetChroma = Note.chroma(Note.transpose(nt, "P4"))
    const diatonic     = getDiatonicChords(tonic, mode)
    const targetChord  = diatonic.find(d => Note.chroma(d.tonic) === targetChroma)
    const targetRoman = targetChord?.roman ?? "?"
    const prefix      = cq === "diminished" ? "iiø" : "ii"
    return {
      romanOverride: `${prefix}/${targetRoman}`,
      scalesOverride: cq === "diminished"
        ? buildScales(ct, "Locrian", [{ scaleName: "Locrian #2", hint: "less dissonant" }])
        : buildScales(ct, "Dorian", []),
    }
  }

  // ------------------------------------------------------------------
  // Rule 4: Extended dominant chain — dominant → dominant, P4 up
  // Example: B7 → E7  →  "V7/III"
  // ------------------------------------------------------------------
  if (cq === "dominant" && nq === "dominant" && isP4Up(ct, nt)) {
    return {
      romanOverride: `V7/${nr}`,
      scalesOverride: buildScales(ct, "Lydian Dominant", []),
    }
  }

  // ------------------------------------------------------------------
  // Rule 5: Tritone substitution — dominant, next root m2 DOWN from current
  // Example: Db7 → Cmaj7  →  "subV7/I"
  // ------------------------------------------------------------------
  if (cq === "dominant" && isM2Down(ct, nt)) {
    return {
      romanOverride: `subV7/${nr}`,
      scalesOverride: buildScales(ct, "Lydian Dominant", []),
    }
  }

  // ------------------------------------------------------------------
  // Rule 6: Diminished passing chord — dim7, next root m2 UP from current
  // Example: C#dim7 → Dm7  →  "vii°7/ii"
  // ------------------------------------------------------------------
  if (cq === "diminished" && isM2Up(ct, nt)) {
    return {
      romanOverride: `vii°7/${nr}`,
      scalesOverride: buildScales(ct, "Whole-Half Diminished", []),
    }
  }

  // ------------------------------------------------------------------
  // Rule 7: Deceptive resolution to minor — dominant → minor, M2 up
  // Example: G7 → Am7 (V7 → vi)
  // No Roman override — it's already the correct diatonic Roman (e.g. "V").
  // ------------------------------------------------------------------
  if (cq === "dominant" && nq === "minor" && isMajor2Up(ct, nt)) {
    return {
      romanOverride: null,
      scalesOverride: buildScales(ct, "Mixolydian b6", [
        { scaleName: "Altered",    hint: "jazz tension" },
        { scaleName: "Mixolydian", hint: "safe choice" },
      ]),
    }
  }

  return NONE
}
