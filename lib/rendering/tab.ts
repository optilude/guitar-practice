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

// MIDI pitches for open strings (index 0 = string 6 low E, index 5 = string 1 high e)
// E2=40, A2=45, D3=50, G3=55, B3=59, E4=64
const OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64]

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
export const INTERVAL_DEGREE_COLORS = {
  third:   "#16a34a", // green-600
  fifth:   "#2563eb", // blue-600
  seventh: "#9333ea", // purple-600
} as const

const THIRD_INTERVALS   = new Set(["3", "b3"])
const FIFTH_INTERVALS   = new Set(["5", "b5", "#5"])
const SEVENTH_INTERVALS = new Set(["7", "b7"])

function intervalColor(interval: string, rootColor: string, mutedColor: string): string {
  if (interval === "R")                return rootColor
  if (THIRD_INTERVALS.has(interval))   return INTERVAL_DEGREE_COLORS.third
  if (FIFTH_INTERVALS.has(interval))   return INTERVAL_DEGREE_COLORS.fifth
  if (SEVENTH_INTERVALS.has(interval)) return INTERVAL_DEGREE_COLORS.seventh
  return mutedColor
}

/**
 * Renders a single scale position as standard notation + guitar tab (ascending)
 * into containerEl. Both staves share one SVG. Clears the container first.
 * Safe to call multiple times.
 */
export function renderNotesView(
  containerEl: HTMLElement,
  scale: GuitarScale,
  positionIndex: number
): void {
  containerEl.innerHTML = ""

  const scalePosition = scale.positions[positionIndex]
  if (!scalePosition || scalePosition.positions.length === 0) return

  const renderer = new Renderer(containerEl, Renderer.Backends.SVG)
  renderer.resize(520, 400) // tall initial canvas; auto-crop trims excess
  const context = renderer.getContext()

  // ── Notation stave (treble clef) ───────────────────────────────────────────
  const notationStave = new Stave(10, 10, 490)
  notationStave.addClef("treble").setContext(context).draw()

  // ── Tab stave, positioned below notation stave ─────────────────────────────
  const tabStaveY = notationStave.getBottomLineBottomY() + 15
  const tabStave  = new TabStave(10, tabStaveY, 490)
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
  const mutedColor  = cs?.getPropertyValue("--muted-foreground").trim() || "#737373"

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
    const color    = intervalColor(p.interval, accentColor, mutedColor)
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
    const color = intervalColor(p.interval, accentColor, mutedColor)
    note.setStyle({ fillStyle: color, strokeStyle: color })
    return note
  })

  // Co-format both voices with a shared Formatter so that accidentals in the
  // notation stave don't shift note positions relative to the tab stave.
  // Two independent FormatAndDraw calls each compute their own spacing, which
  // diverges when accidentals claim extra horizontal space. A single format()
  // call sees both voices and assigns the same x to every pair of notes.
  const availableWidth = 500 - noteStartX - 10 // stave right edge (x:10 + w:490) minus note-start
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
      const color    = intervalColor(p.interval, accentColor, mutedColor)
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

    // Auto-crop: resize viewBox to actual rendered content
    try {
      const bbox          = (svgEl as SVGSVGElement).getBBox()
      const pad           = 8
      const croppedHeight = Math.round(bbox.height + pad * 2)
      svgEl.setAttribute(
        "viewBox",
        `${bbox.x - pad} ${bbox.y - pad} ${bbox.width + pad * 2} ${bbox.height + pad * 2}`
      )
      svgEl.setAttribute("height", String(croppedHeight))
      svgEl.style.height = `${croppedHeight}px`
    } catch {
      // getBBox unavailable in non-browser environments (e.g. jsdom without layout)
    }
  }
}
