import type { GuitarScale } from "@/lib/theory/types"

// VexFlow is imported via ESM so that vitest's vi.mock("vexflow") intercepts it in tests.
// Rendering only runs client-side via useEffect in viewer components.
//
// IMPORTANT: Before modifying this file, check the actual VexFlow API:
//   node_modules/vexflow/build/types/src/index.d.ts
// VexFlow 5.x uses named exports directly.
import * as VexFlow from "vexflow"

const { Renderer, TabStave, TabNote, Formatter } = VexFlow as unknown as {
  Renderer: any
  TabStave: any
  TabNote: any
  Formatter: any
}

// Chroma values for open strings (index 0 = string 6 low E, index 5 = string 1 high e)
const OPEN_STRING_CHROMA = [4, 9, 2, 7, 11, 4]

// Note name → chroma for looking up which scale note is at a given fret
const NOTE_CHROMA: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5,
  "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
}

/**
 * Interval display label → colour category.
 * Root uses the theme accent (resolved at render time); the others are fixed.
 */
export const INTERVAL_DEGREE_COLORS = {
  third:  "#16a34a", // green-600
  fifth:  "#2563eb", // blue-600
  seventh: "#9333ea", // purple-600
} as const

const THIRD_INTERVALS  = new Set(["3", "b3"])
const FIFTH_INTERVALS  = new Set(["5", "b5", "#5"])
const SEVENTH_INTERVALS = new Set(["7", "b7"])

function intervalColor(interval: string, rootColor: string, mutedColor: string): string {
  if (interval === "R") return rootColor
  if (THIRD_INTERVALS.has(interval))   return INTERVAL_DEGREE_COLORS.third
  if (FIFTH_INTERVALS.has(interval))   return INTERVAL_DEGREE_COLORS.fifth
  if (SEVENTH_INTERVALS.has(interval)) return INTERVAL_DEGREE_COLORS.seventh
  return mutedColor
}

/**
 * Renders a single scale position as guitar tablature (ascending) into containerEl.
 * Clears the container first. Safe to call multiple times.
 */
export function renderTab(
  containerEl: HTMLElement,
  scale: GuitarScale,
  positionIndex: number
): void {
  containerEl.innerHTML = ""

  // Guard: early exit for empty/invalid positions
  const scalePosition = scale.positions[positionIndex]
  if (!scalePosition || scalePosition.positions.length === 0) return

  const renderer = new Renderer(containerEl, Renderer.Backends.SVG)
  renderer.resize(520, 220)
  const context = renderer.getContext()

  const stave = new TabStave(10, 25, 490)
  stave.addClef("tab").setContext(context).draw()

  // Sort ascending: low strings (6) first, then by fret
  const sorted = [...scalePosition.positions].sort(
    (a, b) => b.string - a.string || a.fret - b.fret
  )

  // Resolve theme colours at render time
  const cs = typeof document !== "undefined" ? getComputedStyle(document.documentElement) : null
  const accentColor = cs?.getPropertyValue("--accent").trim() || "#b45309"
  const mutedColor  = cs?.getPropertyValue("--muted-foreground").trim() || "#737373"

  const notes = sorted.map((p) => {
    const note = new TabNote({
      positions: [{ str: p.string, fret: String(p.fret) }],
      duration: "q",
    })
    const color = intervalColor(p.interval, accentColor, mutedColor)
    note.setStyle({ fillStyle: color, strokeStyle: color })
    return note
  })

  Formatter.FormatAndDraw(context, stave, notes)

  // Inject note-name labels and auto-crop in a single SVG pass.
  const svgEl = containerEl.querySelector("svg")
  if (svgEl) {
    // Note-name labels: fixed baseline just below the stave, x from each note's position.
    // Degree labels (scale formula) appear one row below note names.
    const labelY = stave.getBottomLineBottomY() + 20
    for (const [i, note] of notes.entries()) {
      const p = sorted[i]
      const openChroma = OPEN_STRING_CHROMA[6 - p.string]
      const noteChroma = (openChroma + p.fret) % 12
      const noteName = scale.notes.find((n) => (NOTE_CHROMA[n] ?? -1) === noteChroma) ?? ""
      const color = intervalColor(p.interval, accentColor, mutedColor)
      const x = String(note.getAbsoluteX())

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

      // Degree label (scale formula): "R" → "1", otherwise use interval as-is
      const degree = p.interval === "R" ? "1" : p.interval
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

    // Auto-crop: resize viewBox to actual rendered content (includes labels above).
    try {
      const bbox = (svgEl as SVGSVGElement).getBBox()
      const pad = 8
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
