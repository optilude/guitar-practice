import { Note } from "tonal"
import type { GuitarScale } from "@/lib/theory/types"
import { getScale } from "@/lib/theory"
import { INTERVAL_DEGREE_COLORS } from "@/lib/rendering/tab"
import SCALE_PATTERNS from "@/lib/theory/data/scale-patterns"

// ---------------------------------------------------------------------------
// Fretboard.js — imported via ESM. Rendering only runs client-side (useEffect).
// If named imports fail at runtime, adjust to: import * as fb from "..."
// ---------------------------------------------------------------------------
import { Fretboard, FretboardSystem, Systems } from "@moonwave99/fretboard.js"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
// Open-string chroma: index 0 = string 6 (low E), index 5 = string 1 (high e)
const OPEN_CHROMA = [4, 9, 2, 7, 11, 4]

const INTERVAL_LABEL: Record<string, string> = {
  "1P": "R",
  "2m": "b2", "2M": "2",
  "3m": "b3", "3M": "3",
  "4P": "4",  "4A": "#4",
  "5d": "b5", "5P": "5", "5A": "#5",
  "6m": "b6", "6M": "6",
  "7m": "b7", "7M": "7",
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type BoxSystem = "none" | "caged" | "3nps" | "pentatonic" | "windows"

export type FretboardDot = {
  string: number    // 1 = high e, 6 = low E
  fret: number      // 0–15
  interval: string  // display label: "R", "b3", "5", etc.
  note: string      // note name: "C", "Eb", "G", etc.
}

// ---------------------------------------------------------------------------
// Box system availability
// ---------------------------------------------------------------------------
const PENTATONIC_SCALE_TYPES = new Set(["Pentatonic Major", "Pentatonic Minor", "Blues"])
const NO_BOX_SCALE_TYPES     = new Set(["Whole Tone", "Diminished Whole-Half", "Diminished Half-Whole"])

const PENTATONIC_TYPE_MAP: Record<string, string> = {
  "Pentatonic Minor": "pentatonic minor",
  "Pentatonic Major": "major pentatonic",
  "Blues":            "minor pentatonic",
}

export const CHORD_TYPE_TO_SCALE: Record<string, string> = {
  // Major family
  maj:     "Major",  maj7: "Major",  maj9: "Major",  "6": "Major",  add9: "Major",
  // Minor family — all minor types use Dorian as parent scale (per design spec)
  m:       "Dorian",  m6:  "Dorian",  m7: "Dorian",  m9: "Dorian",  madd9: "Dorian",
  // Dominant family
  "7":     "Mixolydian", "9": "Mixolydian", "11": "Mixolydian", "13": "Mixolydian",
  // Diminished / other
  m7b5:    "Locrian",
  mmaj7:   "Melodic Minor",  mmaj9: "Melodic Minor",
}

export function getScaleBoxSystems(scaleType: string): BoxSystem[] {
  if (NO_BOX_SCALE_TYPES.has(scaleType))     return ["none"]
  if (PENTATONIC_SCALE_TYPES.has(scaleType)) return ["none", "pentatonic"]
  return ["none", "caged", "3nps"]
}

export function getArpeggioBoxSystems(chordType: string): BoxSystem[] {
  return CHORD_TYPE_TO_SCALE[chordType] ? ["none", "caged", "3nps"] : ["none", "windows"]
}

// ---------------------------------------------------------------------------
// Full fretboard position computation
// ---------------------------------------------------------------------------
export function getAllFretboardPositions(
  _tonic: string,
  scaleNotes: string[],
  scaleIntervals: string[]
): FretboardDot[] {
  const scaleChroma = scaleNotes.map(n => Note.chroma(n) ?? -1)
  const intervalLabels = scaleIntervals.map(iv => INTERVAL_LABEL[iv] ?? iv)

  const dots: FretboardDot[] = []
  for (let strIdx = 0; strIdx < 6; strIdx++) {
    const guitarString = 6 - strIdx
    const openCh = OPEN_CHROMA[strIdx]
    for (let fret = 0; fret <= 15; fret++) {
      const noteChroma = (openCh + fret) % 12
      const noteIdx = scaleChroma.indexOf(noteChroma)
      if (noteIdx !== -1) {
        dots.push({
          string: guitarString,
          fret,
          interval: intervalLabels[noteIdx],
          note: scaleNotes[noteIdx],
        })
      }
    }
  }
  return dots
}

// ---------------------------------------------------------------------------
// 3NPS position computation — stubs filled in Task 3
// ---------------------------------------------------------------------------
export function build3NPSPositions(
  _tonic: string,
  scaleNotes: string[],
  _scaleIntervals: string[]
): Set<string>[] {
  if (scaleNotes.length < 7) return []

  const scaleChroma = scaleNotes.map(n => Note.chroma(n) ?? -1)

  // For each string, all frets 0–17 that are scale tones (extends to 17 for positional overlap)
  const fretsByString: number[][] = OPEN_CHROMA.map(openCh => {
    const frets: number[] = []
    for (let f = 0; f <= 17; f++) {
      if (scaleChroma.includes((openCh + f) % 12)) frets.push(f)
    }
    return frets
  })

  // 7 positions: one starting on each scale degree.
  // startFret for position i = lowest fret of scale degree i on string 6.
  return scaleChroma.map(degChroma => {
    const inBox = new Set<string>()
    let startFret = ((degChroma - OPEN_CHROMA[0] + 12) % 12)

    for (let strIdx = 0; strIdx < 6; strIdx++) {
      const guitarString = 6 - strIdx
      // Take first 3 scale tones at or above startFret on this string
      const chosen = fretsByString[strIdx].filter(f => f >= startFret).slice(0, 3)
      // Only add frets within display range (0–15)
      chosen.forEach(f => { if (f <= 15) inBox.add(`${guitarString}:${f}`) })
      // Carry the lowest chosen fret forward as the anchor for the next string
      if (chosen.length > 0) startFret = chosen[0]
    }

    return inBox
  })
}

// ---------------------------------------------------------------------------
// Box membership — stub filled in Task 4
// ---------------------------------------------------------------------------
export function getBoxMembershipSet(
  tonic: string,
  scaleType: string,
  boxSystem: BoxSystem,
  boxIndex: number,
  scaleNotes: string[],
  scaleIntervals: string[]
): Set<string> {
  if (boxSystem === "none" || boxSystem === "windows") return new Set()

  if (boxSystem === "caged") {
    const patterns = SCALE_PATTERNS[scaleType]
    if (!patterns || !patterns[boxIndex]) return new Set()
    const rootFret = ((Note.chroma(tonic) ?? 0) - OPEN_CHROMA[0] + 12) % 12
    const set = new Set<string>()
    for (const [guitarString, fretOffset] of patterns[boxIndex].shape) {
      let fret = rootFret + fretOffset
      if (fret < 0) fret += 12
      if (fret > 15) continue
      set.add(`${guitarString}:${fret}`)
    }
    return set
  }

  if (boxSystem === "3nps") {
    const positions = build3NPSPositions(tonic, scaleNotes, scaleIntervals)
    return positions[boxIndex] ?? new Set()
  }

  if (boxSystem === "pentatonic") {
    const fbType = PENTATONIC_TYPE_MAP[scaleType]
    if (!fbType) {
      // No Fretboard.js mapping → fall back to CAGED from SCALE_PATTERNS
      return getBoxMembershipSet(tonic, scaleType, "caged", boxIndex, scaleNotes, scaleIntervals)
    }
    try {
      const system = new FretboardSystem()
      const dots = system.getScale({
        type: fbType,
        root: tonic,
        box: { box: boxIndex + 1, system: Systems.pentatonic },
      }) as Array<{ string: number; fret: number; inBox: boolean }>
      return new Set(dots.filter(d => d.inBox).map(d => `${d.string}:${d.fret}`))
    } catch {
      return getBoxMembershipSet(tonic, scaleType, "caged", boxIndex, scaleNotes, scaleIntervals)
    }
  }

  return new Set()
}

// ---------------------------------------------------------------------------
// renderFretboard — stub filled in Task 6
// ---------------------------------------------------------------------------
export function renderFretboard(
  containerEl: HTMLElement,
  scale: GuitarScale,
  boxSystem: BoxSystem,
  boxIndex: number,
  labelMode: "note" | "interval",
  boxScaleType?: string   // for arpeggios: parent scale type for CAGED/3NPS lookup
): void {
  containerEl.innerHTML = ""

  // Use theme-aware hex colors (CSS vars use oklch format which D3/SVG may not parse)
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  const accentColor = isDark ? "#d97706" : "#b45309"  // amber-600 dark / amber-700 light
  const mutedColor  = isDark ? "#888888" : "#737373"

  // Compute all positions of scale/arpeggio notes across the full fretboard
  const baseDots = getAllFretboardPositions(scale.tonic, scale.notes, scale.intervals)

  // Determine box membership
  let inBoxSet: Set<string>
  if (boxSystem === "windows") {
    // Arpeggios only: use the pre-computed position windows from GuitarScale.positions
    const windowPos = scale.positions[boxIndex]?.positions ?? []
    inBoxSet = new Set(windowPos.map(p => `${p.string}:${p.fret}`))
  } else if (boxSystem === "caged") {
    // Use the same algorithmic position windows as the tab view (SCALE_PATTERNS
    // shapes have incorrect fretOffsets and are not reliable for box membership).
    // For arpeggios, resolve the parent scale so its position windows are used.
    const sourceScale = boxScaleType ? getScale(scale.tonic, boxScaleType) : scale
    const boxPositions = sourceScale.positions[boxIndex]?.positions ?? []
    inBoxSet = new Set(boxPositions.map(p => `${p.string}:${p.fret}`))
  } else {
    // 3NPS / pentatonic
    const lookupScaleType = boxScaleType ?? scale.type
    let boxNotes = scale.notes
    let boxIntervals = scale.intervals
    if (boxSystem === "3nps" && boxScaleType) {
      const parentScale = getScale(scale.tonic, boxScaleType)
      boxNotes = parentScale.notes
      boxIntervals = parentScale.intervals
    }
    inBoxSet = getBoxMembershipSet(
      scale.tonic, lookupScaleType, boxSystem, boxIndex, boxNotes, boxIntervals
    )
  }

  const hasBox = boxSystem !== "none"

  // Attach inBox and label to each dot
  const dots = baseDots.map(d => ({
    ...d,
    inBox: hasBox ? inBoxSet.has(`${d.string}:${d.fret}`) : true,
    label: labelMode === "interval" ? d.interval : d.note,
  }))

  // Create Fretboard instance
  // D3's select() accepts both CSS selectors and DOM elements
  const fretboard = new (Fretboard as any)({
    el: containerEl,
    fretCount: 15,
    dotText: (d: any) => d.label,
    showFretNumbers: true,
  })

  fretboard.setDots(dots)

  // render() must come BEFORE style() — style() applies immediately to existing
  // DOM elements (.dot-circle / .dot-text); calling it before render() selects nothing.
  fretboard.render()

  // Style out-of-box dots first (dimmed grey)
  fretboard.style({
    filter: (d: any) => !d.inBox,
    fill: "#aaaaaa",
    stroke: "#aaaaaa",
    fontFill: "#aaaaaa",
    opacity: 0.25,
  })

  // Style in-box dots by interval degree (overrides dimming for in-box dots)
  const inBox = (d: any) => d.inBox

  // dotLabel: re-supply the text so fontFill is honoured (fontFill requires text in style())
  const dotLabel = (d: any) => d.label

  fretboard
    .style({
      filter: (d: any) => inBox(d) && d.interval === "R",
      fill: accentColor,
      stroke: accentColor,
      text: dotLabel,
      fontFill: "#ffffff",
    })
    .style({
      filter: (d: any) => inBox(d) && (d.interval === "3" || d.interval === "b3"),
      fill: INTERVAL_DEGREE_COLORS.third,
      stroke: INTERVAL_DEGREE_COLORS.third,
      text: dotLabel,
      fontFill: "#ffffff",
    })
    .style({
      filter: (d: any) => inBox(d) && (d.interval === "5" || d.interval === "b5" || d.interval === "#5"),
      fill: INTERVAL_DEGREE_COLORS.fifth,
      stroke: INTERVAL_DEGREE_COLORS.fifth,
      text: dotLabel,
      fontFill: "#ffffff",
    })
    .style({
      filter: (d: any) => inBox(d) && (d.interval === "7" || d.interval === "b7"),
      fill: INTERVAL_DEGREE_COLORS.seventh,
      stroke: INTERVAL_DEGREE_COLORS.seventh,
      text: dotLabel,
      fontFill: "#ffffff",
    })
    .style({
      // All other in-box intervals (2, b2, 4, #4, 6, b6, etc.)
      filter: (d: any) => inBox(d) && !["R","3","b3","5","b5","#5","7","b7"].includes(d.interval),
      fill: mutedColor,
      stroke: mutedColor,
      text: dotLabel,
      fontFill: "#ffffff",
    })
}
