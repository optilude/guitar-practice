import { Chord, Note } from "tonal"
import { getScale } from "@/lib/theory/scales"

// Open-string chroma: index 0 = string 6 (low E), index 5 = string 1 (high e)
const OPEN_CHROMA = [4, 9, 2, 7, 11, 4] as const

// Flat-preferred chroma → note name mapping
const CHROMA_TO_NOTE = [
  "C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B",
] as const

export type DetectedChord = {
  symbol: string       // e.g. "Cm7", "Eb/G"
  root: string         // e.g. "C"
  quality: string      // tonal alias[0], e.g. "m7", "M", "" (empty = major)
  bass: string         // lowest sounding note name
  isRootPosition: boolean
  inversionNumber: number  // 0 = root position, 1 = 1st inversion, 2 = 2nd, etc.
  degreeLabel?: string // e.g. "vi" — only when key+scale filter active
}

// Chord type complexity tier: lower = shown earlier (triad → 7th → 6th → sus → extended → other)
function complexityTier(chordType: string): number {
  const t = chordType.toLowerCase()
  if (t === "major" || t === "minor" || t === "diminished" || t === "augmented" || t === "fifth") return 0
  if (/seventh/.test(t) && !/ninth|eleventh|thirteenth/.test(t)) return 1
  if (/sixth/.test(t) && !/seventh/.test(t)) return 2
  if (/suspended/.test(t)) return 3
  if (/ninth|eleventh|thirteenth/.test(t)) return 4
  return 5
}

function chordScore(isRootPosition: boolean, chordType: string, symbolLength: number): number {
  // Complexity tier is the primary sort key (× 100), root position preference is secondary
  return complexityTier(chordType) * 100 + (isRootPosition ? 0 : 10) + symbolLength
}

const DEGREE_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"] as const

function computeDegreeLabel(root: string, scaleNotes: string[], isMinorish: boolean): string | undefined {
  const rootChroma = Note.chroma(root)
  if (rootChroma === undefined || rootChroma === null) return undefined
  const idx = scaleNotes.findIndex((n) => Note.chroma(n) === rootChroma)
  if (idx === -1 || idx >= DEGREE_NUMERALS.length) return undefined
  const numeral = DEGREE_NUMERALS[idx]
  return isMinorish ? numeral.toLowerCase() : numeral
}

export function detectChords(
  frets: (number | null)[],
  options?: { key?: string; scaleType?: string },
): DetectedChord[] {
  // 1. Compute sounding note for each non-muted string (low E first = index 0)
  const soundingStrings: Array<{ note: string }> = []
  for (let i = 0; i < 6; i++) {
    const fret = frets[i]
    if (fret === null) continue
    const chroma = (OPEN_CHROMA[i] + fret) % 12
    soundingStrings.push({ note: CHROMA_TO_NOTE[chroma] })
  }
  if (soundingStrings.length === 0) return []

  // 2. Unique pitch classes (preserve encounter order for Chord.detect)
  const seenChromas = new Set<number>()
  const uniqueNotes: string[] = []
  for (const { note } of soundingStrings) {
    const chroma = Note.chroma(note)
    if (chroma !== undefined && chroma !== null && !seenChromas.has(chroma)) {
      seenChromas.add(chroma)
      uniqueNotes.push(note)
    }
  }

  // 3. Bass = lowest non-muted string note
  const bass = soundingStrings[0].note

  // 4. Detect all matching chords
  const detected = Chord.detect(uniqueNotes)
  if (detected.length === 0) return []

  // 5. Resolve scale notes for optional filter + degree labelling
  let scaleNotes: string[] | null = null
  if (options?.key && options?.scaleType) {
    try {
      scaleNotes = getScale(options.key, options.scaleType).notes
    } catch {
      // unknown combination — skip filter
    }
  }

  // 6. Build result entries
  const scaleChromas = scaleNotes
    ? new Set(scaleNotes.map((n) => Note.chroma(n)).filter((c): c is number => Number.isFinite(c as number)))
    : null

  const entries: Array<{ chord: DetectedChord; score: number }> = []
  for (const symbol of detected) {
    const slashIdx = symbol.indexOf("/")
    const baseSymbol = slashIdx >= 0 ? symbol.slice(0, slashIdx) : symbol

    const info = Chord.get(baseSymbol)
    const root = info.tonic
    if (!root) continue

    const quality = info.aliases[0] ?? ""
    const isRootPosition = Note.chroma(root) === Note.chroma(bass)

    // Scale filter: skip chords with any tone outside the scale
    if (scaleChromas) {
      const allInScale = info.notes.every((n) => {
        const c = Note.chroma(n)
        return Number.isFinite(c) && scaleChromas!.has(c as number)
      })
      if (!allInScale) continue
    }

    // inversionNumber: index of the bass note's chroma among the chord tones
    const bassChroma = Note.chroma(bass) ?? -1
    const inversionNumber = isRootPosition
      ? 0
      : info.notes.findIndex((n) => {
          const c = Note.chroma(n)
          return Number.isFinite(c) && c === bassChroma
        })
    // findIndex returns -1 if not found (unusual) — treat as 0
    const safeInversion = inversionNumber < 0 ? 0 : inversionNumber

    const chord: DetectedChord = { symbol, root, quality, bass, isRootPosition, inversionNumber: safeInversion }
    if (scaleNotes) {
      const isMinorish = info.quality === "Minor" || info.quality === "Diminished"
      chord.degreeLabel = computeDegreeLabel(root, scaleNotes, isMinorish)
    }

    entries.push({ chord, score: chordScore(isRootPosition, info.type, symbol.length) })
  }

  // 7. Sort by score (ascending = simpler/more obvious first)
  return entries.sort((a, b) => a.score - b.score).map((e) => e.chord)
}
