import { Note } from "tonal"
import type { GuitarScale } from "@/lib/theory/types"
import { INTERVAL_DEGREE_COLORS } from "@/lib/rendering/tab"

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

// Scale type names recognised by Fretboard.js's FretboardSystem (CAGED + TNPS)
const FB_TYPE_MAP: Record<string, string> = {
  Major:                 "major",
  Dorian:                "dorian",
  Phrygian:              "phrygian",
  Lydian:                "lydian",
  Mixolydian:            "mixolydian",
  Aeolian:               "aeolian",
  Locrian:               "locrian",
  "Harmonic Minor":      "harmonic minor",
  "Melodic Minor":       "melodic minor",
  Altered:               "altered",
}

// CAGED shape labels in Fretboard.js's CAGED_ORDER ('GEDCA')
export const CAGED_BOX_LABELS = ["G", "E", "D", "C", "A"] as const

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
  } else if (boxSystem === "caged" || boxSystem === "3nps") {
    // Use Fretboard.js's built-in CAGED and TNPS systems — well-tested and correct
    // across all keys. For arpeggios, the parent scale type drives box positions.
    const scaleTypeForBox = boxScaleType ?? scale.type
    const fbType = FB_TYPE_MAP[scaleTypeForBox]
    if (fbType) {
      try {
        const system = new FretboardSystem()
        const fbSystem = boxSystem === "caged" ? Systems.CAGED : Systems.TNPS
        const fbBox   = boxSystem === "caged" ? CAGED_BOX_LABELS[boxIndex] : boxIndex + 1
        const dots = system.getScale({
          type: fbType,
          root: scale.tonic,
          box: { box: fbBox, system: fbSystem },
        }) as Array<{ string: number; fret: number; inBox: boolean }>
        inBoxSet = new Set(dots.filter(d => d.inBox).map(d => `${d.string}:${d.fret}`))
      } catch {
        inBoxSet = new Set()
      }
    } else {
      inBoxSet = new Set()
    }
  } else {
    // pentatonic — delegate to Fretboard.js Systems.pentatonic
    const fbType = PENTATONIC_TYPE_MAP[scale.type]
    if (fbType) {
      try {
        const system = new FretboardSystem()
        const dots = system.getScale({
          type: fbType,
          root: scale.tonic,
          box: { box: boxIndex + 1, system: Systems.pentatonic },
        }) as Array<{ string: number; fret: number; inBox: boolean }>
        inBoxSet = new Set(dots.filter(d => d.inBox).map(d => `${d.string}:${d.fret}`))
      } catch {
        inBoxSet = new Set()
      }
    } else {
      inBoxSet = new Set()
    }
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
