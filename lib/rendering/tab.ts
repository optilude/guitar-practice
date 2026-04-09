import type { GuitarScale } from "@/lib/theory/types"

// VexFlow is imported via ESM so that vitest's vi.mock("vexflow") intercepts it in tests.
// Rendering only runs client-side via useEffect in viewer components.
//
// IMPORTANT: Before modifying this file, check the actual VexFlow API:
//   node_modules/vexflow/build/types/src/index.d.ts
// VexFlow 5.x uses named exports directly.
import * as VexFlow from "vexflow"

const { Renderer, Stave, StaveNote, Accidental, TabStave, TabNote, Formatter, Voice } = VexFlow as unknown as {
  Renderer: any
  Stave: any
  StaveNote: any
  Accidental: any
  TabStave: any
  TabNote: any
  Formatter: any
  Voice: any
}

// Chroma values for open strings (index 0 = string 6 low E, index 5 = string 1 high e)
const OPEN_STRING_CHROMA = [4, 9, 2, 7, 11, 4]

// Written MIDI pitches for open strings in standard guitar notation.
// Guitar is a C8 transposing instrument: sounds an octave lower than written,
// so notation uses pitches one octave above concert pitch.
// E3=52, A3=57, D4=62, G4=67, B4=71, E5=76
// (index 0 = string 6 low E, index 5 = string 1 high e)
const OPEN_STRING_MIDI = [52, 57, 62, 67, 71, 76]

// Note name → chroma for looking up which scale note is at a given fret
const NOTE_CHROMA: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5,
  "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
}

/**
 * Converts a fret position to a VexFlow key string, e.g. "bb/3" or "f#/4".
 * Uses the note name already resolved from the scale (correct enharmonic spelling).
 * VexFlow convention: C4 = MIDI 60, octave = Math.floor((midi - 12) / 12).
 */
function fretToVexKey(string: number, fret: number, noteName: string): string {
  const midi   = OPEN_STRING_MIDI[6 - string] + fret
  const octave = Math.floor((midi - 12) / 12)
  return `${noteName.toLowerCase()}/${octave}`
}

/**
 * Interval display label → colour category.
 * Root uses the theme accent (resolved at render time); the others are fixed.
 */
/**
 * Shared interval→colour palette, used by both stave/tab and fretboard renderers.
 *
 * Aligned with music-theory convention and the app's design system:
 *   Chord tones (1, 3, 5, 7) are placed ~90° apart on the hue wheel for maximum
 *   distinctiveness. Passing tones (2, 4, 6) sit visually between their neighbors.
 *
 *   Root   → amber   (~35°)  home base
 *   2nd    → lime    (~83°)  between amber and emerald
 *   3rd    → emerald (~161°) clearly distinct from amber
 *   4th    → sky     (~199°) between emerald and blue
 *   5th    → blue    (~221°) power / stability
 *   6th    → violet  (~263°) between blue and fuchsia
 *   7th    → fuchsia (~293°) leading-tone / tension
 */
export const INTERVAL_DEGREE_COLORS = {
  second:  "#65a30d", // lime-600
  third:   "#059669", // emerald-600
  fourth:  "#0ea5e9", // sky-500
  fifth:   "#2563eb", // blue-600
  sixth:   "#7c3aed", // violet-600
  seventh: "#c026d3", // fuchsia-600
} as const

const SECOND_INTERVALS  = new Set(["2", "b2"])
const THIRD_INTERVALS   = new Set(["3", "b3"])
const FOURTH_INTERVALS  = new Set(["4", "#4"])
const FIFTH_INTERVALS   = new Set(["5", "b5", "#5"])
const SIXTH_INTERVALS   = new Set(["6", "b6"])
const SEVENTH_INTERVALS = new Set(["7", "b7"])

function intervalColor(interval: string, rootColor: string): string {
  if (interval === "R")                 return rootColor
  if (SECOND_INTERVALS.has(interval))  return INTERVAL_DEGREE_COLORS.second
  if (THIRD_INTERVALS.has(interval))   return INTERVAL_DEGREE_COLORS.third
  if (FOURTH_INTERVALS.has(interval))  return INTERVAL_DEGREE_COLORS.fourth
  if (FIFTH_INTERVALS.has(interval))   return INTERVAL_DEGREE_COLORS.fifth
  if (SIXTH_INTERVALS.has(interval))   return INTERVAL_DEGREE_COLORS.sixth
  if (SEVENTH_INTERVALS.has(interval)) return INTERVAL_DEGREE_COLORS.seventh
  return rootColor // fallback: unknown interval treated as root
}

/**
 * Renders a single scale position as standard notation + guitar tab (ascending)
 * into containerEl. Both staves share one SVG. Clears the container first.
 * Safe to call multiple times.
 */
export function renderNotesView(
  containerEl: HTMLElement,
  scale: GuitarScale,
  positionIndex: number,
  containerWidth = 490
): void {
  containerEl.innerHTML = ""

  const scalePosition = scale.positions[positionIndex]
  if (!scalePosition || scalePosition.positions.length === 0) return

  // 10px margin on each side; minimum 300px so notes don't overlap on narrow screens
  const staveWidth = Math.max(containerWidth - 20, 300)

  const renderer = new Renderer(containerEl, Renderer.Backends.SVG)
  renderer.resize(staveWidth + 30, 400) // tall initial canvas; auto-crop trims excess
  const context = renderer.getContext()

  // Set stave-line colour for the current theme so lines are visible on bg-card.
  // Individual notes override this via setStyle() before they draw.
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  const staveColor = isDark ? "#cccccc" : "#000000"
  context.setFillStyle?.(staveColor)
  context.setStrokeStyle?.(staveColor)
  context.setBackgroundFillStyle?.(isDark ? "#111111" : "#ffffff")

  // ── Notation stave (treble clef) ───────────────────────────────────────────
  // space_above_staff_ln: 1 (vs default 4) places the first staff line at
  // stave.y + 10 instead of stave.y + 40, eliminating most of the whitespace
  // that would otherwise appear above the stave in the auto-cropped SVG.
  const notationStave = new Stave(10, 10, staveWidth, { space_above_staff_ln: 1 })
  notationStave.addClef("treble").setContext(context).draw()

  // ── Tab stave, positioned below notation stave ─────────────────────────────
  // 40px gap (vs 15) gives ledger lines below the bottom staff line room to
  // breathe; notes in keys like G or E can extend 25–35px below getBottomLineBottomY.
  const tabStaveY = notationStave.getBottomLineBottomY() + 40
  const tabStave  = new TabStave(10, tabStaveY, staveWidth)
  tabStave.addClef("tab").setContext(context).draw()

  // Sync note-start x so noteheads align vertically between staves
  const noteStartX = Math.max(notationStave.getNoteStartX(), tabStave.getNoteStartX())
  notationStave.setNoteStartX(noteStartX)
  tabStave.setNoteStartX(noteStartX)

  // Sort ascending: low strings (6) first, then by fret
  const sorted = [...scalePosition.positions].sort(
    (a, b) => b.string - a.string || a.fret - b.fret
  )

  // Resolve theme colours at render time
  const cs          = typeof document !== "undefined" ? getComputedStyle(document.documentElement) : null
  const accentColor = cs?.getPropertyValue("--accent").trim() || "#b45309"

  // Pre-resolve note names (shared between StaveNote building and SVG labels)
  const noteNames = sorted.map((p) => {
    const openChroma = OPEN_STRING_CHROMA[6 - p.string]
    const noteChroma = (openChroma + p.fret) % 12
    return scale.notes.find((n) => (NOTE_CHROMA[n] ?? -1) === noteChroma) ?? ""
  })

  // ── Standard notation notes (whole notes = stemless) ──────────────────────
  const staveNotes = sorted.map((p, i) => {
    const noteName = noteNames[i]
    const vexKey   = noteName ? fretToVexKey(p.string, p.fret, noteName) : "b/4"
    const color    = intervalColor(p.interval, accentColor)
    const sn       = new StaveNote({ clef: "treble", keys: [vexKey], duration: "w" })
    sn.setStyle({ fillStyle: color, strokeStyle: color })
    // noteName is mixed-case ("Bb", "F#"); check original spelling for accidentals
    if (noteName.includes("#")) sn.addModifier(new Accidental("#"), 0)
    if (noteName.includes("b")) sn.addModifier(new Accidental("b"), 0)
    return sn
  })

  // ── Tab notes (unchanged from original renderTab) ──────────────────────────
  const tabNotes = sorted.map((p) => {
    const note  = new TabNote({ positions: [{ str: p.string, fret: String(p.fret) }], duration: "w" })
    const color = intervalColor(p.interval, accentColor)
    note.setStyle({ fillStyle: color, strokeStyle: color })
    return note
  })

  // Co-format both voices with a shared Formatter so that accidentals in the
  // notation stave don't shift note positions relative to the tab stave.
  // Two independent FormatAndDraw calls each compute their own spacing, which
  // diverges when accidentals claim extra horizontal space. A single format()
  // call sees both voices and assigns the same x to every pair of notes.
  const availableWidth = staveWidth - noteStartX // stave right edge (x:10 + staveWidth) minus note-start minus left margin
  const voice1 = new Voice()
  voice1.setMode(2) // SOFT — don't enforce strict beat counts
  voice1.addTickables(staveNotes)
  const voice2 = new Voice()
  voice2.setMode(2)
  voice2.addTickables(tabNotes)
  new Formatter().format([voice1, voice2], availableWidth)
  voice1.draw(context, notationStave)
  voice2.draw(context, tabStave)

  // ── SVG label injection and auto-crop ──────────────────────────────────────
  const svgEl = containerEl.querySelector("svg")
  if (svgEl) {
    // Labels below the tab stave (note names + degree labels)
    const labelY = tabStave.getBottomLineBottomY() + 20
    for (const [i, note] of tabNotes.entries()) {
      const p        = sorted[i]
      const noteName = noteNames[i]
      const color    = intervalColor(p.interval, accentColor)
      const x        = String(note.getAbsoluteX())

      if (noteName) {
        const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text")
        textEl.setAttribute("x", x)
        textEl.setAttribute("y", String(labelY))
        textEl.setAttribute("text-anchor", "middle")
        textEl.setAttribute("font-family", "system-ui, -apple-system, sans-serif")
        textEl.setAttribute("font-size", "10")
        textEl.setAttribute("font-weight", "400")
        textEl.setAttribute("fill", color)
        textEl.textContent = noteName
        svgEl.appendChild(textEl)
      }

      const degree   = p.interval === "R" ? "1" : p.interval
      const degreeEl = document.createElementNS("http://www.w3.org/2000/svg", "text")
      degreeEl.setAttribute("x", x)
      degreeEl.setAttribute("y", String(labelY + 14))
      degreeEl.setAttribute("text-anchor", "middle")
      degreeEl.setAttribute("font-family", "system-ui, -apple-system, sans-serif")
      degreeEl.setAttribute("font-size", "9")
      degreeEl.setAttribute("font-weight", "300")
      degreeEl.setAttribute("fill", color)
      degreeEl.textContent = degree
      svgEl.appendChild(degreeEl)
    }

    // Bold tab-note fret numbers for readability (both light and dark mode).
    // VexFlow-rendered tab note text lacks font-family; our injected labels have it.
    svgEl.querySelectorAll<SVGTextElement>("text:not([font-family])").forEach(el => {
      el.setAttribute("font-weight", "600")
    })

    // Auto-crop: resize viewBox to actual rendered content
    try {
      const bbox          = (svgEl as SVGSVGElement).getBBox()
      const pad           = 8
      const croppedWidth  = Math.round(bbox.width  + pad * 2)
      const croppedHeight = Math.round(bbox.height + pad * 2)
      svgEl.setAttribute(
        "viewBox",
        `${bbox.x - pad} ${bbox.y - pad} ${bbox.width + pad * 2} ${bbox.height + pad * 2}`
      )
      svgEl.setAttribute("width",  String(croppedWidth))
      svgEl.setAttribute("height", String(croppedHeight))
      svgEl.style.width  = `${croppedWidth}px`
      svgEl.style.height = `${croppedHeight}px`
    } catch {
      // getBBox unavailable in non-browser environments (e.g. jsdom without layout)
    }
  }
}
